#!/usr/bin/env npx tsx
/**
 * Stress test — concurrent polls + answer submits (simulates Vercel serverless).
 * Run while `npm run dev` (memory) or `npm run start` with Redis env set.
 *
 * Usage: npm run smoke:concurrent
 */
const BASE = process.env.FLASHCUT_URL ?? "http://localhost:3000";

async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(`${BASE}${path}`, init);
  const data = (await res.json()) as T;
  return { ok: res.ok, status: res.status, data };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log(`FLASHCUT concurrent smoke → ${BASE}\n`);

  const teamPassword = process.env.ROOM_PASSWORD?.trim();
  const authBody = teamPassword ? { password: teamPassword } : {};
  const hostPin = "4242";

  const created = await api<{ code: string; hostToken: string }>("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ packId: "starter-01", hostPin, ...authBody }),
  });
  if (!created.ok) throw new Error("create room failed");
  const { code, hostToken } = created.data;

  const hostAuth = {
    Authorization: `Bearer ${hostToken}`,
    "X-Flashcut-Host-Pin": hostPin,
  };

  const players = await Promise.all(
    ["Alpha", "Bravo", "Charlie", "Delta"].map((nickname) =>
      api<{ playerToken: string; playerId: string }>(`/api/rooms/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, ...authBody }),
      }),
    ),
  );
  if (players.some((p) => !p.ok)) throw new Error("join failed");

  const started = await api(`/api/rooms/${code}/start`, {
    method: "POST",
    headers: hostAuth,
  });
  if (!started.ok) throw new Error("start failed");

  console.log(`Room ${code} — 4 players, hammering polls during round 1\n`);

  let sawGuess = false;
  let sawReveal = false;
  const pollers: Promise<void>[] = [];

  for (let i = 0; i < 12; i++) {
    pollers.push(
      (async () => {
        for (let j = 0; j < 40; j++) {
          await api(`/api/rooms/${code}`, { headers: hostAuth });
          await sleep(30);
        }
      })(),
    );
  }

  for (let step = 0; step < 120 && (!sawGuess || !sawReveal); step++) {
    const state = await api<{
      status: string;
      phase: string;
      choices?: string[];
      yourAnswer?: string;
      roundPlayerAnswers?: Array<{ outcome: string; playerId: string }>;
    }>(`/api/rooms/${code}`, {
      headers: { Authorization: `Bearer ${players[0].data.playerToken}` },
    });
    if (!state.ok) throw new Error("poll failed");

    if (state.data.phase === "guess" && state.data.choices?.length) {
      sawGuess = true;
      await Promise.all(
        players.map((p, idx) =>
          api(`/api/rooms/${code}/answer`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${p.data.playerToken}`,
            },
            body: JSON.stringify({
              choice: state.data.choices![idx % state.data.choices!.length],
            }),
          }),
        ),
      );
      console.log("All players submitted answers during guess");
    }

    if (state.data.phase === "reveal") {
      sawReveal = true;
      const mine = state.data.roundPlayerAnswers?.find(
        (row) => row.playerId === players[0].data.playerId,
      );
      if (!state.data.yourAnswer || mine?.outcome === "none") {
        throw new Error(
          `Answer missing on reveal (yourAnswer=${state.data.yourAnswer ?? "—"})`,
        );
      }
      console.log(`Reveal OK — yourAnswer=${state.data.yourAnswer}`);
      break;
    }

    await api(`/api/rooms/${code}/skip`, { method: "POST", headers: hostAuth });
    await sleep(40);
  }

  await Promise.all(pollers);

  if (!sawGuess || !sawReveal) {
    throw new Error("Did not reach guess + reveal with saved answers");
  }

  await api(`/api/rooms/${code}/end`, { method: "POST", headers: hostAuth });

  const finished = await api<{
    status: string;
    yourAnswerStats?: { correct: number; wrong: number };
    answerStats?: { correct: number; wrong: number };
  }>(`/api/rooms/${code}`, { headers: hostAuth });

  if (finished.data.status !== "finished") {
    throw new Error("Game did not finish");
  }
  if (!finished.data.answerStats || finished.data.answerStats.correct === 0) {
    throw new Error(
      `answerStats not recorded: ${JSON.stringify(finished.data.answerStats)}`,
    );
  }

  console.log(
    `\nFinished — answerStats: ${finished.data.answerStats.correct} correct, ${finished.data.answerStats.wrong} wrong`,
  );
  console.log("Concurrent smoke OK");
}

main().catch((e) => {
  console.error("Concurrent smoke failed:", e);
  process.exit(1);
});

export {};
