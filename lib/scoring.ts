import {
  MAX_ROUND_POINTS,
  MIN_ROUND_POINTS,
  PHASE_MS,
} from "./constants";
import type { Player, Room, RoundResult, AnswerStats, RoundPlayerAnswer, PlayerAnswerStatsRow } from "./types";

/**
 * Kahoot-style speed scoring: correct answers earn more the faster you lock in.
 * Uses quadratic decay so quick clicks are rewarded more than slow ones.
 */
export function scoreRound(
  choice: string,
  answer: string,
  lockedAt: number,
  guessPhaseStartedAt: number,
  guessDurationMs: number = PHASE_MS.guess,
): number {
  if (choice !== answer) return 0;
  if (guessDurationMs <= 0) return 0;

  const elapsed = Math.max(
    0,
    Math.min(guessDurationMs, lockedAt - guessPhaseStartedAt),
  );
  const speedRatio = 1 - elapsed / guessDurationMs;
  const scaled = speedRatio * speedRatio;
  const points =
    MIN_ROUND_POINTS + (MAX_ROUND_POINTS - MIN_ROUND_POINTS) * scaled;
  return Math.round(points);
}

export function computeGameAnswerStats(room: Room): AnswerStats {
  let correct = 0;
  let wrong = 0;
  for (const rr of room.roundResults) {
    for (const score of Object.values(rr.scores)) {
      if (score > 0) correct++;
      else wrong++;
    }
  }
  return { correct, wrong };
}

export function computePlayerAnswerStats(
  playerId: string,
  room: Room,
): AnswerStats {
  let correct = 0;
  let wrong = 0;
  for (const rr of room.roundResults) {
    const score = rr.scores[playerId];
    if (score === undefined) continue;
    if (score > 0) correct++;
    else wrong++;
  }
  return { correct, wrong };
}

export function buildAllPlayerAnswerStats(room: Room): PlayerAnswerStatsRow[] {
  return Object.values(room.players)
    .map((player) => ({
      playerId: player.id,
      nickname: player.nickname,
      totalScore: player.totalScore,
      ...computePlayerAnswerStats(player.id, room),
    }))
    .sort(
      (a, b) =>
        b.totalScore - a.totalScore ||
        b.correct - a.correct ||
        a.nickname.localeCompare(b.nickname),
    );
}

export function buildRoundPlayerAnswers(
  room: Room,
  correctAnswer: string,
  roundScores?: Record<string, number>,
): RoundPlayerAnswer[] {
  return Object.values(room.players)
    .sort((a, b) => a.nickname.localeCompare(b.nickname))
    .map((player) => {
      const ans = room.answers[player.id];
      if (!ans) {
        return {
          playerId: player.id,
          nickname: player.nickname,
          outcome: "none" as const,
        };
      }
      const correct = ans.choice === correctAnswer;
      return {
        playerId: player.id,
        nickname: player.nickname,
        choice: ans.choice,
        outcome: correct ? ("correct" as const) : ("wrong" as const),
        roundScore: roundScores?.[player.id],
      };
    });
}

export function scoreCurrentRound(
  room: Room,
  answer: string,
  guessPhaseStartedAt: number,
): { room: Room; roundResult: RoundResult } {
  const scores: Record<string, number> = {};
  const players = { ...room.players };

  for (const [playerId, playerAnswer] of Object.entries(room.answers)) {
    const player = players[playerId];
    if (!player) continue;

    const points = scoreRound(
      playerAnswer.choice,
      answer,
      playerAnswer.lockedAt,
      guessPhaseStartedAt,
    );
    scores[playerId] = points;

    if (points > 0) {
      players[playerId] = {
        ...player,
        totalScore: player.totalScore + points,
        roundsCorrect: player.roundsCorrect + 1,
      };
    }
  }

  const roundResult: RoundResult = {
    roundIndex: room.roundIndex,
    scores,
  };

  return {
    room: {
      ...room,
      players,
      roundResults: [...room.roundResults, roundResult],
    },
    roundResult,
  };
}

export interface RankedPlayer {
  id: string;
  nickname: string;
  totalScore: number;
  roundsCorrect: number;
  bestRoundScore: number;
  lastRoundCorrectAt?: number;
}

export function rankPlayers(players: Record<string, Player>): RankedPlayer[] {
  return Object.values(players)
    .map((p) => ({
      id: p.id,
      nickname: p.nickname,
      totalScore: p.totalScore,
      roundsCorrect: p.roundsCorrect,
      bestRoundScore: 0,
    }))
    .sort((a, b) => b.totalScore - a.totalScore);
}

export function pickWinner(
  players: Record<string, Player>,
  roundResults: RoundResult[],
  lastRoundAnswers: Record<string, { choice: string; lockedAt: number }>,
  lastRoundAnswer: string,
): string | undefined {
  const ranked = rankPlayers(players);
  if (ranked.length === 0) return undefined;

  const topScore = ranked[0].totalScore;
  let tied = ranked.filter((p) => p.totalScore === topScore);

  if (tied.length === 1) return tied[0].id;

  tied.sort((a, b) => b.roundsCorrect - a.roundsCorrect);
  const topCorrect = tied[0].roundsCorrect;
  tied = tied.filter((p) => p.roundsCorrect === topCorrect);

  if (tied.length === 1) return tied[0].id;

  for (const player of tied) {
    let best = 0;
    for (const rr of roundResults) {
      const s = rr.scores[player.id] ?? 0;
      if (s > best) best = s;
    }
    player.bestRoundScore = best;
  }

  tied.sort((a, b) => b.bestRoundScore - a.bestRoundScore);
  const topBest = tied[0].bestRoundScore;
  tied = tied.filter((p) => p.bestRoundScore === topBest);

  if (tied.length === 1) return tied[0].id;

  for (const player of tied) {
    const ans = lastRoundAnswers[player.id];
    if (ans?.choice === lastRoundAnswer) {
      player.lastRoundCorrectAt = ans.lockedAt;
    }
  }

  tied.sort((a, b) => {
    const aT = a.lastRoundCorrectAt ?? Number.MAX_SAFE_INTEGER;
    const bT = b.lastRoundCorrectAt ?? Number.MAX_SAFE_INTEGER;
    return aT - bT;
  });

  return tied[0]?.id;
}
