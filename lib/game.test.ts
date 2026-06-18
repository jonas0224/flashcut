import { describe, expect, it } from "vitest";
import { existsSync } from "fs";
import { join } from "path";
import { PHASE_MS, ROUND_COUNT } from "@/lib/constants";
import { advanceRoomOnce, phaseEndsAt, shouldAdvance } from "@/lib/phase-engine";
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

  it("advances peek to flashcut", () => {
    const room = baseRoom();
    const now = 1000 + PHASE_MS.peek + 1;
    expect(shouldAdvance(room, now)).toBe(true);
    const next = advanceRoomOnce(room, starterPack as never, now);
    expect(next.phase).toBe("flashcut");
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
