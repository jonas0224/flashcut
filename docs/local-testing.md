# Local testing guide

Test everything on your machine before Vercel deploy.

## Prerequisites

```bash
cd team-games/flashcut
npm install
```

No `.env` required — the app uses an **in-memory room store** when Upstash env vars are unset.

Optional: copy `.env.example` to `.env.local` and set `ROOM_PASSWORD` to test the join gate.

---

## 1. Automated API smoke (fast)

Terminal 1:

```bash
npm run dev
```

Terminal 2:

```bash
npm run smoke:local
```

This creates a room, joins two players, starts the game, answers during guess phases, and uses **host skip** to advance quickly through all 8 rounds. Expect `Smoke OK` and a standings table.

---

## 2. Manual browser test (full UX)

Use **two browser windows** (or one normal + one private/incognito).

| Step | Window A (host) | Window B (player) |
| ---- | ----------------- | ----------------- |
| 1 | http://localhost:3000 → **Create game** | — |
| 2 | Note room code on host screen | http://localhost:3000 → Join with code |
| 3 | — | Enter nickname → **Join lobby** |
| 4 | Confirm player appears in lobby | Wait in lobby |
| 5 | **Start game** | Auto-redirects to play view |
| 6 | Watch round counter / standings | Peek → blackout → tap an answer |
| 7 | Optional: **Skip phase** to speed up | Watch reveal + scores |
| 8 | Repeat through round 8 | Same |
| 9 | Redirects to results | Redirects to results |

### What to verify

- [ ] Peek shows zoomed/blurred/silhouette image (placeholder SVG)
- [ ] Flashcut screen is black with “What was it?”
- [ ] Four answer buttons appear in guess phase
- [ ] Reveal shows full image + correct answer + your round points
- [ ] Score updates on reveal (500, or 800 with early lock)
- [ ] After round 8, results page shows one winner
- [ ] Three+ players: open more incognito tabs, join same code

### Simulate ~20 players

Open many incognito windows, join with nicknames `Player1` … `Player20`, then start from host. All should stay in sync (same phase).

---

## 3. Unit tests

```bash
npm test
npm run typecheck
```

---

## 4. Production build (still local)

```bash
npm run build
npm run start
```

Then repeat the browser test on http://localhost:3000 — confirms the production bundle works.

---

## Local limitations

| Topic | Local dev | Vercel + Redis |
| ----- | --------- | -------------- |
| Room storage | In-memory (lost on server restart) | Upstash persists |
| Multiple server instances | Single `next dev` process only | Many serverless workers |
| Concurrent writes | Rare — one Node process | Poll + answers race on Redis CAS |
| Share with coworkers | Use ngrok/cloudflare tunnel if needed | Deploy |

**Why bugs show up only in prod:** locally every request hits the same in-memory `Map`, so answer saves and poll ticks rarely collide. On Vercel, many `/api/rooms/[code]` polls run in parallel across lambdas and compete to update the same Redis key.

To test with a colleague on another network **before** Vercel, use a tunnel:

```bash
npx localtunnel --port 3000
```

---

## 5. Pre-deploy verification (match production)

### A. Concurrent smoke (memory or Redis)

Terminal 1: `npm run dev` (or `npm run build && npm run start`)

Terminal 2:

```bash
npm run smoke:concurrent
```

Expect `Concurrent smoke OK` — parallel pollers while four players answer, then checks `yourAnswer` on reveal and `answerStats` after host End.

### B. Same tests against Upstash (closest to prod)

1. Copy `.env.example` → `.env.local`
2. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (or Vercel KV vars)
3. Restart the server — rooms now use Redis CAS like production
4. Run `npm run smoke:concurrent` again

If both pass, deploy with the same Redis env vars on Vercel.

---

## Deploy later

When local testing passes, see [README.md](../README.md) → Deploy (Vercel).
