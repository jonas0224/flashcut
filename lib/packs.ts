import starterPack from "@/content/packs/starter-01.json";
import type { Pack, RoundDefinition } from "./types";

const packs: Record<string, Pack> = {
  [starterPack.id]: starterPack as Pack,
};

export function getPack(packId: string): Pack | undefined {
  return packs[packId];
}

export function isAllowedImageUrl(imageUrl: string): boolean {
  if (imageUrl.startsWith("/packs/") || imageUrl.startsWith("/uploads/")) {
    return true;
  }
  if (imageUrl.startsWith("https://") && imageUrl.includes(".blob.vercel-storage.com")) {
    return true;
  }
  return false;
}

export function validateRound(round: RoundDefinition): string[] {
  const errors: string[] = [];

  if (round.choices.length !== 4) {
    errors.push("choices must be length 4");
  }
  if (!round.choices.includes(round.answer)) {
    errors.push("answer must match a choice");
  }
  if (!isAllowedImageUrl(round.imageUrl)) {
    errors.push("imageUrl must be a pack, upload, or team blob URL");
  }
  if (round.mode === "zoom" && !round.crop) {
    errors.push("zoom mode requires crop");
  }

  return errors;
}

export function validatePack(pack: Pack): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const round of pack.rounds) {
    if (ids.has(round.id)) errors.push(`Duplicate round id: ${round.id}`);
    ids.add(round.id);
    for (const msg of validateRound(round)) {
      errors.push(`Round ${round.id}: ${msg}`);
    }
  }

  return errors;
}

export function getRound(pack: Pack, roundIndex: number): RoundDefinition | undefined {
  return pack.rounds[roundIndex];
}

export { starterPack };
