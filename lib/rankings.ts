export type StandingPlayer = {
  id: string;
  nickname: string;
  totalScore: number;
};

export const RANK_MEDALS = ["🥇", "🥈", "🥉"] as const;

export function rankLabel(index: number): string {
  return RANK_MEDALS[index] ?? `${index + 1}.`;
}

export function sortByScore(players: StandingPlayer[]): StandingPlayer[] {
  return [...players].sort((a, b) => b.totalScore - a.totalScore);
}

export function rankMap(players: StandingPlayer[]): Record<string, number> {
  return Object.fromEntries(
    sortByScore(players).map((player, index) => [player.id, index]),
  );
}

/** Standings as they were before the current round's scores were applied. */
export function standingsBeforeRound(
  standings: StandingPlayer[],
  roundScores: Record<string, number>,
): StandingPlayer[] {
  return standings.map((player) => ({
    ...player,
    totalScore: player.totalScore - (roundScores[player.id] ?? 0),
  }));
}

export function rankDeltas(
  previousRanks: Record<string, number>,
  nextRanks: Record<string, number>,
): Record<string, "up" | "down"> {
  const deltas: Record<string, "up" | "down"> = {};
  for (const [playerId, rank] of Object.entries(nextRanks)) {
    const previous = previousRanks[playerId];
    if (previous !== undefined && previous !== rank) {
      deltas[playerId] = rank < previous ? "up" : "down";
    }
  }
  return deltas;
}

export function getPlayerRank(
  sorted: StandingPlayer[],
  playerId: string,
): number | null {
  const index = sorted.findIndex((p) => p.id === playerId);
  return index >= 0 ? index + 1 : null;
}

/** e.g. 1 → "1st", 3 → "3rd", 11 → "11th" */
export function ordinalPlace(rank: number): string {
  const mod100 = rank % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${rank}th`;
  switch (rank % 10) {
    case 1:
      return `${rank}st`;
    case 2:
      return `${rank}nd`;
    case 3:
      return `${rank}rd`;
    default:
      return `${rank}th`;
  }
}
