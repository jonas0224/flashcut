"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { useRoomPoll } from "@/hooks/useRoomPoll";
import { getPlayerSession } from "@/lib/client";

const medals = ["🥇", "🥈", "🥉"];

export default function ResultsPage() {
  const params = useParams();
  const code = String(params.code).toUpperCase();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const session = getPlayerSession(code);
    setToken(session?.playerToken ?? null);
  }, [code]);

  const { state } = useRoomPoll(code, token, true);

  if (!state) {
    return (
      <PageShell>
        <main className="flex flex-1 items-center justify-center">
          <p className="text-xl font-bold text-blue-700">Loading results…</p>
        </main>
      </PageShell>
    );
  }

  const sorted = [...state.players].sort((a, b) => b.totalScore - a.totalScore);
  const winner = sorted.find((p) => p.id === state.winnerId) ?? sorted[0];

  return (
    <PageShell>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-10 text-center sm:px-8">
        <p className="fc-label text-lg tracking-widest">Winner</p>
        <h1 className="fc-heading mt-3 text-5xl sm:text-6xl">
          {winner?.nickname ?? "—"}
        </h1>
        <p className="mt-2 text-4xl font-black tabular-nums text-blue-600">
          {winner?.totalScore ?? 0} pts
        </p>

        <ol className="mt-12 space-y-3 text-left">
          {sorted.map((p, i) => (
            <li
              key={p.id}
              className={`flex justify-between rounded-2xl border px-5 py-4 text-lg font-bold ${
                p.id === winner?.id
                  ? "border-blue-300 bg-blue-50 text-blue-900"
                  : "fc-card"
              }`}
            >
              <span>
                {medals[i] ?? `${i + 1}.`} {p.nickname}
              </span>
              <span className="tabular-nums">{p.totalScore}</span>
            </li>
          ))}
        </ol>

        <Link href="/" className="fc-btn-primary mt-12 inline-block text-xl">
          Play again
        </Link>
      </main>
    </PageShell>
  );
}
