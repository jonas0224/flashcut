"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Crop } from "@/lib/types";
import {
  computeContainLayout,
  focalMarkerFromLayout,
  layoutPointToCrop,
  panCrop,
  type NaturalSize,
  type ContainerSize,
} from "@/lib/zoom-crop";
import { GameImage } from "./GameImage";

const MIN_SCALE = 2;
const MAX_SCALE = 20;

type Props = {
  imageUrl: string;
  crop: Crop;
  disabled?: boolean;
  onChange: (crop: Crop) => void;
};

export function ZoomCropPicker({
  imageUrl,
  crop,
  disabled,
  onChange,
}: Props) {
  const focalRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    mode: "focal" | "pan";
    lastX: number;
    lastY: number;
  } | null>(null);

  const [panning, setPanning] = useState(false);
  const [natural, setNatural] = useState<NaturalSize>({ width: 0, height: 0 });
  const [focalContainer, setFocalContainer] = useState<ContainerSize>({
    width: 0,
    height: 0,
  });
  const [previewContainer, setPreviewContainer] = useState<ContainerSize>({
    width: 0,
    height: 0,
  });

  const cropRef = useRef(crop);
  useEffect(() => {
    cropRef.current = crop;
  }, [crop]);

  const emitCrop = useCallback(
    (next: Crop) => {
      cropRef.current = next;
      onChange(next);
    },
    [onChange],
  );

  useEffect(() => {
    const el = focalRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setFocalContainer({ width: rect.width, height: rect.height });
    };
    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setPreviewContainer({ width: rect.width, height: rect.height });
    };
    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      setNatural({ width: img.naturalWidth, height: img.naturalHeight });
    }
  }, []);

  const focalReady =
    focalContainer.width > 0 &&
    focalContainer.height > 0 &&
    natural.width > 0 &&
    natural.height > 0;

  const focalFrame = focalReady
    ? computeContainLayout(focalContainer, natural)
    : null;
  const marker = focalFrame ? focalMarkerFromLayout(focalFrame, crop) : null;

  const setFocalPoint = useCallback(
    (clientX: number, clientY: number) => {
      const el = focalRef.current;
      if (!el || disabled || !focalReady || !focalFrame) return;
      const rect = el.getBoundingClientRect();
      const point = layoutPointToCrop(
        focalFrame,
        clientX - rect.left,
        clientY - rect.top,
      );
      emitCrop({ ...cropRef.current, ...point });
    },
    [disabled, emitCrop, focalFrame, focalReady],
  );

  const panPreview = useCallback(
    (clientX: number, clientY: number) => {
      const drag = dragRef.current;
      if (
        !drag ||
        drag.mode !== "pan" ||
        disabled ||
        previewContainer.width <= 0 ||
        natural.width <= 0
      ) {
        return;
      }

      const deltaX = clientX - drag.lastX;
      const deltaY = clientY - drag.lastY;
      drag.lastX = clientX;
      drag.lastY = clientY;

      const point = panCrop(
        cropRef.current,
        natural,
        previewContainer,
        deltaX,
        deltaY,
      );
      emitCrop({ ...cropRef.current, ...point });
    },
    [disabled, emitCrop, natural, previewContainer],
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
    setPanning(false);
  }, []);

  const onFocalPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { mode: "focal", lastX: e.clientX, lastY: e.clientY };
    setFocalPoint(e.clientX, e.clientY);
  };

  const onFocalPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.mode !== "focal") return;
    e.preventDefault();
    setFocalPoint(e.clientX, e.clientY);
  };

  const onFocalPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.mode !== "focal") return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    endDrag();
  };

  const onPreviewPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { mode: "pan", lastX: e.clientX, lastY: e.clientY };
    setPanning(true);
  };

  const onPreviewPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.mode !== "pan") return;
    e.preventDefault();
    panPreview(e.clientX, e.clientY);
  };

  const onPreviewPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.mode !== "pan") return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    endDrag();
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="fc-label-on-light mb-1 block">
          Zoom focal point — click or drag on the image
        </p>
        <div
          ref={focalRef}
          className={`relative aspect-[4/3] w-full overflow-hidden rounded-2xl border-2 border-blue-200 bg-blue-50 shadow-sm select-none touch-none ${
            disabled ? "opacity-60" : "cursor-crosshair"
          }`}
          onPointerDown={onFocalPointerDown}
          onPointerMove={onFocalPointerMove}
          onPointerUp={onFocalPointerUp}
          onPointerCancel={onFocalPointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            onLoad={onImageLoad}
            className={
              focalFrame
                ? "pointer-events-none absolute max-w-none"
                : "pointer-events-none absolute inset-0 h-full w-full object-contain"
            }
            style={
              focalFrame
                ? {
                    left: focalFrame.left,
                    top: focalFrame.top,
                    width: focalFrame.width,
                    height: focalFrame.height,
                  }
                : undefined
            }
            draggable={false}
          />
          {marker && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: marker.left, top: marker.top }}
            >
              <span className="block h-8 w-8 rounded-full border-2 border-white bg-blue-600/80 shadow-lg ring-2 ring-blue-400" />
              <span className="absolute left-1/2 top-1/2 h-10 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-white/90" />
              <span className="absolute left-1/2 top-1/2 h-0.5 w-10 -translate-x-1/2 -translate-y-1/2 bg-white/90" />
            </div>
          )}
        </div>
      </div>

      <div>
        <p className="fc-label-on-light mb-1 block">
          Player peek preview — drag to pan
        </p>
        <div
          ref={previewRef}
          className={`select-none touch-none ${
            disabled ? "opacity-60" : panning ? "cursor-grabbing" : "cursor-grab"
          }`}
          onPointerDown={onPreviewPointerDown}
          onPointerMove={onPreviewPointerMove}
          onPointerUp={onPreviewPointerUp}
          onPointerCancel={onPreviewPointerUp}
        >
          <GameImage imageUrl={imageUrl} mode="zoom" crop={crop} size="play" />
        </div>
      </div>

      <label className="block">
        <span className="fc-label-on-light mb-1 flex items-center justify-between">
          <span>Zoom level</span>
          <span className="text-xs font-bold text-blue-600">{crop.scale}×</span>
        </span>
        <input
          type="range"
          min={MIN_SCALE}
          max={MAX_SCALE}
          step={1}
          disabled={disabled}
          value={crop.scale}
          onChange={(e) =>
            emitCrop({
              ...cropRef.current,
              scale: Number.parseInt(e.target.value, 10),
            })
          }
          className="w-full accent-blue-600"
        />
      </label>
    </div>
  );
}
