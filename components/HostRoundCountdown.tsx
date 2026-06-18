type Props = {
  roundIndex: number;
  roundCount: number;
  compact?: boolean;
};

export function HostRoundCountdown({ roundIndex, roundCount, compact = false }: Props) {
  return (
    <section
      className={`fc-host-screen-share flex h-full flex-col items-center justify-center text-center ${
        compact ? "py-4" : "py-10"
      }`}
    >
      <p className={`fc-shell-label ${compact ? "text-xs" : ""}`}>
        Round {roundIndex + 1} of {roundCount}
      </p>
      <p className={`font-black text-white ${compact ? "mt-2 text-3xl" : "mt-3 text-4xl sm:text-5xl"}`}>
        Get ready!
      </p>
      {!compact && (
        <p className="mt-2 text-lg font-semibold text-[#b8c9e6]">
          New round starting…
        </p>
      )}
    </section>
  );
}
