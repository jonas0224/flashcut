import { PHASE_MS, PHASE_ORDER, ROUND_COUNT } from "./constants";
import { pickWinner, scoreCurrentRound } from "./scoring";
import type { Pack, Phase, Room } from "./types";

export function phaseEndsAt(room: Room, now: number): number {
  if (room.status !== "playing") return now;
  return room.phaseStartedAt + PHASE_MS[room.phase];
}

export function shouldAdvance(room: Room, now: number): boolean {
  if (room.status !== "playing") return false;
  return now >= phaseEndsAt(room, now);
}

function nextPhase(phase: Phase): Phase | null {
  const idx = PHASE_ORDER.indexOf(phase);
  if (idx < 0 || idx >= PHASE_ORDER.length - 1) return null;
  return PHASE_ORDER[idx + 1];
}

function finishOrNextRound(next: Room, pack: Pack, lastAnswers: Room["answers"]): Room {
  const round = pack.rounds[next.roundIndex];
  next.answers = {};
  if (next.roundIndex >= ROUND_COUNT - 1) {
    next.status = "finished";
    if (round) {
      next.winnerId = pickWinner(
        next.players,
        next.roundResults,
        lastAnswers,
        round.answer,
      );
    }
    return next;
  }
  next.roundIndex += 1;
  next.phase = "peek";
  return next;
}

export function advanceRoomOnce(
  room: Room,
  pack: Pack,
  now: number,
): Room {
  if (room.status !== "playing") return room;

  let next: Room = { ...room, version: room.version + 1 };

  if (next.phase === "guess") {
    const round = pack.rounds[next.roundIndex];
    if (round) {
      const scored = scoreCurrentRound(next, round.answer, next.phaseStartedAt);
      next = scored.room;
    }
    next.phase = "reveal";
    next.phaseStartedAt = now;
    return next;
  }

  if (next.phase === "reveal") {
    const lastAnswers = { ...next.answers };
    const advanced = finishOrNextRound(next, pack, lastAnswers);
    advanced.phaseStartedAt = now;
    return advanced;
  }

  const upcoming = nextPhase(next.phase);
  if (!upcoming) return next;

  next.phase = upcoming;
  next.phaseStartedAt = now;
  return next;
}

/** Advance at most one phase boundary per call (safe for concurrent polls). */
export function tickRoom(room: Room, pack: Pack, now: number): Room {
  if (!shouldAdvance(room, now)) return room;
  return advanceRoomOnce(room, pack, now);
}

/** Host skip: jump to next phase; score if leaving guess. */
export function skipPhase(room: Room, pack: Pack, now: number): Room {
  if (room.status !== "playing") return room;

  let next = { ...room, version: room.version + 1 };

  if (next.phase === "guess") {
    const round = pack.rounds[next.roundIndex];
    if (round) {
      const scored = scoreCurrentRound(next, round.answer, next.phaseStartedAt);
      next = scored.room;
    }
    next.phase = "reveal";
    next.phaseStartedAt = now;
    return next;
  }

  if (next.phase === "reveal") {
    const lastAnswers = { ...next.answers };
    const advanced = finishOrNextRound(next, pack, lastAnswers);
    advanced.phaseStartedAt = now;
    return advanced;
  }

  const upcoming = nextPhase(next.phase);
  if (!upcoming) return next;

  next.phase = upcoming;
  next.phaseStartedAt = now;
  return next;
}
