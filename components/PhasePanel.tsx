import type { ReactNode } from "react";

export function PhasePanel({
  phaseKey,
  children,
  className = "",
  delay = false,
  panel = true,
}: {
  phaseKey: string;
  children: ReactNode;
  className?: string;
  delay?: boolean;
  panel?: boolean;
}) {
  const anim = delay ? "fc-phase-enter-delayed" : "fc-phase-enter";
  const shell = panel ? `fc-game-panel ${className}` : className;

  return (
    <div key={phaseKey} className={`${anim} ${shell}`}>
      {children}
    </div>
  );
}
