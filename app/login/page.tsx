"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { fetchAccessConfig } from "@/lib/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordRequired, setPasswordRequired] = useState<boolean | null>(null);

  useEffect(() => {
    void fetchAccessConfig().then((config) => {
      setPasswordRequired(config.passwordRequired);
      if (!config.passwordRequired) {
        router.replace(next);
      }
    });
  }, [next, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Wrong password");
        return;
      }
      router.replace(next);
    } catch {
      setError("Could not sign in");
    } finally {
      setLoading(false);
    }
  }

  if (passwordRequired === null) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-xl font-bold text-[#b8c9e6]">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-5 py-12 sm:px-8">
      <header className="text-center">
        <h1 className="fc-hero-title text-4xl">Team sign-in</h1>
        <p className="fc-hero-subtitle mt-3 text-lg">
          FLASHCUT is private to your team. Enter the shared password to
          continue.
        </p>
      </header>

      <form onSubmit={(e) => void handleSubmit(e)} className="fc-host-panel space-y-4">
        <label className="block">
          <span className="fc-shell-label mb-2 block">Team password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="fc-shell-input w-full"
            autoComplete="current-password"
            required
            autoFocus
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="fc-btn-cta w-full text-lg"
        >
          {loading ? "Signing in…" : "Continue"}
        </button>
      </form>

      {error && <p className="fc-shell-error">{error}</p>}
    </main>
  );
}

export default function LoginPage() {
  return (
    <PageShell>
      <Suspense
        fallback={
          <main className="flex flex-1 items-center justify-center">
            <p className="text-xl font-bold text-[#b8c9e6]">Loading…</p>
          </main>
        }
      >
        <LoginForm />
      </Suspense>
    </PageShell>
  );
}
