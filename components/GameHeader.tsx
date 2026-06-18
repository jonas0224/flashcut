export function GameHeader({
  roundIndex,
  roundCount,
  nickname,
  score,
}: {
  roundIndex: number;
  roundCount: number;
  nickname: string;
  score: number;
}) {
  return (
    <header className="mb-4 flex items-center justify-between gap-3">
      <span className="fc-chip shrink-0">
        Round {roundIndex + 1}/{roundCount}
      </span>
      <span className="fc-badge max-w-[55%] truncate text-base sm:max-w-none sm:text-lg">
        {nickname} · {score} pts
      </span>
    </header>
  );
}
