# Implementation Plan

## Status

- Planning iterations: 1
- Build iterations: 11
- Last updated: 2026-02-17

## Notes

### Architecture Decisions
- All monetary values stored as **integer cents** (no floating-point math)
- **Zustand** with `persist` middleware for all stores (auto-saves to localStorage for offline recovery)
- **English-only Tesseract.js v6** (~4MB language file, lazy-loaded on camera path only)
- **File input as primary camera** (`capture="environment"`) — works on iOS PWA home screen
- **React.lazy()** for all page components — code-split with Suspense
- **Workbox CacheFirst** for `.traineddata` and `.wasm` files (30-day expiry)
- Rounding: largest-share person absorbs any cent difference in split calculations

---

## Tasks

### Phase 1: Project Scaffolding & PWA Shell

- [x] Scaffold Vite 6 + React 19 + TypeScript project, install all dependencies: react-router-dom v7, zustand, tesseract.js v6, nanoid, vite-plugin-pwa, @tailwindcss/vite, vitest, @testing-library/react, @testing-library/user-event, eslint, prettier (spec: 01-pwa-shell.md)
- [x] Configure vite.config.ts: Tailwind v4 via @tailwindcss/vite plugin, vite-plugin-pwa with manifest (name: "SplitIt", display: standalone, orientation: portrait, icons 192/512/maskable/apple-touch), Workbox CacheFirst for .traineddata and .wasm (30-day expiry) (spec: 01-pwa-shell.md)
- [x] Configure TypeScript (tsconfig.json), ESLint, Prettier, and add `npm run check` script (typecheck + lint + format check + tests) (spec: 01-pwa-shell.md)
- [x] Configure Vitest with React Testing Library: jsdom environment, setup file for @testing-library/jest-dom matchers (spec: 01-pwa-shell.md)
- [x] Create types/index.ts with all core TypeScript interfaces: LineItem, Person, TipConfig, BillSession, PersonTotal, Assignment Map type (spec: 03-receipt-parsing-editor.md, 06-split-calculation-summary.md)
- [x] Create placeholder page components for all 8 routes and configure React Router v7 with routes: /, /processing, /editor, /people, /assign, /tips, /summary, /history (spec: 01-pwa-shell.md)
- [x] Generate/add PWA icons (192px, 512px, maskable, apple-touch) to public/ directory (spec: 01-pwa-shell.md)

### Phase 2: Home Screen & Image Capture

- [x] Build HomePage: "Scan a Bill" primary CTA, "Enter Manually" secondary action, "View History" link — minimal Apple-like design with Tailwind (spec: 02-image-capture-ocr.md)
- [x] Build ImageCapture component: `<input type="file" accept="image/*" capture="environment">` as primary, optional getUserMedia() with feature detection and graceful fallback (spec: 02-image-capture-ocr.md)
- [x] Build ImagePreview component: show captured image thumbnail, "Retake" / "Use This Photo" buttons (spec: 02-image-capture-ocr.md)
- [x] Implement imagePreprocessor.ts (src/services/ocr/): Canvas API pipeline — resize to max 2000px longest edge, grayscale (luminance formula), contrast stretch (histogram stretching), Otsu binarization (spec: 02-image-capture-ocr.md)

### Phase 3: OCR Engine & Processing Screen

- [x] Implement tesseractService.ts: singleton Tesseract.js v6 worker, lazy initialization, progress callback, recognize() method — English-only language data (spec: 02-image-capture-ocr.md)
- [x] Implement useOcr.ts hook: manages loading/progress/error state, orchestrates imagePreprocessor → tesseractService pipeline (spec: 02-image-capture-ocr.md)
- [x] Build ProcessingPage: dimmed receipt image background, animated progress bar with stage labels (Loading OCR / Processing / Extracting text), auto-navigate to /editor on completion, error fallback to /editor with empty items (spec: 02-image-capture-ocr.md)

### Phase 4: Receipt Parser

- [x] Implement receiptPatterns.ts (src/utils/): regex collection for prices ($X.XX / X.XX at end of line), quantity prefixes (2x, 3 X, 2 ×), metadata lines (SUBTOTAL, TAX, TOTAL, tip, change, payment), skip patterns (THANK YOU, date/time, server name, separators, address) (spec: 03-receipt-parsing-editor.md)
- [x] Implement receiptParser.ts (src/services/ocr/): split OCR text into lines, apply patterns, extract quantity prefixes, handle OCR errors ($l2.99 → $12.99, O → 0), identify metadata lines, return { lineItems[], detectedSubtotal, detectedTax, detectedTotal } with confidence score per item (spec: 03-receipt-parsing-editor.md)
- [x] Write unit tests for receiptParser.ts: 10+ real receipt text samples covering different restaurant formats, OCR error handling, quantity prefixes, special characters, long names, tax/subtotal/total detection accuracy (spec: 03-receipt-parsing-editor.md)

### Phase 5: Bill Store & Item Editor

- [x] Implement billStore.ts (Zustand + persist): CRUD actions for line items, tax amount storage, all prices as integer cents (spec: 03-receipt-parsing-editor.md)
- [x] Build LineItemRow component: display name/qty/price, inline edit on tap, low-confidence warning badge, delete button (spec: 03-receipt-parsing-editor.md)
- [x] Build LineItemList + AddItemForm components: scrollable item list with "Add Item" button, AddItemForm for name + price + quantity quick-entry (spec: 03-receipt-parsing-editor.md)
- [x] Build TaxConfig component + BillSummaryCard: TaxConfig pre-filled from OCR detection; sticky BillSummaryCard footer showing Subtotal | Tax | Grand Total (pre-tip) (spec: 03-receipt-parsing-editor.md)
- [x] Wire up ItemEditorPage: assemble all components, populate from OCR results on arrival from /processing, "Continue" button → /people (spec: 03-receipt-parsing-editor.md)

### Phase 6: People Setup

- [x] Implement peopleStore.ts (Zustand + persist): people list with auto-assigned colors, CRUD actions (spec: 04-people-assignment.md)
- [x] Build PersonChip component: colored chip with person name, used throughout app (spec: 04-people-assignment.md)
- [x] Build PeopleSetupPage: name input + "Add" button, auto-assign colors from accessible colorblind-friendly palette, edit/remove people, minimum 2 required, "Continue to Assignment" → /assign (spec: 04-people-assignment.md)

### Phase 7: Assignment Flow

- [x] Implement assignmentStore.ts (Zustand + persist): Map<itemId, personId[]> assignments, CRUD actions, shareCount per assignment for shared items (spec: 04-people-assignment.md)
- [x] Build AssignableItem component: item row with name/price, colored assignment badges, tap-to-claim feedback, share icon to open shared-item bottom sheet (spec: 04-people-assignment.md)
- [x] Build SharedItemSplitter component: bottom sheet with person checkboxes (who shares this item?), default even split, custom portion selector per person (e.g. "2 of 3 portions") (spec: 04-people-assignment.md)
- [x] Build HandoffScreen component: full-screen overlay "Pass the phone to [Next Person]", large name + person's color, animation preventing accidental taps, confirm to start next person (spec: 04-people-assignment.md)
- [x] Wire up AssignmentPage: Step 1 — "Who are you?" large name buttons; Step 2 — item claiming; "I'm Done" → HandoffScreen; cycle through all people; after last person block on unassigned items and highlight them (spec: 04-people-assignment.md)

### Phase 8: Tip Selection

- [x] Build TipSelector component: preset percentage buttons (15% / 18% / 20% / 25%), custom tip input (dollar amount or percentage), real-time tip amount display, default 20% (spec: 05-tip-selection.md)
- [x] Build PersonTipCard component: card showing person name, color, pre-tip subtotal (items + proportional tax share), and TipSelector (spec: 05-tip-selection.md)
- [x] Build TipSelectionPage: PersonTipCard for each person, two modes (pass-around or one-person-sets-all toggle), "Calculate Final Split" → /summary (spec: 05-tip-selection.md)

### Phase 9: Split Calculator & Summary

- [x] Implement splitCalculator.ts: proportional algorithm in integer cents — per-person subtotal, proportion-based tax share, individual tip amount, rounding adjustment on largest-share person (spec: 06-split-calculation-summary.md)
- [x] Write unit tests for splitCalculator.ts: single person gets entire bill, two people all individual, three people with shared even split, shared items with custom portions, rounding edge cases (totals must match exactly), zero-item person, different tip % per person (spec: 06-split-calculation-summary.md)
- [x] Build SummaryPage: card per person (items list with quantities, subtotal, tax share, tip amount + %, total owed), grand total verification row, "Copy Summary" clipboard button (plain text in specified format), "Start New Bill" (clear session → /), auto-save to history on load (spec: 06-split-calculation-summary.md)

### Phase 10: Bill History

- [x] Implement historyStore.ts (Zustand + persist): save/load completed sessions, cap at 10 (prune oldest on save), each session has id, date, restaurantName, people, lineItems, assignments, totals (spec: 07-bill-history.md)
- [x] Build HistoryPage: list up to 10 past bills (date, total, people count, restaurant name), tap → read-only summary view, swipe/button to delete, empty state, route /history (spec: 07-bill-history.md)

### Phase 11: Polish & Accessibility

- [x] Add React.lazy() + Suspense to all page components for code splitting, loading fallback UI (spec: 08-polish-accessibility.md)
- [x] Implement session recovery: on app load detect incomplete session in stores and prompt "Continue previous bill?" (spec: 08-polish-accessibility.md)
- [x] Add StepIndicator component showing progress through the 7-screen flow; smooth screen transitions; consistent spacing and typography (spec: 08-polish-accessibility.md)
- [x] Accessibility pass: aria labels on all interactive elements, minimum 44px touch targets, WCAG 2.1 AA color contrast (4.5:1 text, 3:1 UI), keyboard navigation, focus management on transitions (spec: 08-polish-accessibility.md)
- [x] Handle edge cases: zero items in editor, very long name truncation, single person bill flow, zero-people guard (spec: 08-polish-accessibility.md)
- [x] Final verification: `npm run check` passes, Lighthouse PWA audit, full offline flow in airplane mode, PWA installs on Android Chrome + iOS Safari (spec: 08-polish-accessibility.md)

---

## Completed

<!-- Completed tasks move here -->
