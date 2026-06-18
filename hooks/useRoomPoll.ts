"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchRoomState } from "@/lib/client";
import type { RoomPublicState } from "@/lib/types";

function pollIntervalMs(state: RoomPublicState | null): number {
  if (!state) return 2000;
  if (state.status === "lobby") return 3000;
  if (state.status === "finished") return 10000;
  if (state.status !== "playing") return 2000;
  if (
    state.phase === "countdown" ||
    state.phase === "peek" ||
    state.phase === "flashcut" ||
    state.phase === "guess"
  ) {
    return 400;
  }
  return 1500;
}

/** Poll at phase end when possible so transitions land on time, not on a fixed cadence. */
function nextPollDelayMs(state: RoomPublicState | null): number {
  const base = pollIntervalMs(state);
  if (!state || state.status !== "playing" || state.phase === "reveal") {
    return base;
  }

  const msUntilEnd = state.phaseEndsAt - Date.now();
  if (msUntilEnd <= 0) return 100;
  return Math.min(msUntilEnd + 50, base);
}

/** Cheap equality — skip React updates when poll payload is unchanged. */
function stateSnapshot(state: RoomPublicState): string {
  const players = state.players
    .map((p) => `${p.id}:${p.totalScore}`)
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
) {
  const [state, setState] = useState<RoomPublicState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stopped, setStopped] = useState(false);

  const codeRef = useRef(code);
  const tokenRef = useRef(token);
  const stateRef = useRef<RoomPublicState | null>(null);
  const snapshotRef = useRef<string | null>(null);
  const phaseKeyRef = useRef<string | null>(null);
  const refreshChainRef = useRef<Promise<RoomPublicState | null>>(
    Promise.resolve(null),
  );
  const visibleRef = useRef(
    typeof document === "undefined" ? true : document.visibilityState === "visible",
  );

  codeRef.current = code;
  tokenRef.current = token;

  const applyState = useCallback((data: RoomPublicState) => {
    const snap = stateSnapshot(data);
    if (snapshotRef.current === snap) return;
    snapshotRef.current = snap;
    stateRef.current = data;
    setState(data);
    setError(null);
    setStopped(false);
  }, []);

  const refresh = useCallback(
    async (force = false): Promise<RoomPublicState | null> => {
      const run = async (): Promise<RoomPublicState | null> => {
        const data = await fetchRoomState(
          codeRef.current,
          tokenRef.current ?? undefined,
        );
        if (!data) {
          setError("Room not found");
          setStopped(true);
          return null;
        }
        if (force) snapshotRef.current = null;
        applyState(data);
        return data;
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
    snapshotRef.current = null;
    phaseKeyRef.current = null;
    stateRef.current = null;
    refreshChainRef.current = Promise.resolve(null);
    setStopped(false);
    setError(null);
    setState(null);
  }, [code, token]);

  useEffect(() => {
    if (!enabled || stopped || state?.status !== "playing") return;
    const phaseKey = `${state.roundIndex}:${state.phase}`;
    if (phaseKeyRef.current === phaseKey) return;
    phaseKeyRef.current = phaseKey;
    void refresh(true);
  }, [enabled, stopped, refresh, state?.roundIndex, state?.phase, state?.status]);

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
        schedule(1000);
        return;
      }
      await refresh();
      if (cancelled) return;
      schedule(nextPollDelayMs(stateRef.current));
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
