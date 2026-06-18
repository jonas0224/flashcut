import { describe, expect, it } from "vitest";
import { PHASE_MS } from "./constants";
import { computeGameAnswerStats, computePlayerAnswerStats, buildRoundPlayerAnswers, buildAllPlayerAnswerStats, scoreCurrentRound, scoreRound } from "./scoring";
import type { Room } from "./types";

function roomWithTwoPlayers(): Room {
  return {
    code: "TEST01",
    hostId: "h1",
    hostToken: "ht",
    status: "playing",
    packId: "starter-01",
    roundIndex: 0,
    phase: "guess",
    phaseStartedAt: 10_000,
    players: {
      alice: {
        id: "alice",
        nickname: "Alice",
        token: "t1",
        totalScore: 200,
        roundsCorrect: 1,
        joinedAt: 0,
      },
      bob: {
        id: "bob",
        nickname: "Bob",
        token: "t2",
        totalScore: 150,
        roundsCorrect: 1,
        joinedAt: 1,
      },
    },
    answers: {
      alice: { choice: "Cat", lockedAt: 10_500 },
      bob: { choice: "Dog", lockedAt: 10_200 },
    },
    roundResults: [],
    createdAt: 0,
    maxPlayers: 25,
    version: 1,
  };
}

describe("scoreRound", () => {
  const guessStart = 10_000;
  const guessMs = PHASE_MS.guess;

  it("awards max points for instant correct answer", () => {
    expect(scoreRound("Cat", "Cat", guessStart, guessStart, guessMs)).toBe(
      1000,
    );
  });

  it("returns zero for wrong answer", () => {
    expect(scoreRound("Dog", "Cat", guessStart + 500, guessStart, guessMs)).toBe(
      0,
    );
  });
});

describe("scoreCurrentRound", () => {
  it("attributes points to the correct player only", () => {
    const room = roomWithTwoPlayers();
    const { room: scored, roundResult } = scoreCurrentRound(
      room,
      "Cat",
      room.phaseStartedAt,
    );

    expect(roundResult.scores.alice).toBeGreaterThan(0);
    expect(roundResult.scores.bob).toBe(0);
    expect(scored.players.alice.totalScore).toBeGreaterThan(room.players.alice.totalScore);
    expect(scored.players.bob.totalScore).toBe(room.players.bob.totalScore);
    expect(scored.players.alice.roundsCorrect).toBe(2);
    expect(scored.players.bob.roundsCorrect).toBe(1);
  });

  it("gives faster correct answers more points than slower ones", () => {
    const guessStart = 20_000;
    const room: Room = {
      ...roomWithTwoPlayers(),
      phaseStartedAt: guessStart,
      answers: {
        fast: { choice: "Cat", lockedAt: guessStart + 500 },
        slow: { choice: "Cat", lockedAt: guessStart + 8000 },
      },
      players: {
        fast: {
          id: "fast",
          nickname: "Fast",
          token: "t1",
          totalScore: 0,
          roundsCorrect: 0,
          joinedAt: 0,
        },
        slow: {
          id: "slow",
          nickname: "Slow",
          token: "t2",
          totalScore: 0,
          roundsCorrect: 0,
          joinedAt: 1,
        },
      },
    };

    const { roundResult } = scoreCurrentRound(room, "Cat", guessStart);
    expect(roundResult.scores.fast).toBeGreaterThan(roundResult.scores.slow);
    expect(roundResult.scores.slow).toBeGreaterThan(0);
  });

  it("ignores players who did not answer", () => {
    const room = roomWithTwoPlayers();
    room.answers = { alice: { choice: "Cat", lockedAt: 10_100 } };

    const { roundResult } = scoreCurrentRound(room, "Cat", room.phaseStartedAt);
    expect(Object.keys(roundResult.scores)).toEqual(["alice"]);
  });
});

describe("answer stats", () => {
  it("counts correct and wrong answers across the game", () => {
    const room = roomWithTwoPlayers();
    const { room: scored } = scoreCurrentRound(room, "Cat", room.phaseStartedAt);
    scored.roundResults.push({
      roundIndex: 1,
      scores: { alice: 500, bob: 0, carol: 800 },
    });

    expect(computeGameAnswerStats(scored)).toEqual({ correct: 3, wrong: 2 });
    expect(computePlayerAnswerStats("alice", scored)).toEqual({
      correct: 2,
      wrong: 0,
    });
    expect(computePlayerAnswerStats("bob", scored)).toEqual({
      correct: 0,
      wrong: 2,
    });
  });

  it("builds per-player rows sorted by score for host summary", () => {
    const room = roomWithTwoPlayers();
    const { room: scored } = scoreCurrentRound(room, "Cat", room.phaseStartedAt);
    scored.roundResults.push({
      roundIndex: 1,
      scores: { alice: 500, bob: 0 },
    });
    scored.players.alice.totalScore = 1500;
    scored.players.bob.totalScore = 0;

    expect(buildAllPlayerAnswerStats(scored)).toEqual([
      {
        playerId: "alice",
        nickname: "Alice",
        totalScore: 1500,
        correct: 2,
        wrong: 0,
      },
      {
        playerId: "bob",
        nickname: "Bob",
        totalScore: 0,
        correct: 0,
        wrong: 2,
      },
    ]);
  });
});

describe("buildRoundPlayerAnswers", () => {
  it("labels each player correct, wrong, or no answer", () => {
    const room = roomWithTwoPlayers();
    const { room: scored, roundResult } = scoreCurrentRound(
      room,
      "Cat",
      room.phaseStartedAt,
    );

    const breakdown = buildRoundPlayerAnswers(scored, "Cat", roundResult.scores);
    expect(breakdown).toHaveLength(2);
    expect(breakdown.find((a) => a.playerId === "alice")).toMatchObject({
      outcome: "correct",
      choice: "Cat",
    });
    expect(breakdown.find((a) => a.playerId === "bob")).toMatchObject({
      outcome: "wrong",
      choice: "Dog",
    });
  });
});
