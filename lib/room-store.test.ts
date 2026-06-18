import { afterEach, describe, expect, it } from "vitest";
import { clearMemoryRooms, saveRoom, saveRoomIfVersion, updateRoom } from "./room-store";
import type { Room } from "./types";

const baseRoom = (): Room => ({
  code: "RACE01",
  hostId: "h1",
  hostToken: "ht",
  status: "playing",
  packId: "starter-01",
  roundIndex: 0,
  phase: "guess",
  phaseStartedAt: Date.now(),
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

describe("saveRoomIfVersion", () => {
  afterEach(() => {
    clearMemoryRooms();
  });

  it("rejects stale writes when version changed", async () => {
    const room = baseRoom();
    await saveRoom(room);

    const stale = await saveRoomIfVersion("RACE01", 1, {
      ...room,
      version: 2,
      answers: { p1: { choice: "A", lockedAt: 100 } },
    });
    expect(stale).toBe(true);

    const lost = await saveRoomIfVersion("RACE01", 1, {
      ...room,
      version: 2,
      answers: {},
    });
    expect(lost).toBe(false);
  });
});

describe("updateRoom", () => {
  afterEach(() => {
    clearMemoryRooms();
  });

  it("retries when a concurrent write bumps the version", async () => {
    const room = baseRoom();
    await saveRoom(room);

    let attempts = 0;
    const result = await updateRoom("RACE01", (r) => {
      attempts += 1;
      if (attempts === 1) {
        void saveRoom({ ...r, version: r.version + 1, phase: "reveal" });
      }
      return {
        ...r,
        answers: { p1: { choice: "Fast", lockedAt: Date.now() } },
      };
    });

    expect(result?.answers.p1?.choice).toBe("Fast");
    expect(attempts).toBeGreaterThan(1);
  });
});
