# PWA Shell & Project Scaffolding

## Overview

Set up the foundational project structure as an installable, offline-capable PWA.

## User Stories

- As a user, I want to install the app on my phone so that it feels like a native app
- As a user, I want the app to work offline so that I can split bills in restaurants with poor wifi

## Requirements

- [ ] Vite 6 + React 19 + TypeScript project scaffold
- [ ] Tailwind CSS v4 via `@tailwindcss/vite` plugin
- [ ] React Router v7 with routes for all 8 pages (/, /processing, /editor, /people, /assign, /tips, /summary, /history)
- [ ] vite-plugin-pwa configured with manifest (name: "SplitIt", display: standalone, orientation: portrait)
- [ ] Workbox runtime caching for `.traineddata` and `.wasm` files (CacheFirst, 30-day expiry)
- [ ] PWA icons generated (192px, 512px, maskable, apple-touch)
- [ ] Service worker caches all app assets for full offline support
- [ ] Placeholder page components for each route
- [ ] Zustand installed and configured
- [ ] nanoid installed
- [ ] Vitest + React Testing Library configured
- [ ] ESLint + Prettier configured
- [ ] `npm run check` script that runs typecheck + lint + format check + tests

## Acceptance Criteria

- [ ] `npm run build` succeeds with zero errors
- [ ] `npm run check` passes
- [ ] App installs as PWA on mobile
- [ ] Offline shell loads after first visit
- [ ] All routes render placeholder content

## Out of Scope

- Actual page content/functionality (just placeholders)
- Styling beyond basic Tailwind setup
