import { describe, expect, it } from "vitest";
import {
  getPlayerRank,
  ordinalPlace,
  rankDeltas,
  rankLabel,
  rankMap,
  sortByScore,
  standingsBeforeRound,
} from "./rankings";

const sample = [
  { id: "a", nickname: "A", totalScore: 100 },
  { id: "b", nickname: "B", totalScore: 500 },
  { id: "c", nickname: "C", totalScore: 250 },
];

describe("sortByScore", () => {
  it("orders players by total score descending", () => {
    const sorted = sortByScore(sample);
    expect(sorted.map((p) => p.id)).toEqual(["b", "c", "a"]);
  });
});

describe("getPlayerRank", () => {
  it("returns 1-based rank for a player", () => {
    const sorted = sortByScore(sample);
    expect(getPlayerRank(sorted, "b")).toBe(1);
    expect(getPlayerRank(sorted, "a")).toBe(3);
    expect(getPlayerRank(sorted, "missing")).toBeNull();
  });
});

describe("ordinalPlace", () => {
  it("formats place ordinals", () => {
    expect(ordinalPlace(1)).toBe("1st");
    expect(ordinalPlace(2)).toBe("2nd");
    expect(ordinalPlace(3)).toBe("3rd");
    expect(ordinalPlace(4)).toBe("4th");
    expect(ordinalPlace(11)).toBe("11th");
    expect(ordinalPlace(21)).toBe("21st");
  });
});

describe("rankLabel", () => {
  it("returns medals for the top three", () => {
    expect(rankLabel(0)).toBe("🥇");
    expect(rankLabel(2)).toBe("🥉");
    expect(rankLabel(4)).toBe("5.");
  });
});

describe("standingsBeforeRound", () => {
  it("subtracts round scores from totals", () => {
    const after = [
      { id: "a", nickname: "A", totalScore: 1390 },
      { id: "b", nickname: "B", totalScore: 820 },
    ];
    const before = standingsBeforeRound(after, { a: 972, b: 0 });
    expect(before.map((p) => p.totalScore)).toEqual([418, 820]);
  });
});

describe("rankDeltas", () => {
  it("detects upward and downward movement", () => {
    const previous = { a: 1, b: 0 };
    const next = { a: 0, b: 1 };
    expect(rankDeltas(previous, next)).toEqual({ a: "up", b: "down" });
  });
});
