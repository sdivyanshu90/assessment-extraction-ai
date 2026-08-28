"use client";

import { AlertTriangle, Check, CircleSlash, Link2Off, Sparkles } from "lucide-react";
import type { AssessmentResult, HighlightTarget } from "@/lib/types";

export function QuestionList({
  result,
  target,
  onSelect,
}: {
  result: AssessmentResult;
  target: HighlightTarget;
  onSelect: (target: HighlightTarget) => void;
}) {
  const mappingMap = new Map(result.mappings.map((mapping) => [mapping.questionId, mapping]));
  const gradeMap = new Map(result.grades.map((grade) => [grade.questionId, grade]));

  return (
    <aside className="question-list-panel" aria-label="Extracted questions">
      <div className="question-list-heading">
        <span>Extracted Questions <i>(from question paper)</i></span><strong>{result.questions.length}</strong>
      </div>
      <div className="question-list-scroll">
        {result.questions.map((question) => {
          const mapping = mappingMap.get(question.id)!;
          const grade = gradeMap.get(question.id);
          const needsReview = mapping.status === "answered" && mapping.confidence < 0.85;
          const selected = target.kind === "question" && target.id === question.id;
          return (
            <button
              key={question.id}
              className={`question-row ${selected ? "selected" : ""}`}
              onClick={() => onSelect({ kind: "question", id: question.id })}
              aria-current={selected ? "true" : undefined}
            >
              <span className="question-number">{question.displayNumber}</span>
              <span className="question-preview"><strong>{question.text}</strong><small>
                {mapping.status === "unanswered" ? <><CircleSlash /> Unanswered</> : needsReview ? <><AlertTriangle /> Needs review</> : <><Check /> Answered</>}
              </small>
              {selected && mapping.status === "answered" && (
                <span className="selected-answer-preview">
                  <span><Sparkles /> AI Feedback</span>
                  <q>{grade?.feedback || `Mapped confidently to ${mapping.segments.length} answer region${mapping.segments.length === 1 ? "" : "s"}.`}</q>
                </span>
              )}</span>
              {grade && grade.score !== null && grade.maxMarks !== null && <span className="score-chip">{grade.score}/{grade.maxMarks}</span>}
            </button>
          );
        })}
        {!!result.unmatchedAnswers.length && (
          <div className="unmatched-section">
            <h3><Link2Off /> Unmatched answers <span>{result.unmatchedAnswers.length}</span></h3>
            {result.unmatchedAnswers.map((answer) => (
              <button
                key={answer.answerBlockId}
                className={target.kind === "unmatched" && target.id === answer.answerBlockId ? "selected" : ""}
                onClick={() => onSelect({ kind: "unmatched", id: answer.answerBlockId })}
              >
                <strong>Page {answer.pageIndex + 1}</strong>
                <span>{answer.text}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
