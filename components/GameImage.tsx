import type { CSSProperties } from "react";
import type { Crop, ImageMode } from "@/lib/types";
import {
  computeContainLayout,
  computeCoverLayout,
  computeZoomFrame,
} from "@/lib/zoom-crop";
import { useMeasuredImage } from "@/hooks/useMeasuredImage";

type Props = {
  imageUrl: string;
  mode: ImageMode;
  crop?: Crop;
  reveal?: boolean;
  size?: "play" | "reveal" | "thumb" | "host";
  /** Cover crops to fill; contain shows the full image (host screen share). */
  fit?: "cover" | "contain";
  /** Peek uses the standard phase timing; default is for reveal/editor. */
  entrance?: "default" | "peek" | "none";
  className?: string;
};

const FRAME_CLASS = {
  play: "aspect-[4/3] w-full",
  reveal: "aspect-[4/3] w-full",
  thumb: "aspect-[4/3] w-full",
  host: "h-full w-full min-h-0 max-h-full",
} as const;

const ENTRANCE_CLASS = {
  default: "fc-image-enter",
  peek: "fc-image-peek",
  none: "",
} as const;

function imageFilter(mode: ImageMode, reveal: boolean): string | undefined {
  if (reveal) return undefined;
  if (mode === "silhouette") return "brightness(0) contrast(1.2)";
  if (mode === "blur") return "blur(20px)";
  return undefined;
}

export function GameImage({
  imageUrl,
  mode,
  crop,
  reveal = false,
  size = "play",
  fit = "cover",
  entrance = "default",
  className = "",
}: Props) {
  const { containerRef, container, natural, onImageLoad, ready } =
    useMeasuredImage();

  const useZoom = !reveal && mode === "zoom" && crop;
  const useContain = fit === "contain" || reveal;
  const frame = ready
    ? useZoom
      ? computeZoomFrame(container, natural, crop)
      : useContain
        ? computeContainLayout(container, natural)
        : computeCoverLayout(container, natural)
    : null;

  const style: CSSProperties = frame
    ? {
        left: frame.left,
        top: frame.top,
        width: frame.width,
        height: frame.height,
        filter: imageFilter(mode, reveal),
      }
    : {
        filter: imageFilter(mode, reveal),
      };

  const placeholderFit = useContain ? "object-contain" : "object-cover";

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-3xl border-2 border-blue-200 bg-white shadow-xl ${FRAME_CLASS[size]} ${ENTRANCE_CLASS[entrance]} ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt=""
        onLoad={onImageLoad}
        className={
          frame
            ? "absolute max-w-none"
            : `absolute inset-0 h-full w-full ${placeholderFit}`
        }
        style={style}
        draggable={false}
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
            size="play"
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
