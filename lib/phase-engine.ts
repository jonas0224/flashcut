import { HOST_ADVANCE_PHASES, PHASE_MS, PHASE_ORDER, ROUND_COUNT } from "./constants";
import { pickWinner, scoreCurrentRound } from "./scoring";
import type { Pack, Phase, Room } from "./types";

export function allPlayersAnswered(room: Room): boolean {
  const playerIds = Object.keys(room.players);
  if (playerIds.length === 0) return false;
  return playerIds.every((id) => room.answers[id] != null);
}

export function phaseEndsAt(room: Room, now: number): number {
  if (room.status !== "playing") return now;
  return room.phaseStartedAt + PHASE_MS[room.phase];
}

export function shouldAdvance(room: Room, now: number): boolean {
  if (room.status !== "playing") return false;
  if (HOST_ADVANCE_PHASES.includes(room.phase)) return false;
  if (room.phase === "guess" && allPlayersAnswered(room)) return true;
  return now >= phaseEndsAt(room, now);
}

function nextPhase(phase: Phase): Phase | null {
  const idx = PHASE_ORDER.indexOf(phase);
  if (idx < 0 || idx >= PHASE_ORDER.length - 1) return null;
  return PHASE_ORDER[idx + 1];
}

function finishOrNextRound(
  next: Room,
  pack: Pack,
  lastAnswers: Room["answers"],
  nextRoundPhase: Phase = "countdown",
): Room {
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
  next.phase = nextRoundPhase;
  return next;
}

/** Score the current round if still in guess and not yet recorded. */
export function scorePendingRound(room: Room, pack: Pack): Room {
  if (room.status !== "playing" || room.phase !== "guess") return room;
  const round = pack.rounds[room.roundIndex];
  if (!round) return room;
  if (room.roundResults.some((rr) => rr.roundIndex === room.roundIndex)) {
    return room;
  }
  return scoreCurrentRound(room, round.answer, room.phaseStartedAt).room;
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

/** After recording an answer, advance to reveal when every player has locked in. */
export function maybeAdvanceAfterAnswer(
  room: Room,
  pack: Pack,
  now: number,
): Room {
  if (room.phase !== "guess" || !allPlayersAnswered(room)) return room;
  return advanceRoomOnce(room, pack, now);
}

/** Advance at most one phase boundary per call (safe for concurrent polls). */
export function tickRoom(room: Room, pack: Pack, now: number): Room {
  if (!shouldAdvance(room, now)) return room;
  return advanceRoomOnce(room, pack, now);
}

/** Host advance: jump to next phase; score if leaving guess. */
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

export function hostAdvanceLabel(phase: Phase): string {
  if (phase === "reveal") return "Next round";
  return "Skip phase";
}

export function isHostAdvancePrimary(phase: Phase): boolean {
  return phase === "reveal";
}
