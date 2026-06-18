import type { RoundPlayerAnswer } from "@/lib/types";

const LETTERS = ["A", "B", "C", "D"] as const;
const VARIANTS = ["a", "b", "c", "d"] as const;

type Props = {
  choices: [string, string, string, string];
  correctAnswer: string;
  roundPlayerAnswers: RoundPlayerAnswer[];
  surface?: "light" | "shell";
  compact?: boolean;
};

function noAnswerCountLabel(count: number): string {
  if (count === 1) return "1 player didn't answer";
  return `${count} players didn't answer`;
}

export function RoundAnswerBreakdown({
  choices,
  correctAnswer,
  roundPlayerAnswers,
  surface = "light",
  compact = false,
}: Props) {
  const noAnswer = roundPlayerAnswers.filter((a) => a.outcome === "none");
  const totalAnswered = roundPlayerAnswers.length - noAnswer.length;
  const onShell = surface === "shell";

  return (
    <section
      className={`fc-reveal-breakdown fc-phase-enter flex h-full min-h-0 flex-col ${compact ? "fc-reveal-breakdown--compact gap-1.5" : "gap-3"}`}
    >
      <h2
        className={`shrink-0 text-center tracking-widest ${compact ? "text-xs" : ""} ${onShell ? "fc-shell-label" : "fc-label"}`}
      >
        Answer breakdown
      </h2>

      <ul
        className={`min-h-0 ${compact ? "space-y-1.5" : "flex-1 space-y-3 overflow-y-auto"}`}
      >
        {choices.map((choice, index) => {
          const letter = LETTERS[index] ?? String(index + 1);
          const variant = VARIANTS[index] ?? "a";
          const isCorrect = choice === correctAnswer;
          const pickCount = roundPlayerAnswers.filter(
            (a) => a.choice === choice,
          ).length;
          const sharePercent =
            totalAnswered > 0 ? (pickCount / totalAnswered) * 100 : 0;

          return (
            <li
              key={choice}
              className={`fc-reveal-bar fc-choice fc-choice-${variant} fc-reveal-choice-readonly ${
                isCorrect
                  ? "fc-reveal-choice-correct"
                  : pickCount > 0
                    ? "fc-reveal-choice-wrong"
                    : "fc-reveal-choice-empty"
              }`}
              aria-label={`${choice}: ${pickCount} ${pickCount === 1 ? "player" : "players"}, ${Math.round(sharePercent)} percent${isCorrect ? ", correct answer" : ""}`}
            >
              <div className="fc-reveal-bar-inner">
                <div
                  className="fc-reveal-bar-fill"
                  style={
                    {
                      "--bar-width": `${sharePercent}%`,
                      animationDelay: `${index * 90}ms`,
                    } as React.CSSProperties
                  }
                />
                <div className="fc-reveal-bar-front">
                  <span className="fc-choice-letter" aria-hidden>
                    {letter}
                  </span>
                  <span className="fc-choice-label">{choice}</span>
                  <div className="fc-reveal-bar-meta ml-auto flex shrink-0 items-center gap-2">
                    {totalAnswered > 0 && sharePercent > 0 && (
                      <span className="fc-reveal-bar-percent tabular-nums">
                        {Math.round(sharePercent)}%
                      </span>
                    )}
                    <span className="fc-reveal-bar-count tabular-nums">
                      {pickCount}
                    </span>
                    {isCorrect ? (
                      <span
                        className="fc-reveal-badge fc-reveal-badge-correct"
                        aria-label="Correct answer"
                      >
                        ✓
                      </span>
                    ) : pickCount > 0 ? (
                      <span
                        className="fc-reveal-badge fc-reveal-badge-wrong"
                        aria-label="Incorrect answer"
                      >
                        ✗
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {noAnswer.length > 0 && (
        <div
          className={`rounded-xl border px-4 py-3 ${
            onShell
              ? "border-white/12 bg-fc-night/60"
              : "border-blue-200 bg-blue-50"
          }`}
        >
          <p
            className={`text-sm font-bold uppercase tracking-wide ${
              onShell ? "text-[#94a8c9]" : "text-blue-600"
            }`}
          >
            {noAnswerCountLabel(noAnswer.length)}
          </p>
        </div>
      )}
    </section>
  );
}
