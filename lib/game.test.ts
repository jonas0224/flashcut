import { describe, expect, it } from "vitest";
import { existsSync } from "fs";
import { join } from "path";
import { COUNTDOWN_FIRST_ROUND_GRACE_MS, COUNTDOWN_SYNC_GRACE_MS, PHASE_DISPLAY_GRACE_MS, PHASE_MS, ROUND_COUNT } from "@/lib/constants";
import { advanceRoomOnce, allPlayersAnswered, maybeAdvanceAfterAnswer, phaseEndsAt, phaseStartedAtFor, scorePendingRound, shouldAdvance, skipPhase } from "@/lib/phase-engine";
import { validatePack, validateRound, starterPack } from "@/lib/packs";
import { getRoomPack } from "@/lib/room-pack";
import { scoreRound } from "@/lib/scoring";
import type { Room, RoundDefinition } from "@/lib/types";

const baseRoom = (): Room => ({
  code: "TEST01",
  hostId: "h1",
  hostToken: "ht",
  status: "playing",
  packId: "starter-01",
  roundIndex: 0,
  phase: "peek",
  phaseStartedAt: 1000,
  players: {
    p1: {
      id: "p1",
      nickname: "A",
      token: "t1",
      totalScore: 0,
      roundsCorrect: 0,
      joinedAt: 0,
    },
  },
  answers: {},
  roundResults: [],
  createdAt: 0,
  maxPlayers: 25,
  version: 1,
});

describe("scoreRound", () => {
  const guessStart = 1000;
  const guessMs = PHASE_MS.guess;

  it("awards max points for instant correct answer", () => {
    expect(scoreRound("A", "A", guessStart, guessStart, guessMs)).toBe(1000);
  });

  it("scales down with slower correct answers", () => {
    expect(scoreRound("A", "A", guessStart + 5000, guessStart, guessMs)).toBe(
      325,
    );
  });

  it("awards min points at end of guess window", () => {
    expect(
      scoreRound("A", "A", guessStart + guessMs, guessStart, guessMs),
    ).toBe(100);
  });

  it("returns zero for wrong", () => {
    expect(scoreRound("B", "A", guessStart + 500, guessStart, guessMs)).toBe(0);
  });
});

describe("phase engine", () => {
  it("computes phase end", () => {
    const room = baseRoom();
    expect(phaseEndsAt(room, 1000)).toBe(1000 + PHASE_MS.peek);
  });

  it("does not auto-advance reveal (host-controlled)", () => {
    const reveal = { ...baseRoom(), phase: "reveal" as const };
    const pastReveal = 1000 + PHASE_MS.reveal + 1;
    expect(shouldAdvance(reveal, pastReveal)).toBe(false);
  });

  it("auto-advances countdown to peek", () => {
    const room = { ...baseRoom(), phase: "countdown" as const };
    const now = 1000 + PHASE_MS.countdown + 1;
    expect(shouldAdvance(room, now)).toBe(true);
    const next = advanceRoomOnce(room, starterPack as never, now);
    expect(next.phase).toBe("peek");
  });

  it("does not tick countdown during sync grace", () => {
    const startedAt = 10_000;
    const room = {
      ...baseRoom(),
      phase: "countdown" as const,
      phaseStartedAt: startedAt,
    };
    expect(shouldAdvance(room, startedAt - 1)).toBe(false);
    expect(shouldAdvance(room, startedAt + PHASE_MS.countdown - 1)).toBe(false);
    expect(shouldAdvance(room, startedAt + PHASE_MS.countdown)).toBe(true);
  });

  it("phaseStartedAtFor delays countdown start", () => {
    const now = 5000;
    expect(phaseStartedAtFor("countdown", now, 0)).toBe(
      now + COUNTDOWN_FIRST_ROUND_GRACE_MS,
    );
    expect(phaseStartedAtFor("countdown", now, 1)).toBe(
      now + COUNTDOWN_SYNC_GRACE_MS,
    );
    expect(phaseStartedAtFor("peek", now)).toBe(now + PHASE_DISPLAY_GRACE_MS);
    expect(phaseStartedAtFor("flashcut", now)).toBe(now + PHASE_DISPLAY_GRACE_MS);
    expect(phaseStartedAtFor("guess", now)).toBe(now + PHASE_DISPLAY_GRACE_MS);
    expect(phaseStartedAtFor("reveal", now)).toBe(now);
  });

  it("host skip from reveal starts next round at countdown", () => {
    const room = { ...baseRoom(), phase: "reveal" as const, roundIndex: 0 };
    const next = skipPhase(room, starterPack as never, 2000);
    expect(next.roundIndex).toBe(1);
    expect(next.phase).toBe("countdown");
  });

  it("advances peek to flashcut", () => {
    const room = baseRoom();
    const now = 1000 + PHASE_MS.peek + 1;
    expect(shouldAdvance(room, now)).toBe(true);
    const next = advanceRoomOnce(room, starterPack as never, now);
    expect(next.phase).toBe("flashcut");
  });

  it("does not end guess early until every player has answered", () => {
    const room = {
      ...baseRoom(),
      phase: "guess" as const,
      players: {
        ...baseRoom().players,
        p2: {
          id: "p2",
          nickname: "B",
          token: "t2",
          totalScore: 0,
          roundsCorrect: 0,
          joinedAt: 1,
        },
      },
      answers: { p1: { choice: "A", lockedAt: 1500 } },
    };
    expect(allPlayersAnswered(room)).toBe(false);
    expect(shouldAdvance(room, 1500)).toBe(false);
  });

  it("ends guess early when all players have answered", () => {
    const room = {
      ...baseRoom(),
      phase: "guess" as const,
      answers: { p1: { choice: "A", lockedAt: 1500 } },
    };
    expect(allPlayersAnswered(room)).toBe(true);
    expect(shouldAdvance(room, 1500)).toBe(true);
    const next = advanceRoomOnce(room, starterPack as never, 1500);
    expect(next.phase).toBe("reveal");
  });

  it("maybeAdvanceAfterAnswer scores and reveals when everyone answered", () => {
    const round0 = starterPack.rounds[0] as RoundDefinition;
    const correct = round0.answer;
    const room = {
      ...baseRoom(),
      phase: "guess" as const,
      phaseStartedAt: 1000,
      answers: { p1: { choice: correct, lockedAt: 1100 } },
    };
    const next = maybeAdvanceAfterAnswer(room, starterPack as never, 1500);
    expect(next.phase).toBe("reveal");
    expect(next.roundResults).toHaveLength(1);
    expect(next.roundResults[0].scores.p1).toBeGreaterThan(0);
  });

  it("maybeAdvanceAfterAnswer stays in guess until everyone answers", () => {
    const room = {
      ...baseRoom(),
      phase: "guess" as const,
      players: {
        ...baseRoom().players,
        p2: {
          id: "p2",
          nickname: "B",
          token: "t2",
          totalScore: 0,
          roundsCorrect: 0,
          joinedAt: 1,
        },
      },
      answers: { p1: { choice: "A", lockedAt: 1500 } },
    };
    const next = maybeAdvanceAfterAnswer(room, starterPack as never, 1500);
    expect(next.phase).toBe("guess");
    expect(next.roundResults).toHaveLength(0);
  });

  it("scorePendingRound records answers when ending from guess", () => {
    const round0 = starterPack.rounds[0] as RoundDefinition;
    const correct = round0.answer;
    const room = {
      ...baseRoom(),
      phase: "guess" as const,
      phaseStartedAt: 1000,
      answers: { p1: { choice: correct, lockedAt: 1100 } },
    };
    const scored = scorePendingRound(room, starterPack as never);
    expect(scored.roundResults).toHaveLength(1);
    expect(scored.roundResults[0].scores.p1).toBeGreaterThan(0);
    expect(scored.players.p1.totalScore).toBeGreaterThan(0);
  });
});

describe("validatePack", () => {
  it("starter pack is valid", () => {
    expect(validatePack(starterPack as never)).toEqual([]);
  });

  it("starter pack image files exist on disk", () => {
    const publicDir = join(process.cwd(), "public");
    for (const round of starterPack.rounds) {
      expect(existsSync(join(publicDir, round.imageUrl))).toBe(true);
    }
    expect(starterPack.rounds.length).toBe(ROUND_COUNT);
  });

  it("allows upload image URLs", () => {
    const round: RoundDefinition = {
      ...(starterPack.rounds[0] as RoundDefinition),
      imageUrl: "/uploads/TEST01/round-0.jpg",
    };
    expect(validateRound(round)).toEqual([]);
  });

  it("allows Vercel Blob image URLs", () => {
    const round: RoundDefinition = {
      ...(starterPack.rounds[0] as RoundDefinition),
      imageUrl:
        "https://abc.public.blob.vercel-storage.com/flashcut/TEST01/round-0.jpg",
    };
    expect(validateRound(round)).toEqual([]);
  });
});

describe("getRoomPack", () => {
  it("uses custom rounds when present", () => {
    const custom = structuredClone(starterPack.rounds) as RoundDefinition[];
    custom[0] = { ...custom[0], answer: "Custom answer", choices: ["Custom answer", "B", "C", "D"] };
    const room: Room = {
      ...baseRoom(),
      status: "lobby",
      customRounds: custom,
    };
    const pack = getRoomPack(room);
    expect(pack?.rounds[0].answer).toBe("Custom answer");
    expect(pack?.rounds.length).toBe(ROUND_COUNT);
  });
});
