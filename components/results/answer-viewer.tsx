"use client";

import { Minus, Plus, ScanSearch } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { boxToPercentStyle } from "@/lib/bbox";
import type { AssessmentResult, BoundingBox, DocumentPage, HighlightTarget } from "@/lib/types";

type ActiveSegment = { key: string; pageIndex: number; bbox: BoundingBox };

export function AnswerViewer({
  pages,
  result,
  target,
  debug,
}: {
  pages: DocumentPage[];
  result: AssessmentResult;
  target: HighlightTarget;
  debug: boolean;
}) {
  const [zoom, setZoom] = useState(100);
  const segmentRefs = useRef(new Map<string, HTMLDivElement>());

  const active = useMemo<ActiveSegment[]>(() => {
    if (target.kind === "question") {
      const mapping = result.mappings.find((item) => item.questionId === target.id);
      return (mapping?.segments || []).map((segment) => ({
        key: segment.answerBlockId,
        pageIndex: segment.pageIndex,
        bbox: segment.bbox,
      }));
    }
    const unmatched = result.unmatchedAnswers.find((item) => item.answerBlockId === target.id);
    return unmatched ? [{ key: unmatched.answerBlockId, pageIndex: unmatched.pageIndex, bbox: unmatched.bbox }] : [];
  }, [result, target]);

  useEffect(() => {
    if (!active.length) return;
    const timer = window.setTimeout(() => {
      segmentRefs.current.get(active[0].key)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [active]);

  const activeByPage = new Map<number, ActiveSegment[]>();
  active.forEach((segment) => activeByPage.set(segment.pageIndex, [...(activeByPage.get(segment.pageIndex) || []), segment]));

  return (
    <section className="viewer-panel" aria-label="Answer sheet document viewer">
      <header className="viewer-toolbar">
        <div><ScanSearch /><span><strong>Answer Sheet</strong><small>{pages.length} page{pages.length === 1 ? "" : "s"}</small></span></div>
        <div className="zoom-controls">
          <button aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(70, value - 10))}><Minus /></button>
          <span>{zoom}%</span>
          <button aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(150, value + 10))}><Plus /></button>
        </div>
      </header>
      <div className="viewer-scroll">
        {!active.length && <div className="viewer-empty-hint">This question has no mapped handwriting region.</div>}
        {pages.map((page) => {
          const pageActive = activeByPage.get(page.pageIndex) || [];
          return (
            <figure className="document-page-wrap" key={`${page.sourceName}-${page.pageIndex}`}>
              <figcaption>Page {page.pageIndex + 1}</figcaption>
              <div
                className="document-page"
                style={{ width: `${zoom}%`, aspectRatio: `${page.width} / ${page.height}` }}
              >
                {/* A data URL is required here because pages are rendered locally and are never persisted. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={page.dataUrl} alt={`Student answer sheet page ${page.pageIndex + 1}`} />
                {pageActive.map((segment, index) => (
                  <div
                    key={segment.key}
                    ref={(node) => {
                      if (node) segmentRefs.current.set(segment.key, node);
                      else segmentRefs.current.delete(segment.key);
                    }}
                    className="answer-highlight active-highlight"
                    style={boxToPercentStyle(segment.bbox)}
                    aria-label={`Selected answer region ${index + 1} of ${active.length}`}
                  ><span>{active.length > 1 ? `${index + 1}/${active.length}` : "Answer"}</span></div>
                ))}
                {debug && result.answerBlocks
                  .filter((block) => block.pageIndex === page.pageIndex && !pageActive.some((item) => item.key === block.id))
                  .map((block) => (
                    <div className="answer-highlight debug-highlight" style={boxToPercentStyle(block.bbox)} key={block.id}>
                      <span>{block.id}</span>
                    </div>
                  ))}
              </div>
            </figure>
          );
        })}
      </div>
    </section>
  );
}
