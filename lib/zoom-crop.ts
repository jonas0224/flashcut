import type { Crop } from "./types";

export interface NaturalSize {
  width: number;
  height: number;
}

export interface ContainerSize {
  width: number;
  height: number;
}

export interface ImageFrame {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface VisibleSourceRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

/** Full-image object-cover layout for a container. */
export function computeCoverLayout(
  container: ContainerSize,
  natural: NaturalSize,
): ImageFrame | null {
  if (
    container.width <= 0 ||
    container.height <= 0 ||
    natural.width <= 0 ||
    natural.height <= 0
  ) {
    return null;
  }

  const coverScale = Math.max(
    container.width / natural.width,
    container.height / natural.height,
  );
  const width = natural.width * coverScale;
  const height = natural.height * coverScale;
  return {
    width,
    height,
    left: (container.width - width) / 2,
    top: (container.height - height) / 2,
  };
}

/** Full-image object-contain layout — entire image visible, letterboxed. */
export function computeContainLayout(
  container: ContainerSize,
  natural: NaturalSize,
): ImageFrame | null {
  if (
    container.width <= 0 ||
    container.height <= 0 ||
    natural.width <= 0 ||
    natural.height <= 0
  ) {
    return null;
  }

  const containScale = Math.min(
    container.width / natural.width,
    container.height / natural.height,
  );
  const width = natural.width * containScale;
  const height = natural.height * containScale;
  return {
    width,
    height,
    left: (container.width - width) / 2,
    top: (container.height - height) / 2,
  };
}

export function layoutPointToCrop(
  layout: ImageFrame,
  pointX: number,
  pointY: number,
): Pick<Crop, "x" | "y"> {
  return {
    x: clamp01((pointX - layout.left) / layout.width),
    y: clamp01((pointY - layout.top) / layout.height),
  };
}

/** Map a container click to normalized image coordinates (object-cover). */
export function containerPointToCrop(
  container: ContainerSize,
  natural: NaturalSize,
  pointX: number,
  pointY: number,
): Pick<Crop, "x" | "y"> {
  const layout = computeCoverLayout(container, natural);
  if (!layout) return { x: 0.5, y: 0.5 };
  return layoutPointToCrop(layout, pointX, pointY);
}

/** Source rectangle in natural pixels for a zoom crop. */
export function getVisibleSourceRect(
  natural: NaturalSize,
  crop: Crop,
): VisibleSourceRect {
  const sw = natural.width / crop.scale;
  const sh = natural.height / crop.scale;
  const cx = crop.x * natural.width;
  const cy = crop.y * natural.height;

  let sx = cx - sw / 2;
  let sy = cy - sh / 2;
  sx = Math.min(Math.max(0, sx), natural.width - sw);
  sy = Math.min(Math.max(0, sy), natural.height - sh);

  return { sx, sy, sw, sh };
}

/** Position a full image so the zoomed source rect fills the container. */
export function computeZoomFrame(
  container: ContainerSize,
  natural: NaturalSize,
  crop: Crop,
): ImageFrame | null {
  if (
    container.width <= 0 ||
    container.height <= 0 ||
    natural.width <= 0 ||
    natural.height <= 0
  ) {
    return null;
  }

  const source = getVisibleSourceRect(natural, crop);
  const scale = Math.min(
    container.width / source.sw,
    container.height / source.sh,
  );
  const width = natural.width * scale;
  const height = natural.height * scale;
  const viewportLeft = (container.width - source.sw * scale) / 2;
  const viewportTop = (container.height - source.sh * scale) / 2;

  return {
    width,
    height,
    left: viewportLeft - source.sx * scale,
    top: viewportTop - source.sy * scale,
  };
}

/** Pan a zoom crop by dragging the preview (container pixel delta). */
export function panCrop(
  crop: Crop,
  natural: NaturalSize,
  container: ContainerSize,
  deltaX: number,
  deltaY: number,
): Pick<Crop, "x" | "y"> {
  const source = getVisibleSourceRect(natural, crop);
  const dx = (-deltaX * source.sw) / container.width;
  const dy = (-deltaY * source.sh) / container.height;

  return {
    x: clamp01(crop.x + dx),
    y: clamp01(crop.y + dy),
  };
}

export function focalMarkerPosition(
  container: ContainerSize,
  natural: NaturalSize,
  crop: Pick<Crop, "x" | "y">,
): { left: number; top: number } | null {
  const layout = computeCoverLayout(container, natural);
  if (!layout) return null;
  return focalMarkerFromLayout(layout, crop);
}

export function focalMarkerFromLayout(
  layout: ImageFrame,
  crop: Pick<Crop, "x" | "y">,
): { left: number; top: number } {
  return {
    left: layout.left + crop.x * layout.width,
    top: layout.top + crop.y * layout.height,
  };
}
