"use client";

import { useEffect, useRef, useState } from "react";

export function useCountUp(target: number, duration = 700, enabled = true) {
  const [display, setDisplay] = useState(target);
  const prevTarget = useRef(target);

  useEffect(() => {
    if (!enabled) {
      setDisplay(target);
      prevTarget.current = target;
      return;
    }

    const from = prevTarget.current;
    prevTarget.current = target;
    if (from === target) return;

    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(from + (target - from) * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, enabled]);

  return display;
}
