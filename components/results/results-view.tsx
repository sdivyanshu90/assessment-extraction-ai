"use client";

import { ArrowLeft, CheckCircle2, CircleSlash, FileText, Flag, ListChecks, RotateCcw, ScanSearch } from "lucide-react";
import { useMemo, useState } from "react";
import type { AssessmentResult, DocumentPage, HighlightTarget } from "@/lib/types";
import { AnswerViewer } from "./answer-viewer";
import { QuestionList } from "./question-list";

export function ResultsView({
  result,
  pages,
  debug,
  onReset,
}: {
  result: AssessmentResult;
  pages: DocumentPage[];
  debug: boolean;
  onReset: () => void;
}) {
  const [target, setTarget] = useState<HighlightTarget>(() => ({ kind: "question", id: result.questions[0]?.id || "" }));
  const [mobilePane, setMobilePane] = useState<"questions" | "viewer">("questions");
  const answered = result.mappings.filter((item) => item.status === "answered").length;
  const review = result.mappings.filter((item) => item.status === "answered" && item.confidence < 0.85).length + result.unmatchedAnswers.length;
  const score = useMemo(() => {
    const scored = result.grades.filter((grade) => grade.score !== null && grade.maxMarks !== null);
    if (!scored.length) return null;
    return {
      earned: scored.reduce((sum, grade) => sum + (grade.score || 0), 0),
      total: scored.reduce((sum, grade) => sum + (grade.maxMarks || 0), 0),
    };
  }, [result.grades]);

  return (
    <div className="results-view">
      <header className="results-header">
        <div><button onClick={onReset}><ArrowLeft /></button><span><small>Assessment result</small><strong>Question & answer mapping</strong></span></div>
        <div className="summary-strip">
          <span><ListChecks /><small>Questions</small><strong>{result.questions.length}</strong></span>
          <span><CheckCircle2 /><small>Answered</small><strong>{answered}</strong></span>
          <span><CircleSlash /><small>Unanswered</small><strong>{result.questions.length - answered}</strong></span>
          <span className={review ? "needs-review" : ""}><Flag /><small>Review</small><strong>{review}</strong></span>
          {score && <span><small>AI score</small><strong>{score.earned}/{score.total}</strong></span>}
        </div>
        <button className="new-assessment" onClick={onReset}><RotateCcw /> New assessment</button>
      </header>
      {result.warnings.map((warning) => <div className="results-warning" role="status" key={warning}>{warning}</div>)}
      <nav className="mobile-result-tabs" aria-label="Result view">
        <button className={mobilePane === "questions" ? "active" : ""} onClick={() => setMobilePane("questions")}><FileText /> Questions</button>
        <button className={mobilePane === "viewer" ? "active" : ""} onClick={() => setMobilePane("viewer")}><ScanSearch /> Answer sheet</button>
      </nav>
      <div className={`results-grid mobile-pane-${mobilePane}`}>
        <QuestionList result={result} target={target} onSelect={setTarget} />
        <AnswerViewer result={result} pages={pages} target={target} debug={debug} />
      </div>
    </div>
  );
}
