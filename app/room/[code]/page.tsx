"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnswerResult } from "@/components/AnswerResult";
import { GameImage, RevealImages } from "@/components/GameImage";
import { PageShell } from "@/components/PageShell";
import { PhaseBar } from "@/components/PhaseBar";
import { PhasePanel } from "@/components/PhasePanel";
import { StandingsList } from "@/components/StandingsList";
import { useRoomPoll } from "@/hooks/useRoomPoll";
import { PHASE_MS } from "@/lib/constants";
import { getPlayerSession } from "@/lib/client";

const PHASE_LABELS = {
  peek: "Look closely!",
  flashcut: "FLASHCUT",
  guess: "Pick your answer",
  reveal: "Reveal",
} as const;

export default function PlayerRoomPage() {
  const params = useParams();
  const code = String(params.code).toUpperCase();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const session = getPlayerSession(code);
    if (!session) {
      router.replace(`/join/${code}`);
      return;
    }
    setToken(session.playerToken);
  }, [code, router]);

  const { state } = useRoomPoll(code, token, Boolean(token));

  useEffect(() => {
    if (state?.status === "lobby") router.replace(`/join/${code}`);
    if (state?.status === "finished") router.replace(`/room/${code}/results`);
  }, [state?.status, code, router]);

  useEffect(() => {
    if (state?.phase === "guess") setSelected(null);
  }, [state?.roundIndex, state?.phase]);

  async function submitChoice(choice: string) {
    if (!token || state?.phase !== "guess") return;
    setSelected(choice);
    setSubmitting(true);
    try {
      await fetch(`/api/rooms/${code}/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ choice }),
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (!state || !token) {
    return (
      <PageShell>
        <main className="flex flex-1 items-center justify-center">
          <p className="text-xl font-bold text-blue-700">Loading…</p>
        </main>
      </PageShell>
    );
  }

  const playerSession = getPlayerSession(code);
  const me = state.players.find((p) => p.id === playerSession?.playerId);
  const score = me?.totalScore ?? 0;
  const phaseDuration = PHASE_MS[state.phase];
  const phaseKey = `${state.roundIndex}-${state.phase}`;

  return (
    <PageShell>
      <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 py-4 sm:px-6 sm:py-5">
        <header className="mb-4 flex items-center justify-between gap-4">
          <span className="fc-chip">
            Round {state.roundIndex + 1}/{state.roundCount}
          </span>
          <span className="fc-badge text-lg">{score} pts</span>
        </header>

        {state.phase !== "flashcut" && (
          <div className="mb-4 fc-phase-enter">
            <PhaseBar
              phaseEndsAt={state.phaseEndsAt}
              durationMs={phaseDuration}
              label={PHASE_LABELS[state.phase]}
            />
          </div>
        )}

        {state.phase === "peek" && state.imageUrl && state.imageMode && (
          <PhasePanel phaseKey={phaseKey} className="flex flex-1 flex-col">
            <p className="animate-pop mb-3 text-center text-2xl font-black text-blue-700">
              Look closely!
            </p>
            <GameImage
              imageUrl={state.imageUrl}
              mode={state.imageMode}
              crop={state.crop}
            />
          </PhasePanel>
        )}

        {state.phase === "flashcut" && (
          <PhasePanel
            phaseKey={phaseKey}
            className="fc-flashcut-enter flex min-h-[55dvh] flex-1 flex-col items-center justify-center rounded-3xl border-2 border-blue-200 bg-white shadow-xl"
          >
            <p className="text-6xl font-black tracking-tight text-blue-900 sm:text-7xl">
              FLASHCUT
            </p>
            <p className="fc-subtext mt-4 text-2xl font-bold">
              What was it?
            </p>
          </PhasePanel>
        )}

        {state.phase === "guess" && state.choices && (
          <PhasePanel
            phaseKey={phaseKey}
            className="flex flex-1 flex-col gap-3 sm:gap-4"
          >
            <p className="text-center text-sm font-semibold text-blue-500">
              Faster answers earn more points (up to 1,000)
            </p>
            {state.choices.map((choice) => {
              const isSelected = selected === choice;
              const isDimmed = selected !== null && !isSelected;
              return (
                <button
                  key={choice}
                  type="button"
                  disabled={submitting || selected !== null}
                  onClick={() => void submitChoice(choice)}
                  className={`min-h-[4.5rem] flex-1 rounded-2xl border px-5 py-4 text-left text-lg font-bold transition-all duration-300 sm:min-h-[5rem] sm:text-xl ${
                    isSelected
                      ? "fc-choice-selected fc-choice-lock"
                      : isDimmed
                        ? "fc-input border-blue-100 opacity-40"
                        : "fc-input hover:border-blue-400 hover:shadow-md"
                  }`}
                >
                  {choice}
                </button>
              );
            })}
          </PhasePanel>
        )}

        {state.phase === "reveal" && state.imageUrl && state.imageMode && (
          <PhasePanel phaseKey={phaseKey} className="flex flex-1 flex-col gap-5">
            <AnswerResult
              yourAnswer={state.yourAnswer}
              correctAnswer={state.answer}
              score={state.yourRoundScore}
            />
            <div className="fc-phase-enter-delayed">
              <RevealImages
                imageUrl={state.imageUrl}
                mode={state.imageMode}
                crop={state.crop}
              />
            </div>
            <p className="fc-phase-enter-delayed text-center text-2xl font-bold text-blue-900">
              Answer:{" "}
              <span className="text-blue-600 underline decoration-2 underline-offset-4">
                {state.answer}
              </span>
            </p>
            <div className="fc-phase-enter-delayed">
              <StandingsList standings={state.standings} />
            </div>
          </PhasePanel>
        )}
      </main>
    </PageShell>
  );
}
