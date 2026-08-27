import { requestStructuredAI } from "@/lib/ai/client";
import { gradingPrompt } from "@/lib/ai/prompts";
import { GradeResponseSchema } from "@/lib/schemas";
import type { GradeResult, Question, QuestionMapping } from "@/lib/types";

export async function gradeMappedAnswers(
  questions: Question[],
  mappings: QuestionMapping[],
): Promise<GradeResult[]> {
  const answered = mappings.filter((mapping) => mapping.status === "answered");
  if (!answered.length) return [];

  const questionMap = new Map(questions.map((question) => [question.id, question]));
  const response = await requestStructuredAI({
    task: "grading",
    system: gradingPrompt,
    userText: JSON.stringify({
      items: answered.map((mapping) => {
        const question = questionMap.get(mapping.questionId);
        return {
          questionId: mapping.questionId,
          question: question?.text,
          maxMarks: question?.maxMarks ?? null,
          studentAnswer: mapping.combinedAnswer,
        };
      }),
    }),
    schema: GradeResponseSchema,
  });

  const validQuestionIds = new Set(answered.map((mapping) => mapping.questionId));
  return response.grades.filter((grade) => validQuestionIds.has(grade.questionId)).map((grade) => {
    const sourceMax = questionMap.get(grade.questionId)?.maxMarks ?? null;
    return {
      ...grade,
      maxMarks: sourceMax,
      score: sourceMax === null ? null : Math.min(sourceMax, grade.score ?? 0),
    };
  });
}
