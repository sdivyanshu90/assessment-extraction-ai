import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { consumeBenchmarkMetrics } from "@/lib/ai/client";
import { extractAnswerBlocks, extractQuestions } from "@/lib/ai/extraction";
import { mapAnswerBlocks } from "@/lib/ai/mapping";
import { createDeterministicAssignments, finalizeMappings } from "@/lib/mapping";
import { normalizeQuestionLabel } from "@/lib/normalization";
import type { BoundingBox, DocumentPage, ExtractedAnswerBlock } from "@/lib/types";

const cliModels = process.argv.slice(2).join(",");
const MODELS = (cliModels || process.env.BENCHMARK_MODELS || [
  "dots-studio/dots-3-note-preview:free",
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-4-31b-it:free",
  "minimax/minimax-m3:free",
].join(",")).split(",").map((item) => item.trim()).filter(Boolean);

const fixtureDir = path.join(process.cwd(), "benchmarks", "fixtures");
const expectedRegions: Array<{ pageIndex: number; label: string | null; bbox: BoundingBox; keywords: string[] }> = [
  { pageIndex: 0, label: "3", bbox: { x: .12, y: .09, width: .82, height: .09 }, keywords: ["force", "mass", "acceleration"] },
  { pageIndex: 0, label: "11a", bbox: { x: .12, y: .31, width: .82, height: .09 }, keywords: ["mitosis", "identical", "daughter"] },
  { pageIndex: 0, label: "1", bbox: { x: .12, y: .59, width: .82, height: .09 }, keywords: ["osmosis", "water", "membrane"] },
  { pageIndex: 1, label: null, bbox: { x: .12, y: .07, width: .82, height: .09 }, keywords: ["dilute", "concentrated", "balanced"] },
  { pageIndex: 1, label: "11b", bbox: { x: .12, y: .33, width: .82, height: .09 }, keywords: ["grow", "repair", "tissues"] },
  { pageIndex: 1, label: null, bbox: { x: .12, y: .68, width: .55, height: .10 }, keywords: ["rough", "25", "100"] },
];

async function main() {
  process.env.AI_BENCHMARK_LOGS = "true";
  if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is missing.");

  const questionPage = await imagePage("question-paper.png", 0);
  const answerPages = await Promise.all([imagePage("answer-page-1.png", 0), imagePage("answer-page-2.png", 1)]);
  const results = [];

  for (const model of MODELS) {
    process.env.OPENROUTER_MODEL = model;
    consumeBenchmarkMetrics();
    const started = performance.now();
    try {
      const [questionOutcome, answerOutcome] = await Promise.allSettled([
        extractQuestions([questionPage]),
        extractAnswerBlocks(answerPages),
      ]);
      if (questionOutcome.status === "rejected" || answerOutcome.status === "rejected") {
        const failures = [questionOutcome, answerOutcome]
          .filter((outcome): outcome is PromiseRejectedResult => outcome.status === "rejected")
          .map((outcome) => outcome.reason instanceof Error ? outcome.reason.message : "Unknown extraction error");
        throw new Error([...new Set(failures)].join("; "));
      }
      const questions = questionOutcome.value;
      const answerBlocks = answerOutcome.value;
      let mappingFallbackError: string | null = null;
      let mapped;
      try {
        mapped = await mapAnswerBlocks(questions, answerBlocks);
      } catch (mappingError) {
        const deterministic = createDeterministicAssignments(questions, answerBlocks);
        mapped = finalizeMappings(questions, answerBlocks, deterministic.assignments);
        mappingFallbackError = mappingError instanceof Error ? mappingError.message : "Semantic mapping unavailable";
      }
      const scores = scoreRun(questions, answerBlocks, mapped);
      results.push({
        model,
        success: true,
        wallTimeMs: Math.round(performance.now() - started),
        ...scores,
        metrics: consumeBenchmarkMetrics(),
        counts: { questions: questions.length, answerBlocks: answerBlocks.length, unmatched: mapped.unmatchedAnswers.length },
        extractedLabels: questions.map((q) => q.displayNumber),
        mappingFallbackError,
      });
    } catch (error) {
      results.push({
        model,
        success: false,
        wallTimeMs: Math.round(performance.now() - started),
        error: error instanceof Error ? error.message : "Unknown failure",
        metrics: consumeBenchmarkMetrics(),
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  const report = {
    generatedAt: new Date().toISOString(),
    fixture: "Synthetic 5-question science paper and 2-page out-of-order handwritten answer sheet",
    weighting: { questionLabels: .25, explicitAnswerLabels: .15, mapping: .30, boundingBoxes: .20, transcriptionKeywords: .10 },
    results: results.sort((a, b) => scoreValue(b) - scoreValue(a)),
  };
  await mkdir(path.join(process.cwd(), "benchmarks", "results"), { recursive: true });
  await writeFile(path.join(process.cwd(), "benchmarks", "results", "latest.json"), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(path.join(process.cwd(), "benchmarks", "results", `${report.generatedAt.replace(/[:.]/g, "-")}.json`), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`BENCHMARK_REPORT ${JSON.stringify(report)}`);
}

void main();

async function imagePage(name: string, pageIndex: number): Promise<DocumentPage> {
  const data = await readFile(path.join(fixtureDir, name));
  return { pageIndex, dataUrl: `data:image/png;base64,${data.toString("base64")}`, width: 1200, height: 1600, sourceName: name };
}

function scoreRun(
  questions: Awaited<ReturnType<typeof extractQuestions>>,
  blocks: ExtractedAnswerBlock[],
  mapped: Awaited<ReturnType<typeof mapAnswerBlocks>>,
) {
  const expectedLabels = ["1", "2", "3", "11a", "11b"];
  const actualLabels = new Set(questions.map((item) => item.normalizedNumber));
  const questionLabelScore = ratio(expectedLabels.filter((label) => actualLabels.has(label)).length, expectedLabels.length);
  const explicitExpected = expectedRegions.filter((item) => item.label);
  const actualBlockLabels = new Set(blocks.map((item) => item.normalizedQuestionLabel).filter(Boolean));
  const explicitAnswerLabelScore = ratio(explicitExpected.filter((item) => actualBlockLabels.has(item.label)).length, explicitExpected.length);

  const regionMatches = expectedRegions.map((expected) => {
    const candidates = blocks.filter((block) => block.pageIndex === expected.pageIndex);
    const best = candidates.sort((a, b) => iou(b.bbox, expected.bbox) - iou(a.bbox, expected.bbox))[0];
    const overlap = best ? iou(best.bbox, expected.bbox) : 0;
    const lower = best?.text.toLowerCase() || "";
    const keywordScore = ratio(expected.keywords.filter((word) => lower.includes(word)).length, expected.keywords.length);
    return { overlap, keywordScore };
  });
  const boundingBoxScore = average(regionMatches.map((item) => item.overlap));
  const transcriptionKeywordScore = average(regionMatches.map((item) => item.keywordScore));

  const expectedMapping = new Map<string, { status: "answered" | "unanswered"; pages: number[] }>([
    ["1", { status: "answered", pages: [0, 1] }],
    ["2", { status: "unanswered", pages: [] }],
    ["3", { status: "answered", pages: [0] }],
    ["11a", { status: "answered", pages: [0] }],
    ["11b", { status: "answered", pages: [1] }],
  ]);
  let mappingCorrect = 0;
  for (const [label, expected] of expectedMapping) {
    const question = questions.find((item) => item.normalizedNumber === label);
    const mapping = question ? mapped.mappings.find((item) => item.questionId === question.id) : undefined;
    const pages = [...new Set(mapping?.segments.map((item) => item.pageIndex) || [])].sort();
    if (mapping?.status === expected.status && JSON.stringify(pages) === JSON.stringify(expected.pages)) mappingCorrect += 1;
  }
  const roughUnmatched = mapped.unmatchedAnswers.some((item) => normalizeQuestionLabel(item.text).includes("254100") || item.text.toLowerCase().includes("rough"));
  const mappingScore = ratio(mappingCorrect + Number(roughUnmatched), expectedMapping.size + 1);
  const overallScore = questionLabelScore * .25 + explicitAnswerLabelScore * .15 + mappingScore * .30 + boundingBoxScore * .20 + transcriptionKeywordScore * .10;
  return { questionLabelScore, explicitAnswerLabelScore, mappingScore, boundingBoxScore, transcriptionKeywordScore, overallScore };
}

function iou(a: BoundingBox, b: BoundingBox) {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
  const union = a.width * a.height + b.width * b.height - intersection;
  return union ? intersection / union : 0;
}

const ratio = (value: number, total: number) => total ? value / total : 0;
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const scoreValue = (value: { success: boolean; overallScore?: number }) => value.success ? value.overallScore || 0 : -1;
