"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Crop } from "@/lib/types";
import { GameImage } from "./GameImage";

const MIN_SCALE = 2;
const MAX_SCALE = 15;

type Props = {
  imageUrl: string;
  crop: Crop;
  disabled?: boolean;
  onChange: (crop: Crop) => void;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function pointerToCrop(
  container: HTMLElement,
  clientX: number,
  clientY: number,
): Pick<Crop, "x" | "y"> {
  const rect = container.getBoundingClientRect();
  return {
    x: clamp01((clientX - rect.left) / rect.width),
    y: clamp01((clientY - rect.top) / rect.height),
  };
}

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

  const setFocalPoint = useCallback(
    (clientX: number, clientY: number) => {
      const el = focalRef.current;
      if (!el || disabled) return;
      const { x, y } = pointerToCrop(el, clientX, clientY);
      emitCrop({ ...cropRef.current, x, y });
    },
    [disabled, emitCrop],
  );

  const panPreview = useCallback(
    (clientX: number, clientY: number) => {
      const drag = dragRef.current;
      const el = previewRef.current;
      if (!drag || drag.mode !== "pan" || !el || disabled) return;

      const rect = el.getBoundingClientRect();
      const dx = (clientX - drag.lastX) / rect.width;
      const dy = (clientY - drag.lastY) / rect.height;
      drag.lastX = clientX;
      drag.lastY = clientY;

      const current = cropRef.current;
      emitCrop({
        ...current,
        x: clamp01(current.x + dx),
        y: clamp01(current.y + dy),
      });
    },
    [disabled, emitCrop],
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
          className={`relative h-44 w-full overflow-hidden rounded-2xl border-2 border-blue-200 bg-white shadow-sm select-none touch-none ${
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
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%` }}
          >
            <span className="block h-8 w-8 rounded-full border-2 border-white bg-blue-600/80 shadow-lg ring-2 ring-blue-400" />
            <span className="absolute left-1/2 top-1/2 h-10 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-white/90" />
            <span className="absolute left-1/2 top-1/2 h-0.5 w-10 -translate-x-1/2 -translate-y-1/2 bg-white/90" />
          </div>
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
          <GameImage imageUrl={imageUrl} mode="zoom" crop={crop} size="thumb" />
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
