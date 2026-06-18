import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  createAccessToken,
  isPasswordRequired,
  verifyAccess,
  verifyAccessPassword,
  verifyAccessToken,
} from "./access-control";

describe("access-control", () => {
  const original = process.env.ROOM_PASSWORD;

  afterEach(() => {
    if (original === undefined) delete process.env.ROOM_PASSWORD;
    else process.env.ROOM_PASSWORD = original;
  });

  beforeEach(() => {
    delete process.env.ROOM_PASSWORD;
  });

  it("allows all access when ROOM_PASSWORD is unset", () => {
    expect(isPasswordRequired()).toBe(false);
    expect(verifyAccessPassword()).toBe(true);
    expect(verifyAccess()).toBe(true);
  });

  it("requires matching password when ROOM_PASSWORD is set", () => {
    process.env.ROOM_PASSWORD = "team-secret";
    expect(isPasswordRequired()).toBe(true);
    expect(verifyAccessPassword("wrong")).toBe(false);
    expect(verifyAccessPassword("team-secret")).toBe(true);
  });

  it("issues and verifies access tokens", () => {
    process.env.ROOM_PASSWORD = "team-secret";
    const token = createAccessToken();
    expect(token).toBeTruthy();
    expect(verifyAccessToken(token)).toBe(true);
    expect(verifyAccessToken("bad")).toBe(false);
    expect(verifyAccess("", token)).toBe(true);
  });

  it("edge token matches node token", async () => {
    process.env.ROOM_PASSWORD = "team-secret";
    const { verifyEdgeAccessCookie } = await import("./access-edge");
    const token = createAccessToken();
    expect(await verifyEdgeAccessCookie(token)).toBe(true);
  });
});
