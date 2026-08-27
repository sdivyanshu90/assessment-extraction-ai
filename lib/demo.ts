import type { AssessmentResult, DocumentPage } from "@/lib/types";

function svgPage(lines: Array<{ x: number; y: number; text: string; bold?: boolean }>): string {
  const body = lines.map((line) =>
    `<text x="${line.x}" y="${line.y}" font-family="Georgia,serif" font-size="24" font-style="italic" font-weight="${line.bold ? 700 : 400}" fill="#27302e">${escapeXml(line.text)}</text>`,
  ).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="850" height="1100" viewBox="0 0 850 1100"><rect width="850" height="1100" fill="#fffefb"/><path d="M70 0V1100" stroke="#efb7ac"/><g stroke="#dbe8ef" stroke-width="1">${Array.from({ length: 34 }, (_, i) => `<path d="M0 ${90 + i * 30}H850"/>`).join("")}</g>${body}<text x="770" y="1060" font-family="Arial" font-size="14" fill="#8d9694">VedaAI sample</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const demoPages: DocumentPage[] = [
  {
    pageIndex: 0,
    width: 850,
    height: 1100,
    sourceName: "student_sample_page_1.png",
    dataUrl: svgPage([
      { x: 95, y: 125, text: "Q3)", bold: true },
      { x: 155, y: 125, text: "Force is equal to mass multiplied by acceleration." },
      { x: 155, y: 165, text: "So Newton's second law is F = m × a." },
      { x: 95, y: 355, text: "Q1)", bold: true },
      { x: 155, y: 355, text: "Osmosis is the movement of water molecules" },
      { x: 155, y: 395, text: "through a partially permeable membrane from a" },
      { x: 155, y: 435, text: "dilute solution to a concentrated solution..." },
      { x: 95, y: 780, text: "continued on next page →" },
    ]),
  },
  {
    pageIndex: 1,
    width: 850,
    height: 1100,
    sourceName: "student_sample_page_2.png",
    dataUrl: svgPage([
      { x: 95, y: 120, text: "...until the concentration becomes balanced." },
      { x: 95, y: 420, text: "Rough work", bold: true },
      { x: 145, y: 470, text: "25 × 4 = 100" },
    ]),
  },
];

export const demoAssessment: { pages: DocumentPage[]; result: AssessmentResult } = {
  pages: demoPages,
  result: {
    questions: [
      { id: "q-1", displayNumber: "1.", normalizedNumber: "1", text: "Define osmosis.", pageIndex: 0, printedOrder: 0, maxMarks: 3 },
      { id: "q-2", displayNumber: "2.", normalizedNumber: "2", text: "Explain photosynthesis.", pageIndex: 0, printedOrder: 1, maxMarks: 3 },
      { id: "q-3", displayNumber: "3.", normalizedNumber: "3", text: "State Newton's second law.", pageIndex: 0, printedOrder: 2, maxMarks: 2 },
    ],
    answerBlocks: [
      { id: "a-1", detectedQuestionLabel: "Q3", normalizedQuestionLabel: "3", text: "Force is equal to mass multiplied by acceleration. So Newton's second law is F = m × a.", pageIndex: 0, bbox: { x: 0.1, y: 0.075, width: 0.83, height: 0.105 }, sequenceIndex: 0, isPossibleContinuation: false, continuesOnNextPage: false },
      { id: "a-2", detectedQuestionLabel: "Q1", normalizedQuestionLabel: "1", text: "Osmosis is the movement of water molecules through a partially permeable membrane from a dilute solution to a concentrated solution...", pageIndex: 0, bbox: { x: 0.1, y: 0.285, width: 0.84, height: 0.135 }, sequenceIndex: 1, isPossibleContinuation: false, continuesOnNextPage: true },
      { id: "a-3", detectedQuestionLabel: null, normalizedQuestionLabel: null, text: "...until the concentration becomes balanced.", pageIndex: 1, bbox: { x: 0.1, y: 0.065, width: 0.82, height: 0.07 }, sequenceIndex: 2, isPossibleContinuation: true, continuesOnNextPage: false },
      { id: "a-4", detectedQuestionLabel: null, normalizedQuestionLabel: null, text: "Rough work: 25 × 4 = 100", pageIndex: 1, bbox: { x: 0.1, y: 0.35, width: 0.5, height: 0.11 }, sequenceIndex: 3, isPossibleContinuation: false, continuesOnNextPage: false },
    ],
    mappings: [
      { questionId: "q-1", status: "answered", segments: [
        { answerBlockId: "a-2", pageIndex: 0, bbox: { x: 0.1, y: 0.285, width: 0.84, height: 0.135 }, text: "Osmosis is the movement of water molecules through a partially permeable membrane from a dilute solution to a concentrated solution..." },
        { answerBlockId: "a-3", pageIndex: 1, bbox: { x: 0.1, y: 0.065, width: 0.82, height: 0.07 }, text: "...until the concentration becomes balanced." },
      ], combinedAnswer: "Osmosis is the movement of water molecules through a partially permeable membrane from a dilute solution to a concentrated solution...\n\n...until the concentration becomes balanced.", confidence: 0.92, mappingMethod: "normalized-label" },
      { questionId: "q-2", status: "unanswered", segments: [], combinedAnswer: "", confidence: 0, mappingMethod: "none" },
      { questionId: "q-3", status: "answered", segments: [{ answerBlockId: "a-1", pageIndex: 0, bbox: { x: 0.1, y: 0.075, width: 0.83, height: 0.105 }, text: "Force is equal to mass multiplied by acceleration. So Newton's second law is F = m × a." }], combinedAnswer: "Force is equal to mass multiplied by acceleration. So Newton's second law is F = m × a.", confidence: 0.98, mappingMethod: "normalized-label" },
    ],
    unmatchedAnswers: [{ answerBlockId: "a-4", text: "Rough work: 25 × 4 = 100", pageIndex: 1, bbox: { x: 0.1, y: 0.35, width: 0.5, height: 0.11 }, confidence: 0.22 }],
    grades: [
      { questionId: "q-1", score: 3, maxMarks: 3, correctness: "correct", feedback: "Clear and complete definition, including the membrane and concentration direction.", confidence: 0.94 },
      { questionId: "q-3", score: 2, maxMarks: 2, correctness: "correct", feedback: "Correct statement and formula for Newton's second law.", confidence: 0.97 },
    ],
    warnings: ["Sample mode uses illustrative data. Uploaded assessments always use the configured AI provider."],
  },
};

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
