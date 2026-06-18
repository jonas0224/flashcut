"use client";

import { useRef, useState } from "react";
import type { ImageMode, RoundDefinition } from "@/lib/types";
import { ZoomCropPicker } from "./ZoomCropPicker";

const MODES: ImageMode[] = ["zoom", "silhouette", "blur"];
const DEFAULT_CROP = { x: 0.5, y: 0.5, scale: 5 };

type Props = {
  roundIndex: number;
  round: RoundDefinition;
  disabled?: boolean;
  busy?: boolean;
  onChange: (round: RoundDefinition) => void;
  onUpload: (file: File) => Promise<string | null>;
};

export function RoundEditor({
  roundIndex,
  round,
  disabled,
  busy,
  onChange,
  onUpload,
}: Props) {
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function updateChoice(index: number, value: string) {
    const choices = [...round.choices] as [string, string, string, string];
    choices[index] = value;
    onChange({ ...round, choices });
  }

  function setMode(mode: ImageMode) {
    onChange({
      ...round,
      mode,
      crop: mode === "zoom" ? (round.crop ?? DEFAULT_CROP) : undefined,
    });
  }

  async function handleUpload(file: File) {
    setUploadMessage(null);
    const err = await onUpload(file);
    if (err) {
      setUploadMessage(err);
      return;
    }
    setUploadMessage("Image uploaded");
  }

  return (
    <article className="fc-panel space-y-4">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-black text-blue-900">
          Round {roundIndex + 1}
        </h2>
        <span className="fc-chip text-xs uppercase">{round.mode}</span>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => fileRef.current?.click()}
          className="fc-btn-secondary px-4 py-2 text-sm"
        >
          Upload image
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUpload(file);
            e.target.value = "";
          }}
        />
      </div>

      <label className="block">
        <span className="fc-label-on-light mb-1 block">Image URL</span>
        <input
          className="fc-input w-full text-sm"
          value={round.imageUrl}
          disabled={disabled || busy}
          onChange={(e) => onChange({ ...round, imageUrl: e.target.value })}
          placeholder="/packs/... or uploaded image URL"
        />
      </label>

      <label className="block">
        <span className="fc-label-on-light mb-1 block">Image mode</span>
        <select
          className="fc-input w-full"
          value={round.mode}
          disabled={disabled || busy}
          onChange={(e) => setMode(e.target.value as ImageMode)}
        >
          {MODES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>

      {round.mode === "zoom" ? (
        <ZoomCropPicker
          imageUrl={round.imageUrl}
          crop={round.crop ?? DEFAULT_CROP}
          disabled={disabled || busy}
          onChange={(crop) => onChange({ ...round, crop })}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-blue-100 bg-blue-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={round.imageUrl}
            alt=""
            className="h-40 w-full object-cover"
          />
        </div>
      )}

      <div className="space-y-2">
        <span className="fc-label-on-light block">Choices</span>
        {round.choices.map((choice, i) => (
          <input
            key={i}
            className="fc-input w-full text-sm"
            value={choice}
            disabled={disabled || busy}
            maxLength={60}
            onChange={(e) => updateChoice(i, e.target.value)}
          />
        ))}
      </div>

      <label className="block">
        <span className="fc-label-on-light mb-1 block">Correct answer</span>
        <select
          className="fc-input w-full"
          value={round.answer}
          disabled={disabled || busy}
          onChange={(e) => onChange({ ...round, answer: e.target.value })}
        >
          {round.choices.map((c) => (
            <option key={c} value={c}>
              {c || "(empty)"}
            </option>
          ))}
        </select>
      </label>

      {uploadMessage && (
        <p
          className={`text-center text-sm font-semibold ${uploadMessage === "Image uploaded" ? "text-green-700" : "text-red-600"}`}
        >
          {uploadMessage}
        </p>
      )}
    </article>
  );
}
