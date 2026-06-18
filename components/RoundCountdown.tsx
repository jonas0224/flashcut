"use client";

import { useEffect, useState } from "react";

type Props = {
  phaseStartedAt: number;
  phaseEndsAt: number;
  durationMs: number;
  roundLabel?: string;
  waitingForHost?: boolean;
};

const RING_R = 88;
const RING_C = 2 * Math.PI * RING_R;

export function RoundCountdown({
  phaseStartedAt,
  phaseEndsAt,
  durationMs,
  roundLabel,
  waitingForHost = false,
}: Props) {
  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);

  useEffect(() => {
    if (waitingForHost) return;
    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, phaseEndsAt - now);
      const elapsedSec = Math.floor((now - phaseStartedAt) / 1000);
      const left = Math.max(0, totalSeconds - elapsedSec);
      setRemainingMs(remaining);
      setSecondsLeft(left);
    };
    tick();
    const id = setInterval(tick, 50);
    return () => clearInterval(id);
  }, [phaseEndsAt, phaseStartedAt, totalSeconds, waitingForHost]);

  if (waitingForHost) {
    return (
      <div className="fc-game-panel fc-countdown-panel fc-phase-enter flex min-h-[52dvh] flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        {roundLabel && <p className="fc-countdown-eyebrow">{roundLabel}</p>}
        <p className="fc-countdown-value relative z-10 my-10 text-5xl sm:text-6xl">
          …
        </p>
        <p className="fc-countdown-subtitle">Waiting for host to start the round</p>
      </div>
    );
  }

  const isGo = secondsLeft === 0;
  const display = isGo ? "Go!" : String(secondsLeft);
  const pct = Math.min(100, (remainingMs / durationMs) * 100);
  const ringOffset = RING_C * (1 - pct / 100);

  return (
    <div className="fc-game-panel fc-countdown-panel fc-phase-enter flex min-h-[52dvh] flex-1 flex-col items-center justify-center px-6 py-10">
      {roundLabel && (
        <p className="fc-countdown-eyebrow">{roundLabel}</p>
      )}

      <div className="fc-countdown-hero relative my-8 flex items-center justify-center">
        <svg
          className="absolute inset-0 h-full w-full -rotate-90"
          viewBox="0 0 200 200"
          aria-hidden
        >
          <circle
            cx="100"
            cy="100"
            r={RING_R}
            className="fc-countdown-ring-bg"
          />
          <circle
            cx="100"
            cy="100"
            r={RING_R}
            className={`fc-countdown-ring-progress ${isGo ? "fc-countdown-ring-progress-go" : ""}`}
            strokeDasharray={RING_C}
            strokeDashoffset={ringOffset}
          />
        </svg>
        <p
          key={display}
          className={`fc-countdown-value relative z-10 ${
            isGo ? "fc-countdown-go fc-countdown-value-go" : "fc-countdown-digit"
          }`}
        >
          {display}
        </p>
      </div>

      <p className="fc-countdown-subtitle">
        {isGo ? "Let's go!" : "Get ready…"}
      </p>
    </div>
  );
}
