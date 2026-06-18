"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { StandingsList } from "@/components/StandingsList";
import { useRoomPoll } from "@/hooks/useRoomPoll";
import { getHostSession } from "@/lib/client";

export default function HostPage() {
  const params = useParams();
  const code = String(params.code).toUpperCase();
  const router = useRouter();
  const [hostToken, setHostToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const token = getHostSession(code);
    if (!token) {
      router.replace("/");
      return;
    }
    setHostToken(token);
  }, [code, router]);

  const { state, refresh } = useRoomPoll(code, hostToken, Boolean(hostToken));

  useEffect(() => {
    if (state?.status === "finished") {
      router.replace(`/room/${code}/results`);
    }
  }, [state?.status, code, router]);

  async function hostAction(path: string) {
    if (!hostToken) return;
    setBusy(true);
    try {
      await fetch(`/api/rooms/${code}/${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${hostToken}` },
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!state || !hostToken) {
    return (
      <PageShell>
        <main className="flex flex-1 items-center justify-center">
          <p className="text-xl font-bold text-blue-700">Loading…</p>
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 sm:px-8">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="fc-label tracking-widest">Host dashboard</p>
            <h1 className="fc-heading text-4xl">{code}</h1>
            <p className="fc-subtext mt-1 text-lg capitalize">
              {state.status}
              {state.status === "playing" &&
                ` · Round ${state.roundIndex + 1}/${state.roundCount} · ${state.phase}`}
            </p>
          </div>
          <Link
            href={`/join/${code}`}
            className="fc-btn-secondary px-4 py-2 text-sm"
          >
            Player join link →
          </Link>
        </header>

        {state.status === "lobby" && (
          <section className="mb-6">
            <Link
              href={`/room/${code}/host/rounds`}
              className="fc-btn-secondary inline-block text-base"
            >
              Edit rounds (images & answers)
            </Link>
          </section>
        )}

        {state.status === "lobby" && (
          <section className="fc-panel mb-8">
            <p className="mb-4 text-lg text-blue-900">
              Share code{" "}
              <strong className="text-3xl font-black text-blue-600">
                {code}
              </strong>{" "}
              — players only need a nickname.
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {state.players.map((p) => (
                <li key={p.id} className="fc-card font-bold">
                  {p.nickname}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-base font-semibold text-blue-500">
              {state.players.length} players in lobby
            </p>
          </section>
        )}

        {state.status === "playing" && (
          <section className="mb-8">
            <StandingsList standings={state.standings} />
          </section>
        )}

        <div className="flex flex-wrap gap-3">
          {state.status === "lobby" && (
            <button
              type="button"
              disabled={busy || state.players.length === 0}
              onClick={() => void hostAction("start")}
              className="fc-btn-primary text-lg"
            >
              Start game
            </button>
          )}
          {state.status === "playing" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void hostAction("skip")}
              className="fc-btn-secondary text-lg"
            >
              Skip phase
            </button>
          )}
          {state.status !== "finished" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void hostAction("end")}
              className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-lg font-bold text-red-700 hover:bg-red-100"
            >
              End game
            </button>
          )}
        </div>
      </main>
    </PageShell>
  );
}
