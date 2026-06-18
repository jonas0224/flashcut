"use client";

import { useEffect, useState } from "react";

type Props = {
  phaseEndsAt: number;
  durationMs: number;
  compact?: boolean;
};

export function FlashcutPanel({ phaseEndsAt, durationMs, compact = false }: Props) {
  const [remainingMs, setRemainingMs] = useState(durationMs);

  useEffect(() => {
    const tick = () => {
      setRemainingMs(Math.max(0, phaseEndsAt - Date.now()));
    };
    tick();
    const id = setInterval(tick, 50);
    return () => clearInterval(id);
  }, [phaseEndsAt]);

  const pct = Math.min(100, (remainingMs / durationMs) * 100);

  return (
    <div
      className={`fc-flashcut-panel fc-flashcut-enter flex flex-col items-center justify-center text-center ${
        compact ? "h-full min-h-0 px-4 py-6" : "min-h-[48dvh] px-6 py-10"
      }`}
    >
      <div className="fc-flashcut-burst" aria-hidden>
        <span className="fc-flashcut-ring" />
        <span className="fc-flashcut-icon">⚡</span>
      </div>

      <p className="fc-flashcut-eyebrow">Memory test</p>
      <h2 className="fc-flashcut-title">FLASHCUT</h2>
      <p className="fc-flashcut-subtitle">What was it?</p>

      <p className={`fc-flashcut-hint max-w-xs font-semibold text-white/60 ${compact ? "mt-3 text-xs" : "mt-6 text-sm"}`}>
        Picture it in your mind — answers coming up
      </p>

      <div className={`fc-flashcut-timer w-full max-w-[14rem] ${compact ? "mt-4" : "mt-8"}`}>
        <div className="fc-flashcut-timer-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
