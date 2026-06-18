"use client";

import { useEffect, useState } from "react";
import { clearHostPin, getHostPin, saveHostPin } from "@/lib/client";

type Props = {
  code: string;
  hostToken: string;
  children: React.ReactNode;
  onUnlocked?: () => void;
};

export function HostPinGate({ code, hostToken, children, onUnlocked }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (getHostPin(code)) setUnlocked(true);
  }, [code]);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${code}/host/verify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hostToken}`,
          "X-Flashcut-Host-Pin": pin,
        },
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Wrong host PIN");
        return;
      }
      saveHostPin(code, pin);
      setUnlocked(true);
      onUnlocked?.();
    } catch {
      setError("Could not verify PIN");
    } finally {
      setLoading(false);
    }
  }

  if (unlocked) return children;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-5 py-12 sm:px-8">
      <header className="text-center">
        <p className="fc-shell-label">Host access</p>
        <h1 className="fc-room-code-hero mt-2 text-5xl">{code}</h1>
        <p className="fc-hero-subtitle mt-3 text-lg">
          Enter your host PIN to view answers and control the game.
        </p>
      </header>

      <form onSubmit={(e) => void handleUnlock(e)} className="fc-host-panel space-y-4">
        <label className="block">
          <span className="fc-shell-label mb-2 block">Host PIN</span>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="fc-shell-input w-full text-center text-2xl font-black tracking-[0.35em]"
            placeholder="••••"
            minLength={4}
            maxLength={6}
            required
            autoFocus
          />
        </label>
        <button type="submit" disabled={loading} className="fc-btn-cta w-full text-lg">
          {loading ? "Checking…" : "Unlock host"}
        </button>
      </form>

      {error && <p className="fc-shell-error">{error}</p>}

      <button
        type="button"
        onClick={() => clearHostPin(code)}
        className="fc-shell-text text-center text-sm font-medium underline-offset-2 hover:underline"
      >
        Forgot PIN? Create a new game from the home page.
      </button>
    </main>
  );
}
