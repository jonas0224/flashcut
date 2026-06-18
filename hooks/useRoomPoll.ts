"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchRoomState } from "@/lib/client";
import {
  readCachedRoom,
  readCachedRoomState,
  writeCachedRoomState,
} from "@/lib/room-state-cache";
import type { RoomPublicState } from "@/lib/types";

function pollIntervalMs(
  state: RoomPublicState | null,
  lobbyFastPoll = false,
): number {
  if (!state) return lobbyFastPoll ? 1200 : 2000;
  if (state.status === "lobby") return lobbyFastPoll ? 1200 : 3000;
  if (state.status === "finished") return 10000;
  if (state.status !== "playing") return 2000;
  if (state.phase === "reveal") return 2000;
  if (state.phase === "guess") return 600;
  if (
    state.phase === "countdown" ||
    state.phase === "peek" ||
    state.phase === "flashcut"
  ) {
    return 500;
  }
  return 1500;
}

/** Poll at phase boundaries; stay quiet during long idle stretches. */
function nextPollDelayMs(
  state: RoomPublicState | null,
  lobbyFastPoll = false,
): number {
  const base = pollIntervalMs(state, lobbyFastPoll);
  if (!state || state.status !== "playing") return base;

  const now = Date.now();
  const msUntilStart = state.phaseStartedAt - now;
  if (msUntilStart > 0) {
    return Math.min(msUntilStart + 50, 2000);
  }

  const msUntilEnd = state.phaseEndsAt - now;
  if (msUntilEnd <= 0) return 300;

  if (state.phase === "guess" && msUntilEnd > 2500) {
    return Math.min(msUntilEnd - 2000, 2000);
  }

  return Math.min(msUntilEnd + 50, base);
}

function stateSnapshot(state: RoomPublicState): string {
  const players = state.players
    .map((p) => `${p.id}:${p.nickname}:${p.totalScore}`)
    .join(",");
  const standings = state.standings
    .map((p) => `${p.id}:${p.totalScore}`)
    .join(",");
  const roundScores = state.roundScores
    ? Object.entries(state.roundScores)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([id, score]) => `${id}:${score}`)
        .join(",")
    : "";
  return [
    state.status,
    state.phase,
    state.roundIndex,
    state.phaseEndsAt,
    players,
    standings,
    roundScores,
    state.yourAnswer ?? "",
    state.answer ?? "",
    state.winnerId ?? "",
  ].join("|");
}

export function useRoomPoll(
  code: string,
  token: string | null | undefined,
  enabled = true,
  options?: { lobbyFastPoll?: boolean },
) {
  const initialCache = readCachedRoom(code);
  const [state, setState] = useState<RoomPublicState | null>(
    () => initialCache?.state ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [stopped, setStopped] = useState(false);

  const codeRef = useRef(code);
  const tokenRef = useRef(token);
  const stateRef = useRef<RoomPublicState | null>(initialCache?.state ?? null);
  const versionRef = useRef<number | null>(initialCache?.version ?? null);
  const snapshotRef = useRef<string | null>(null);
  const refreshChainRef = useRef<Promise<RoomPublicState | null>>(
    Promise.resolve(null),
  );
  const visibleRef = useRef(
    typeof document === "undefined" ? true : document.visibilityState === "visible",
  );

  const lobbyFastPoll = options?.lobbyFastPoll ?? false;
  const lobbyFastPollRef = useRef(lobbyFastPoll);
  lobbyFastPollRef.current = lobbyFastPoll;

  codeRef.current = code;
  tokenRef.current = token;

  const applyState = useCallback((data: RoomPublicState, version: number) => {
    const snap = stateSnapshot(data);
    if (snapshotRef.current === snap && versionRef.current === version) return;
    snapshotRef.current = snap;
    versionRef.current = version;
    stateRef.current = data;
    writeCachedRoomState(codeRef.current, data, version);
    setState(data);
    setError(null);
    setStopped(false);
  }, []);

  const refresh = useCallback(
    async (force = false): Promise<RoomPublicState | null> => {
      const run = async (): Promise<RoomPublicState | null> => {
        const result = await fetchRoomState(
          codeRef.current,
          tokenRef.current ?? undefined,
          force ? undefined : (versionRef.current ?? undefined),
        );

        if (!result.ok) {
          if ("notModified" in result && result.notModified) {
            versionRef.current = result.version;
            return stateRef.current;
          }
          setError("Room not found");
          setStopped(true);
          return null;
        }

        if (force) snapshotRef.current = null;
        applyState(result.state, result.version);
        return result.state;
      };

      const next = refreshChainRef.current.then(run, run);
      refreshChainRef.current = next.then(
        () => null,
        () => null,
      );
      return next;
    },
    [applyState],
  );

  useEffect(() => {
    const cached = readCachedRoom(code);
    snapshotRef.current = null;
    stateRef.current = cached?.state ?? null;
    versionRef.current = cached?.version ?? null;
    refreshChainRef.current = Promise.resolve(null);
    setStopped(false);
    setError(null);
    setState(cached?.state ?? null);
  }, [code]);

  useEffect(() => {
    if (!enabled || !token) return;
    void refresh(true);
  }, [enabled, token, refresh]);

  useEffect(() => {
    if (!enabled || stopped) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const schedule = (delayMs: number) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => void loop(), delayMs);
    };

    const loop = async () => {
      if (cancelled) return;
      if (!visibleRef.current) {
        schedule(1500);
        return;
      }
      await refresh();
      if (cancelled) return;
      schedule(nextPollDelayMs(stateRef.current, lobbyFastPollRef.current));
    };

    void loop();

    const onVisibility = () => {
      visibleRef.current = document.visibilityState === "visible";
      if (visibleRef.current && !cancelled) void refresh(true);
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, stopped, refresh]);

  return {
    state,
    error,
    refresh,
  };
}
