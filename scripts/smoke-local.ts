#!/usr/bin/env npx tsx
/**
 * Local API smoke test — run while `npm run dev` is up.
 * Usage: npm run smoke:local
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
  console.log(`FLASHCUT smoke → ${BASE}\n`);

  const teamPassword = process.env.ROOM_PASSWORD?.trim();
  const authBody = teamPassword ? { password: teamPassword } : {};
  const hostPin = "4242";

  const created = await api<{
    code: string;
    hostToken: string;
  }>("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ packId: "starter-01", hostPin, ...authBody }),
  });
  if (!created.ok) throw new Error("create room failed");
  const { code, hostToken } = created.data;
  console.log(`Room ${code}`);

  const hostAuth = {
    Authorization: `Bearer ${hostToken}`,
    "X-Flashcut-Host-Pin": hostPin,
  };

  const p1 = await api<{ playerToken: string; nickname: string }>(
    `/api/rooms/${code}/join`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: "SmokeA", ...authBody }),
    },
  );
  const p2 = await api<{ playerToken: string; nickname: string }>(
    `/api/rooms/${code}/join`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: "SmokeB", ...authBody }),
    },
  );
  if (!p1.ok || !p2.ok) throw new Error("join failed");
  console.log(`Players: ${p1.data.nickname}, ${p2.data.nickname}`);

  const started = await api<{ ok: boolean }>(`/api/rooms/${code}/start`, {
    method: "POST",
    headers: hostAuth,
  });
  if (!started.ok) throw new Error("start failed");
  console.log("Game started");

  let finished = false;
  let rounds = 0;
  const maxSkips = 80;

  for (let i = 0; i < maxSkips && !finished; i++) {
    const state = await api<{
      status: string;
      phase: string;
      roundIndex: number;
      choices?: string[];
      answer?: string;
      winnerId?: string;
    }>(`/api/rooms/${code}`, {
      headers: { Authorization: `Bearer ${p1.data.playerToken}` },
    });

    if (!state.ok) throw new Error("poll failed");

    if (state.data.status === "finished") {
      finished = true;
      console.log(`Finished after ${rounds} rounds. Winner id: ${state.data.winnerId ?? "—"}`);
      break;
    }

    if (state.data.phase === "guess" && state.data.choices?.length) {
      const correct = state.data.choices[0];
      await api(`/api/rooms/${code}/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${p1.data.playerToken}`,
        },
        body: JSON.stringify({ choice: correct }),
      });
      await api(`/api/rooms/${code}/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${p2.data.playerToken}`,
        },
        body: JSON.stringify({ choice: state.data.choices[1] }),
      });
    }

    if (state.data.phase === "reveal") {
      rounds = Math.max(rounds, state.data.roundIndex + 1);
    }

    await api(`/api/rooms/${code}/skip`, {
      method: "POST",
      headers: hostAuth,
    });

    await sleep(50);
  }

  if (!finished) throw new Error("game did not finish in time");

  const finalState = await api<{
    players: Array<{ nickname: string; totalScore: number }>;
    standings: Array<{ nickname: string; totalScore: number }>;
  }>(`/api/rooms/${code}`);

  console.log("\nStandings:");
  for (const p of finalState.data.players.sort(
    (a, b) => b.totalScore - a.totalScore,
  )) {
    console.log(`  ${p.nickname}: ${p.totalScore}`);
  }

  console.log("\nSmoke OK");
}

main().catch((e) => {
  console.error("Smoke failed:", e);
  process.exit(1);
});
