"use client";

import { useMemo } from "react";
import { AnimatedRankings } from "./AnimatedRankings";
import {
  getPlayerRank,
  ordinalPlace,
  sortByScore,
  type StandingPlayer,
} from "@/lib/rankings";

type PlacementProps = {
  standings: StandingPlayer[];
  highlightId?: string;
  surface?: "light" | "shell";
  compact?: boolean;
};

function standingsKey(players: StandingPlayer[]) {
  return players.map((p) => `${p.id}:${p.totalScore}`).join("|");
}

export function RoundPlacement({
  standings,
  highlightId,
  surface = "light",
  compact = false,
}: PlacementProps) {
  const key = standingsKey(standings);
  const sorted = useMemo(() => sortByScore(standings), [key]);
  const rank = highlightId ? getPlayerRank(sorted, highlightId) : null;

  if (rank === null || sorted.length <= 1) return null;

  const onShell = surface === "shell";

  return (
    <div
      className={`fc-round-placement text-center ${
        onShell ? "fc-round-placement--shell" : "fc-panel"
      }`}
    >
      <p
        className={
          onShell
            ? "fc-shell-label text-xs"
            : "fc-label text-sm tracking-widest"
        }
      >
        You&apos;re in
      </p>
      <p
        className={`font-black tabular-nums ${
          compact ? "text-2xl" : "mt-1 text-5xl sm:text-6xl"
        } ${onShell ? "text-fc-flash" : "text-blue-700"}`}
      >
        {ordinalPlace(rank)}
      </p>
      <p
        className={`font-bold ${compact ? "text-xs" : "mt-1 text-lg"} ${
          onShell ? "text-[#94a8c9]" : "text-blue-500"
        }`}
      >
        place
      </p>
    </div>
  );
}

type Props = {
  standings: StandingPlayer[];
  roundScores?: Record<string, number>;
  highlightId?: string;
};

export function RoundRankings({
  standings,
  roundScores,
  highlightId,
}: Props) {
  const key = standingsKey(standings);
  const sorted = useMemo(() => sortByScore(standings), [key]);

  if (sorted.length === 0) return null;

  return (
    <section className="space-y-5">
      <RoundPlacement standings={standings} highlightId={highlightId} />

      <AnimatedRankings
        standings={sorted}
        roundScores={roundScores}
        highlightId={highlightId}
        title="Rankings"
      />
    </section>
  );
}
