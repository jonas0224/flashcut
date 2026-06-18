"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { savePlayerSession } from "@/lib/client";
import { useRoomPoll } from "@/hooks/useRoomPoll";

export default function JoinPage() {
  const params = useParams();
  const code = String(params.code).toUpperCase();
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [playerToken, setPlayerToken] = useState<string | null>(null);

  const { state } = useRoomPoll(code, playerToken, joined);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Join failed");
        return;
      }
      savePlayerSession(code, data.playerId, data.playerToken);
      setPlayerToken(data.playerToken);
      setJoined(true);
    } catch {
      setError("Join failed");
    } finally {
      setLoading(false);
    }
  }

  if (state?.status === "playing") {
    router.replace(`/room/${code}`);
    return null;
  }

  if (joined) {
    return (
      <PageShell>
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-8 sm:px-8">
          <h1 className="fc-heading text-4xl">Lobby · {code}</h1>
          <p className="fc-subtext mt-3 text-lg">Waiting for host to start…</p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {state?.players.map((p) => (
              <li key={p.id} className="fc-card px-5 py-4 text-lg font-bold">
                {p.nickname}
              </li>
            ))}
          </ul>
          <p className="mt-auto pt-10 text-center text-lg font-semibold text-blue-500">
            {state?.players.length ?? 0} players ready
          </p>
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-8 px-5 py-10 sm:px-8">
        <header className="text-center">
          <p className="fc-label tracking-widest">Join game</p>
          <h1 className="fc-heading mt-2 text-5xl">{code}</h1>
        </header>
        <form onSubmit={(e) => void handleJoin(e)} className="flex flex-col gap-4">
          <label className="fc-label">Your nickname</label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="e.g. PixelPanda"
            className="fc-input text-xl"
            maxLength={20}
            required
            autoFocus
          />
          <button
            type="submit"
            disabled={loading}
            className="fc-btn-primary mt-2 text-xl"
          >
            {loading ? "Joining…" : "Join lobby"}
          </button>
        </form>
        {error && (
          <p className="rounded-xl bg-red-100 px-4 py-3 text-center font-semibold text-red-700">
            {error}
          </p>
        )}
      </main>
    </PageShell>
  );
}
