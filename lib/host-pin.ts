import { createHash, timingSafeEqual } from "crypto";
import type { Room } from "./types";

export function validateHostPin(pin: string): string | null {
  const normalized = pin.trim();
  if (!/^\d{4,6}$/.test(normalized)) {
    return "Host PIN must be 4–6 digits";
  }
  return null;
}

export function hashHostPin(pin: string, roomCode: string): string {
  return createHash("sha256")
    .update(`flashcut-host:${roomCode}:${pin.trim()}`)
    .digest("hex");
}

export function verifyHostPin(room: Room, pin?: string): boolean {
  if (!room.hostPinHash) return true;
  if (!pin?.trim()) return false;
  const hash = hashHostPin(pin, room.code);
  try {
    const a = Buffer.from(hash, "utf8");
    const b = Buffer.from(room.hostPinHash, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
