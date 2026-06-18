"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AnimatedRankings } from "@/components/AnimatedRankings";
import { PageShell } from "@/components/PageShell";
import { RankingsPodium } from "@/components/RankingsPodium";
import { useRoomPoll } from "@/hooks/useRoomPoll";
import { getHostSession, getPlayerSession } from "@/lib/client";
import { sortByScore } from "@/lib/rankings";

export default function ResultsPage() {
  const params = useParams();
  const code = String(params.code).toUpperCase();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (getHostSession(code)) {
      router.replace(`/room/${code}/host/results`);
      return;
    }
    const session = getPlayerSession(code);
    setToken(session?.playerToken ?? null);
  }, [code, router]);

  const { state } = useRoomPoll(code, token, true);

  const players = state?.players ?? [];
  const standingsKey = players
    .map((p) => `${p.id}:${p.totalScore}`)
    .join("|");
  const sorted = useMemo(
    () => (players.length > 0 ? sortByScore(players) : []),
    [standingsKey],
  );
  const topThree = useMemo(() => sorted.slice(0, 3), [standingsKey]);
  const session = getPlayerSession(code);

  if (!state) {
    return (
      <PageShell>
        <main className="flex flex-1 items-center justify-center">
          <p className="text-xl font-bold text-white">Loading results…</p>
        </main>
      </PageShell>
    );
  }

  const winner = sorted.find((p) => p.id === state.winnerId) ?? sorted[0];

  return (
    <PageShell>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-12 text-center sm:px-8 sm:py-14">
        <p className="text-lg font-bold uppercase tracking-widest text-[#b8c9e6]">
          Final rankings
        </p>

        <RankingsPodium players={topThree} winnerId={state.winnerId} />

        <div className="fc-results-after-podium">
          <div className="fc-panel space-y-3 pb-2 text-center">
            <p className="fc-label text-lg tracking-widest">Winner</p>
            <h1 className="fc-heading text-5xl sm:text-6xl">
              {winner?.nickname ?? "—"}
            </h1>
            <p className="text-4xl font-black tabular-nums text-fc-primary">
              {winner?.totalScore ?? 0} pts
            </p>
          </div>

          {state.yourAnswerStats && session && (
            <div className="fc-panel mt-4 space-y-3 pb-2 text-center">
              <p className="fc-label text-lg tracking-widest">Your answers</p>
              <div className="flex flex-wrap items-center justify-center gap-6">
                <div>
                  <p className="text-4xl font-black tabular-nums text-fc-correct">
                    {state.yourAnswerStats.correct}
                  </p>
                  <p className="text-sm font-bold uppercase tracking-wide text-blue-800">
                    Correct
                  </p>
                </div>
                <div>
                  <p className="text-4xl font-black tabular-nums text-fc-wrong">
                    {state.yourAnswerStats.wrong}
                  </p>
                  <p className="text-sm font-bold uppercase tracking-wide text-blue-800">
                    Wrong
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="fc-panel mt-4 pt-2 text-left">
            <AnimatedRankings
              standings={sorted}
              highlightId={session?.playerId}
              title="Full standings"
            />
          </div>

          <Link href="/" className="fc-btn-cta mt-8 inline-block text-xl">
            Play again
          </Link>
        </div>
      </main>
    </PageShell>
  );
}
