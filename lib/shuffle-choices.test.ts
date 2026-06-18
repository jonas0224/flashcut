import { describe, expect, it } from "vitest";
import { shuffledChoices } from "./shuffle-choices";

const CHOICES = ["Alpha", "Bravo", "Charlie", "Delta"] as const;

describe("shuffledChoices", () => {
  it("returns a permutation of the four choices", () => {
    const shuffled = shuffledChoices(CHOICES, "ABCD12", 0);
    expect([...shuffled].sort()).toEqual([...CHOICES].sort());
  });

  it("shuffles order for most room codes", () => {
    let changed = 0;
    for (let i = 0; i < 50; i++) {
      const code = `ROOM${i}`;
      if (shuffledChoices(CHOICES, code, 0).join() !== CHOICES.join()) changed++;
    }
    expect(changed).toBeGreaterThan(10);
  });

  it("is stable for the same room and round", () => {
    const a = shuffledChoices(CHOICES, "ROOM99", 3);
    const b = shuffledChoices(CHOICES, "ROOM99", 3);
    expect(a).toEqual(b);
  });

  it("varies order across round indexes", () => {
    const r0 = shuffledChoices(CHOICES, "ROOM99", 0);
    const r1 = shuffledChoices(CHOICES, "ROOM99", 1);
    expect(r0).not.toEqual(r1);
  });

  it("does not always leave the first pack choice in slot A", () => {
    const firstIsA = Array.from({ length: 20 }, (_, roundIndex) => {
      const shuffled = shuffledChoices(CHOICES, "MIXED1", roundIndex);
      return shuffled[0] === CHOICES[0];
    });
    expect(firstIsA.some((v) => !v)).toBe(true);
  });
});
