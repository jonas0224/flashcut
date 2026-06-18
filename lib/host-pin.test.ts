import { describe, expect, it } from "vitest";
import { hashHostPin, validateHostPin, verifyHostPin } from "./host-pin";
import type { Room } from "./types";

const roomWithPin = (pin: string): Room => ({
  code: "ABC123",
  hostId: "h1",
  hostToken: "ht",
  hostPinHash: hashHostPin(pin, "ABC123"),
  status: "lobby",
  packId: "starter-01",
  roundIndex: 0,
  phase: "countdown",
  phaseStartedAt: 0,
  players: {},
  answers: {},
  roundResults: [],
  createdAt: 0,
  maxPlayers: 25,
  version: 1,
});

describe("validateHostPin", () => {
  it("accepts 4–6 digit pins", () => {
    expect(validateHostPin("1234")).toBeNull();
    expect(validateHostPin("123456")).toBeNull();
  });

  it("rejects short or non-numeric pins", () => {
    expect(validateHostPin("123")).not.toBeNull();
    expect(validateHostPin("abcd")).not.toBeNull();
  });
});

describe("verifyHostPin", () => {
  it("matches the stored hash", () => {
    const room = roomWithPin("4321");
    expect(verifyHostPin(room, "4321")).toBe(true);
    expect(verifyHostPin(room, "9999")).toBe(false);
    expect(verifyHostPin(room, undefined)).toBe(false);
  });
});
