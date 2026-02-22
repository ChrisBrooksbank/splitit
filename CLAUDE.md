# CLAUDE.md - Project Context for Claude Code

Keep this file concise. It's loaded every iteration.

## What Is This?

SplitIt — a PWA for splitting restaurant bills fairly. Photograph a receipt, OCR extracts items, each person claims theirs, and it calculates per-person totals with proportional tax and tip. Fully client-side except for a lightweight WebSocket relay (Deno Deploy) for live sessions.

## Tech Stack

- React 19 + TypeScript, Vite 7, Tailwind CSS v4
- Zustand (state), Tesseract.js (OCR, WASM), React Router v7
- WebSocket relay service (live sessions)
- Vitest + React Testing Library (testing)
- vite-plugin-pwa (Workbox service worker)

## Deployment

- **Frontend on Netlify** — auto-deploys from `master`
- Config in `netlify.toml` (build: `npm run build`, publish: `dist`, SPA fallback)
- **Relay server on Deno Deploy** — WebSocket relay for live sessions
  - Source: `server/main.ts` (stateless, no auth, no storage)
  - URL: `wss://splitit-relay.chrisbrooksbank.deno.net`
  - Config: `src/services/liveSession/relayConfig.ts` (override with `VITE_RELAY_URL` env var)
  - Local dev: `cd server && deno task dev`

## Build & Dev

```bash
npm run dev            # Dev server (localhost:5173)
npm run build          # Type-check + production build
```

## Test

```bash
npm test               # Watch mode
npm run test:run       # Single run
npm run test:coverage  # With coverage
```

## Lint / Format

```bash
npm run lint           # ESLint
npm run format         # Prettier
npm run typecheck      # TypeScript
npm run check          # ALL checks (typecheck + lint + format + tests)
```

## Key Conventions

- All monetary values are **integer cents** (no floating point)
- English-only OCR (Tesseract ~4MB language file)
- Fully offline PWA — no backend except WebSocket relay for live sessions
- Minimal & clean UI — Apple-like simplicity
- WCAG 2.1 AA accessibility
- File structure and data model defined in PLAN.md
- Product decisions documented in INTERVIEW.md
