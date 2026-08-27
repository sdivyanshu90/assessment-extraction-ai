import { describe, expect, it } from "vitest";
import { boxFromThousandCoordinates, boxToPercentStyle, clampBoundingBox } from "@/lib/bbox";

describe("bounding boxes", () => {
  it("converts model y/x coordinates to normalized x/y coordinates", () => {
    expect(boxFromThousandCoordinates([100, 200, 400, 800])).toEqual({
      x: 0.2,
      y: 0.1,
      width: 0.6,
      height: 0.3,
    });
  });

  it("clamps boxes to page bounds", () => {
    expect(clampBoundingBox({ x: -0.2, y: 0.9, width: 1.3, height: 0.5 })).toEqual({
      x: 0,
      y: 0.9,
      width: 1,
      height: 0.09999999999999998,
    });
  });

  it("uses percentages so overlays resize with the document", () => {
    expect(boxToPercentStyle({ x: 0.1, y: 0.2, width: 0.3, height: 0.4 })).toEqual({
      left: "10%",
      top: "20%",
      width: "30%",
      height: "40%",
    });
  });
});
