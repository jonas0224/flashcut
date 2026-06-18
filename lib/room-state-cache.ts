import type { RoomPublicState } from "./types";

type CachedRoomPayload = {
  state: RoomPublicState;
  version: number;
};

function cacheKey(code: string): string {
  return `flashcut:room-state:${code.toUpperCase()}`;
}

export function readCachedRoom(code: string): CachedRoomPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(cacheKey(code));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedRoomPayload | RoomPublicState;
    if ("version" in parsed && "state" in parsed) {
      return parsed as CachedRoomPayload;
    }
    return { state: parsed as RoomPublicState, version: 0 };
  } catch {
    return null;
  }
}

export function readCachedRoomState(code: string): RoomPublicState | null {
  return readCachedRoom(code)?.state ?? null;
}

export function readCachedRoomVersion(code: string): number | null {
  return readCachedRoom(code)?.version ?? null;
}

export function writeCachedRoomState(
  code: string,
  state: RoomPublicState,
  version: number,
): void {
  if (typeof window === "undefined") return;
  const payload: CachedRoomPayload = { state, version };
  sessionStorage.setItem(cacheKey(code), JSON.stringify(payload));
}
