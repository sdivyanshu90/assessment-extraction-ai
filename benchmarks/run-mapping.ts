import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { consumeBenchmarkMetrics } from "@/lib/ai/client";
import { mapAnswerBlocks } from "@/lib/ai/mapping";
import type { BoundingBox, ExtractedAnswerBlock, Question } from "@/lib/types";

const models = (process.argv.slice(2).join(",") || [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "openai/gpt-oss-120b:free",
].join(",")).split(",").map((item) => item.trim()).filter(Boolean);

const questions: Question[] = [
  q("q1", "1.", "Define osmosis.", 0),
  q("q2", "2.", "Explain photosynthesis and name the organelle involved.", 1),
  q("q3", "3.", "State Newton's second law of motion.", 2),
  q("q11a", "11 (a)", "Define mitosis.", 3),
  q("q11b", "11 (b)", "Why is mitosis important to living organisms?", 4),
];

// Labels are intentionally removed so this measures semantic reasoning rather
// than the deterministic normalizer. Physical order differs from question order.
const blocks: ExtractedAnswerBlock[] = [
  a("a-force", "Force equals mass multiplied by acceleration. Newton's second law is F = m × a.", 0, 0),
  a("a-mitosis", "Mitosis is cell division that produces two genetically identical daughter cells.", 0, 1),
  { ...a("a-osmosis", "Osmosis is the movement of water molecules through a partially permeable membrane...", 0, 2), continuesOnNextPage: true },
  { ...a("a-osmosis-cont", "...from a dilute solution to a concentrated solution until balanced.", 1, 3), isPossibleContinuation: true },
  a("a-growth", "It allows organisms to grow and repair damaged or worn-out tissues.", 1, 4),
  a("a-rough", "Rough calculation: 25 × 4 = 100", 1, 5),
];

async function main() {
  if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is missing.");
  process.env.AI_BENCHMARK_LOGS = "true";
  const results = [];
  for (const model of models) {
    process.env.OPENROUTER_MODEL = model;
    consumeBenchmarkMetrics();
    const started = performance.now();
    try {
      const mapped = await mapAnswerBlocks(questions, blocks);
      const expected = new Map([
        ["q1", ["a-osmosis", "a-osmosis-cont"]],
        ["q2", []],
        ["q3", ["a-force"]],
        ["q11a", ["a-mitosis"]],
        ["q11b", ["a-growth"]],
      ]);
      let correct = 0;
      for (const [questionId, blockIds] of expected) {
        const actual = mapped.mappings.find((item) => item.questionId === questionId)?.segments.map((item) => item.answerBlockId).sort() || [];
        if (JSON.stringify(actual) === JSON.stringify([...blockIds].sort())) correct += 1;
      }
      const roughUnmatched = mapped.unmatchedAnswers.some((item) => item.answerBlockId === "a-rough");
      results.push({
        model,
        success: true,
        semanticMappingScore: (correct + Number(roughUnmatched)) / 6,
        wallTimeMs: Math.round(performance.now() - started),
        unmatchedCount: mapped.unmatchedAnswers.length,
        metrics: consumeBenchmarkMetrics(),
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
  const report = { generatedAt: new Date().toISOString(), benchmark: "Text-only semantic mapping with all written question labels removed", results };
  const outputDir = path.join(process.cwd(), "benchmarks", "results");
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, "mapping-latest.json"), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(path.join(outputDir, `${report.generatedAt.replace(/[:.]/g, "-")}-mapping.json`), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`MAPPING_BENCHMARK_REPORT ${JSON.stringify(report)}`);
}

function q(id: string, displayNumber: string, text: string, printedOrder: number): Question {
  return { id, displayNumber, normalizedNumber: displayNumber.toLowerCase().replace(/[^a-z0-9]/g, ""), text, pageIndex: 0, printedOrder, maxMarks: 2 };
}

function a(id: string, text: string, pageIndex: number, sequenceIndex: number): ExtractedAnswerBlock {
  const bbox: BoundingBox = { x: .1, y: .1 + (sequenceIndex % 3) * .25, width: .8, height: .1 };
  return { id, detectedQuestionLabel: null, normalizedQuestionLabel: null, text, pageIndex, bbox, sequenceIndex, isPossibleContinuation: false, continuesOnNextPage: false };
}

void main();
