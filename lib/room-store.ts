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

export async function updateRoom(
  code: string,
  updater: (room: Room) => Room,
): Promise<Room | null> {
  const room = await loadRoom(code);
  if (!room) return null;

  const updated = updater(room);
  await saveRoom(updated);
  return updated;
}

/** For tests */
export function clearMemoryRooms(): void {
  memoryRooms.clear();
}

export function usingMemoryStore(): boolean {
  return !redisConfigured();
}
