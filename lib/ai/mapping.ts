import { requestStructuredAI } from "@/lib/ai/client";
import { semanticMappingPrompt } from "@/lib/ai/prompts";
import { createDeterministicAssignments, finalizeMappings } from "@/lib/mapping";
import { SemanticMappingResponseSchema } from "@/lib/schemas";
import type { ExtractedAnswerBlock, Question } from "@/lib/types";

export async function mapAnswerBlocks(questions: Question[], answerBlocks: ExtractedAnswerBlock[]) {
  const deterministic = createDeterministicAssignments(questions, answerBlocks);
  if (!deterministic.unresolved.length) {
    return finalizeMappings(questions, answerBlocks, deterministic.assignments);
  }

  const claimed = deterministic.assignments.map((assignment) => ({
    answerBlockId: assignment.blockId,
    questionId: assignment.questionId,
    method: assignment.method,
  }));

  const response = await requestStructuredAI({
    task: "semantic mapping",
    system: semanticMappingPrompt,
    userText: JSON.stringify({
      questions: questions.map(({ id, displayNumber, text }) => ({ id, displayNumber, text })),
      unresolvedAnswerBlocks: deterministic.unresolved.map((block) => ({
        id: block.id,
        text: block.text,
        pageIndex: block.pageIndex,
        sequenceIndex: block.sequenceIndex,
        isPossibleContinuation: block.isPossibleContinuation,
      })),
      alreadyClaimedMappings: claimed,
    }),
    schema: SemanticMappingResponseSchema,
  });

  return finalizeMappings(questions, answerBlocks, deterministic.assignments, response.decisions);
}
