import { requestStructuredAI } from "@/lib/ai/client";
import { answerExtractionPrompt, questionExtractionPrompt } from "@/lib/ai/prompts";
import { clampBoundingBox } from "@/lib/bbox";
import { makeStableId, normalizeQuestionLabel } from "@/lib/normalization";
import { orderByDocumentPosition } from "@/lib/ordering";
import { RawAnswersResponseSchema, RawQuestionsResponseSchema } from "@/lib/schemas";
import type { DocumentPage, ExtractedAnswerBlock, Question } from "@/lib/types";

export async function extractQuestions(pages: DocumentPage[]): Promise<Question[]> {
  const pageIndexes = new Set(pages.map((page) => page.pageIndex));
  const result = await requestStructuredAI({
    task: "question extraction",
    system: questionExtractionPrompt,
    userText: pageManifest(pages, "question paper"),
    images: pages.map((page) => page.dataUrl),
    schema: RawQuestionsResponseSchema,
  });

  return orderByDocumentPosition(result.questions.filter((item) => pageIndexes.has(item.pageIndex)))
    .map((item, printedOrder) => ({
      id: makeStableId("q", printedOrder + 1, item.displayNumber),
      displayNumber: item.displayNumber.trim(),
      normalizedNumber: normalizeQuestionLabel(item.displayNumber),
      text: item.text.trim(),
      pageIndex: item.pageIndex,
      bbox: item.bbox ? clampBoundingBox(item.bbox) : undefined,
      printedOrder,
      maxMarks: item.maxMarks,
    }));
}

export async function extractAnswerBlocks(pages: DocumentPage[]): Promise<ExtractedAnswerBlock[]> {
  const pageIndexes = new Set(pages.map((page) => page.pageIndex));
  const result = await requestStructuredAI({
    task: "answer extraction",
    system: answerExtractionPrompt,
    userText: pageManifest(pages, "student answer sheet"),
    images: pages.map((page) => page.dataUrl),
    schema: RawAnswersResponseSchema,
  });

  return orderByDocumentPosition(result.answerBlocks.filter((item) => pageIndexes.has(item.pageIndex)))
    .map((item, sequenceIndex) => ({
      id: makeStableId("a", sequenceIndex + 1, item.pageIndex),
      detectedQuestionLabel: item.detectedQuestionLabel?.trim() || null,
      normalizedQuestionLabel: normalizeQuestionLabel(item.detectedQuestionLabel) || null,
      text: item.text.trim(),
      pageIndex: item.pageIndex,
      bbox: clampBoundingBox(item.bbox),
      sequenceIndex,
      isPossibleContinuation: item.isPossibleContinuation,
      continuesOnNextPage: item.continuesOnNextPage,
    }));
}

function pageManifest(pages: DocumentPage[], documentType: string): string {
  return `Attached ${documentType} pages are ordered exactly like this:\n${pages
    .map((page, index) => `Image ${index + 1}: pageIndex=${page.pageIndex}, source=${JSON.stringify(page.sourceName)}`)
    .join("\n")}\nAnalyze all images. Return zero-based pageIndex values matching this manifest.`;
}
