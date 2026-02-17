# AGENTS.md - Operational Guide

Keep this file under 60 lines. It's loaded every iteration.

## Tech Stack

- React 19 + TypeScript, Vite 6, Tailwind CSS v4
- Zustand (state), Tesseract.js v6 (OCR), React Router v7
- Vitest + React Testing Library (testing)

## Build Commands

```bash
npm run build          # Production build
npm run dev            # Development server
```

## Test Commands

```bash
npm test               # Run tests (watch mode)
npm run test:run       # Run tests once
npm run test:coverage  # Coverage report
```

## Lint / Format

```bash
npm run lint           # ESLint
npm run format         # Prettier
npm run typecheck      # TypeScript type checking
```

## Validation (run before committing)

```bash
npm run check          # Run ALL checks (typecheck + lint + format + tests)
```

## Project Notes

- All monetary values are **integer cents** (no floating point)
- English-only OCR (Tesseract ~4MB language file)
- Fully offline PWA — no backend, no cloud
- Minimal & clean UI — Apple-like simplicity
- WCAG 2.1 AA accessibility
- File structure defined in PLAN.md
- Data model defined in PLAN.md
- See INTERVIEW.md for product decisions
