export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DocumentPage = {
  pageIndex: number;
  dataUrl: string;
  width: number;
  height: number;
  sourceName: string;
};

export type Question = {
  id: string;
  displayNumber: string;
  normalizedNumber: string;
  text: string;
  pageIndex: number;
  bbox?: BoundingBox;
  printedOrder: number;
  maxMarks: number | null;
};

export type ExtractedAnswerBlock = {
  id: string;
  detectedQuestionLabel: string | null;
  normalizedQuestionLabel: string | null;
  text: string;
  pageIndex: number;
  bbox: BoundingBox;
  sequenceIndex: number;
  isPossibleContinuation: boolean;
  continuesOnNextPage: boolean;
};

export type AnswerSegment = {
  answerBlockId: string;
  pageIndex: number;
  bbox: BoundingBox;
  text: string;
};

export type MappingMethod =
  | "explicit-label"
  | "normalized-label"
  | "semantic"
  | "continuation"
  | "none";

export type QuestionMapping = {
  questionId: string;
  status: "answered" | "unanswered";
  segments: AnswerSegment[];
  combinedAnswer: string;
  confidence: number;
  mappingMethod: MappingMethod;
};

export type UnmatchedAnswer = {
  answerBlockId: string;
  text: string;
  pageIndex: number;
  bbox: BoundingBox;
  confidence: number;
};

export type GradeResult = {
  questionId: string;
  score: number | null;
  maxMarks: number | null;
  correctness: "correct" | "partially-correct" | "incorrect" | "not-graded";
  feedback: string;
  confidence: number;
};

export type AssessmentResult = {
  questions: Question[];
  answerBlocks: ExtractedAnswerBlock[];
  mappings: QuestionMapping[];
  unmatchedAnswers: UnmatchedAnswer[];
  grades: GradeResult[];
  warnings: string[];
};

export type HighlightTarget =
  | { kind: "question"; id: string }
  | { kind: "unmatched"; id: string };
