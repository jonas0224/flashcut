"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { LobbyPlayerChips } from "@/components/PlayerChip";
import { fetchAccessConfig, savePlayerSession } from "@/lib/client";
import { useRoomPoll } from "@/hooks/useRoomPoll";

export default function JoinPage() {
  const params = useParams();
  const code = String(params.code).toUpperCase();
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [playerToken, setPlayerToken] = useState<string | null>(null);
  const [localPlayer, setLocalPlayer] = useState<{
    id: string;
    nickname: string;
  } | null>(null);
  const redirectingRef = useRef(false);

  const { state, refresh } = useRoomPoll(code, playerToken, joined, {
    lobbyFastPoll: true,
  });

  useEffect(() => {
    router.prefetch(`/room/${code}`);
  }, [code, router]);

  useEffect(() => {
    void fetchAccessConfig().then((config) => {
      setPasswordRequired(config.passwordRequired);
      setShowPassword(config.passwordRequired);
    });
  }, []);

  useEffect(() => {
    if (state?.status !== "playing" || redirectingRef.current) return;
    redirectingRef.current = true;
    void (async () => {
      await refresh(true);
      router.replace(`/room/${code}`);
    })();
  }, [state?.status, code, router, refresh]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          nickname,
          password: password || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "WRONG_PASSWORD") setShowPassword(true);
        setError(data.error ?? "Join failed");
        return;
      }
      savePlayerSession(code, data.playerId, data.playerToken);
      setLocalPlayer({ id: data.playerId, nickname: data.nickname });
      setPlayerToken(data.playerToken);
      setJoined(true);
    } catch {
      setError("Join failed");
    } finally {
      setLoading(false);
    }
  }

  if (joined && state?.status === "playing") {
    return (
      <PageShell>
        <main className="flex flex-1 items-center justify-center">
          <p className="text-xl font-bold text-[#b8c9e6]">Starting game…</p>
        </main>
      </PageShell>
    );
  }

  if (joined) {
    const lobbyPlayers = state?.players ?? [];
    const displayPlayers =
      localPlayer && !lobbyPlayers.some((p) => p.id === localPlayer.id)
        ? [
            ...lobbyPlayers,
            {
              id: localPlayer.id,
              nickname: localPlayer.nickname,
              totalScore: 0,
            },
          ]
        : lobbyPlayers;

    return (
      <PageShell>
        <main className="mx-auto flex w-full max-w-2xl flex-col px-5 py-5 sm:px-8">
          <p className="fc-shell-label">Lobby</p>
          <h1 className="fc-room-code-hero mt-1 text-5xl">{code}</h1>
          <p className="fc-hero-subtitle mt-2 text-lg">Waiting for host to start…</p>
          <div className="fc-host-panel mt-5">
            <LobbyPlayerChips players={displayPlayers} />
            <p className="mt-4 text-center text-lg font-semibold text-[#94a8c9]">
              {displayPlayers.length} players ready
            </p>
          </div>
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-8 px-5 py-10 sm:px-8">
        <header className="text-center">
          <p className="fc-shell-label">Join game</p>
          <h1 className="fc-room-code-hero mt-2 text-6xl">{code}</h1>
        </header>
        <form onSubmit={(e) => void handleJoin(e)} className="fc-host-panel flex flex-col gap-4">
          <label className="fc-shell-label">Your nickname</label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="e.g. PixelPanda"
            className="fc-shell-input text-xl"
            maxLength={20}
            required
            autoFocus
          />
          {showPassword && (
            <>
              <label className="fc-shell-label">Team password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="fc-shell-input text-xl"
                autoComplete="current-password"
                required={passwordRequired}
              />
            </>
          )}
          <button type="submit" disabled={loading} className="fc-btn-cta mt-2 text-xl">
            {loading ? "Joining…" : "Join lobby"}
          </button>
        </form>
        {error && <p className="fc-shell-error">{error}</p>}
      </main>
    </PageShell>
  );
}
