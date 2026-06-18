"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { HostPinGate } from "@/components/HostPinGate";
import { RoundEditor } from "@/components/RoundEditor";
import {
  fetchHostRounds,
  getHostPin,
  getHostSession,
  saveHostRound,
  uploadHostRoundImage,
  fetchAccessConfig,
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
  const [uploadsEnabled, setUploadsEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const { state } = useRoomPoll(code, hostToken, Boolean(hostToken));

  useEffect(() => {
    void fetchAccessConfig().then((c) => setUploadsEnabled(c.customUploadsEnabled));
  }, []);

  useEffect(() => {
    const token = getHostSession(code);
    if (!token) {
      router.replace("/");
      return;
    }
    setHostToken(token);
  }, [code, router]);

  const loadRounds = useCallback(async () => {
    if (!hostToken || !getHostPin(code)) return;
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

  function updateRound(roundIndex: number, round: RoundDefinition) {
    setRounds((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[roundIndex] = round;
      return next;
    });
    setSaveMessage(null);
  }

  async function handleSaveAll() {
    if (!hostToken || !rounds) return;
    setSaving(true);
    setSaveMessage(null);

    for (let i = 0; i < rounds.length; i++) {
      const result = await saveHostRound(code, hostToken, i, rounds[i]);
      if (!result.ok) {
        setSaveMessage(result.error ?? `Failed to save round ${i + 1}`);
        setSaving(false);
        return;
      }
    }

    setSaveMessage("All changes saved");
    setSaving(false);
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
    updateRound(roundIndex, {
      ...rounds![roundIndex],
      imageUrl: result.imageUrl,
    });
    return null;
  }

  if (!hostToken) {
    return (
      <PageShell>
        <main className="flex flex-1 items-center justify-center">
          <p className="text-xl font-bold text-[#b8c9e6]">Loading rounds…</p>
        </main>
      </PageShell>
    );
  }

  const locked = state?.status !== "lobby";

  return (
    <PageShell>
      <HostPinGate
        code={code}
        hostToken={hostToken}
        onUnlocked={() => void loadRounds()}
      >
        {rounds === null ? (
          <main className="flex flex-1 items-center justify-center">
            <p className="text-xl font-bold text-[#b8c9e6]">Loading rounds…</p>
          </main>
        ) : (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 sm:px-8">
        <header className="fc-sticky-bar top-0 -mx-5 border-b px-5 py-3 sm:-mx-8 sm:px-8">
          <Link href={`/room/${code}/host`} className="fc-link-back">
            ← Back to host dashboard
          </Link>
          <h1 className="fc-hero-title mt-2 text-2xl sm:text-3xl">Edit rounds</h1>
        </header>

        <div className="flex-1 py-6">
          <p className="mb-6 text-sm font-medium text-white/70">
            Upload your own photos or keep the starter pack. Set zoom, choices,
            and answers before you start — editing locks once the game begins.
          </p>

          {loadError && (
            <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center font-semibold text-red-700">
              {loadError}
            </p>
          )}

          {!uploadsEnabled && (
            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-900">
              Custom image uploads need Vercel Blob in production. You can still
              use the starter pack images or paste a hosted image URL.
            </p>
          )}

          {locked && (
            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center font-semibold text-amber-900">
              Game already started — editing is disabled.
            </p>
          )}

          <div className="space-y-6 pb-4">
            {rounds.map((round, index) => (
              <RoundEditor
                key={`${round.id}-${index}`}
                roundIndex={index}
                round={round}
                disabled={locked}
                busy={saving}
                onChange={(r) => updateRound(index, r)}
                onUpload={(file) => handleUpload(index, file)}
              />
            ))}
          </div>
        </div>

        <div className="fc-sticky-bar bottom-0 -mx-5 border-t px-5 py-4 sm:-mx-8 sm:px-8">
          {saveMessage && (
            <p
              className={`mb-2 text-center text-sm font-semibold ${saveMessage === "All changes saved" ? "text-green-600" : "text-red-600"}`}
            >
              {saveMessage}
            </p>
          )}
          <button
            type="button"
            disabled={locked || saving}
            onClick={() => void handleSaveAll()}
            className="fc-btn-cta w-full text-base"
          >
            {saving ? "Saving…" : "Save all changes"}
          </button>
        </div>
      </main>
        )}
      </HostPinGate>
    </PageShell>
  );
}
