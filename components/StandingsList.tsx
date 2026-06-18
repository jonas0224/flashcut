import type { RoomPublicState } from "@/lib/types";

const medals = ["🥇", "🥈", "🥉", "4.", "5."];

export function StandingsList({
  standings,
}: {
  standings: RoomPublicState["standings"];
}) {
  if (standings.length === 0) return null;

  return (
    <ol className="space-y-2 text-base">
      {standings.map((p, i) => (
        <li
          key={p.id}
          className="fc-card flex justify-between"
        >
          <span>
            {medals[i] ?? `${i + 1}.`} {p.nickname}
          </span>
          <span className="tabular-nums">{p.totalScore}</span>
        </li>
      ))}
    </ol>
  );
}
