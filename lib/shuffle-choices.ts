import type { RoundDefinition } from "./types";

/** FNV-1a 32-bit — stable per room + round. */
function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function nextRand(state: number): number {
  return Math.imul(state ^ (state >>> 16), 0x7feb352d) >>> 0;
}

/** Deterministic Fisher–Yates so every client sees the same order for a round. */
export function shuffledChoices(
  choices: RoundDefinition["choices"],
  roomCode: string,
  roundIndex: number,
): RoundDefinition["choices"] {
  const items = [...choices];
  let state = hashSeed(`${roomCode}:${roundIndex}`);

  for (let i = items.length - 1; i > 0; i--) {
    state = nextRand(state);
    const j = state % (i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }

  return items as RoundDefinition["choices"];
}

export function choicesForRoom(
  roomCode: string,
  roundIndex: number,
  round: RoundDefinition,
): RoundDefinition["choices"] {
  return shuffledChoices(round.choices, roomCode, roundIndex);
}
