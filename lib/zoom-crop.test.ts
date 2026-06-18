import { describe, expect, it } from "vitest";
import {
  computeContainLayout,
  computeZoomFrame,
  containerPointToCrop,
  getVisibleSourceRect,
  panCrop,
} from "./zoom-crop";
import type { Crop } from "./types";

const natural = { width: 1600, height: 1200 };
const crop = { x: 0.5, y: 0.35, scale: 5 };

describe("getVisibleSourceRect", () => {
  it("centers on the focal point", () => {
    const rect = getVisibleSourceRect(natural, crop);
    expect(rect.sw).toBe(320);
    expect(rect.sh).toBe(240);
    expect(rect.sx + rect.sw / 2).toBeCloseTo(800, 5);
    expect(rect.sy + rect.sh / 2).toBeCloseTo(420, 5);
  });
});

describe("computeZoomFrame", () => {
  function decodedSource(
    container: { width: number; height: number },
    natural: { width: number; height: number },
    frame: { left: number; top: number; width: number; height: number },
    zoom: Crop,
  ) {
    const scale = frame.width / natural.width;
    const sw = natural.width / zoom.scale;
    const sh = natural.height / zoom.scale;
    const viewportLeft = (container.width - sw * scale) / 2;
    const viewportTop = (container.height - sh * scale) / 2;
    return {
      sx: (viewportLeft - frame.left) / scale,
      sy: (viewportTop - frame.top) / scale,
      sw,
      sh,
    };
  }

  it("shows the same source region in different container sizes", () => {
    const wide = { width: 400, height: 120 };
    const tall = { width: 400, height: 500 };
    const source = getVisibleSourceRect(natural, crop);

    const wideFrame = computeZoomFrame(wide, natural, crop)!;
    const tallFrame = computeZoomFrame(tall, natural, crop)!;

    const wideDecoded = decodedSource(wide, natural, wideFrame, crop);
    const tallDecoded = decodedSource(tall, natural, tallFrame, crop);

    for (const decoded of [wideDecoded, tallDecoded]) {
      expect(decoded.sx).toBeCloseTo(source.sx, 4);
      expect(decoded.sy).toBeCloseTo(source.sy, 4);
      expect(decoded.sw).toBeCloseTo(source.sw, 4);
      expect(decoded.sh).toBeCloseTo(source.sh, 4);
    }
  });

  it("centers the viewport on the focal point", () => {
    const container = { width: 400, height: 300 };
    const focal = containerPointToCrop(container, natural, 260, 110);
    const zoomed = { ...focal, scale: 5 };
    const frame = computeZoomFrame(container, natural, zoomed)!;
    const scale = frame.width / natural.width;

    const focalX = frame.left + focal.x * natural.width * scale;
    const focalY = frame.top + focal.y * natural.height * scale;

    expect(focalX).toBeCloseTo(container.width / 2, 1);
    expect(focalY).toBeCloseTo(container.height / 2, 1);
  });
});

describe("computeContainLayout", () => {
  it("fits the entire image in a wide container", () => {
    const container = { width: 400, height: 176 };
    const layout = computeContainLayout(container, natural)!;
    expect(layout.height).toBe(176);
    expect(layout.width).toBeCloseTo(234.67, 1);
    expect(layout.left).toBeCloseTo(82.67, 0);
    expect(layout.top).toBe(0);
  });
});

describe("containerPointToCrop", () => {
  it("maps the cover-layout center to 0.5, 0.5", () => {
    const container = { width: 400, height: 300 };
    const point = containerPointToCrop(container, natural, 200, 150);
    expect(point.x).toBeCloseTo(0.5, 2);
    expect(point.y).toBeCloseTo(0.5, 2);
  });
});

describe("panCrop", () => {
  it("moves the focal point opposite to drag direction", () => {
    const container = { width: 400, height: 300 };
    const next = panCrop(crop, natural, container, 40, 0);
    expect(next.x).toBeLessThan(crop.x);
    expect(next.y).toBe(crop.y);
  });
});
