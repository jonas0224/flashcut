import type { RoomPublicState } from "./types";

const HOST_KEY = (code: string) => `flashcut:host:${code}`;
const HOST_PIN_KEY = (code: string) => `flashcut:hostpin:${code}`;
const PLAYER_KEY = (code: string) => `flashcut:player:${code}`;

export function saveHostSession(code: string, hostToken: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(HOST_KEY(code), hostToken);
}

export function saveHostPin(code: string, hostPin: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(HOST_PIN_KEY(code), hostPin);
}

export function getHostPin(code: string): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(HOST_PIN_KEY(code));
}

export function clearHostPin(code: string) {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(HOST_PIN_KEY(code));
}

export function hostAuthHeaders(code: string, hostToken: string): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${hostToken}`,
  };
  const pin = getHostPin(code);
  if (pin) headers["X-Flashcut-Host-Pin"] = pin;
  return headers;
}

export function getHostSession(code: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(HOST_KEY(code));
}

export function savePlayerSession(
  code: string,
  playerId: string,
  playerToken: string,
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    PLAYER_KEY(code),
    JSON.stringify({ playerId, playerToken }),
  );
}

export function getPlayerSession(code: string): {
  playerId: string;
  playerToken: string;
} | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PLAYER_KEY(code));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { playerId: string; playerToken: string };
  } catch {
    return null;
  }
}

export async function fetchAccessConfig(): Promise<{
  passwordRequired: boolean;
  customUploadsEnabled: boolean;
}> {
  const res = await fetch("/api/config", { cache: "no-store" });
  if (!res.ok) {
    return { passwordRequired: false, customUploadsEnabled: true };
  }
  return res.json() as Promise<{
    passwordRequired: boolean;
    customUploadsEnabled: boolean;
  }>;
}

export type FetchRoomStateResult =
  | { ok: true; state: RoomPublicState; version: number }
  | { ok: false; notModified: true; version: number }
  | { ok: false; notModified?: false };

export async function fetchRoomState(
  code: string,
  token?: string,
  ifNoneMatch?: number,
): Promise<FetchRoomStateResult> {
  const headers: HeadersInit = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (ifNoneMatch != null) headers["If-None-Match"] = `"${ifNoneMatch}"`;

  const res = await fetch(`/api/rooms/${code}`, { headers, cache: "no-store" });
  if (res.status === 304) {
    const etag = res.headers.get("etag");
    const version = etag ? Number(etag.replace(/"/g, "")) : ifNoneMatch ?? 0;
    return { ok: false, notModified: true, version };
  }
  if (!res.ok) return { ok: false };
  const state = (await res.json()) as RoomPublicState;
  const etag = res.headers.get("etag");
  const version = etag ? Number(etag.replace(/"/g, "")) : 0;
  return { ok: true, state, version };
}

export async function fetchHostRounds(
  code: string,
  hostToken: string,
): Promise<{ rounds: import("./types").RoundDefinition[] } | null> {
  const res = await fetch(`/api/rooms/${code}/rounds`, {
    headers: hostAuthHeaders(code, hostToken),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ rounds: import("./types").RoundDefinition[] }>;
}

export async function saveHostRound(
  code: string,
  hostToken: string,
  roundIndex: number,
  round: import("./types").RoundDefinition,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/rooms/${code}/rounds/${roundIndex}`, {
    method: "PATCH",
    headers: {
      ...hostAuthHeaders(code, hostToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(round),
  });
  if (!res.ok) {
    const data = (await res.json()) as { error?: string };
    return { ok: false, error: data.error ?? "Save failed" };
  }
  return { ok: true };
}

export async function uploadHostRoundImage(
  code: string,
  hostToken: string,
  roundIndex: number,
  file: File,
): Promise<{ imageUrl: string } | { error: string }> {
  const form = new FormData();
  form.append("image", file);
  const res = await fetch(`/api/rooms/${code}/rounds/${roundIndex}/image`, {
    method: "POST",
    headers: hostAuthHeaders(code, hostToken),
    body: form,
  });
  const data = (await res.json()) as { imageUrl?: string; error?: string };
  if (!res.ok) return { error: data.error ?? "Upload failed" };
  if (!data.imageUrl) return { error: "Upload failed" };
  return { imageUrl: data.imageUrl };
}
