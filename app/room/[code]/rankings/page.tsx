"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnswerResult } from "@/components/AnswerResult";
import { GameImage } from "@/components/GameImage";
import { PageShell } from "@/components/PageShell";
import { RoundAnswerBreakdown } from "@/components/RoundAnswerBreakdown";
import { RoundPlacement } from "@/components/RoundRankings";
import { StandingsList } from "@/components/StandingsList";
import { useRoomPoll } from "@/hooks/useRoomPoll";
import { getPlayerSession } from "@/lib/client";

export default function RoundRankingsPage() {
  const params = useParams();
  const code = String(params.code).toUpperCase();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

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
    if (!state) return;
    if (state.status === "lobby") {
      router.replace(`/join/${code}`);
      return;
    }
    if (state.status === "finished") {
      router.replace(`/room/${code}/results`);
      return;
    }
    if (state.status === "playing" && state.phase !== "reveal") {
      router.replace(`/room/${code}`);
    }
  }, [state, code, router]);

  if (!state || !token) {
    return (
      <PageShell>
        <main className="flex flex-1 items-center justify-center">
          <p className="text-xl font-bold text-white">Loading rankings…</p>
        </main>
      </PageShell>
    );
  }

  const playerSession = getPlayerSession(code);
  const me = state.players.find((p) => p.id === playerSession?.playerId);
  const showBreakdown =
    state.choices &&
    state.answer &&
    state.roundPlayerAnswers &&
    state.roundPlayerAnswers.length > 0;
  const showRevealImage = Boolean(state.imageUrl && state.imageMode);

  return (
    <PageShell hideFooter lockScroll>
      <main className="fc-player-reveal mx-auto">
        <header className="fc-host-play-bar">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="fc-chip shrink-0 text-sm">
              Round {state.roundIndex + 1}/{state.roundCount}
            </span>
            <span className="fc-badge max-w-[55%] truncate text-sm sm:max-w-none">
              {me?.nickname ?? "You"} · {me?.totalScore ?? 0} pts
            </span>
          </div>
          <p className="fc-shell-label shrink-0 text-xs">Waiting for host</p>
        </header>

        <div
          className={`fc-player-reveal-grid ${showBreakdown ? "" : "fc-player-reveal-grid--no-breakdown"}`}
        >
          <aside className="fc-host-play-cell fc-player-reveal-cell--rankings">
            <StandingsList
              standings={state.standings}
              roundIndex={state.roundIndex}
              roundScores={state.roundScores}
              highlightId={playerSession?.playerId}
              title="Rankings"
              surface="shell"
              compact
            />
          </aside>

          <section className="fc-host-play-cell fc-player-reveal-cell--result">
            <div className="flex h-full min-h-0 flex-col gap-2">
              {showRevealImage && (
                <>
                  <p className="fc-shell-label shrink-0 text-center text-xs">
                    Correct answer
                  </p>
                  <div className="flex min-h-[6rem] flex-1 items-center justify-center">
                    <GameImage
                      imageUrl={state.imageUrl!}
                      mode={state.imageMode!}
                      crop={state.crop}
                      reveal
                      size="host"
                      fit="contain"
                      entrance="none"
                      className="max-h-full w-full"
                    />
                  </div>
                </>
              )}
              <RoundPlacement
                standings={state.players}
                highlightId={playerSession?.playerId}
                surface="shell"
                compact
              />
              <AnswerResult
                yourAnswer={state.yourAnswer}
                correctAnswer={state.answer}
                score={state.yourRoundScore}
                surface="shell"
                compact
              />
            </div>
          </section>

          {showBreakdown && (
            <section className="fc-host-play-cell fc-player-reveal-cell--breakdown">
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
    </PageShell>
  );
}
