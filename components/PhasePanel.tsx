import type { ReactNode } from "react";

export function PhasePanel({
  phaseKey,
  children,
  className = "",
  delay = false,
}: {
  phaseKey: string;
  children: ReactNode;
  className?: string;
  delay?: boolean;
}) {
  return (
    <div
      key={phaseKey}
      className={`${delay ? "fc-phase-enter-delayed" : "fc-phase-enter"} ${className}`}
    >
      {children}
    </div>
  );
}
