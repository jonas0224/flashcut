"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchRoomState } from "@/lib/client";
import type { RoomPublicState } from "@/lib/types";

function pollIntervalMs(state: RoomPublicState | null, stopped: boolean): number {
  if (stopped) return 0;
  if (!state) return 800;
  if (state.status === "lobby") return 800;
  if (state.status === "finished") return 5000;
  if (state.status !== "playing") return 1500;
  if (
    state.phase === "countdown" ||
    state.phase === "peek" ||
    state.phase === "flashcut" ||
    state.phase === "guess"
  ) {
    return 250;
  }
  return 700;
}

export function useRoomPoll(
  code: string,
  token: string | null | undefined,
  enabled = true,
) {
  const [state, setState] = useState<RoomPublicState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stopped, setStopped] = useState(false);
  const phaseKeyRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    const data = await fetchRoomState(code, token ?? undefined);
    if (!data) {
      setError("Room not found");
      setStopped(true);
      return;
    }
    setError(null);
    setStopped(false);
    setState(data);
  }, [code, token]);

  useEffect(() => {
    if (!enabled) return;
    setStopped(false);
    setError(null);
    void refresh();
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled || stopped) return;
    const interval = pollIntervalMs(state, stopped);
    if (interval <= 0) return;
    const id = setInterval(() => void refresh(), interval);
    return () => clearInterval(id);
  }, [enabled, stopped, refresh, state?.status, state?.phase, state?.roundIndex]);

  useEffect(() => {
    if (!enabled || stopped || state?.status !== "playing") return;
    const phaseKey = `${state.roundIndex}:${state.phase}`;
    if (phaseKeyRef.current === phaseKey) return;
    phaseKeyRef.current = phaseKey;
    void refresh();
  }, [enabled, stopped, refresh, state?.roundIndex, state?.phase, state?.status]);

  return { state, error, refresh };
}
