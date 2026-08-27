"use client";

import { Check, FileSearch, LoaderCircle } from "lucide-react";

export type ProcessingStage = {
  id: string;
  label: string;
  message: string;
  progress: number;
};

export const PROCESSING_STAGES: ProcessingStage[] = [
  { id: "read", label: "Reading documents", message: "Validating files and preparing pages", progress: 8 },
  { id: "render", label: "Rendering pages", message: "Creating high-resolution document images", progress: 22 },
  { id: "questions", label: "Extracting questions", message: "Preserving printed order, numbering, and sub-parts", progress: 40 },
  { id: "answers", label: "Reading handwritten answers", message: "Locating handwriting and exact answer regions", progress: 58 },
  { id: "mapping", label: "Mapping answers", message: "Matching labels, continuations, and answer meaning", progress: 74 },
  { id: "grading", label: "Generating feedback", message: "Preparing optional AI-assisted review notes", progress: 90 },
  { id: "complete", label: "Complete", message: "Your assessment is ready", progress: 100 },
];

export function ProcessingScreen({ stage, progress }: { stage: string; progress: number }) {
  const currentIndex = Math.max(0, PROCESSING_STAGES.findIndex((item) => item.id === stage));
  const current = PROCESSING_STAGES[currentIndex] || PROCESSING_STAGES[0];
  return (
    <section className="processing-screen" aria-live="polite">
      <div className="processing-card">
        <div className="processing-orbit"><FileSearch /><span /></div>
        <p className="eyebrow">Assessment intelligence</p>
        <h1>{current.label}<span className="animated-dots">...</span></h1>
        <p>{current.message}</p>
        <div className="progress-track" aria-label={`${progress}% complete`}><span style={{ width: `${progress}%` }} /></div>
        <strong className="progress-number">{progress}%</strong>
        <ol className="stage-list">
          {PROCESSING_STAGES.slice(0, -1).map((item, index) => (
            <li key={item.id} className={index < currentIndex ? "done" : index === currentIndex ? "current" : ""}>
              <span>{index < currentIndex ? <Check /> : index === currentIndex ? <LoaderCircle className="spin" /> : index + 1}</span>
              {item.label}
            </li>
          ))}
        </ol>
        <small>Keep this tab open while we securely process your documents.</small>
      </div>
    </section>
  );
}
