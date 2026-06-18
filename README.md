# FLASHCUT

**See it. Gone. Guess it.**

Private team party game for ~20 remote players. Brief image peek → blackout → pick the answer. **10 rounds**, **~12 minutes**, **one winner** (highest score).

| Doc | Purpose |
| --- | ------- |
| [docs/build-spec.md](docs/build-spec.md) | Implementation spec |
| [docs/content-pack-starter-01.json](docs/content-pack-starter-01.json) | Starter 10-round pack |

**Status:** MVP implemented — **test locally first**; deploy to Vercel when ready.

**Stack:** Next.js 16, in-memory store locally (Upstash on Vercel later).

---

## Quick start (local)

```bash
cd team-games/flashcut
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No Redis or `.env` required.

| Doc | Purpose |
| --- | ------- |
| [docs/local-testing.md](docs/local-testing.md) | **Full local test checklist** + smoke script |
| [docs/build-spec.md](docs/build-spec.md) | Implementation spec |

### Manual test (2 browser windows)

1. **Create game** → host dashboard  
2. Second window → **Join** with room code + nickname  
3. Host → **Start game** → play through 10 rounds  

### Automated smoke (optional)

```bash
# terminal 1
npm run dev

# terminal 2
npm run smoke:local
```

---

## Environment (optional locally)

| Variable | Required | Notes |
| -------- | -------- | ----- |
| `UPSTASH_REDIS_REST_URL` | For Vercel prod | Without it, uses in-memory store (single instance only) |
| `UPSTASH_REDIS_REST_TOKEN` | For Vercel prod | |
| `ROOM_PASSWORD` | No | If set, players must enter it to join |

---

## Scripts

| Command | Purpose |
| ------- | ------- |
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm test` | Vitest (scoring, phases, pack) |
| `npm run smoke:local` | API smoke test (run while `dev` is up) |
| `npm run typecheck` | `tsc --noEmit` |

---

## Deploy (Vercel) — after local testing

See [docs/local-testing.md](docs/local-testing.md) first. Then:

1. Import project from `team-games/flashcut`  
2. Add **Upstash Redis** integration  
3. Optionally set `ROOM_PASSWORD`  
4. Deploy — share URL with team only (`robots.txt` blocks indexing)

---

## Player rules

1. Join with room code + nickname  
2. Glance at the image → blackout → pick 1 of 4 answers  
3. **Correct answers score up to 1,000 points** — faster taps earn more (Kahoot-style)  
4. After **10 rounds**, highest total wins
