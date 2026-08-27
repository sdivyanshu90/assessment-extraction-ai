import type { BoundingBox } from "@/lib/types";

export function clampBoundingBox(box: BoundingBox): BoundingBox {
  const x = clamp(box.x);
  const y = clamp(box.y);
  return {
    x,
    y,
    width: Math.max(0.001, Math.min(1 - x, box.width)),
    height: Math.max(0.001, Math.min(1 - y, box.height)),
  };
}

export function boxFromThousandCoordinates(values: [number, number, number, number]): BoundingBox {
  const [yMin, xMin, yMax, xMax] = values.map((value) => Math.max(0, Math.min(1000, value)));
  return clampBoundingBox({
    x: xMin / 1000,
    y: yMin / 1000,
    width: Math.max(1, xMax - xMin) / 1000,
    height: Math.max(1, yMax - yMin) / 1000,
  });
}

export function boxToPercentStyle(box: BoundingBox) {
  const safe = clampBoundingBox(box);
  return {
    left: `${safe.x * 100}%`,
    top: `${safe.y * 100}%`,
    width: `${safe.width * 100}%`,
    height: `${safe.height * 100}%`,
  };
}

const clamp = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
