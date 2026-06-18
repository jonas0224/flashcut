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
  const inFlightRef = useRef(false);
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
    async (force = false) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const data = await fetchRoomState(
          codeRef.current,
          tokenRef.current ?? undefined,
        );
        if (!data) {
          setError("Room not found");
          setStopped(true);
          return;
        }
        if (force) snapshotRef.current = null;
        applyState(data);
      } finally {
        inFlightRef.current = false;
      }
    },
    [applyState],
  );

  useEffect(() => {
    snapshotRef.current = null;
    phaseKeyRef.current = null;
    stateRef.current = null;
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
      schedule(pollIntervalMs(stateRef.current));
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
    refresh: () => refresh(true),
  };
}
