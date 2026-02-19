# AI Assist Page Redesign Plan

## Problem

The current AI Assist page requires scrolling on mobile. The manual mode (Step 1 / Step 2) takes up too much vertical space. The prompt text doesn't need to be visible — just copyable.

## Design Goals

- **No scroll** — everything fits on a single mobile viewport
- **Prompt is hidden** — just a "Copy Prompt" button, no displayed text
- **Clean & minimal** — consistent with the rest of the app's Apple-like aesthetic
- **Two modes** still supported: manual (no API key) and direct (with API key)

---

## Manual Mode (no API key) — Redesign

Replace the current two big "Step" sections with a compact, single-screen layout:

```
┌──────────────────────────────┐
│         AI Assistant         │
│  Use ChatGPT or Claude to    │
│  read your bill              │
│                              │
│  1. Copy the prompt below    │
│  2. Open ChatGPT / Claude    │
│  3. Attach bill photo(s)     │
│     and paste the prompt     │
│  4. Copy the AI's response   │
│     and paste it below       │
│                              │
│  ┌────────────────────────┐  │
│  │  Copy Prompt           │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ Paste JSON here...     │  │
│  │                        │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │  Import Items          │  │
│  └────────────────────────┘  │
│                              │
│  Have an API key? Skip the   │
│  copy-paste                  │
│                              │
│  Back to Home                │
└──────────────────────────────┘
```

### Key changes from current:

1. **Remove separate "Step 1" / "Step 2" section headers** — replace with a compact numbered instruction list (small text, tightly spaced)
2. **Reduce textarea to 3-4 rows** (from 6) — just enough to paste into, JSON doesn't need to be readable
3. **Remove the sub-description under "Step 1"** ("Open ChatGPT or Claude, attach your bill photo(s)...") — this is folded into the instruction list
4. **Tighter spacing** — reduce gap between sections from `gap-8` to `gap-4` / `gap-5`
5. **Remove top padding** — change `py-10` to `py-6` to reclaim vertical space

### Estimated vertical space (mobile):

| Element | Height |
|---------|--------|
| Header (title + subtitle) | ~64px |
| Instruction list (4 lines) | ~80px |
| Copy Prompt button | ~48px |
| Textarea (3 rows) | ~96px |
| Import button | ~48px |
| API key link | ~24px |
| Back link | ~24px |
| Padding + gaps | ~80px |
| **Total** | **~464px** |

Fits comfortably on a 667px mobile viewport (iPhone SE).

---

## Direct Mode (has API key) — Minor Tweaks

The direct mode is already fairly compact. Minor adjustments only:

- Match the tighter spacing (`gap-5` instead of `gap-8`)
- Reduce `py-10` to `py-6`

No major layout changes needed — it already fits on one screen.

---

## API Key Setup — No Changes

The inline API key setup modal is already compact and only appears on demand. No changes needed.

---

## Implementation Steps

### 1. Restructure manual mode layout

**File:** `src/pages/AiAssistPage.tsx`

- Replace Step 1 / Step 2 sections with a single section containing:
  - A compact numbered instruction list (`<ol>` with `text-sm text-gray-500`)
  - The "Copy Prompt" button (primary style, same as current)
  - The textarea (reduced to 3 rows)
  - The "Import Items" button
- Remove the separate helper text paragraphs

### 2. Tighten spacing

- Outer container: `py-10` → `py-6`
- Inner column: `gap-8` → `gap-5`

### 3. Verify no-scroll on mobile

- Test at 375×667 viewport (iPhone SE — smallest common target)
- Both manual and direct modes should fit without scrolling

---

## Files Modified

- `src/pages/AiAssistPage.tsx` — only file changed

No new files, no new dependencies, no routing changes.
