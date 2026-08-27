import { describe, expect, it } from "vitest";
import { createDeterministicAssignments, finalizeMappings } from "@/lib/mapping";
import type { ExtractedAnswerBlock, Question } from "@/lib/types";

const question = (id: string, displayNumber: string, order: number): Question => ({
  id,
  displayNumber,
  normalizedNumber: displayNumber.toLowerCase().replace(/[^a-z0-9]/g, ""),
  text: `Question ${displayNumber}`,
  pageIndex: 0,
  printedOrder: order,
  maxMarks: 2,
});

const block = (
  id: string,
  label: string | null,
  sequenceIndex: number,
  pageIndex = 0,
  continuation = false,
  continuesOnNextPage = false,
): ExtractedAnswerBlock => ({
  id,
  detectedQuestionLabel: label,
  normalizedQuestionLabel: label?.toLowerCase().replace(/^q/, "").replace(/[^a-z0-9]/g, "") || null,
  text: `Answer ${id}`,
  pageIndex,
  bbox: { x: 0.1, y: 0.1 + sequenceIndex * 0.1, width: 0.7, height: 0.08 },
  sequenceIndex,
  isPossibleContinuation: continuation,
  continuesOnNextPage,
});

describe("layered answer mapping", () => {
  it("maps exact and normalized labels even when answers are out of order", () => {
    const questions = [question("q1", "1", 0), question("q2", "2", 1), question("q3", "3", 2)];
    const blocks = [block("a3", "Q3", 0), block("a1", "1", 1)];
    const deterministic = createDeterministicAssignments(questions, blocks);
    const result = finalizeMappings(questions, blocks, deterministic.assignments);
    expect(result.mappings.find((item) => item.questionId === "q3")?.segments[0].answerBlockId).toBe("a3");
    expect(result.mappings.find((item) => item.questionId === "q1")?.segments[0].answerBlockId).toBe("a1");
    expect(result.mappings.find((item) => item.questionId === "q2")?.status).toBe("unanswered");
  });

  it("keeps labelled sub-parts separate", () => {
    const questions = [question("qa", "11a", 0), question("qb", "11b", 1)];
    const blocks = [block("aa", "Q11(a)", 0), block("ab", "11b", 1)];
    const deterministic = createDeterministicAssignments(questions, blocks);
    expect(deterministic.assignments.map((item) => item.questionId)).toEqual(["qa", "qb"]);
  });

  it("joins an explicit answer and its next-page continuation as multiple segments", () => {
    const questions = [question("q7", "7", 0)];
    const blocks = [block("first", "7", 0, 1, false, true), block("continued", null, 1, 2, true)];
    const deterministic = createDeterministicAssignments(questions, blocks);
    const result = finalizeMappings(questions, blocks, deterministic.assignments);
    expect(result.mappings[0].segments.map((item) => item.pageIndex)).toEqual([1, 2]);
    expect(result.mappings[0].segments).toHaveLength(2);
  });

  it("retains unlabelled content as unmatched when semantic confidence is low", () => {
    const questions = [question("q1", "1", 0)];
    const blocks = [block("rough", null, 0)];
    const result = finalizeMappings(questions, blocks, [], [{ answerBlockId: "rough", decision: "unmatched", questionId: null, confidence: 0.35 }]);
    expect(result.unmatchedAnswers[0].answerBlockId).toBe("rough");
    expect(result.mappings[0].status).toBe("unanswered");
  });

  it("rejects invalid AI references without losing the answer block", () => {
    const questions = [question("q1", "1", 0)];
    const blocks = [block("a1", null, 0)];
    const result = finalizeMappings(questions, blocks, [], [{ answerBlockId: "a1", decision: "question", questionId: "does-not-exist", confidence: 0.99 }]);
    expect(result.unmatchedAnswers).toHaveLength(1);
  });

  it("does not deterministically claim ambiguous duplicate labels", () => {
    const questions = [question("q1a", "1", 0), question("q1b", "1", 1)];
    const blocks = [block("a1", "1", 0)];
    const deterministic = createDeterministicAssignments(questions, blocks);
    expect(deterministic.assignments).toHaveLength(0);
    expect(deterministic.unresolved).toHaveLength(1);
  });

  it("accepts a valid semantic mapping above threshold", () => {
    const questions = [question("q1", "1", 0)];
    const blocks = [block("a1", null, 0)];
    const result = finalizeMappings(questions, blocks, [], [{ answerBlockId: "a1", decision: "question", questionId: "q1", confidence: 0.79 }]);
    expect(result.mappings[0]).toMatchObject({ status: "answered", mappingMethod: "semantic", confidence: 0.79 });
  });
});
