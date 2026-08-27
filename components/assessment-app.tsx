"use client";

import { ArrowRight, FlaskConical, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ProcessingScreen } from "@/components/processing-screen";
import { ResultsView } from "@/components/results/results-view";
import { FileDropzone } from "@/components/upload/file-dropzone";
import { renderDocumentFiles } from "@/lib/client/documents";
import { demoAssessment } from "@/lib/demo";
import { createDeterministicAssignments, finalizeMappings } from "@/lib/mapping";
import { makeStableId } from "@/lib/normalization";
import type { AssessmentResult, DocumentPage, ExtractedAnswerBlock, GradeResult, Question, QuestionMapping, UnmatchedAnswer } from "@/lib/types";

type View = "upload" | "processing" | "results";

export function AssessmentApp() {
  const [view, setView] = useState<View>("upload");
  const [questionFiles, setQuestionFiles] = useState<File[]>([]);
  const [answerFiles, setAnswerFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState("read");
  const [progress, setProgress] = useState(8);
  const [answerPages, setAnswerPages] = useState<DocumentPage[]>([]);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [debug] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "1");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const preview = new URLSearchParams(window.location.search).get("preview");
      if (preview === "processing") {
        setStage("mapping");
        setProgress(74);
        setView("processing");
      } else if (preview === "results") {
        setAnswerPages(demoAssessment.pages);
        setResult(demoAssessment.result);
        setView("results");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const reset = () => {
    setView("upload");
    setQuestionFiles([]);
    setAnswerFiles([]);
    setAnswerPages([]);
    setResult(null);
    setError(null);
    setProgress(8);
    setStage("read");
  };

  const loadDemo = () => {
    setAnswerPages(demoAssessment.pages);
    setResult(demoAssessment.result);
    setView("results");
  };

  const processAssessment = async () => {
    if (!questionFiles.length || !answerFiles.length) return;
    setError(null);
    setView("processing");
    setStage("read");
    setProgress(8);

    try {
      setStage("render");
      setProgress(16);
      const [questionPages, renderedAnswerPages] = await Promise.all([
        renderDocumentFiles(questionFiles),
        renderDocumentFiles(answerFiles),
      ]);
      setAnswerPages(renderedAnswerPages);
      setProgress(26);

      setStage("questions");
      setProgress(36);
      let extractionCompleted = 0;
      const questionRequest = extractQuestionBatches(questionPages)
        .then((value) => { extractionCompleted += 1; setProgress(extractionCompleted === 2 ? 64 : 49); return value; });
      const answerRequest = extractAnswerBatches(renderedAnswerPages)
        .then((value) => { extractionCompleted += 1; setStage("answers"); setProgress(extractionCompleted === 2 ? 64 : 54); return value; });

      const [questionOutcome, answerOutcome] = await Promise.allSettled([questionRequest, answerRequest]);
      if (questionOutcome.status === "rejected") throw questionOutcome.reason;
      const questions = questionOutcome.value;
      const warnings: string[] = [];
      let answerBlocks: ExtractedAnswerBlock[] = [];
      if (answerOutcome.status === "fulfilled") {
        answerBlocks = answerOutcome.value;
        if (!answerBlocks.length) warnings.push("No handwriting was detected. All questions are shown for manual review.");
      } else {
        warnings.push(`Handwriting extraction was unavailable: ${errorMessage(answerOutcome.reason)}`);
      }

      setStage("mapping");
      setProgress(74);
      let mappings: QuestionMapping[];
      let unmatchedAnswers: UnmatchedAnswer[];
      try {
        const mapped = await postJson<{ mappings: QuestionMapping[]; unmatchedAnswers: UnmatchedAnswer[] }>("/api/map", { questions, answerBlocks });
        mappings = mapped.mappings;
        unmatchedAnswers = mapped.unmatchedAnswers;
      } catch (mappingError) {
        const deterministic = createDeterministicAssignments(questions, answerBlocks);
        const fallback = finalizeMappings(questions, answerBlocks, deterministic.assignments);
        mappings = fallback.mappings;
        unmatchedAnswers = fallback.unmatchedAnswers;
        warnings.push(`Semantic mapping was unavailable; reliable written labels were still matched. ${errorMessage(mappingError)}`);
      }

      setStage("grading");
      setProgress(90);
      let grades: GradeResult[] = [];
      try {
        grades = (await postJson<{ grades: GradeResult[] }>("/api/grade", { questions, mappings })).grades;
      } catch (gradingError) {
        warnings.push(`AI grading was unavailable, but extraction and mapping completed. ${errorMessage(gradingError)}`);
      }

      setStage("complete");
      setProgress(100);
      setResult({ questions, answerBlocks, mappings, unmatchedAnswers, grades, warnings });
      window.setTimeout(() => setView("results"), 350);
    } catch (processingError) {
      setError(errorMessage(processingError));
      setView("upload");
    }
  };

  if (view === "results" && result) {
    return <AppShell compact><ResultsView result={result} pages={answerPages} debug={debug} onReset={reset} /></AppShell>;
  }

  return (
    <AppShell>
      {view === "processing" ? <ProcessingScreen stage={stage} progress={progress} /> : (
        <section className="upload-screen">
          <div className="upload-heading">
            <div className="teacher-illustration"><span><Sparkles /></span><strong>AI</strong></div>
            <p className="eyebrow">AI Teacher&apos;s Toolkit</p>
            <h1>Upload <em>Question Paper &amp; Answer Sheets</em></h1>
            <p>Map every handwritten response to its question and review it in the original document.</p>
            <div className="workflow-pills" aria-label="Assessment workflow">
              <span><b>1</b> Upload documents</span><i />
              <span><b>2</b> AI extraction</span><i />
              <span><b>3</b> Review mapping</span>
            </div>
          </div>
          <div className="upload-card">
            <FileDropzone id="question-paper" title="Question Paper" accent="#f06449" files={questionFiles} onChange={setQuestionFiles} onError={setError} />
            <FileDropzone id="answer-sheet" title="Answer Sheet" accent="#f06449" files={answerFiles} onChange={setAnswerFiles} onError={setError} />
          </div>
          {error && <div className="upload-error" role="alert">{error}</div>}
          <button className="primary-action" disabled={!questionFiles.length || !answerFiles.length} onClick={processAssessment}>
            Process Assessment <ArrowRight />
          </button>
          <div className="privacy-note"><ShieldCheck /> Files are processed in memory and are not stored by this application.</div>
          <button className="demo-link" onClick={loadDemo}><FlaskConical /> Explore a sample result</button>
        </section>
      )}
    </AppShell>
  );
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(payload.error || `Request failed with status ${response.status}`);
  return payload as T;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Processing failed. Please try again.";
}

// Keeps each Vercel request safely below the platform payload ceiling while
// preserving adjacent pages together whenever their rendered size allows it.
function pageBatches(pages: DocumentPage[], maxCharacters = 3_100_000): DocumentPage[][] {
  const batches: DocumentPage[][] = [];
  let current: DocumentPage[] = [];
  let size = 0;
  for (const page of pages) {
    if (current.length && size + page.dataUrl.length > maxCharacters) {
      batches.push(current);
      current = [];
      size = 0;
    }
    current.push(page);
    size += page.dataUrl.length;
  }
  if (current.length) batches.push(current);
  return batches;
}

async function extractQuestionBatches(pages: DocumentPage[]): Promise<Question[]> {
  const all: Question[] = [];
  for (const batch of pageBatches(pages)) {
    const response = await postJson<{ questions: Question[] }>("/api/extract/questions", { pages: batch });
    all.push(...response.questions);
  }
  return all
    .sort((a, b) => a.pageIndex - b.pageIndex || a.printedOrder - b.printedOrder)
    .map((item, printedOrder) => ({
      ...item,
      id: makeStableId("q", printedOrder + 1, item.displayNumber),
      printedOrder,
    }));
}

async function extractAnswerBatches(pages: DocumentPage[]): Promise<ExtractedAnswerBlock[]> {
  const all: ExtractedAnswerBlock[] = [];
  for (const batch of pageBatches(pages)) {
    const response = await postJson<{ answerBlocks: ExtractedAnswerBlock[] }>("/api/extract/answers", { pages: batch });
    all.push(...response.answerBlocks);
  }
  return all
    .sort((a, b) => a.pageIndex - b.pageIndex || a.sequenceIndex - b.sequenceIndex)
    .map((item, sequenceIndex) => ({
      ...item,
      id: makeStableId("a", sequenceIndex + 1, item.pageIndex),
      sequenceIndex,
    }));
}
