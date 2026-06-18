import type { RoomPublicState } from "./types";

export function roomPhaseKey(state: RoomPublicState | null | undefined): string {
  if (!state) return "";
  return `${state.status}:${state.roundIndex}:${state.phase}`;
}

/** Poll until the server reflects a completed action (phase/status change). */
export async function waitForRoomTransition(
  refresh: (force?: boolean) => Promise<RoomPublicState | null>,
  beforeKey: string,
  isDone: (next: RoomPublicState) => boolean,
  maxAttempts = 20,
): Promise<RoomPublicState | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const next = await refresh(true);
    if (next && isDone(next)) return next;
    if (next && roomPhaseKey(next) !== beforeKey) return next;
    await new Promise((r) => setTimeout(r, 80));
  }
  return null;
}
