"use client";

import { AlertCircle, Bot, CheckCircle2, FileQuestion, Link2Off, MapPin } from "lucide-react";
import type { AssessmentResult, HighlightTarget } from "@/lib/types";

export function QuestionDetail({ result, target, debug }: { result: AssessmentResult; target: HighlightTarget; debug: boolean }) {
  if (target.kind === "unmatched") {
    const answer = result.unmatchedAnswers.find((item) => item.answerBlockId === target.id);
    return (
      <section className="detail-panel">
        <div className="detail-status review"><Link2Off /> Unmatched answer</div>
        <h2>Answer region on page {(answer?.pageIndex ?? 0) + 1}</h2>
        <p className="detail-intro">The model could not connect this handwriting to a question reliably. It remains visible for teacher review.</p>
        <div className="answer-card"><span>Extracted handwriting</span><p>{answer?.text}</p></div>
        <div className="confidence-note"><AlertCircle /> No answer was forced into an uncertain match.</div>
      </section>
    );
  }

  const question = result.questions.find((item) => item.id === target.id)!;
  const mapping = result.mappings.find((item) => item.questionId === target.id)!;
  const grade = result.grades.find((item) => item.questionId === target.id);
  const answered = mapping.status === "answered";

  return (
    <section className="detail-panel">
      <div className={`detail-status ${answered ? mapping.confidence < 0.85 ? "review" : "answered" : "unanswered"}`}>
        {answered ? mapping.confidence < 0.85 ? <AlertCircle /> : <CheckCircle2 /> : <FileQuestion />}
        {answered ? mapping.confidence < 0.85 ? "Needs mapping review" : "Answered" : "Not answered"}
      </div>
      <div className="question-title-line">
        <span>{question.displayNumber}</span>
        {grade && grade.score !== null && grade.maxMarks !== null && <strong>{grade.score} / {grade.maxMarks}</strong>}
      </div>
      <h2>{question.text}</h2>
      {answered ? (
        <>
          <div className="answer-card"><span>Student answer · {mapping.segments.length} region{mapping.segments.length === 1 ? "" : "s"}</span><p>{mapping.combinedAnswer}</p></div>
          {grade?.feedback && <div className="feedback-card"><div><Bot /> <strong>AI-assisted feedback</strong></div><p>{grade.feedback}</p></div>}
          <div className="source-note"><MapPin /> Clicked question highlights {mapping.segments.length > 1 ? "all mapped regions" : "the exact mapped region"} in the source document.</div>
          {mapping.confidence < 0.85 && <div className="confidence-note"><AlertCircle /> Review suggested · {Math.round(mapping.confidence * 100)}% mapping confidence</div>}
        </>
      ) : (
        <div className="unanswered-card"><FileQuestion /><div><strong>No answer was mapped</strong><p>The student may have skipped this question, or the writing could not be matched reliably.</p></div></div>
      )}
      {debug && <pre className="debug-data">{JSON.stringify({ questionId: question.id, normalizedNumber: question.normalizedNumber, mappingMethod: mapping.mappingMethod, confidence: mapping.confidence, segments: mapping.segments }, null, 2)}</pre>}
    </section>
  );
}
