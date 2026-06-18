"use client";

import { useEffect, useState } from "react";

export function PhaseBar({
  phaseEndsAt,
  durationMs,
  label,
}: {
  phaseEndsAt: number;
  durationMs: number;
  label: string;
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

  return (
    <div className="w-full">
      <div className="mb-1 flex justify-between text-sm font-bold uppercase tracking-wide text-blue-700">
        <span>{label}</span>
        <span>{Math.ceil(remainingMs / 1000)}s</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-blue-100 shadow-inner">
        <div
          className="h-full rounded-full bg-blue-600 transition-[width] duration-150 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
