import { rankLabel } from "@/lib/rankings";
import type { PlayerAnswerStatsRow } from "@/lib/types";

type Props = {
  rows: PlayerAnswerStatsRow[];
  winnerId?: string;
  className?: string;
};

export function HostFinalRankings({ rows, winnerId, className = "" }: Props) {
  if (rows.length === 0) return null;

  return (
    <section className={className}>
      <h2 className="fc-shell-label mb-3">Full rankings</h2>
      <div className="overflow-x-auto rounded-2xl border border-white/12">
        <table className="fc-host-results-table w-full min-w-[28rem] text-left">
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col">Player</th>
              <th scope="col" className="text-right">
                Score
              </th>
              <th scope="col" className="text-right">
                Correct
              </th>
              <th scope="col" className="text-right">
                Wrong
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const isWinner = row.playerId === winnerId;
              return (
                <tr
                  key={row.playerId}
                  className={isWinner ? "fc-host-results-winner" : undefined}
                >
                  <td className="tabular-nums">{rankLabel(index)}</td>
                  <td>
                    <span className="font-bold">{row.nickname}</span>
                    {isWinner && (
                      <span className="ml-2 text-xs font-bold uppercase tracking-wide text-fc-flash">
                        Winner
                      </span>
                    )}
                  </td>
                  <td className="text-right tabular-nums font-black text-fc-flash">
                    {row.totalScore}
                  </td>
                  <td className="text-right tabular-nums font-black text-fc-correct">
                    {row.correct}
                  </td>
                  <td className="text-right tabular-nums font-black text-fc-wrong">
                    {row.wrong}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
