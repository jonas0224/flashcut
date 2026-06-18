import type { Phase } from "./types";

export const PHASE_MS: Record<Phase, number> = {
  countdown: 3000,
  peek: 2000,
  flashcut: 2000,
  guess: 10000,
  reveal: 5000,
};

/** Buffer before countdown ticks — lets players load the play screen after redirects. */
export const COUNTDOWN_FIRST_ROUND_GRACE_MS = 6500;
export const COUNTDOWN_SYNC_GRACE_MS = 4000;

/** Phases that only advance when the host presses Next (no auto timer). */
export const HOST_ADVANCE_PHASES: Phase[] = ["reveal"];

export const PHASE_ORDER: Phase[] = [
  "countdown",
  "peek",
  "flashcut",
  "guess",              
  "reveal",
];

export const ROUND_COUNT = 10;
/** Max points for an instant correct answer (Kahoot-style speed scoring). */
export const MAX_ROUND_POINTS = 1000;
/** Floor for a correct answer locked at the end of the guess window. */
export const MIN_ROUND_POINTS = 100;
export const MAX_PLAYERS = 25;
export const ROOM_TTL_SECONDS = 7200;
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
