# SplitIt

**Split restaurant bills fairly — snap a photo, claim your items, and let SplitIt handle the math.**

A fully offline Progressive Web App that makes splitting the bill painless. Photograph a receipt, let OCR extract the line items, pass the phone around the table so everyone claims what they ordered, and get an instant per-person breakdown with proportional tax and tip.

## Features

- **Photo-to-items** — Snap a picture of the bill; Tesseract.js extracts line items locally (no upload required)
- **Claim-based splitting** — Each person taps the items they ordered; shared items are divided evenly
- **Proportional tax & tip** — Tax and tip are distributed based on each person's subtotal
- **Live sessions** — Share a QR code so everyone can claim items from their own phone via WebSocket relay
- **Fully offline** — Service-worker-powered PWA; works without an internet connection after first load
- **Dark mode** — Automatic and manual theme switching
- **Installable** — Add to home screen on any device

## Tech Stack

- **UI:** React 19, TypeScript, Tailwind CSS v4
- **Build:** Vite 7 with `vite-plugin-pwa` (Workbox)
- **State:** Zustand
- **OCR:** Tesseract.js (WASM, runs entirely in-browser)
- **Routing:** React Router v7
- **Realtime:** WebSocket relay on Deno Deploy (`server/main.ts`)
- **Testing:** Vitest + React Testing Library

## Getting Started

```bash
npm install
npm run dev        # Start dev server at http://localhost:5173
```

## Scripts

| Command               | Description                                  |
| --------------------- | -------------------------------------------- |
| `npm run dev`         | Start development server                     |
| `npm run build`       | Type-check and production build              |
| `npm run preview`     | Preview production build locally             |
| `npm run test`        | Run tests in watch mode                      |
| `npm run test:run`    | Run tests once                               |
| `npm run test:coverage` | Run tests with coverage report             |
| `npm run lint`        | Run ESLint                                   |
| `npm run format`      | Format code with Prettier                    |
| `npm run typecheck`   | TypeScript type checking                     |
| `npm run check`       | Run **all** checks (typecheck + lint + format + tests) |

## Deployment

### Frontend (Netlify)

Every push to `master` triggers an automatic build and deploy.

- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **SPA redirect:** All routes fall back to `index.html` (configured in `netlify.toml`)

### Relay Server (Deno Deploy)

Live sessions use a lightweight WebSocket relay server hosted on [Deno Deploy](https://deno.com/deploy). The server is stateless — it forwards JSON messages between host and guests in ephemeral rooms. No data is stored.

- **Source:** `server/main.ts`
- **Runtime:** [Deno](https://deno.com/)
- **Run locally:** `cd server && deno task dev`
- **Health check:** `GET /health` returns `{ status: "ok", rooms: N }`
- **Client config:** `src/services/liveSession/relayConfig.ts` (override with `VITE_RELAY_URL` env var)

## Project Structure

```
src/
  components/   # Reusable UI components
  pages/        # Route-level page components
  hooks/        # Custom React hooks
  store/        # Zustand state stores
  services/     # OCR, P2P, and other service modules
  types/        # TypeScript type definitions
  utils/        # Helper utilities
  test/         # Test setup and utilities
```

## License

MIT
