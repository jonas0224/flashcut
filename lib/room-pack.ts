import { getPack } from "./packs";
import type { Pack, Room, RoundDefinition } from "./types";

export function initCustomRounds(packId: string): RoundDefinition[] | undefined {
  const pack = getPack(packId);
  if (!pack) return undefined;
  return structuredClone(pack.rounds);
}

export function getRoomPack(room: Room): Pack | undefined {
  const base = getPack(room.packId);
  if (!base) return undefined;
  if (!room.customRounds?.length) return base;
  return { ...base, rounds: room.customRounds };
}
