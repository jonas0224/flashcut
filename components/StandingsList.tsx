import type { RoomPublicState } from "@/lib/types";
import { AnimatedRankings } from "./AnimatedRankings";

export function StandingsList({
  standings,
  roundScores,
  roundIndex,
  highlightId,
  title,
  surface = "light",
  compact = false,
  className = "",
}: {
  standings: RoomPublicState["standings"];
  roundScores?: Record<string, number>;
  roundIndex?: number;
  highlightId?: string;
  title?: string;
  surface?: "light" | "shell";
  compact?: boolean;
  className?: string;
}) {
  return (
    <AnimatedRankings
      standings={standings}
      roundScores={roundScores}
      roundIndex={roundIndex}
      highlightId={highlightId}
      title={title}
      surface={surface}
      compact={compact}
      className={className}
    />
  );
}
