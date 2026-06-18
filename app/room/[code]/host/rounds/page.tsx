"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { RoundEditor } from "@/components/RoundEditor";
import {
  fetchHostRounds,
  getHostSession,
  saveHostRound,
  uploadHostRoundImage,
} from "@/lib/client";
import type { RoundDefinition } from "@/lib/types";
import { useRoomPoll } from "@/hooks/useRoomPoll";

export default function HostRoundsPage() {
  const params = useParams();
  const code = String(params.code).toUpperCase();
  const router = useRouter();
  const [hostToken, setHostToken] = useState<string | null>(null);
  const [rounds, setRounds] = useState<RoundDefinition[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { state } = useRoomPoll(code, hostToken, Boolean(hostToken));

  useEffect(() => {
    const token = getHostSession(code);
    if (!token) {
      router.replace("/");
      return;
    }
    setHostToken(token);
  }, [code, router]);

  const loadRounds = useCallback(async () => {
    if (!hostToken) return;
    const data = await fetchHostRounds(code, hostToken);
    if (!data) {
      setLoadError("Could not load rounds");
      return;
    }
    setLoadError(null);
    setRounds(data.rounds);
  }, [code, hostToken]);

  useEffect(() => {
    void loadRounds();
  }, [loadRounds]);

  useEffect(() => {
    if (state?.status === "playing") {
      router.replace(`/room/${code}/host`);
    }
  }, [state?.status, code, router]);

  async function handleSave(roundIndex: number, round: RoundDefinition) {
    if (!hostToken) return "Not authorized";
    const result = await saveHostRound(code, hostToken, roundIndex, round);
    if (!result.ok) return result.error ?? "Save failed";
    await loadRounds();
    return null;
  }

  async function handleUpload(roundIndex: number, file: File) {
    if (!hostToken) return "Not authorized";
    const result = await uploadHostRoundImage(
      code,
      hostToken,
      roundIndex,
      file,
    );
    if ("error" in result) return result.error;
    await loadRounds();
    return null;
  }

  if (!hostToken || rounds === null) {
    return (
      <PageShell>
        <main className="flex flex-1 items-center justify-center">
          <p className="text-xl font-bold text-blue-700">Loading rounds…</p>
        </main>
      </PageShell>
    );
  }

  const locked = state?.status !== "lobby";

  return (
    <PageShell>
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 sm:px-8">
        <header className="mb-6">
          <Link
            href={`/room/${code}/host`}
            className="text-sm font-bold text-blue-600 hover:underline"
          >
            ← Back to host dashboard
          </Link>
          <h1 className="fc-heading mt-3 text-3xl">Edit rounds</h1>
          <p className="fc-subtext mt-2">
            Customize images and answers before you start. Changes lock once the
            game begins.
          </p>
        </header>

        {loadError && (
          <p className="mb-4 rounded-xl bg-red-100 px-4 py-3 text-center font-semibold text-red-700">
            {loadError}
          </p>
        )}

        {locked && (
          <p className="mb-4 rounded-xl bg-amber-100 px-4 py-3 text-center font-semibold text-amber-900">
            Game already started — editing is disabled.
          </p>
        )}

        <div className="space-y-6">
          {rounds.map((round, index) => (
            <RoundEditor
              key={`${round.id}-${round.imageUrl}`}
              roundIndex={index}
              round={round}
              disabled={locked}
              onSave={(r) => handleSave(index, r)}
              onUpload={(file) => handleUpload(index, file)}
            />
          ))}
        </div>
      </main>
    </PageShell>
  );
}
