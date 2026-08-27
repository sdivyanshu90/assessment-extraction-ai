import type { DocumentPage } from "@/lib/types";

export const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_PAGES = 16;

export function validateFiles(files: File[]): string | null {
  if (!files.length) return "Choose at least one PDF or image.";
  const unsupported = files.find((file) => !ACCEPTED_TYPES.includes(file.type));
  if (unsupported) return `${unsupported.name} is not a supported PDF, PNG, JPG, or WebP file.`;
  const oversized = files.find((file) => file.size > MAX_FILE_BYTES);
  if (oversized) return `${oversized.name} is larger than the 10 MB limit.`;
  return null;
}

export async function renderDocumentFiles(
  files: File[],
  onProgress?: (rendered: number) => void,
): Promise<DocumentPage[]> {
  const error = validateFiles(files);
  if (error) throw new Error(error);

  const pages: DocumentPage[] = [];
  for (const file of files) {
    const rendered = file.type === "application/pdf"
      ? await renderPdf(file)
      : [await renderImage(file)];
    for (const page of rendered) {
      if (pages.length >= MAX_PAGES) throw new Error(`Documents are limited to ${MAX_PAGES} pages each.`);
      pages.push({ ...page, pageIndex: pages.length });
      onProgress?.(pages.length);
    }
  }
  return pages;
}

async function renderPdf(file: File): Promise<DocumentPage[]> {
  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
    const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    const pdf = await task.promise;
    if (pdf.numPages > MAX_PAGES) throw new Error(`PDFs are limited to ${MAX_PAGES} pages.`);

    const pages: DocumentPage[] = [];
    for (let number = 1; number <= pdf.numPages; number += 1) {
      const page = await pdf.getPage(number);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(2.2, 1800 / Math.max(base.width, base.height));
      const viewport = page.getViewport({ scale: Math.max(1.35, scale) });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Canvas rendering is unavailable in this browser.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: context, viewport }).promise;
      pages.push({
        pageIndex: pages.length,
        dataUrl: canvas.toDataURL("image/jpeg", 0.86),
        width: canvas.width,
        height: canvas.height,
        sourceName: file.name,
      });
      page.cleanup();
    }
    await task.destroy();
    return pages;
  } catch (error) {
    if (error instanceof Error && (error.message.includes("limited") || error.message.includes("Canvas"))) throw error;
    throw new Error(`${file.name} could not be read as a PDF. It may be corrupt or password-protected.`);
  }
}

async function renderImage(file: File): Promise<DocumentPage> {
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas rendering is unavailable in this browser.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return {
      pageIndex: 0,
      dataUrl: canvas.toDataURL("image/jpeg", 0.88),
      width: canvas.width,
      height: canvas.height,
      sourceName: file.name,
    };
  } catch {
    throw new Error(`${file.name} could not be decoded as an image.`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image decode failed"));
    image.src = url;
  });
}
