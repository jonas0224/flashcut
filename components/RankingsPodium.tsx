"use client";

import { useCountUp } from "@/hooks/useCountUp";
import { RANK_MEDALS, type StandingPlayer } from "@/lib/rankings";

type Props = {
  players: StandingPlayer[];
  winnerId?: string;
};

const PODIUM_ORDER = [1, 0, 2] as const;
const PODIUM_HEIGHT = ["h-32", "h-40", "h-28"] as const;
/** CSS animation classes — reveal order: 3rd → 2nd → 1st */
const PODIUM_REVEAL = ["fc-podium-reveal-2nd", "fc-podium-reveal-1st", "fc-podium-reveal-3rd"] as const;

function PodiumSlot({
  player,
  place,
  heightClass,
  revealClass,
  isWinner,
}: {
  player?: StandingPlayer;
  place: number;
  heightClass: string;
  revealClass: string;
  isWinner?: boolean;
}) {
  const score = useCountUp(player?.totalScore ?? 0);

  if (!player) {
    return <div className="w-24 shrink-0 sm:w-28" aria-hidden />;
  }

  return (
    <div className="flex w-24 shrink-0 flex-col items-center sm:w-28">
      <div
        className={`${revealClass} ${heightClass} flex w-full origin-bottom flex-col items-center justify-between rounded-t-2xl border-2 border-white/20 px-2 pb-3 pt-3 shadow-lg ${
          place === 0
            ? "bg-[#d89e00]"
            : place === 1
              ? "bg-[#9ca3af]"
              : "bg-[#b87333]"
        } ${isWinner ? "ring-4 ring-yellow-200" : ""}`}
      >
        <p className="max-w-full truncate text-center text-xs font-bold text-white/95 sm:text-sm">
          {player.nickname}
        </p>
        <div className="flex flex-col items-center">
          <span className="text-2xl leading-none">{RANK_MEDALS[place]}</span>
          <span className="mt-1 text-lg font-black tabular-nums text-white sm:text-xl">
            {score}
          </span>
        </div>
      </div>
    </div>
  );
}

export function RankingsPodium({ players, winnerId }: Props) {
  if (players.length === 0) {
    return (
      <p className="py-8 text-center font-semibold text-white/80">
        No players in this game.
      </p>
    );
  }

  if (players.length === 1) {
    const player = players[0];
    return (
      <section className="min-h-48 w-full py-6 sm:min-h-52 sm:py-8">
        <div className="flex justify-center">
          <PodiumSlot
            player={player}
            place={0}
            heightClass="h-40"
            revealClass="fc-podium-reveal-1st"
            isWinner={player.id === winnerId}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-48 w-full py-6 sm:min-h-52 sm:py-8">
      <div className="flex items-end justify-center gap-4 sm:gap-6">
        {PODIUM_ORDER.map((placeIndex, slot) => {
          const player = players[placeIndex];
          return (
            <PodiumSlot
              key={placeIndex}
              player={player}
              place={placeIndex}
              heightClass={PODIUM_HEIGHT[slot]}
              revealClass={PODIUM_REVEAL[slot]}
              isWinner={player?.id === winnerId}
            />
          );
        })}
      </div>
    </section>
  );
}
