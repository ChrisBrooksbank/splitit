# SplitIt - Restaurant Bill Splitting PWA

## Context

Splitting a restaurant bill fairly is a universal pain point. Existing apps either require cloud accounts, push subscriptions, or have poor OCR. SplitIt is a fully client-side PWA that lets you photograph a bill, extract line items via local OCR, then pass the phone around the table so each person claims their items. It calculates each person's share including proportional tax and tip -- no account, no server, no cloud.

## Tech Stack

- **Framework:** React 19 + TypeScript
- **Build:** Vite 6 + vite-plugin-pwa (Workbox service worker)
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/vite` plugin)
- **State:** Zustand with `persist` middleware (localStorage)
- **OCR:** Tesseract.js v6 (WASM, runs entirely in-browser)
- **Routing:** React Router v7
- **IDs:** nanoid
- **Testing:** Vitest + React Testing Library

Total production deps: 6 packages. No backend required.

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
  mode: 'percentage' | 'fixed';
  percentage: number;      // e.g. 18
  fixedAmount: number;     // cents
}

// Assignment: Map<itemId, personId[]> - which people claimed each item
```

## User Flow (6 screens)

```
Home -> Processing -> Item Editor -> People Setup -> Assignment -> Summary
 |                                       ^
 +-- "Enter Manually" -----------------+
```

1. **Home** - "Scan a Bill" (camera/upload) or "Enter Manually"
2. **Processing** - Progress bar while OCR runs, then auto-navigate
3. **Item Editor** - Review/correct OCR results, set tax + tip rate
4. **People Setup** - Add names of everyone at the table
5. **Assignment** - Each person taps their items (pass-around flow with handoff screen)
6. **Summary** - Per-person breakdown with totals

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
- `HomePage.tsx` - CTA: "Scan a Bill" + secondary "Enter Manually"
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
- `TaxTipConfig.tsx` - Tax amount (pre-filled from OCR), tip mode toggle (% or fixed), quick-select: 15/18/20/25/Custom
- `BillSummaryCard.tsx` - Sticky footer: Subtotal | Tax | Tip | Grand Total
- `billStore.ts` (Zustand) - CRUD actions for items, tax/tip config, persist middleware
- **Milestone:** End-to-end receipt scanning pipeline is testable here

### Phase 6: People + Assignment (core feature)
- `PeopleSetupPage.tsx` - Add names, auto-assign colors from accessible palette, min 2 people
- `peopleStore.ts` + `assignmentStore.ts` (Zustand, persisted)
- `AssignmentPage.tsx` - The make-or-break screen:
  1. "Who are you?" - Person taps their name
  2. Item list appears - tap items to claim (colored dot appears)
  3. Shared items - tap share icon -> modal to pick who's sharing
  4. "I'm Done" -> handoff screen: "Pass to next person" with name buttons
  5. After last person: warn about any unassigned items, offer to split equally
- `AssignableItem.tsx` - Item row with colored assignment badges, tap feedback
- `SharedItemSplitter.tsx` - Bottom sheet with person checkboxes for shared items

### Phase 7: Split Calculation + Summary
- `splitCalculator.ts` - Proportional algorithm:
  ```
  For each person:
    subtotal = sum of (item.price * qty / shareCount) for their items
    proportion = subtotal / billSubtotal
    taxShare = round(tax * proportion)
    tipShare = round(tip * proportion)
    total = subtotal + taxShare + tipShare
  Rounding adjustment: largest-share person absorbs cent difference
  ```
- **Unit tests** - Single person, equal split, shared items, rounding edge cases, zero items
- `SummaryPage.tsx` - Card per person (items, subtotal, tax, tip, **total**), grand total verification, "Start New Bill" reset, Web Share API / copy-to-clipboard for text summary

### Phase 8: Polish + Edge Cases
- OCR failure graceful fallback -> manual entry
- Session recovery ("Continue previous bill?" on app load)
- Accessibility: aria labels, 44px touch targets, color contrast
- Lazy-load Tesseract.js (only when camera used)
- `React.lazy()` for pages with Suspense
- Handle edge cases: zero items, zero people, unassigned items, very long names

## File Structure

```
src/
  main.tsx, App.tsx, index.css
  components/
    ui/         Button, Input, Modal, Card, ProgressBar, Slider, Badge
    bill/       LineItemRow, LineItemList, AddItemForm, TaxTipConfig, BillSummaryCard
    assignment/ PersonChip, PersonSelector, AssignableItem, SharedItemSplitter
    camera/     ImageCapture, ImagePreview
    layout/     PageContainer, BottomNav, StepIndicator
  pages/        HomePage, ProcessingPage, ItemEditorPage, PeopleSetupPage, AssignmentPage, SummaryPage
  store/        billStore.ts, peopleStore.ts, assignmentStore.ts, appStore.ts
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
/summary     SummaryPage
```

## Key Risks + Mitigations

| Risk | Mitigation |
|------|-----------|
| OCR accuracy on crumpled/faded receipts | Preprocessing pipeline + mandatory manual edit step |
| Tesseract ~5MB first-load | Lazy-load, service worker cache, progress bar |
| iOS PWA camera quirks | File input as primary (works everywhere), getUserMedia as enhancement only |
| Floating-point rounding errors | All math in integer cents, rounding adjustment on largest share |
| Accidental navigation mid-session | Zustand persist auto-saves to localStorage |

## Verification Plan

1. **Unit tests:** `vitest run` - receipt parser + split calculator
2. **Manual OCR test:** Photograph a real receipt, verify line items extracted and editable
3. **Split math test:** 3 people, mix of individual + shared items, verify totals add up exactly
4. **PWA test:** Install on Android Chrome + iOS Safari, verify offline shell, verify camera works
5. **Pass-around test:** Complete full flow with 3+ people on a single device
