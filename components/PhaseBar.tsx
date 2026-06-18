"use client";

import { useEffect, useState } from "react";

export function PhaseBar({
  phaseEndsAt,
  durationMs,
  label,
  urgentLastSeconds = 0,
}: {
  phaseEndsAt: number;
  durationMs: number;
  label: string;
  /** Pulse amber when this many seconds remain (guess phase only). */
  urgentLastSeconds?: number;
}) {
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    const tick = () => {
      setRemainingMs(Math.max(0, phaseEndsAt - Date.now()));
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [phaseEndsAt]);

  const pct = Math.min(100, (remainingMs / durationMs) * 100);
  const seconds = Math.ceil(remainingMs / 1000);
  const urgent =
    urgentLastSeconds > 0 && seconds <= urgentLastSeconds && seconds > 0;

  return (
    <div className="fc-timer-card">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <span className="fc-label text-xs sm:text-sm">{label}</span>
        <span
          className={`fc-timer-digits tabular-nums ${urgent ? "fc-timer-urgent" : ""}`}
        >
          {seconds}s
        </span>
      </div>
      <div className="fc-timer-track">
        <div
          className={`fc-timer-fill ${urgent ? "fc-timer-fill-urgent" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
