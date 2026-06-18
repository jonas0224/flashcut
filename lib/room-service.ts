import { randomBytes } from "crypto";
import { CODE_ALPHABET, MAX_PLAYERS, ROUND_COUNT } from "./constants";
import { hashHostPin, validateHostPin, verifyHostPin } from "./host-pin";
import { phaseEndsAt, skipPhase, tickRoom } from "./phase-engine";
import { getPack, getRound, validateRound } from "./packs";
import { getRoomPack, initCustomRounds } from "./room-pack";
import { computeGameAnswerStats, computePlayerAnswerStats, buildRoundPlayerAnswers, buildAllPlayerAnswerStats, pickWinner } from "./scoring";
import { loadRoom, saveRoom, updateRoom } from "./room-store";
import type { Pack, Player, Room, RoomPublicState, RoundDefinition } from "./types";

export function generateRoomCode(): string {
  const bytes = randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

export function generateToken(): string {
  return randomBytes(16).toString("hex");
}

export async function createRoom(
  packId = "starter-01",
  hostPin: string,
): Promise<Room | null> {
  const pinError = validateHostPin(hostPin);
  if (pinError) return null;

  const pack = getPack(packId);
  if (!pack) return null;

  let code = generateRoomCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await loadRoom(code);
    if (!existing) break;
    code = generateRoomCode();
  }

  const room: Room = {
    code,
    hostId: generateToken(),
    hostToken: generateToken(),
    hostPinHash: hashHostPin(hostPin, code),
    status: "lobby",
    packId,
    customRounds: initCustomRounds(packId),
    roundIndex: 0,
    phase: "countdown",
    phaseStartedAt: Date.now(),
    players: {},
    answers: {},
    roundResults: [],
    createdAt: Date.now(),
    maxPlayers: MAX_PLAYERS,
    version: 1,
  };

  await saveRoom(room);
  return room;
}

function uniqueNickname(room: Room, nickname: string): string {
  const existing = new Set(
    Object.values(room.players).map((p) => p.nickname.toLowerCase()),
  );
  if (!existing.has(nickname.toLowerCase())) return nickname;

  let n = 2;
  while (existing.has(`${nickname}-${n}`.toLowerCase())) n++;
  return `${nickname}-${n}`;
}

export async function joinRoom(
  code: string,
  nickname: string,
): Promise<{ room: Room; player: Player } | { error: string; code: string }> {
  const trimmed = nickname.trim();
  if (trimmed.length < 2 || trimmed.length > 20) {
    return { error: "Nickname must be 2–20 characters", code: "INVALID_NICKNAME" };
  }

  const room = await loadRoom(code);
  if (!room) return { error: "Room not found", code: "ROOM_NOT_FOUND" };
  if (room.status !== "lobby") {
    return { error: "Game already started", code: "GAME_STARTED" };
  }

  const playerCount = Object.keys(room.players).length;
  if (playerCount >= room.maxPlayers) {
    return { error: "Room is full", code: "ROOM_FULL" };
  }

  const finalNickname = uniqueNickname(room, trimmed);
  const player: Player = {
    id: generateToken(),
    nickname: finalNickname,
    token: generateToken(),
    totalScore: 0,
    roundsCorrect: 0,
    joinedAt: Date.now(),
  };

  const updated: Room = {
    ...room,
    players: { ...room.players, [player.id]: player },
    version: room.version + 1,
  };
  await saveRoom(updated);

  return { room: updated, player };
}

function getStandings(room: Room, limit = MAX_PLAYERS) {
  return Object.values(room.players)
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, limit)
    .map((p) => ({ id: p.id, nickname: p.nickname, totalScore: p.totalScore }));
}

export function toPublicState(
  room: Room,
  pack: Pack,
  now: number,
  viewerPlayerId?: string,
  isHostViewer = false,
): RoomPublicState {
  const round = getRound(pack, room.roundIndex);
  const endsAt = phaseEndsAt(room, now);

  const base: RoomPublicState = {
    code: room.code,
    status: room.status,
    roundIndex: room.roundIndex,
    roundCount: ROUND_COUNT,
    phase: room.phase,
    phaseStartedAt: room.phaseStartedAt,
    phaseEndsAt: endsAt,
    players: Object.values(room.players).map((p) => ({
      id: p.id,
      nickname: p.nickname,
      totalScore: p.totalScore,
    })),
    standings: getStandings(room),
  };

  if (room.status === "finished") {
    const answerStats = computeGameAnswerStats(room);
    const yourAnswerStats = viewerPlayerId
      ? computePlayerAnswerStats(viewerPlayerId, room)
      : undefined;
    return {
      ...base,
      winnerId: room.winnerId,
      answerStats: isHostViewer ? answerStats : undefined,
      yourAnswerStats,
      playerAnswerStats: isHostViewer
        ? buildAllPlayerAnswerStats(room)
        : undefined,
    };
  }

  if (room.status !== "playing" || !round) return base;

  if (room.phase === "countdown" && isHostViewer) {
    return {
      ...base,
      choices: round.choices,
      imageUrl: round.imageUrl,
      imageMode: round.mode,
      crop: round.crop,
    };
  }

  if (room.phase === "peek") {
    return {
      ...base,
      imageUrl: round.imageUrl,
      imageMode: round.mode,
      crop: round.crop,
    };
  }

  if (room.phase === "flashcut") {
    if (!isHostViewer) return base;
    return {
      ...base,
      imageUrl: round.imageUrl,
      imageMode: round.mode,
      crop: round.crop,
      choices: round.choices,
    };
  }

  if (room.phase === "guess") {
    return {
      ...base,
      choices: round.choices,
      ...(isHostViewer
        ? {
            imageUrl: round.imageUrl,
            imageMode: round.mode,
            crop: round.crop,
          }
        : {}),
    };
  }

  const lastResult = room.roundResults[room.roundResults.length - 1];
  const viewerAnswer = viewerPlayerId
    ? room.answers[viewerPlayerId]
    : undefined;

  return {
    ...base,
    imageUrl: round.imageUrl,
    imageMode: round.mode,
    crop: round.crop,
    choices: round.choices,
    answer: round.answer,
    roundScores: lastResult?.scores,
    roundPlayerAnswers: buildRoundPlayerAnswers(
      room,
      round.answer,
      lastResult?.scores,
    ),
    yourAnswer: viewerAnswer?.choice,
    yourRoundScore: viewerPlayerId
      ? lastResult?.scores[viewerPlayerId]
      : undefined,
  };
}

export async function syncAndGetRoom(
  code: string,
  viewerPlayerId?: string,
  isHostViewer = false,
): Promise<RoomPublicState | null> {
  const now = Date.now();

  const room = await updateRoom(code, (r) => {
    if (r.status !== "playing") return r;
    const pack = getRoomPack(r);
    if (!pack) return r;
    return tickRoom(r, pack, now);
  });

  if (!room) return null;
  const resolvedPack = getRoomPack(room);
  if (!resolvedPack) return null;
  return toPublicState(room, resolvedPack, now, viewerPlayerId, isHostViewer);
}

export async function startGame(
  code: string,
  hostToken: string,
  hostPin?: string,
): Promise<Room | { error: string; code: string }> {
  const room = await loadRoom(code);
  if (!room) return { error: "Room not found", code: "ROOM_NOT_FOUND" };
  const auth = assertHost(room, hostToken, hostPin);
  if ("error" in auth) return auth;
  if (room.status !== "lobby") {
    return { error: "Game already started", code: "GAME_STARTED" };
  }

  const now = Date.now();
  const updated: Room = {
    ...room,
    status: "playing",
    roundIndex: 0,
    phase: "countdown",
    phaseStartedAt: now,
    answers: {},
    roundResults: [],
    version: room.version + 1,
  };
  await saveRoom(updated);
  return updated;
}

export async function submitAnswer(
  code: string,
  playerToken: string,
  choice: string,
): Promise<Room | { error: string; code: string }> {
  let playerId: string | undefined;
  let reject: { error: string; code: string } | undefined;

  const updated = await updateRoom(code, (room) => {
    const player = Object.values(room.players).find((p) => p.token === playerToken);
    if (!player) {
      reject = { error: "Not authorized", code: "UNAUTHORIZED" };
      return "noop";
    }
    playerId = player.id;

    if (room.status !== "playing" || room.phase !== "guess") {
      reject = { error: "Not in guess phase", code: "WRONG_PHASE" };
      return "noop";
    }

    if (room.answers[player.id]) return "noop";

    const pack = getRoomPack(room);
    if (!pack) {
      reject = { error: "Pack not found", code: "PACK_NOT_FOUND" };
      return "noop";
    }

    const round = getRound(pack, room.roundIndex);
    if (!round || !round.choices.includes(choice as (typeof round.choices)[number])) {
      reject = { error: "Invalid choice", code: "INVALID_CHOICE" };
      return "noop";
    }

    const withAnswer: Room = {
      ...room,
      answers: {
        ...room.answers,
        [player.id]: { choice, lockedAt: Date.now() },
      },
      version: room.version + 1,
    };

    return tickRoom(withAnswer, pack, Date.now());
  });

  if (!updated) return { error: "Room not found", code: "ROOM_NOT_FOUND" };
  if (reject) return reject;
  if (playerId && !updated.answers[playerId]) {
    return { error: "Answer not saved", code: "SAVE_FAILED" };
  }
  return updated;
}

export async function skipRound(
  code: string,
  hostToken: string,
  hostPin?: string,
): Promise<Room | { error: string; code: string }> {
  const room = await loadRoom(code);
  if (!room) return { error: "Room not found", code: "ROOM_NOT_FOUND" };
  const auth = assertHost(room, hostToken, hostPin);
  if ("error" in auth) return auth;
  if (room.status !== "playing") {
    return { error: "Game not in progress", code: "WRONG_STATUS" };
  }

  const pack = getRoomPack(room);
  if (!pack) return { error: "Pack not found", code: "PACK_NOT_FOUND" };

  const updated = skipPhase(room, pack, Date.now());
  await saveRoom(updated);
  return updated;
}

export async function endGame(
  code: string,
  hostToken: string,
  hostPin?: string,
): Promise<Room | { error: string; code: string }> {
  const room = await loadRoom(code);
  if (!room) return { error: "Room not found", code: "ROOM_NOT_FOUND" };
  const auth = assertHost(room, hostToken, hostPin);
  if ("error" in auth) return auth;

  const pack = getRoomPack(room);
  const lastRound = pack?.rounds[room.roundIndex];
  const updated: Room = {
    ...room,
    status: "finished",
    version: room.version + 1,
    winnerId:
      room.winnerId ??
      (lastRound
        ? pickWinner(
            room.players,
            room.roundResults,
            room.answers,
            lastRound.answer,
          )
        : undefined),
  };
  await saveRoom(updated);
  return updated;
}

export function findPlayerByToken(room: Room, token: string): Player | undefined {
  return Object.values(room.players).find((p) => p.token === token);
}

function assertHost(
  room: Room,
  hostToken: string,
  hostPin?: string,
): Room | { error: string; code: string } {
  if (room.hostToken !== hostToken) {
    return { error: "Not authorized", code: "UNAUTHORIZED" };
  }
  if (room.hostPinHash) {
    if (!hostPin?.trim()) {
      return { error: "Host PIN required", code: "HOST_PIN_REQUIRED" };
    }
    if (!verifyHostPin(room, hostPin)) {
      return { error: "Wrong host PIN", code: "WRONG_HOST_PIN" };
    }
  }
  return room;
}

function ensureCustomRounds(room: Room): RoundDefinition[] {
  const existing = room.customRounds;
  if (existing?.length === ROUND_COUNT) return existing;
  const seeded = initCustomRounds(room.packId);
  if (!seeded) throw new Error("Pack not found");
  return seeded;
}

export async function verifyHostAccess(
  code: string,
  hostToken: string,
  hostPin?: string,
): Promise<{ ok: true } | { error: string; code: string }> {
  const room = await loadRoom(code);
  if (!room) return { error: "Room not found", code: "ROOM_NOT_FOUND" };
  const auth = assertHost(room, hostToken, hostPin);
  if ("error" in auth) return auth;
  return { ok: true };
}

export async function getHostRounds(
  code: string,
  hostToken: string,
  hostPin?: string,
): Promise<{ rounds: RoundDefinition[] } | { error: string; code: string }> {
  const room = await loadRoom(code);
  if (!room) return { error: "Room not found", code: "ROOM_NOT_FOUND" };
  const auth = assertHost(room, hostToken, hostPin);
  if ("error" in auth) return auth;

  const pack = getRoomPack(room);
  if (!pack) return { error: "Pack not found", code: "PACK_NOT_FOUND" };
  return { rounds: pack.rounds };
}

export async function updateHostRound(
  code: string,
  hostToken: string,
  roundIndex: number,
  patch: RoundDefinition,
  hostPin?: string,
): Promise<{ ok: true } | { error: string; code: string }> {
  if (roundIndex < 0 || roundIndex >= ROUND_COUNT) {
    return { error: "Invalid round index", code: "INVALID_ROUND" };
  }

  const room = await loadRoom(code);
  if (!room) return { error: "Room not found", code: "ROOM_NOT_FOUND" };
  const auth = assertHost(room, hostToken, hostPin);
  if ("error" in auth) return auth;
  if (room.status !== "lobby") {
    return { error: "Can only edit rounds in lobby", code: "GAME_STARTED" };
  }

  const errors = validateRound(patch);
  if (errors.length > 0) {
    return { error: errors.join("; "), code: "INVALID_ROUND" };
  }

  const rounds = ensureCustomRounds(room);
  const nextRounds = [...rounds];
  nextRounds[roundIndex] = patch;

  const updated: Room = {
    ...room,
    customRounds: nextRounds,
    version: room.version + 1,
  };
  await saveRoom(updated);
  return { ok: true };
}

export async function setHostRoundImageUrl(
  code: string,
  hostToken: string,
  roundIndex: number,
  imageUrl: string,
  hostPin?: string,
): Promise<{ imageUrl: string } | { error: string; code: string }> {
  if (roundIndex < 0 || roundIndex >= ROUND_COUNT) {
    return { error: "Invalid round index", code: "INVALID_ROUND" };
  }

  const room = await loadRoom(code);
  if (!room) return { error: "Room not found", code: "ROOM_NOT_FOUND" };
  const auth = assertHost(room, hostToken, hostPin);
  if ("error" in auth) return auth;
  if (room.status !== "lobby") {
    return { error: "Can only edit rounds in lobby", code: "GAME_STARTED" };
  }

  const rounds = ensureCustomRounds(room);
  const current = rounds[roundIndex];
  if (!current) return { error: "Round not found", code: "INVALID_ROUND" };

  const next: RoundDefinition = { ...current, imageUrl };
  const errors = validateRound(next);
  if (errors.length > 0) {
    return { error: errors.join("; "), code: "INVALID_ROUND" };
  }

  const nextRounds = [...rounds];
  nextRounds[roundIndex] = next;
  await saveRoom({
    ...room,
    customRounds: nextRounds,
    version: room.version + 1,
  });

  return { imageUrl };
}
