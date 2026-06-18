import type { Phase } from "./types";

export const PHASE_MS: Record<Phase, number> = {
  peek: 5000,
  flashcut: 2500,
  guess: 10000,
  reveal: 6000,
};

export const PHASE_ORDER: Phase[] = ["peek", "flashcut", "guess", "reveal"];

export const ROUND_COUNT = 10;
/** Max points for an instant correct answer (Kahoot-style speed scoring). */
export const MAX_ROUND_POINTS = 1000;
/** Floor for a correct answer locked at the end of the guess window. */
export const MIN_ROUND_POINTS = 100;
export const MAX_PLAYERS = 25;
export const ROOM_TTL_SECONDS = 7200;
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
