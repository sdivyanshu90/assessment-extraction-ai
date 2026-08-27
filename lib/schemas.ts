import { z } from "zod";

const finite = z.number().finite();

export const BoundingBoxSchema = z
  .object({
    x: finite.min(0).max(1),
    y: finite.min(0).max(1),
    width: finite.positive().max(1),
    height: finite.positive().max(1),
  })
  .refine((box) => box.x + box.width <= 1.001 && box.y + box.height <= 1.001, {
    message: "Bounding box extends beyond the page",
  });

export const RawQuestionSchema = z.object({
  displayNumber: z.string().min(1).max(80),
  text: z.string().min(1).max(12000),
  pageIndex: z.number().int().nonnegative(),
  bbox: BoundingBoxSchema.optional(),
  orderOnPage: z.number().int().nonnegative(),
  maxMarks: z.number().nonnegative().nullable(),
});

export const RawQuestionsResponseSchema = z.object({
  questions: z.array(RawQuestionSchema).max(300),
});

export const RawAnswerBlockSchema = z.object({
  detectedQuestionLabel: z.string().max(80).nullable(),
  text: z.string().min(1).max(20000),
  pageIndex: z.number().int().nonnegative(),
  bbox: BoundingBoxSchema,
  orderOnPage: z.number().int().nonnegative(),
  isPossibleContinuation: z.boolean(),
  continuesOnNextPage: z.boolean(),
});

export const RawAnswersResponseSchema = z.object({
  answerBlocks: z.array(RawAnswerBlockSchema).max(500),
});

export const SemanticDecisionSchema = z.object({
  answerBlockId: z.string().min(1),
  decision: z.enum(["question", "continuation", "unmatched"]),
  questionId: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  reason: z.string().max(300),
});

export const SemanticMappingResponseSchema = z.object({
  decisions: z.array(SemanticDecisionSchema),
});

export const GradeItemSchema = z.object({
  questionId: z.string().min(1),
  score: z.number().nonnegative().nullable(),
  maxMarks: z.number().nonnegative().nullable(),
  correctness: z.enum(["correct", "partially-correct", "incorrect", "not-graded"]),
  feedback: z.string().max(1000),
  confidence: z.number().min(0).max(1),
});

export const GradeResponseSchema = z.object({ grades: z.array(GradeItemSchema) });

export const PageInputSchema = z.object({
  pageIndex: z.number().int().nonnegative(),
  dataUrl: z.string().startsWith("data:image/").max(6_000_000),
  width: z.number().int().positive().max(10000),
  height: z.number().int().positive().max(10000),
  sourceName: z.string().max(300),
});

export const PagesRequestSchema = z.object({ pages: z.array(PageInputSchema).min(1).max(16) });

export const QuestionSchema = z.object({
  id: z.string().min(1),
  displayNumber: z.string().min(1),
  normalizedNumber: z.string(),
  text: z.string().min(1),
  pageIndex: z.number().int().nonnegative(),
  bbox: BoundingBoxSchema.optional(),
  printedOrder: z.number().int().nonnegative(),
  maxMarks: z.number().nonnegative().nullable(),
});

export const AnswerBlockSchema = z.object({
  id: z.string().min(1),
  detectedQuestionLabel: z.string().nullable(),
  normalizedQuestionLabel: z.string().nullable(),
  text: z.string().min(1),
  pageIndex: z.number().int().nonnegative(),
  bbox: BoundingBoxSchema,
  sequenceIndex: z.number().int().nonnegative(),
  isPossibleContinuation: z.boolean(),
  continuesOnNextPage: z.boolean(),
});

export const AnswerSegmentSchema = z.object({
  answerBlockId: z.string().min(1),
  pageIndex: z.number().int().nonnegative(),
  bbox: BoundingBoxSchema,
  text: z.string(),
});

export const QuestionMappingSchema = z.object({
  questionId: z.string().min(1),
  status: z.enum(["answered", "unanswered"]),
  segments: z.array(AnswerSegmentSchema),
  combinedAnswer: z.string(),
  confidence: z.number().min(0).max(1),
  mappingMethod: z.enum(["explicit-label", "normalized-label", "semantic", "continuation", "none"]),
});

export const MappingRequestSchema = z.object({
  questions: z.array(QuestionSchema).min(1).max(300),
  answerBlocks: z.array(AnswerBlockSchema).max(500),
});

export const GradeRequestSchema = z.object({
  questions: z.array(QuestionSchema).min(1).max(300),
  mappings: z.array(QuestionMappingSchema).max(300),
});
