import { describe, expect, it } from "vitest";
import { orderByDocumentPosition } from "@/lib/ordering";

describe("document ordering", () => {
  it("preserves visual page order instead of sorting by question number", () => {
    const ordered = orderByDocumentPosition([
      { label: "2", pageIndex: 1, orderOnPage: 0 },
      { label: "10", pageIndex: 0, orderOnPage: 1 },
      { label: "Section A – 1", pageIndex: 0, orderOnPage: 0 },
    ]);
    expect(ordered.map((item) => item.label)).toEqual(["Section A – 1", "10", "2"]);
  });
});
