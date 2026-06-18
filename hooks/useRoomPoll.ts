"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchRoomState } from "@/lib/client";
import type { RoomPublicState } from "@/lib/types";

export function useRoomPoll(
  code: string,
  token: string | null | undefined,
  enabled = true,
) {
  const [state, setState] = useState<RoomPublicState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const data = await fetchRoomState(code, token ?? undefined);
    if (!data) {
      setError("Room not found");
      return;
    }
    setError(null);
    setState(data);
  }, [code, token]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const interval =
      state?.status === "playing" ? 800 : state?.status === "lobby" ? 3000 : 2000;
    const id = setInterval(() => void refresh(), interval);
    return () => clearInterval(id);
  }, [enabled, refresh, state?.status]);

  return { state, error, refresh };
}
