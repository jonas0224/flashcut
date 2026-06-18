import type { CSSProperties } from "react";
import type { Crop, ImageMode } from "@/lib/types";

type Props = {
  imageUrl: string;
  mode: ImageMode;
  crop?: Crop;
  reveal?: boolean;
  size?: "play" | "reveal" | "thumb";
};

const HEIGHT = {
  play: "h-[48dvh] sm:h-[55dvh]",
  reveal: "h-[38dvh] sm:h-[42dvh]",
  thumb: "h-28 sm:h-32",
} as const;

export function GameImage({
  imageUrl,
  mode,
  crop,
  reveal = false,
  size = "play",
}: Props) {
  const style: CSSProperties = {};
  const showCrop = !reveal && mode === "zoom" && crop;

  if (showCrop) {
    style.transform = `scale(${crop.scale})`;
    style.transformOrigin = `${crop.x * 100}% ${crop.y * 100}%`;
  }

  let filter: string | undefined;
  if (!reveal) {
    if (mode === "silhouette") filter = "brightness(0) contrast(1.2)";
    if (mode === "blur") filter = "blur(20px)";
  }

  return (
    <div
      className={`fc-image-enter relative w-full overflow-hidden rounded-3xl border-2 border-blue-200 bg-white shadow-xl ${HEIGHT[size]}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ ...style, filter }}
      />
    </div>
  );
}

export function RevealImages({
  imageUrl,
  mode,
  crop,
}: {
  imageUrl: string;
  mode: ImageMode;
  crop?: Crop;
}) {
  if (mode === "zoom" && crop) {
    return (
      <div className="flex flex-col gap-4">
        <div className="fc-phase-enter">
          <p className="mb-2 text-center text-sm font-bold uppercase tracking-wide text-blue-600">
            Full image
          </p>
          <GameImage
            imageUrl={imageUrl}
            mode={mode}
            crop={crop}
            reveal
            size="reveal"
          />
        </div>
        <div className="fc-phase-enter-delayed">
          <p className="mb-2 text-center text-sm font-bold uppercase tracking-wide text-blue-600">
            The detail you saw
          </p>
          <GameImage
            imageUrl={imageUrl}
            mode={mode}
            crop={crop}
            size="thumb"
          />
        </div>
      </div>
    );
  }

  return (
    <GameImage
      imageUrl={imageUrl}
      mode={mode}
      crop={crop}
      reveal
      size="reveal"
    />
  );
}
