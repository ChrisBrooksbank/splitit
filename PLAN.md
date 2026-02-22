# SplitIt - Restaurant Bill Splitting PWA

> **Interview decisions:** See [INTERVIEW.md](./INTERVIEW.md) for full Q&A with project owner.

## Context

Splitting a restaurant bill fairly is a universal pain point. Existing apps either require cloud accounts, push subscriptions, or have poor OCR. SplitIt is a fully client-side PWA that lets you photograph a bill, extract line items via local OCR, then pass the phone around the table so each person claims their items. It calculates each person's share including proportional tax and tip -- no account, no server, no cloud.

- **Target audience:** Broad public — needs polish and professionalism
- **Visual style:** Minimal & clean — white space, subtle colors, Apple-like simplicity
- **Deployment:** Netlify

## Tech Stack

- **Framework:** React 19 + TypeScript
- **Build:** Vite 6 + vite-plugin-pwa (Workbox service worker)
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/vite` plugin)
- **State:** Zustand with `persist` middleware (localStorage)
- **OCR:** Tesseract.js v6 (WASM, runs entirely in-browser)
- **Routing:** React Router v7
- **IDs:** nanoid
- **Testing:** Vitest + React Testing Library

Total production deps: 6 packages. The only server-side component is a lightweight WebSocket relay on Deno Deploy for live multi-device sessions.

## Core Data Model

All monetary values stored as **integer cents** to avoid floating-point errors.

```typescript
interface LineItem {
  id: string;
  name: string;
  price: number;           // cents
  quantity: number;
  confidence: number;      // 0-1 from OCR (1.0 for manual)
  manuallyEdited: boolean;
}

interface Person {
  id: string;
  name: string;
  color: string;           // from a preset accessible palette
}

interface TipConfig {
  mode: 'percentage' | 'fixed' | 'per-person';
  percentage: number;      // e.g. 18 (default for non-per-person)
  fixedAmount: number;     // cents
}

// Assignment: Map<itemId, personId[]> - which people claimed each item

interface BillSession {
  id: string;
  date: string;           // ISO date
  restaurantName?: string; // optional, from receipt
  people: Person[];
  lineItems: LineItem[];
  assignments: Map<string, string[]>;
  taxAmount: number;       // cents
  tipConfig: TipConfig;
  totals: PersonTotal[];   // calculated summary
}
```

## User Flow (7 screens)

```
Home -> Processing -> Item Editor -> People Setup -> Assignment -> Tip Selection -> Summary
 |                                       ^
 +-- "Enter Manually" -----------------+
```

1. **Home** - "Scan a Bill" (camera/upload) or "Enter Manually", access to Bill History
2. **Processing** - Progress bar while OCR runs, then auto-navigate
3. **Item Editor** - Review/correct OCR results, set tax amount (pre-filled from OCR)
4. **People Setup** - Add names of everyone at the table
5. **Assignment** - Each person taps their items (pass-around flow with handoff screen)
6. **Tip Selection** - Each person sees their pre-tip subtotal and picks their own tip %
7. **Summary** - Per-person breakdown with totals, copy summary, auto-saved to history

## Implementation Phases

### Phase 1: Project Scaffolding + PWA Shell
- `npm create vite@latest . -- --template react-ts`
- Install deps: `react-router-dom`, `zustand`, `tesseract.js`, `nanoid`, `vite-plugin-pwa`, `tailwindcss`, `@tailwindcss/vite`, `vitest`
- Configure `vite.config.ts` with PWA manifest (name, icons, `display: standalone`, `orientation: portrait`)
- Workbox runtime caching for `.traineddata` and `.wasm` files (CacheFirst, 30-day expiry)
- Tailwind v4 setup via Vite plugin
- Placeholder pages + React Router routes
- Generate PWA icons (192, 512, maskable, apple-touch)
- **Verify:** App installs on mobile, offline shell loads

### Phase 2: Image Capture
- `ImageCapture.tsx` - Primary: `<input type="file" accept="image/*" capture="environment">` (works everywhere including iOS PWA home screen). Optional enhancement: `getUserMedia()` with feature detection.
- `ImagePreview.tsx` - Show captured image, "Retake" / "Use This Photo"
- `HomePage.tsx` - CTA: "Scan a Bill" + secondary "Enter Manually" + "View History" link
- Image downscaling in `imagePreprocessor.ts` - Resize to max 2000px longest edge via Canvas API before OCR (prevents mobile OOM)

### Phase 3: OCR Engine
- `tesseractService.ts` - Singleton worker, lazy init, progress callback, `recognize()` method
- `imagePreprocessor.ts` - Canvas API pipeline (no OpenCV.js):
  1. Grayscale (luminance formula)
  2. Contrast stretch (histogram stretching)
  3. Otsu binarization (optimal threshold)
- `ProcessingPage.tsx` - Dimmed image + animated progress bar with stage labels
- `useOcr.ts` hook - Manages loading/progress/error state
- Cache Tesseract WASM + language data via service worker (first load ~5MB, then instant)

### Phase 4: Receipt Parsing
- `receiptParser.ts` - The critical algorithm:
  - Split OCR text into lines
  - Match price pattern: `$X.XX` or `X.XX` at end of line
  - Extract quantity prefixes: `2x`, `3 X`
  - Identify & separate metadata lines (SUBTOTAL, TAX, TOTAL, payment info)
  - Skip noise (THANK YOU, date, server name, separators)
  - Return `{ lineItems[], detectedSubtotal, detectedTax, detectedTotal }`
- `receiptPatterns.ts` - Regex collection for prices, quantities, skip patterns
- **Unit tests** with 10+ real receipt text samples + edge cases (OCR errors like `$l2.99`)

### Phase 5: Item Editor Screen
- `LineItemRow.tsx` - Display name/qty/price, tap to edit inline, low-confidence warning, delete
- `LineItemList.tsx` - Scrollable list + "Add Item" button
- `AddItemForm.tsx` - Name + price + quantity quick-entry
- `TaxConfig.tsx` - Tax amount (pre-filled from OCR). Tip configuration is handled per-person on the Tip Selection screen.
- `BillSummaryCard.tsx` - Sticky footer: Subtotal | Tax | Grand Total (pre-tip)
- `billStore.ts` (Zustand) - CRUD actions for items, tax config, persist middleware
- **Milestone:** End-to-end receipt scanning pipeline is testable here

### Phase 6: People + Assignment (core feature)
- `PeopleSetupPage.tsx` - Add names, auto-assign colors from accessible palette, min 2 people
- `peopleStore.ts` + `assignmentStore.ts` (Zustand, persisted)
- `AssignmentPage.tsx` - The make-or-break screen:
  1. "Who are you?" — person taps their name (large buttons)
  2. Item list appears — tap items to claim (colored dot appears with person's color)
  3. Share icon on any item → bottom sheet with person checkboxes + even/custom split toggle
  4. Custom split: fraction/portion selector per person (e.g., "2 of 3 portions")
  5. "I'm Done" → full-screen handoff animation: "Pass the phone to [Next Person]" with large name + color
  6. After last person: check for unassigned items. If any exist, **block** progression and highlight unassigned items. User must assign all items before proceeding.
- `AssignableItem.tsx` - Item row with colored assignment badges, tap feedback
- `SharedItemSplitter.tsx` - Bottom sheet with person checkboxes for shared items
- `HandoffScreen.tsx` - Full-screen handoff animation between people

### Phase 7: Tip Selection (per-person tips)
- `TipSelectionPage.tsx` - Inserted between Assignment and Summary
- Show each person's name, their pre-tip subtotal (items + proportional tax share)
- Each person selects their tip: quick presets (15/18/20/25%) or custom amount
- Default to 20% but let each person change
- Can use pass-around flow OR one person sets all tips
- "Calculate Final Split" button proceeds to Summary
- `TipSelector.tsx` - Preset buttons + custom input
- `PersonTipCard.tsx` - Card showing person name, subtotal, and tip picker

### Phase 8: Split Calculation + Summary
- `splitCalculator.ts` - Proportional algorithm:
  ```
  For each person:
    subtotal = sum of (item.price * qty / shareCount) for their items
    proportion = subtotal / billSubtotal
    taxShare = round(tax * proportion)
    tipShare = calculated from person's individual tip choice
    total = subtotal + taxShare + tipShare
  Rounding adjustment: largest-share person absorbs cent difference
  ```
- **Unit tests** - Single person, equal split, shared items, rounding edge cases, zero items
- `SummaryPage.tsx` - Card per person (items, subtotal, tax share, **their chosen tip**, total), grand total verification row, "Copy Summary" button (text copy to clipboard), "Start New Bill" button
- Bill auto-saved to history (localStorage)

### Phase 8.5: Bill History
- `HistoryPage.tsx` — accessible from Home screen
- Show last 10 bills: date, total, people count, restaurant name (if detected)
- Tap to view past summary (read-only)
- Swipe/button to delete individual entries
- `historyStore.ts` (Zustand + persist) — manages saved sessions
- Add route: `/history`

### Phase 9: Polish + Edge Cases
- OCR failure graceful fallback -> manual entry
- Session recovery ("Continue previous bill?" on app load)
- Accessibility: aria labels, 44px touch targets, color contrast (WCAG 2.1 AA)
- Lazy-load Tesseract.js (only when camera path chosen)
- `React.lazy()` for pages with Suspense
- Full offline support — service worker caches all app assets + Tesseract WASM/traineddata
- Handle edge cases: zero items, zero people, unassigned items, very long names

## File Structure

```
src/
  main.tsx, App.tsx, index.css
  components/
    ui/         Button, Input, Modal, Card, ProgressBar, Slider, Badge
    bill/       LineItemRow, LineItemList, AddItemForm, TaxConfig, BillSummaryCard
    assignment/ PersonChip, PersonSelector, AssignableItem, SharedItemSplitter, HandoffScreen
    camera/     ImageCapture, ImagePreview
    tip/        TipSelector, PersonTipCard
    layout/     PageContainer, BottomNav, StepIndicator
  pages/        HomePage, ProcessingPage, ItemEditorPage, PeopleSetupPage, AssignmentPage, TipSelectionPage, SummaryPage, HistoryPage
  store/        billStore.ts, peopleStore.ts, assignmentStore.ts, historyStore.ts, appStore.ts
  services/
    ocr/        tesseractService.ts, imagePreprocessor.ts, receiptParser.ts
    calculator/ splitCalculator.ts
  hooks/        useOcr.ts, useCamera.ts, useSplitCalculation.ts
  types/        index.ts
  utils/        formatCurrency.ts, receiptPatterns.ts, idGenerator.ts
tests/
  services/     receiptParser.test.ts, splitCalculator.test.ts
```

## Routes

```
/            HomePage
/processing  ProcessingPage
/editor      ItemEditorPage
/people      PeopleSetupPage
/assign      AssignmentPage
/tips        TipSelectionPage
/summary     SummaryPage
/history     HistoryPage
```

## Key Risks + Mitigations

| Risk | Mitigation |
|------|-----------|
| OCR accuracy on crumpled/faded receipts | Preprocessing pipeline + mandatory manual edit step |
| Tesseract ~5MB first-load | Lazy-load, service worker cache, progress bar |
| iOS PWA camera quirks | File input as primary (works everywhere), getUserMedia as enhancement only |
| Floating-point rounding errors | All math in integer cents, rounding adjustment on largest share |
| Accidental navigation mid-session | Zustand persist auto-saves to localStorage |
| Bill history storage limits | Cap at 10 sessions, prune oldest on save |
| Tesseract caching for offline | English-only simplifies caching — single ~4MB language file |

## Verification Plan

1. **Unit tests:** `vitest run` - receipt parser + split calculator
2. **Manual OCR test:** Photograph a real receipt, verify line items extracted and editable
3. **Split math test:** 3 people, mix of individual + shared items, verify totals add up exactly
4. **PWA test:** Install on Android Chrome + iOS Safari, verify offline shell, verify camera works
5. **Pass-around test:** Complete full flow with 3+ people on a single device
6. **Bill history test:** Complete 2 bills, verify both appear in history and are viewable
7. **Tip selection test:** 3 people each pick different tip %, verify individual + grand totals
8. **Offline test:** Airplane mode after first visit, verify full flow works
9. **Netlify deploy test:** Deploy to Netlify, test PWA install from live URL
