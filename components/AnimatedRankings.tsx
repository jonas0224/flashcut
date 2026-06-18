"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useCountUp } from "@/hooks/useCountUp";
import {
  rankDeltas,
  rankLabel,
  rankMap,
  sortByScore,
  standingsBeforeRound,
  type StandingPlayer,
} from "@/lib/rankings";

const ROW_HEIGHT = 52;
const ROW_HEIGHT_COMPACT = 36;
const ROW_GAP = 8;
const ROW_GAP_COMPACT = 5;
const SLIDE_MS = 900;

type Props = {
  standings: StandingPlayer[];
  roundScores?: Record<string, number>;
  roundIndex?: number;
  highlightId?: string;
  title?: string;
  className?: string;
  surface?: "light" | "shell";
  compact?: boolean;
};

function RankingRow({
  player,
  medalRank,
  positionRank,
  roundScore,
  highlight,
  rankDelta,
  surface = "light",
  animatePosition,
  animateScore,
  pulseRank,
  compact = false,
  rowHeight,
  rowGap,
}: {
  player: StandingPlayer;
  medalRank: number;
  positionRank: number;
  roundScore?: number;
  highlight?: boolean;
  rankDelta?: "up" | "down" | null;
  surface?: "light" | "shell";
  animatePosition: boolean;
  animateScore: boolean;
  pulseRank: boolean;
  compact?: boolean;
  rowHeight: number;
  rowGap: number;
}) {
  const score = useCountUp(player.totalScore, 700, animateScore);
  const onShell = surface === "shell";

  return (
    <div
      className={`fc-rank-row absolute inset-x-0 flex items-center justify-between gap-2 rounded-xl border font-semibold ${
        compact ? "px-2.5 py-1" : "gap-3 rounded-2xl px-4 py-2.5"
      } ${
        animatePosition ? "fc-rank-row-animated" : ""
      } ${
        highlight
          ? onShell
            ? "border-fc-flash bg-fc-night text-white shadow-md ring-2 ring-fc-flash/40"
            : "border-fc-flash bg-fc-flash-soft text-fc-ink shadow-md ring-2 ring-fc-flash/40"
          : onShell
            ? "fc-shell-player"
            : "fc-card"
      } ${pulseRank && rankDelta === "up" ? "fc-rank-up" : ""} ${pulseRank && rankDelta === "down" ? "fc-rank-down" : ""}`}
      style={{
        top: positionRank * rowHeight,
        height: rowHeight - rowGap,
        zIndex: rankDelta ? 3 : 1,
      }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="fc-rank-medal w-8 shrink-0 text-center text-lg leading-none">
          {rankLabel(medalRank)}
        </span>
        <span className={`min-w-0 ${compact ? "truncate text-xs" : "text-sm"}`}>
          {player.nickname}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span
          className={`fc-score-pop tabular-nums font-black ${compact ? "text-sm" : "text-lg"} ${onShell ? "text-fc-flash" : "text-fc-primary"}`}
        >
          {score}
        </span>
        {roundScore !== undefined && (
          <span
            className={`fc-round-score-pop font-black tabular-nums ${compact ? "text-xs" : "text-sm"} ${
              roundScore > 0
                ? "text-green-600"
                : onShell
                  ? "text-[#94a8c9]"
                  : "text-blue-400"
            }`}
          >
            +{roundScore}
          </span>
        )}
        <span className="fc-rank-arrow-slot w-5 text-center" aria-hidden={!rankDelta}>
          {rankDelta === "up" && (
            <span
              className={`fc-rank-arrow inline-block text-xl font-black leading-none ${
                onShell ? "text-fc-correct" : "text-green-600"
              }`}
              aria-label="Moved up in rankings"
            >
              ▲
            </span>
          )}
          {rankDelta === "down" && (
            <span
              className={`fc-rank-arrow inline-block text-xl font-black leading-none ${
                onShell ? "text-orange-400" : "text-orange-500"
              }`}
              aria-label="Moved down in rankings"
            >
              ▼
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

export function AnimatedRankings({
  standings,
  roundScores,
  roundIndex = 0,
  highlightId,
  title = "Leaderboard",
  className = "",
  surface = "light",
  compact = false,
}: Props) {
  const [rowPositions, setRowPositions] = useState<Record<string, number>>({});
  const [medalRanks, setMedalRanks] = useState<Record<string, number>>({});
  const [animatePosition, setAnimatePosition] = useState(false);
  const [scoreAnimating, setScoreAnimating] = useState(false);
  const [pulseRank, setPulseRank] = useState(false);
  const playedRevealKeysRef = useRef(new Set<string>());

  const standingsKey = standings
    .map((p) => `${p.id}:${p.totalScore}`)
    .join("|");
  const roundScoresKey = roundScores
    ? Object.entries(roundScores)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([id, score]) => `${id}:${score}`)
        .join("|")
    : "";
  const revealKey = roundScores
    ? `${roundIndex}|${standingsKey}|${roundScoresKey}`
    : null;

  const sorted = useMemo(() => sortByScore(standings), [standingsKey]);
  const finalRanks = useMemo(() => rankMap(standings), [standingsKey]);

  /** Stable for the whole reveal — survives polling. */
  const revealDeltas = useMemo(() => {
    if (!roundScores) return {} as Record<string, "up" | "down">;
    const previousRanks = rankMap(standingsBeforeRound(standings, roundScores));
    return rankDeltas(previousRanks, finalRanks);
  }, [revealKey, roundScores, standings, finalRanks]);

  useLayoutEffect(() => {
    if (!roundScores || !revealKey) {
      setRowPositions(finalRanks);
      setMedalRanks(finalRanks);
      setAnimatePosition(false);
      setScoreAnimating(false);
      setPulseRank(false);
      return;
    }

    if (playedRevealKeysRef.current.has(revealKey)) {
      setRowPositions(finalRanks);
      setMedalRanks(finalRanks);
      setAnimatePosition(false);
      setScoreAnimating(false);
      setPulseRank(false);
      return;
    }

    playedRevealKeysRef.current.add(revealKey);

    const previousRanks = rankMap(standingsBeforeRound(standings, roundScores));
    const nextRanks = finalRanks;

    setAnimatePosition(false);
    setRowPositions(previousRanks);
    setMedalRanks(previousRanks);
    setScoreAnimating(true);
    setPulseRank(false);

    const slideTimer = window.setTimeout(() => {
      setAnimatePosition(true);
      setRowPositions(nextRanks);
      setPulseRank(true);
    }, 120);

    const medalTimer = window.setTimeout(() => {
      setMedalRanks(nextRanks);
    }, 120 + SLIDE_MS);

    const scoreTimer = window.setTimeout(() => {
      setScoreAnimating(false);
    }, 120 + SLIDE_MS + 200);

    const pulseTimer = window.setTimeout(() => {
      setPulseRank(false);
    }, 120 + SLIDE_MS + 1600);

    return () => {
      window.clearTimeout(slideTimer);
      window.clearTimeout(medalTimer);
      window.clearTimeout(scoreTimer);
      window.clearTimeout(pulseTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [revealKey]);

  if (sorted.length === 0) return null;

  const rowHeight = compact ? ROW_HEIGHT_COMPACT : ROW_HEIGHT;
  const rowGap = compact ? ROW_GAP_COMPACT : ROW_GAP;
  const listHeight = sorted.length * rowHeight - rowGap;
  const showReveal = Boolean(roundScores);
  const fillHeight = compact;

  return (
    <section
      className={`fc-rankings-enter flex flex-col ${fillHeight ? "h-full min-h-0" : ""} ${className}`}
    >
      {title && (
        <h2
          className={`mb-2 shrink-0 text-center tracking-widest ${compact ? "text-xs" : ""} ${surface === "shell" ? "fc-shell-label" : "fc-label"}`}
        >
          {title}
        </h2>
      )}
      <div
        className={`relative w-full overflow-y-auto ${fillHeight ? "min-h-0 flex-1" : ""}`}
        style={{ height: listHeight }}
      >
        {sorted.map((player, rank) => (
          <RankingRow
            key={player.id}
            player={player}
            medalRank={medalRanks[player.id] ?? rank}
            positionRank={rowPositions[player.id] ?? rank}
            roundScore={roundScores?.[player.id]}
            highlight={player.id === highlightId}
            rankDelta={showReveal ? (revealDeltas[player.id] ?? null) : null}
            surface={surface}
            animatePosition={animatePosition}
            animateScore={scoreAnimating}
            pulseRank={pulseRank}
            compact={compact}
            rowHeight={rowHeight}
            rowGap={rowGap}
          />
        ))}
      </div>
    </section>
  );
}
