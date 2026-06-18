import { GameImage } from "@/components/GameImage";
import type { Crop, ImageMode, Phase } from "@/lib/types";

const LETTERS = ["A", "B", "C", "D"] as const;
const VARIANTS = ["a", "b", "c", "d"] as const;

const PHASE_LABELS: Partial<Record<Phase, string>> = {
  peek: "Look closely",
  guess: "Pick your answer",
  reveal: "Correct answer",
};

type Props = {
  phase: Phase;
  roundIndex: number;
  roundCount: number;
  imageUrl?: string;
  imageMode?: ImageMode;
  crop?: Crop;
  choices?: [string, string, string, string];
  answer?: string;
  compact?: boolean;
};

export function HostRoundQuestion({
  phase,
  roundIndex,
  roundCount,
  imageUrl,
  imageMode,
  crop,
  choices,
  answer,
  compact = false,
}: Props) {
  const showImage =
    imageUrl && imageMode && (phase === "peek" || phase === "reveal");
  const showChoicesBelow =
    choices &&
    (phase === "guess" || (phase === "reveal" && answer)) &&
    !(compact && phase === "reveal");
  const revealImage = phase === "reveal";

  if (!showImage && !showChoicesBelow) return null;

  return (
    <section
      className={`fc-host-screen-share flex h-full min-h-0 flex-col ${compact ? "gap-2" : "gap-4"}`}
    >
      <div className="shrink-0 text-center">
        <p className={`fc-shell-label ${compact ? "text-xs" : ""}`}>
          Round {roundIndex + 1} of {roundCount}
        </p>
        {PHASE_LABELS[phase] && (
          <p
            className={`font-black text-white ${compact ? "text-lg" : "mt-1 text-2xl sm:text-3xl"}`}
          >
            {PHASE_LABELS[phase]}
          </p>
        )}
      </div>

      {showImage && (
        <div
          className={`flex min-h-0 items-center justify-center ${compact ? "min-h-[8rem] flex-1" : ""}`}
        >
          <GameImage
            imageUrl={imageUrl}
            mode={imageMode}
            crop={crop}
            reveal={revealImage}
            size={compact ? "host" : "reveal"}
            fit={compact ? "contain" : "cover"}
            entrance={phase === "peek" ? "peek" : "none"}
            className={compact ? "max-h-full w-full" : ""}
          />
        </div>
      )}

      {showChoicesBelow && (
        <ul
          className={`min-h-0 flex-1 ${compact ? "grid grid-cols-2 gap-2 content-start" : "space-y-3"}`}
        >
          {choices.map((choice, index) => {
            const variant = VARIANTS[index] ?? "a";
            const isCorrect = phase === "reveal" && choice === answer;
            const isGuess = phase === "guess";

            return (
              <li
                key={choice}
                className={
                  isGuess
                    ? `fc-choice fc-choice-${variant} fc-reveal-choice-readonly ${
                        compact ? "min-h-[3rem] !px-3 !py-2" : "min-h-[3.75rem] sm:min-h-[4.25rem]"
                      }`
                    : `rounded-xl border px-3 py-2 text-sm font-bold ${
                        isCorrect
                          ? "border-fc-correct/50 bg-fc-correct/15 text-white"
                          : "border-white/10 bg-fc-night/60 text-[#b8c9e6]"
                      }`
                }
              >
                {isGuess ? (
                  <div className="flex w-full items-center gap-2">
                    <span
                      className={`fc-choice-letter ${compact ? "!h-8 !w-8 !text-base" : ""}`}
                      aria-hidden
                    >
                      {LETTERS[index] ?? index + 1}
                    </span>
                    <span
                      className={`fc-choice-label ${compact ? "!text-sm" : "text-lg sm:text-xl"}`}
                    >
                      {choice}
                    </span>
                  </div>
                ) : (
                  <>
                    <span className="mr-1 text-[#94a8c9]">
                      {LETTERS[index] ?? index + 1}.
                    </span>
                    {choice}
                    {isCorrect && (
                      <span className="ml-1 text-xs font-black text-fc-correct">
                        ✓
                      </span>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
