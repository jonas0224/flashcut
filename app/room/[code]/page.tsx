"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChoiceButton } from "@/components/ChoiceButton";
import { FlashcutPanel } from "@/components/FlashcutPanel";
import { GameHeader } from "@/components/GameHeader";
import { GameImage } from "@/components/GameImage";
import { PageShell } from "@/components/PageShell";
import { PhaseBar } from "@/components/PhaseBar";
import { PhasePanel } from "@/components/PhasePanel";
import { RoundCountdown } from "@/components/RoundCountdown";
import { useRoomPoll } from "@/hooks/useRoomPoll";
import { PHASE_MS } from "@/lib/constants";
import { getPlayerSession } from "@/lib/client";

const PHASE_LABELS = {
  countdown: "Get ready",
  peek: "Look closely!",
  flashcut: "FLASHCUT",
  guess: "Pick your answer",
} as const;

export default function PlayerRoomPage() {
  const params = useParams();
  const code = String(params.code).toUpperCase();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const guessRoundRef = useRef(-1);

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
    if (state?.status === "playing" && state.phase === "reveal") {
      router.replace(`/room/${code}/rankings`);
    }
  }, [state?.status, state?.phase, code, router]);

  useEffect(() => {
    if (state?.phase !== "guess") return;
    if (state.roundIndex === guessRoundRef.current) return;
    guessRoundRef.current = state.roundIndex;
    setSelected(null);
  }, [state?.roundIndex, state?.phase]);

  async function submitChoice(choice: string) {
    if (!token || state?.phase !== "guess" || selected !== null) return;
    setSelected(choice);
    setSubmitting(true);
    try {
      for (let attempt = 0; attempt < 4; attempt++) {
        const res = await fetch(`/api/rooms/${code}/answer`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ choice }),
        });
        if (res.ok) return;
        const data = (await res.json().catch(() => null)) as {
          code?: string;
        } | null;
        if (data?.code === "WRONG_PHASE" && attempt < 3) {
          await new Promise((r) => setTimeout(r, 120));
          continue;
        }
        return;
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!state || !token) {
    return (
      <PageShell>
        <main className="flex flex-1 items-center justify-center">
          <p className="text-xl font-bold text-white">Loading…</p>
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
      <main className="mx-auto flex w-full max-w-3xl flex-col px-4 py-4 sm:px-6 sm:py-5">
        <GameHeader
          roundIndex={state.roundIndex}
          roundCount={state.roundCount}
          nickname={me?.nickname ?? "You"}
          score={score}
        />

        {state.phase !== "flashcut" &&
          state.phase !== "countdown" &&
          state.phase !== "reveal" && (
            <div className="mb-4 fc-phase-enter">
              <PhaseBar
                phaseEndsAt={state.phaseEndsAt}
                durationMs={phaseDuration}
                label={PHASE_LABELS[state.phase]}
                urgentLastSeconds={state.phase === "guess" ? 3 : 0}
              />
            </div>
          )}

        {state.phase === "countdown" && (
          <RoundCountdown
            phaseStartedAt={state.phaseStartedAt}
            phaseEndsAt={state.phaseEndsAt}
            durationMs={phaseDuration}
            roundLabel={`Round ${state.roundIndex + 1}`}
          />
        )}

        {state.phase === "peek" && state.imageUrl && state.imageMode && (
          <PhasePanel phaseKey={phaseKey} className="flex flex-col">
            <p className="mb-4 text-center text-2xl font-black text-blue-800">
              Look closely!
            </p>
            <GameImage
              imageUrl={state.imageUrl}
              mode={state.imageMode}
              crop={state.crop}
              entrance="peek"
            />
          </PhasePanel>
        )}

        {state.phase === "flashcut" && (
          <PhasePanel phaseKey={phaseKey} panel={false}>
            <FlashcutPanel
              phaseEndsAt={state.phaseEndsAt}
              durationMs={phaseDuration}
            />
          </PhasePanel>
        )}

        {state.phase === "guess" && state.choices && (
          <PhasePanel
            phaseKey={phaseKey}
            panel={false}
            className="fc-guess-panel flex flex-col gap-3 sm:gap-3.5"
          >
            <p className="fc-choice-hint">
              Faster answers earn more points (up to 1,000)
            </p>
            <div className="flex flex-col gap-3 sm:gap-3.5">
              {state.choices.map((choice, index) => (
                <ChoiceButton
                  key={choice}
                  index={index}
                  choice={choice}
                  selected={selected === choice}
                  dimmed={selected !== null && selected !== choice}
                  disabled={submitting || selected !== null}
                  onSelect={() => void submitChoice(choice)}
                />
              ))}
            </div>
            {selected && (
              <p className="fc-choice-locked fc-phase-enter">
                Answer locked — hang tight!
              </p>
            )}
          </PhasePanel>
        )}
      </main>
    </PageShell>
  );
}
