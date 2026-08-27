import { describe, expect, it } from "vitest";
import { normalizeQuestionLabel } from "@/lib/normalization";

describe("normalizeQuestionLabel", () => {
  it.each([
    ["Q1", "1"],
    ["1.", "1"],
    ["(1)", "1"],
    ["Question 1", "1"],
    ["11(a)", "11a"],
    ["11 (a)", "11a"],
    ["11-a", "11a"],
    ["Q11(a)", "11a"],
    ["5(ii)", "5ii"],
    ["5 (ii)", "5ii"],
    ["Q 11a", "11a"],
    ["1)", "1"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeQuestionLabel(input)).toBe(expected);
  });

  it("does not collapse meaningful subparts", () => {
    expect(normalizeQuestionLabel("11 (a)")).not.toBe(normalizeQuestionLabel("11 (b)"));
  });
});
