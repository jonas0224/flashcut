"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CopyInviteLink } from "@/components/CopyInviteLink";
import { FlashcutPanel } from "@/components/FlashcutPanel";
import { HostPinGate } from "@/components/HostPinGate";
import { HostRoundCountdown } from "@/components/HostRoundCountdown";
import { HostRoundQuestion } from "@/components/HostRoundQuestion";
import { PageShell } from "@/components/PageShell";
import { LobbyPlayerChips } from "@/components/PlayerChip";
import { RoundAnswerBreakdown } from "@/components/RoundAnswerBreakdown";
import { StandingsList } from "@/components/StandingsList";
import { useRoomPoll } from "@/hooks/useRoomPoll";
import { getHostSession, hostAuthHeaders } from "@/lib/client";
import { PHASE_MS } from "@/lib/constants";
import { hostAdvanceLabel, isHostAdvancePrimary } from "@/lib/phase-engine";
import { roomPhaseKey, waitForRoomTransition } from "@/lib/room-flow";

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
      router.replace(`/room/${code}/host/results`);
    }
  }, [state?.status, code, router]);

  async function hostAction(path: "start" | "skip" | "end") {
    if (!hostToken || busy) return;
    const beforeKey = roomPhaseKey(state);
    setBusy(true);
    try {
      const res = await fetch(`/api/rooms/${code}/${path}`, {
        method: "POST",
        headers: hostAuthHeaders(code, hostToken),
      });
      if (!res.ok) return;

      await waitForRoomTransition(
        refresh,
        beforeKey,
        (next) =>
          path === "end"
            ? next.status === "finished"
            : path === "start"
              ? next.status === "playing"
              : roomPhaseKey(next) !== beforeKey,
      );
    } finally {
      setBusy(false);
    }
  }

  if (!hostToken) {
    return (
      <PageShell>
        <main className="flex flex-1 items-center justify-center">
          <p className="text-xl font-bold text-[#b8c9e6]">Loading…</p>
        </main>
      </PageShell>
    );
  }

  const isPlaying = state?.status === "playing";
  const isReveal = isPlaying && state.phase === "reveal";
  const showBreakdown =
    isReveal &&
    state.choices &&
    state.answer &&
    state.roundPlayerAnswers;

  return (
    <PageShell hideFooter={isPlaying} lockScroll={isPlaying}>
      <HostPinGate code={code} hostToken={hostToken}>
        {!state ? (
          <main className="flex flex-1 items-center justify-center">
            <p className="text-xl font-bold text-[#b8c9e6]">Loading…</p>
          </main>
        ) : isPlaying ? (
          <main className="fc-host-play mx-auto">
            <header className="fc-host-play-bar">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <span className="fc-room-code-hero text-2xl sm:text-3xl">{code}</span>
                <span className="text-sm font-semibold text-[#94a8c9]">
                  Round {state.roundIndex + 1}/{state.roundCount}
                </span>
                <span className="text-sm font-bold capitalize text-[#b8c9e6]">
                  {state.phase}
                </span>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void hostAction("skip")}
                  className={
                    isHostAdvancePrimary(state.phase)
                      ? "fc-btn-cta px-4 py-2 text-sm"
                      : "fc-btn-alt px-4 py-2 text-sm"
                  }
                >
                  {hostAdvanceLabel(state.phase)}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void hostAction("end")}
                  className="fc-btn-danger-shell px-4 py-2 text-sm"
                >
                  End
                </button>
              </div>
            </header>

            <div
              className={`fc-host-play-grid ${isReveal ? "fc-host-play-grid--reveal" : ""}`}
            >
              <aside className="fc-host-play-cell">
                <StandingsList
                  standings={state.standings}
                  roundIndex={state.roundIndex}
                  roundScores={isReveal ? state.roundScores : undefined}
                  title="Rankings"
                  surface="shell"
                  compact
                />
              </aside>

              <section className="fc-host-play-cell">
                {state.phase === "countdown" && (
                  <HostRoundCountdown
                    roundIndex={state.roundIndex}
                    roundCount={state.roundCount}
                    compact
                  />
                )}
                {state.phase === "flashcut" && (
                  <FlashcutPanel
                    phaseEndsAt={state.phaseEndsAt}
                    durationMs={PHASE_MS.flashcut}
                    compact
                  />
                )}
                {(state.phase === "peek" ||
                  state.phase === "guess" ||
                  state.phase === "reveal") && (
                  <HostRoundQuestion
                    phase={state.phase}
                    roundIndex={state.roundIndex}
                    roundCount={state.roundCount}
                    imageUrl={state.imageUrl}
                    imageMode={state.imageMode}
                    crop={state.crop}
                    choices={state.choices}
                    answer={isReveal ? state.answer : undefined}
                    compact
                  />
                )}
              </section>

              {showBreakdown && (
                <section className="fc-host-play-cell">
                  <RoundAnswerBreakdown
                    choices={state.choices!}
                    correctAnswer={state.answer!}
                    roundPlayerAnswers={state.roundPlayerAnswers!}
                    surface="shell"
                    compact
                  />
                </section>
              )}
            </div>
          </main>
        ) : (
          <main className="mx-auto w-full max-w-3xl px-5 py-5 sm:px-8">
            <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-[#94a8c9]">
                  Host dashboard
                </p>
                <h1 className="fc-room-code-hero mt-1 text-5xl sm:text-6xl">{code}</h1>
                <p className="fc-hero-subtitle mt-2 text-lg capitalize">{state.status}</p>
              </div>
              <Link href={`/join/${code}`} className="fc-btn-alt px-4 py-2 text-sm">
                Open join page →
              </Link>
            </header>

            {state.status === "lobby" && (
              <>
                <section className="mb-6 space-y-3">
                  <Link
                    href={`/room/${code}/host/rounds`}
                    className="fc-btn-alt inline-block text-base"
                  >
                    Customize rounds (photos & answers)
                  </Link>
                  <p className="text-sm font-medium text-[#94a8c9]">
                    Use the starter pack or upload your own images (JPEG/PNG, max 5 MB
                    per round).
                  </p>
                </section>
                <section className="fc-host-panel mb-5">
                  <CopyInviteLink code={code} variant="shell" className="mb-4" />
                  <p className="mb-3 text-lg text-[#b8c9e6]">
                    Share code{" "}
                    <strong className="fc-room-code text-3xl">{code}</strong> — players
                    only need a nickname.
                  </p>
                  <LobbyPlayerChips players={state.players} />
                  <p className="mt-4 text-base font-semibold text-[#94a8c9]">
                    {state.players.length} players in lobby
                  </p>
                </section>
                <button
                  type="button"
                  disabled={busy || state.players.length === 0}
                  onClick={() => void hostAction("start")}
                  className="fc-btn-cta text-lg"
                >
                  Start game
                </button>
              </>
            )}
          </main>
        )}
      </HostPinGate>
    </PageShell>
  );
}
