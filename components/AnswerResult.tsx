type Props = {
  yourAnswer?: string;
  correctAnswer?: string;
  score?: number;
  surface?: "light" | "shell";
  compact?: boolean;
};

export function AnswerResult({
  yourAnswer,
  correctAnswer,
  score,
  surface = "light",
  compact = false,
}: Props) {
  if (!correctAnswer) return null;

  const onShell = surface === "shell";
  const sizeClass = compact ? "fc-result-card--compact" : "";
  const shellClass = onShell ? "fc-result-card--shell" : "";

  if (!yourAnswer) {
    return (
      <div
        className={`fc-result-card fc-result-neutral fc-phase-enter text-center ${sizeClass} ${shellClass}`}
      >
        <p
          className={`font-bold ${compact ? "text-sm" : "text-lg"} ${onShell ? "text-[#b8c9e6]" : "text-blue-800"}`}
        >
          No answer submitted
        </p>
      </div>
    );
  }

  const correct = yourAnswer === correctAnswer;

  if (correct) {
    return (
      <div
        className={`fc-result-card fc-result-correct fc-answer-correct text-center ${sizeClass} ${shellClass}`}
      >
        <p className={compact ? "text-2xl" : "fc-confetti-icon text-4xl"}>✓</p>
        <p
          className={`mt-1 font-black text-fc-correct ${compact ? "text-lg" : "mt-2 text-2xl"}`}
        >
          Correct!
        </p>
        {score !== undefined && score > 0 && (
          <p
            className={`font-bold ${compact ? "text-sm" : "mt-1 text-lg"} ${onShell ? "text-fc-flash" : "text-blue-900"}`}
          >
            +{score} points
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`fc-result-card fc-result-wrong fc-answer-wrong text-center ${sizeClass} ${shellClass}`}
    >
      <p className={`font-black text-fc-wrong ${compact ? "text-2xl" : "text-4xl"}`}>✗</p>
      <p
        className={`font-black text-fc-wrong ${compact ? "mt-1 text-lg" : "mt-2 text-2xl"}`}
      >
        Wrong
      </p>
      <p
        className={`font-semibold ${compact ? "mt-1 text-xs" : "mt-2 text-base"} ${onShell ? "text-[#b8c9e6]" : "text-blue-900"}`}
      >
        You picked: <span className="font-black">{yourAnswer}</span>
      </p>
    </div>
  );
}
