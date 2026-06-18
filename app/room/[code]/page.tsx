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
import { PlayerRevealPanel } from "@/components/PlayerRevealPanel";
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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const roundRef = useRef(-1);

  useEffect(() => {
    const session = getPlayerSession(code);
    if (!session) {
      router.replace(`/join/${code}`);
      return;
    }
    setToken(session.playerToken);
  }, [code, router]);

  const { state, refresh } = useRoomPoll(code, token, Boolean(token));

  useEffect(() => {
    if (state?.status === "lobby") {
      router.replace(`/join/${code}`);
      return;
    }
    if (state?.status === "finished") {
      router.replace(`/room/${code}/results`);
    }
  }, [state?.status, code, router]);

  useEffect(() => {
    if (!state) return;
    if (state.roundIndex === roundRef.current) return;
    roundRef.current = state.roundIndex;
    setSelected(null);
    setSubmitError(null);
  }, [state?.roundIndex]);

  async function submitChoice(choice: string) {
    if (!token || state?.phase !== "guess" || selected !== null || submitting) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      for (let attempt = 0; attempt < 8; attempt++) {
        const res = await fetch(`/api/rooms/${code}/answer`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ choice }),
        });
        if (res.ok) {
          setSelected(choice);
          await refresh(true);
          return;
        }
        const data = (await res.json().catch(() => null)) as {
          code?: string;
          error?: string;
        } | null;
        const retryable =
          data?.code === "WRONG_PHASE" ||
          data?.code === "ROOM_NOT_FOUND" ||
          data?.code === "SAVE_FAILED";
        if (retryable && attempt < 7) {
          await new Promise((r) => setTimeout(r, attempt < 3 ? 120 : 250));
          continue;
        }
        setSubmitError(data?.error ?? "Could not save your answer. Try again.");
        return;
      }
    } finally {
      setSubmitting(false);
    }
  }

  const playerSession = getPlayerSession(code);
  const hasCachedState = state != null;

  if (!hasCachedState || !token) {
    return (
      <PageShell>
        <main className="flex flex-1 items-center justify-center">
          <p className="text-xl font-bold text-white">Loading…</p>
        </main>
      </PageShell>
    );
  }

  const me = state.players.find((p) => p.id === playerSession?.playerId);
  const score = me?.totalScore ?? 0;
  const phaseDuration = PHASE_MS[state.phase];
  const phaseKey = `${state.roundIndex}-${state.phase}`;
  const isReveal = state.status === "playing" && state.phase === "reveal";

  if (isReveal) {
    return (
      <PageShell hideFooter lockScroll>
        <PlayerRevealPanel
          state={state}
          playerId={playerSession?.playerId}
          nickname={me?.nickname}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <main className="mx-auto flex w-full max-w-3xl flex-col px-4 py-4 sm:px-6 sm:py-5">
        <GameHeader
          roundIndex={state.roundIndex}
          roundCount={state.roundCount}
          nickname={me?.nickname ?? "You"}
          score={score}
        />

        {(state.phase === "peek" || state.phase === "guess") && (
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
            {submitError && (
              <p className="fc-choice-error fc-phase-enter" role="alert">
                {submitError}
              </p>
            )}
            {selected && !submitError && (
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
