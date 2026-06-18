"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { fetchAccessConfig, saveHostPin, saveHostSession } from "@/lib/client";

export default function HomePage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [hostPin, setHostPin] = useState("");
  const [teamPassword, setTeamPassword] = useState("");
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchAccessConfig().then((config) => {
      setPasswordRequired(config.passwordRequired);
    });
  }, []);

  async function createGame() {
    if (hostPin.trim().length < 4) {
      setError("Set a 4–6 digit host PIN");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          packId: "starter-01",
          hostPin,
          password: teamPassword || undefined,
        }),
      });
      const data = (await res.json()) as {
        code?: string;
        hostToken?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Failed to create room");
        return;
      }
      if (!data.code || !data.hostToken) throw new Error("Invalid response");
      saveHostSession(data.code, data.hostToken);
      saveHostPin(data.code, hostPin);
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
    setError(null);
    router.push(`/join/${code}`);
  }

  return (
    <PageShell>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-5 py-12 sm:px-8">
        <header className="text-center">
          <h1 className="fc-hero-title text-6xl sm:text-7xl">
            FLASH<span className="fc-hero-flash">CUT</span>
          </h1>
          <p className="fc-hero-subtitle mt-4 text-xl">See it. Gone. Guess it.</p>
        </header>

        <div className="fc-host-panel space-y-6">
          <div className="space-y-4">
            {passwordRequired && (
              <label className="block">
                <span className="fc-shell-label mb-2 block">Team password</span>
                <input
                  type="password"
                  value={teamPassword}
                  onChange={(e) => setTeamPassword(e.target.value)}
                  className="fc-shell-input w-full"
                  autoComplete="current-password"
                  required
                />
              </label>
            )}
            <label className="block">
              <span className="fc-shell-label mb-2 block">Host PIN</span>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={hostPin}
                onChange={(e) =>
                  setHostPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="fc-shell-input w-full text-center text-2xl font-black tracking-[0.35em]"
                placeholder="••••"
                minLength={4}
                maxLength={6}
                required
              />
              <p className="fc-shell-text mt-2 text-sm">
                Required to view answers and run the host dashboard. Players never
                need this PIN.
              </p>
            </label>
            <button
              type="button"
              onClick={() => void createGame()}
              disabled={loading}
              className="fc-btn-cta w-full px-8 py-5 text-2xl"
            >
              {loading ? "Creating…" : "Create game (host)"}
            </button>
          </div>

          <div className="fc-shell-divider space-y-4 pt-6">
            <label className="fc-shell-label block" htmlFor="code">
              Or join with code
            </label>
            <input
              id="code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              className="fc-shell-input w-full text-center text-3xl font-black tracking-[0.3em] uppercase"
              maxLength={6}
            />
            <button
              type="button"
              onClick={joinGame}
              className="fc-btn-cta w-full px-8 py-5 text-2xl"
            >
              Join game
            </button>
          </div>
        </div>

        {error && <p className="fc-shell-error">{error}</p>}

        <p className="fc-shell-text text-center text-base font-medium">
          10 rounds · ~12 minutes · fastest fingers win
        </p>
      </main>
    </PageShell>
  );
}
