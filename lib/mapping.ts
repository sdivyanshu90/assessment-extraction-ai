import type {
  AnswerSegment,
  ExtractedAnswerBlock,
  MappingMethod,
  Question,
  QuestionMapping,
  UnmatchedAnswer,
} from "@/lib/types";

export type MappingAssignment = {
  blockId: string;
  questionId: string;
  confidence: number;
  method: MappingMethod;
};

export type SemanticDecision = {
  answerBlockId: string;
  decision: "question" | "continuation" | "unmatched";
  questionId: string | null;
  confidence: number;
};

export function createDeterministicAssignments(
  questions: Question[],
  blocks: ExtractedAnswerBlock[],
): { assignments: MappingAssignment[]; unresolved: ExtractedAnswerBlock[] } {
  const byLabel = new Map<string, Question[]>();
  questions.forEach((question) => {
    if (!question.normalizedNumber) return;
    const existing = byLabel.get(question.normalizedNumber) || [];
    existing.push(question);
    byLabel.set(question.normalizedNumber, existing);
  });

  const assignments: MappingAssignment[] = [];
  const assigned = new Map<string, MappingAssignment>();

  for (const block of blocks) {
    const candidates = block.normalizedQuestionLabel
      ? byLabel.get(block.normalizedQuestionLabel) || []
      : [];
    if (candidates.length === 1) {
      const assignment: MappingAssignment = {
        blockId: block.id,
        questionId: candidates[0].id,
        confidence: 0.98,
        method: block.detectedQuestionLabel === candidates[0].displayNumber ? "explicit-label" : "normalized-label",
      };
      assignments.push(assignment);
      assigned.set(block.id, assignment);
      continue;
    }

    if (block.isPossibleContinuation) {
      const previous = blocks
        .filter((candidate) => candidate.sequenceIndex < block.sequenceIndex)
        .sort((a, b) => b.sequenceIndex - a.sequenceIndex)
        .find((candidate) => assigned.has(candidate.id));
      const previousAssignment = previous ? assigned.get(previous.id) : undefined;
      const adjacent = previous &&
        (previous.pageIndex === block.pageIndex || previous.pageIndex + 1 === block.pageIndex);
      if (previousAssignment && adjacent && (previous.continuesOnNextPage || block.pageIndex === previous.pageIndex)) {
        const assignment: MappingAssignment = {
          blockId: block.id,
          questionId: previousAssignment.questionId,
          confidence: previous.continuesOnNextPage ? 0.9 : 0.82,
          method: "continuation",
        };
        assignments.push(assignment);
        assigned.set(block.id, assignment);
      }
    }
  }

  return { assignments, unresolved: blocks.filter((block) => !assigned.has(block.id)) };
}

export function finalizeMappings(
  questions: Question[],
  blocks: ExtractedAnswerBlock[],
  deterministic: MappingAssignment[],
  semantic: SemanticDecision[] = [],
): { mappings: QuestionMapping[]; unmatchedAnswers: UnmatchedAnswer[] } {
  const validQuestions = new Set(questions.map((question) => question.id));
  const validBlocks = new Map(blocks.map((block) => [block.id, block]));
  const assignments = new Map<string, MappingAssignment>();

  deterministic.forEach((item) => {
    if (validQuestions.has(item.questionId) && validBlocks.has(item.blockId)) assignments.set(item.blockId, item);
  });

  for (const decision of semantic) {
    if (assignments.has(decision.answerBlockId) || !validBlocks.has(decision.answerBlockId)) continue;
    if (
      decision.decision !== "unmatched" &&
      decision.questionId &&
      validQuestions.has(decision.questionId) &&
      decision.confidence >= 0.6
    ) {
      assignments.set(decision.answerBlockId, {
        blockId: decision.answerBlockId,
        questionId: decision.questionId,
        confidence: decision.confidence,
        method: decision.decision === "continuation" ? "continuation" : "semantic",
      });
    }
  }

  const mappings = questions.map<QuestionMapping>((question) => {
    const items = blocks
      .map((block) => ({ block, assignment: assignments.get(block.id) }))
      .filter((item) => item.assignment?.questionId === question.id)
      .sort((a, b) => a.block.sequenceIndex - b.block.sequenceIndex);

    const segments: AnswerSegment[] = items.map(({ block }) => ({
      answerBlockId: block.id,
      pageIndex: block.pageIndex,
      bbox: block.bbox,
      text: block.text,
    }));
    const confidences = items.map((item) => item.assignment?.confidence || 0);
    const methods = items.map((item) => item.assignment?.method || "none");
    const primaryMethod = methods.find((method) => method !== "continuation") || methods[0] || "none";

    return {
      questionId: question.id,
      status: segments.length ? "answered" : "unanswered",
      segments,
      combinedAnswer: segments.map((segment) => segment.text).join("\n\n"),
      confidence: confidences.length ? Math.min(...confidences) : 0,
      mappingMethod: primaryMethod,
    };
  });

  const unmatchedAnswers = blocks
    .filter((block) => !assignments.has(block.id))
    .map((block) => ({
      answerBlockId: block.id,
      text: block.text,
      pageIndex: block.pageIndex,
      bbox: block.bbox,
      confidence: semantic.find((item) => item.answerBlockId === block.id)?.confidence || 0,
    }));

  return { mappings, unmatchedAnswers };
}
