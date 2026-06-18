"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HostFinalRankings } from "@/components/HostFinalRankings";
import { HostPinGate } from "@/components/HostPinGate";
import { PageShell } from "@/components/PageShell";
import { useRoomPoll } from "@/hooks/useRoomPoll";
import { getHostSession } from "@/lib/client";

export default function HostResultsPage() {
  const params = useParams();
  const code = String(params.code).toUpperCase();
  const router = useRouter();
  const [hostToken, setHostToken] = useState<string | null>(null);

  useEffect(() => {
    const token = getHostSession(code);
    if (!token) {
      router.replace("/");
      return;
    }
    setHostToken(token);
  }, [code, router]);

  const { state } = useRoomPoll(code, hostToken, Boolean(hostToken));

  useEffect(() => {
    if (!state) return;
    const status = state.status;
    if (status === "lobby") {
      router.replace(`/room/${code}/host`);
      return;
    }
    if (status === "playing") {
      router.replace(`/room/${code}/host`);
    }
  }, [state?.status, code, router]);

  if (!hostToken) {
    return (
      <PageShell>
        <main className="flex flex-1 items-center justify-center">
          <p className="text-xl font-bold text-[#b8c9e6]">Loading…</p>
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <HostPinGate code={code} hostToken={hostToken}>
        {!state ? (
          <main className="flex flex-1 items-center justify-center">
            <p className="text-xl font-bold text-[#b8c9e6]">Loading results…</p>
          </main>
        ) : (
          <main className="mx-auto w-full max-w-3xl px-5 py-5 sm:px-8">
            <header className="mb-5">
              <p className="fc-shell-label">Host summary</p>
              <h1 className="fc-room-code-hero mt-1 text-5xl sm:text-6xl">{code}</h1>
              <p className="fc-hero-subtitle mt-2 text-lg">Game complete</p>
            </header>

            {state.playerAnswerStats && state.playerAnswerStats.length > 0 && (
              <section className="fc-host-panel mb-5 space-y-4">
                {state.answerStats && (
                  <div className="flex flex-wrap gap-6 border-b border-white/10 pb-4">
                    <div>
                      <p className="text-3xl font-black tabular-nums text-fc-correct">
                        {state.answerStats.correct}
                      </p>
                      <p className="text-xs font-bold uppercase tracking-wide text-[#94a8c9]">
                        Total correct
                      </p>
                    </div>
                    <div>
                      <p className="text-3xl font-black tabular-nums text-fc-wrong">
                        {state.answerStats.wrong}
                      </p>
                      <p className="text-xs font-bold uppercase tracking-wide text-[#94a8c9]">
                        Total wrong
                      </p>
                    </div>
                    <div>
                      <p className="text-3xl font-black tabular-nums text-fc-flash">
                        {state.playerAnswerStats.length}
                      </p>
                      <p className="text-xs font-bold uppercase tracking-wide text-[#94a8c9]">
                        Players
                      </p>
                    </div>
                  </div>
                )}

                <HostFinalRankings
                  rows={state.playerAnswerStats}
                  winnerId={state.winnerId}
                />
              </section>
            )}

            <div className="flex flex-wrap gap-3">
              <Link href="/" className="fc-btn-cta text-lg">
                Create new game
              </Link>
              <Link href={`/join/${code}`} className="fc-btn-alt text-lg">
                Open join page
              </Link>
            </div>
          </main>
        )}
      </HostPinGate>
    </PageShell>
  );
}
