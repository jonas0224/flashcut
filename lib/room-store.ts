import { Redis } from "@upstash/redis";
import type { Room } from "./types";

const memoryRooms = new Map<string, Room>();

function redisConfigured(): boolean {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return Boolean(url && token);
}

let redisClient: Redis | null = null;

function getRedis(): Redis {
  if (!redisClient) {
    redisClient = Redis.fromEnv();
  }
  return redisClient;
}

function roomKey(code: string): string {
  return `room:${code}`;
}

export async function loadRoom(code: string): Promise<Room | null> {
  const key = roomKey(code.toUpperCase());

  if (!redisConfigured()) {
    return memoryRooms.get(key) ?? null;
  }

  const data = await getRedis().get<string>(key);
  if (!data) return null;
  return typeof data === "string" ? (JSON.parse(data) as Room) : (data as Room);
}

export async function saveRoom(room: Room): Promise<void> {
  const key = roomKey(room.code);

  if (!redisConfigured()) {
    memoryRooms.set(key, room);
    return;
  }

  const { ROOM_TTL_SECONDS } = await import("./constants");
  await getRedis().set(key, JSON.stringify(room), { ex: ROOM_TTL_SECONDS });
}

/**
 * Save only if the room in storage still matches `expectedVersion`.
 * Prevents poll ticks from clobbering concurrent answer submissions.
 */
export async function saveRoomIfVersion(
  code: string,
  expectedVersion: number,
  room: Room,
): Promise<boolean> {
  const key = roomKey(code.toUpperCase());

  if (!redisConfigured()) {
    const current = memoryRooms.get(key);
    if (!current || current.version !== expectedVersion) return false;
    memoryRooms.set(key, room);
    return true;
  }

  const { ROOM_TTL_SECONDS } = await import("./constants");
  const payload = JSON.stringify(room);
  const result = (await getRedis().eval(
    `local raw = redis.call('GET', KEYS[1])
if not raw then return 0 end
local current = cjson.decode(raw)
if tonumber(current.version) ~= tonumber(ARGV[1]) then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'EX', tonumber(ARGV[3]))
return 1`,
    [key],
    [String(expectedVersion), payload, String(ROOM_TTL_SECONDS)],
  )) as number;
  return result === 1;
}

export async function updateRoom(
  code: string,
  updater: (room: Room) => Room | "noop",
  maxRetries = 16,
): Promise<Room | null> {
  const normalized = code.toUpperCase();

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const room = await loadRoom(normalized);
    if (!room) return null;

    const updated = updater(room);
    if (updated === "noop" || updated === room) return room;

    const next: Room = {
      ...updated,
      version: room.version + 1,
    };

    const saved = await saveRoomIfVersion(normalized, room.version, next);
    if (saved) return next;
  }

  return null;
}

/** For tests */
export function clearMemoryRooms(): void {
  memoryRooms.clear();
}

export function usingMemoryStore(): boolean {
  return !redisConfigured();
}
