"use client";

import { useSyncedPhaseTimer } from "@/hooks/useSyncedPhaseTimer";

export function PhaseBar({
  phaseStartedAt,
  phaseEndsAt,
  durationMs,
  label,
  urgentLastSeconds = 0,
}: {
  phaseStartedAt: number;
  phaseEndsAt: number;
  durationMs: number;
  label: string;
  /** Pulse amber when this many seconds remain (guess phase only). */
  urgentLastSeconds?: number;
}) {
  const { pct, seconds } = useSyncedPhaseTimer(
    phaseStartedAt,
    phaseEndsAt,
    durationMs,
  );

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
