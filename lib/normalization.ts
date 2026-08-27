/** Normalize common printed and handwritten question labels without losing sub-parts. */
export function normalizeQuestionLabel(input: string | null | undefined): string {
  if (!input) return "";

  let value = input
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/^\s*(?:question|ques|que|q)\s*[.:#-]?\s*/i, "")
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/\s+/g, "");

  // Remove wrappers/punctuation while preserving roman/letter subparts.
  value = value
    .replace(/^\((.+)\)$/u, "$1")
    .replace(/[()[\]{}._:\-/]/g, "")
    .replace(/[^a-z0-9]/g, "");

  // Common OCR confusion only when adjacent to digits (Q l / Q I -> Q1).
  value = value.replace(/^[li](?=[a-z]?$)/, "1");
  return value;
}

export function makeStableId(prefix: string, ...parts: Array<string | number>): string {
  const raw = parts.join("-").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${prefix}-${raw || "item"}`;
}
