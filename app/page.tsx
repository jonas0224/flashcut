"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { saveHostSession } from "@/lib/client";

export default function HomePage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createGame() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: "starter-01" }),
      });
      if (!res.ok) throw new Error("Failed to create room");
      const data = (await res.json()) as {
        code: string;
        hostToken: string;
      };
      saveHostSession(data.code, data.hostToken);
      router.push(`/room/${data.code}/host`);
    } catch {
      setError("Could not create room");
    } finally {
      setLoading(false);
    }
  }

  function joinGame() {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      setError("Enter a room code");
      return;
    }
    router.push(`/join/${code}`);
  }

  return (
    <PageShell>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-10 px-5 py-12 sm:px-8">
        <header className="text-center">
          <h1 className="fc-heading text-6xl sm:text-7xl">FLASHCUT</h1>
          <p className="fc-subtext mt-4 text-xl">See it. Gone. Guess it.</p>
        </header>

        <button
          type="button"
          onClick={() => void createGame()}
          disabled={loading}
          className="fc-btn-primary rounded-3xl px-8 py-5 text-2xl"
        >
          {loading ? "Creating…" : "Create game (host)"}
        </button>

        <div className="fc-panel">
          <label className="fc-label mb-3 block" htmlFor="code">
            Or join with code
          </label>
          <input
            id="code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            className="fc-input w-full text-center text-3xl font-black tracking-[0.3em] uppercase"
            maxLength={6}
          />
          <button
            type="button"
            onClick={joinGame}
            className="fc-btn-secondary mt-4 w-full text-xl"
          >
            Join game
          </button>
        </div>

        {error && (
          <p className="rounded-xl bg-red-100 px-4 py-3 text-center font-semibold text-red-700">
            {error}
          </p>
        )}

        <p className="text-center text-base font-medium text-blue-500">
          10 rounds · ~12 minutes · fastest fingers win
        </p>
      </main>
    </PageShell>
  );
}
