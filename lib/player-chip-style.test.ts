import { describe, expect, it } from "vitest";
import {
  LOBBY_CHIP_COLOR_COUNT,
  computeLobbyLayout,
  lobbyChipsMinHeightRem,
  lobbyLayoutHasNoOverlaps,
  playerChipPalette,
  sortPlayersForLobby,
} from "./player-chip-style";

describe("playerChipPalette", () => {
  it("gives each of the first 15 players a unique color", () => {
    const colors = new Set(
      Array.from({ length: 15 }, (_, i) => playerChipPalette(i).bg),
    );
    expect(colors.size).toBe(15);
    expect(LOBBY_CHIP_COLOR_COUNT).toBeGreaterThanOrEqual(15);
  });
});

describe("computeLobbyLayout", () => {
  it("keeps chips inside the play area", () => {
    const players = Array.from({ length: 20 }, (_, i) => ({
      id: `p${i}`,
      nickname: `P${i}`,
    }));
    const { layout, heightRem } = computeLobbyLayout(players);
    expect(heightRem).toBeLessThan(lobbyChipsMinHeightRem(20));
    for (const spot of layout) {
      expect(spot.left).toBeGreaterThanOrEqual(8);
      expect(spot.left).toBeLessThanOrEqual(92);
      expect(spot.top).toBeGreaterThanOrEqual(4);
      expect(spot.top).toBeLessThanOrEqual(96);
    }
  });

  it("never overlaps chips for 20 players", () => {
    const players = Array.from({ length: 20 }, (_, i) => ({
      id: `mock-${String(i).padStart(2, "0")}`,
      nickname: ["Alex", "Blair", "Morgan", "VeryLongNickname"][i % 4],
    }));
    const { layout, heightRem } = computeLobbyLayout(players);
    expect(layout).toHaveLength(20);
    expect(lobbyLayoutHasNoOverlaps(players, layout, heightRem)).toBe(true);
  });

  it("never overlaps chips for 25 players with mixed nickname lengths", () => {
    const players = Array.from({ length: 25 }, (_, i) => ({
      id: `p${i}`,
      nickname: i % 3 === 0 ? "ExtraLongPlayerName" : `P${i}`,
    }));
    const { layout, heightRem } = computeLobbyLayout(players);
    expect(lobbyLayoutHasNoOverlaps(players, layout, heightRem)).toBe(true);
  });

  it("never overlaps with all max-length nicknames", () => {
    const longName = "X".repeat(40);
    const players = Array.from({ length: 25 }, (_, i) => ({
      id: `long-${i}`,
      nickname: longName,
    }));
    const { layout, heightRem } = computeLobbyLayout(players);
    expect(layout).toHaveLength(25);
    expect(lobbyLayoutHasNoOverlaps(players, layout, heightRem)).toBe(true);
  });

  it("is stable for the same lobby", () => {
    const players = [
      { id: "b", nickname: "Bob" },
      { id: "a", nickname: "Amy" },
    ];
    expect(computeLobbyLayout(players)).toEqual(computeLobbyLayout(players));
  });
});

describe("sortPlayersForLobby", () => {
  it("sorts by id for stable color slots", () => {
    const sorted = sortPlayersForLobby([
      { id: "z", nickname: "Zed" },
      { id: "a", nickname: "Amy" },
    ]);
    expect(sorted.map((p) => p.id)).toEqual(["a", "z"]);
  });
});

describe("lobbyChipsMinHeightRem", () => {
  it("grows with player count", () => {
    expect(lobbyChipsMinHeightRem(1)).toBeLessThan(lobbyChipsMinHeightRem(20));
  });
});
