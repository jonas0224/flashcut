"use client";

import { useEffect, useState } from "react";

/** Timer that stays full until `phaseStartedAt`, then tracks server `phaseEndsAt`. */
export function useSyncedPhaseTimer(
  phaseStartedAt: number,
  phaseEndsAt: number,
  durationMs: number,
) {
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const [inGrace, setInGrace] = useState(
    () => typeof window !== "undefined" && Date.now() < phaseStartedAt,
  );

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      if (now < phaseStartedAt) {
        setInGrace(true);
        setRemainingMs(durationMs);
        return;
      }
      setInGrace(false);
      setRemainingMs(Math.max(0, phaseEndsAt - now));
    };
    tick();
    const id = setInterval(tick, 50);
    return () => clearInterval(id);
  }, [phaseStartedAt, phaseEndsAt, durationMs]);

  const pct = Math.min(100, (remainingMs / durationMs) * 100);
  const seconds = Math.ceil(remainingMs / 1000);

  return { remainingMs, inGrace, pct, seconds };
}
