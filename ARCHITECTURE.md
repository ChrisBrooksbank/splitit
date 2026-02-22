# SplitIt Architecture

## Overview

SplitIt is a fully client-side PWA for splitting restaurant bills. A user photographs a receipt, OCR extracts line items, each person at the table claims their items, and the app calculates per-person totals with proportional tax and individual tip choices.

The only server component is a stateless WebSocket relay on Deno Deploy that enables optional multi-device live sessions.

```
┌─────────────────────────────────────────────────────────┐
│                    Client (PWA)                         │
│                                                         │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │  Pages   │──│  Components  │──│  Zustand Stores   │ │
│  │ (Routes) │  │ (by feature) │  │ (persisted to LS) │ │
│  └──────────┘  └──────────────┘  └───────────────────┘ │
│       │                                    │            │
│       │         ┌──────────────┐           │            │
│       └─────────│   Services   │───────────┘            │
│                 │ OCR/Calc/WS  │                        │
│                 └──────────────┘                        │
│                        │                                │
│                 ┌──────────────┐                        │
│                 │  Service     │  (Workbox, offline)    │
│                 │  Worker      │                        │
│                 └──────────────┘                        │
└────────────────────────┬────────────────────────────────┘
                         │ WebSocket (optional, live sessions only)
                         ▼
              ┌─────────────────────┐
              │  Relay Server       │
              │  (Deno Deploy)      │
              │  Stateless, no auth │
              └─────────────────────┘
```

## Tech Stack

| Layer          | Technology                                |
|----------------|-------------------------------------------|
| Framework      | React 19 + TypeScript                     |
| Build          | Vite 7 + vite-plugin-pwa (Workbox)        |
| Styling        | Tailwind CSS v4 (`@tailwindcss/vite`)     |
| State          | Zustand with `persist` middleware (localStorage) |
| OCR            | Tesseract.js v6 (WASM, in-browser)       |
| Routing        | React Router v7                           |
| IDs            | nanoid                                    |
| Testing        | Vitest + React Testing Library            |
| Relay server   | Deno Deploy (WebSocket)                   |

## Directory Structure

```
src/
  App.tsx                          # Router, lazy-loaded pages, PWA hooks
  main.tsx                         # React root
  index.css                        # Tailwind entry

  pages/                           # 13 route-level components (all lazy-loaded)
    HomePage.tsx                   # Landing: scan, manual entry, history
    ProcessingPage.tsx             # OCR progress display
    ItemEditorPage.tsx             # Review/correct OCR results
    PeopleSetupPage.tsx            # Add people to the bill
    AssignmentPage.tsx             # Pass-around item claiming
    TipSelectionPage.tsx           # Per-person tip choice
    SummaryPage.tsx                # Final per-person breakdown
    HistoryPage.tsx                # Past bill sessions
    LiveSessionPage.tsx            # Host a multi-device session
    JoinPage.tsx                   # Guest joins via room code
    ShareQRPage.tsx                # Share bill data via QR
    ImportQRPage.tsx               # Import bill data from QR
    AiAssistPage.tsx               # AI-powered receipt parsing

  components/
    assignment/                    # Item claiming UI
      AssignableItem.tsx           # Tappable item row with color badges
      HandoffScreen.tsx            # Full-screen "pass to next person"
      PersonChip.tsx               # Person selector chip
      RunningTotal.tsx             # Live running total during claiming
      SharedItemSplitter.tsx       # Bottom sheet for shared item splits

    bill/                          # Bill editing UI
      AddItemForm.tsx              # Manual item entry
      BillSummaryCard.tsx          # Sticky footer with subtotal/tax/total
      ItemEditorModal.tsx          # Inline item edit modal
      LineItemList.tsx             # Scrollable item list
      LineItemRow.tsx              # Single item display row

    camera/                        # Image capture
      ImageCapture.tsx             # File input with camera capture
      ImagePreview.tsx             # Preview with retake/confirm

    layout/                        # App shell components
      AppearanceToggle.tsx         # Dark/light mode toggle
      ErrorBoundary.tsx            # React error boundary
      InstallBanner.tsx            # PWA install prompt
      StepIndicator.tsx            # Progress steps indicator
      UpdateToast.tsx              # Service worker update prompt

    liveSession/                   # Multi-device session UI
      GuestClaimingView.tsx        # Guest's item claiming interface
      GuestSummaryView.tsx         # Guest's summary view
      GuestTipView.tsx             # Guest's tip selection
      HostLiveAssignmentView.tsx   # Host's live session dashboard
      ShareSessionQRModal.tsx      # QR code for room join

    tip/                           # Tip selection
      PersonTipCard.tsx            # Per-person tip card
      TipSelector.tsx              # Preset buttons + custom input

  store/                           # Zustand stores (all persisted to localStorage)
    billStore.ts                   # Line items CRUD
    peopleStore.ts                 # People list management
    assignmentStore.ts             # Item-to-person assignment map
    tipStore.ts                    # Per-person tip choices
    historyStore.ts                # Saved bill sessions
    liveSessionStore.ts            # Live session connection state
    appearanceStore.ts             # Dark/light mode preference
    apiKeyStore.ts                 # API key for AI assist feature

  services/
    ocr/                           # Receipt scanning pipeline
      tesseractService.ts          # Singleton Tesseract worker, lazy init
      imagePreprocessor.ts         # Canvas: grayscale, contrast, binarize
      imagePreprocessor.worker.ts  # Web Worker for preprocessing
      receiptParser.ts             # OCR text → structured line items

    calculator/
      splitCalculator.ts           # Bill split math (integer cents)

    liveSession/                   # Multi-device real-time sync
      RelayService.ts              # WebSocket client (host + guest modes)
      hostOrchestrator.ts          # Host-side state sync logic
      relayConfig.ts               # Relay URL + connection settings
      types.ts                     # Message protocol types

    qr/
      qrCodec.ts                   # QR code encode/decode for bill sharing

    aiImport/
      directAiService.ts           # AI-powered receipt parsing
      parseAiResponse.ts           # AI response → line items

  hooks/
    useOcr.ts                      # OCR loading/progress/error state
    useSessionRecovery.ts          # "Continue previous bill?" on app load
    useInstallPrompt.ts            # PWA install prompt detection
    useSWUpdate.ts                 # Service worker update detection
    useAppearanceEffect.ts         # Apply dark/light mode to DOM
    useLiveSessionHost.ts          # Host-side live session logic
    useLiveSessionGuest.ts         # Guest-side live session logic
    useQRScanner.ts                # QR code scanning via camera

  types/
    index.ts                       # Core data model interfaces

server/
  main.ts                          # Deno Deploy WebSocket relay
  deno.json                        # Deno configuration
```

## Core Data Model

All monetary values are **integer cents** to avoid floating-point errors.

```typescript
interface LineItem {
  id: string
  name: string
  price: number           // cents
  quantity: number
  confidence: number      // 0-1 from OCR (1.0 for manual entry)
  manuallyEdited: boolean
}

interface Person {
  id: string
  name: string
  color: string           // from accessible color palette
}

type AssignmentMap = Map<string, string[]>  // itemId → personId[]

interface PersonTotal {
  personId: string
  subtotal: number        // cents — sum of assigned item shares
  tipAmount: number       // cents
  total: number           // cents — subtotal + tipAmount
  tipPercentage: number
}

interface BillSession {
  id: string
  date: string            // ISO date
  status?: 'draft' | 'complete'
  restaurantName?: string
  people: Person[]
  lineItems: LineItem[]
  assignments: Map<string, string[]>
  tipConfig: TipConfig
  totals: PersonTotal[]
  photoDataUrls?: string[]
}
```

## User Flow

```
Home ──→ Processing ──→ Item Editor ──→ People Setup ──→ Assignment ──→ Tips ──→ Summary
  │                                          ▲
  └── "Enter Manually" ─────────────────────┘
```

| Step | Route | Purpose |
|------|-------|---------|
| 1 | `/` | Scan receipt, enter manually, or view history |
| 2 | `/processing` | OCR progress bar while Tesseract runs |
| 3 | `/editor` | Review/correct extracted items, set tax |
| 4 | `/people` | Add names, auto-assign colors |
| 5 | `/assign` | Pass-around claiming with handoff screens |
| 6 | `/tips` | Per-person tip selection |
| 7 | `/summary` | Final breakdown, copy summary, auto-save |

Additional routes: `/history`, `/live-session`, `/join/:roomCode`, `/share`, `/import-qr`, `/ai-assist`.

## State Management

Eight Zustand stores, all using `persist` middleware to survive page reloads:

```
┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  ┌───────────┐
│ billStore    │  │ peopleStore  │  │ assignmentStore   │  │ tipStore  │
│ (line items) │  │ (people)     │  │ (item→person map) │  │ (per-     │
│              │  │              │  │ + portions        │  │  person)  │
└──────┬───────┘  └──────┬───────┘  └────────┬──────────┘  └─────┬─────┘
       │                 │                   │                    │
       └─────────────────┴───────────────────┴────────────────────┘
                                    │
                         ┌──────────▼──────────┐
                         │  splitCalculator()  │
                         │  Combines all four  │
                         │  → PersonTotal[]    │
                         └──────────▼──────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │  historyStore (saved sessions) │
                    └───────────────────────────────┘

  Other stores: liveSessionStore, appearanceStore, apiKeyStore
```

Each store is independent and focused on a single concern. The `splitCalculator` service reads from all four core stores to produce the final split result.

## OCR Pipeline

```
Camera/Upload → imagePreprocessor → Tesseract.js → receiptParser → billStore
                (Web Worker)        (WASM)          (regex-based)
```

1. **Image capture**: `<input type="file" accept="image/*" capture="environment">` — works on all platforms including iOS PWA
2. **Preprocessing** (`imagePreprocessor.ts`, runs in Web Worker):
   - Resize to max 2000px longest edge (prevents mobile OOM)
   - Grayscale conversion (luminance formula)
   - Contrast stretching (histogram)
   - Otsu binarization (optimal threshold)
3. **OCR** (`tesseractService.ts`): Singleton Tesseract worker, lazy-initialized, English only (~4MB language data)
4. **Parsing** (`receiptParser.ts`): Regex-based extraction — prices (`$X.XX`), quantities (`2x`), metadata lines (SUBTOTAL, TAX, TOTAL), noise filtering

The Tesseract worker is pre-warmed during browser idle time via `requestIdleCallback` in `App.tsx`.

## Split Calculation Algorithm

Located in `src/services/calculator/splitCalculator.ts`. All math in integer cents.

```
For each person:
  subtotal = Σ (item.price × item.quantity × personShareFraction)
    where personShareFraction =
      - 1/N for equal splits (N = number of assignees)
      - custom weight / total weight for custom portions

  tipAmount =
    - percentage mode: round(subtotal × percentage / 100)
    - fixed mode: fixedAmount

  total = subtotal + tipAmount
```

The person with the largest subtotal absorbs any rounding difference so grand totals balance exactly.

## Live Sessions (Multi-Device)

Enables multiple phones to participate simultaneously instead of pass-around.

### Protocol

```
┌────────┐         ┌──────────────┐         ┌────────┐
│  Host  │◄──WS───►│ Relay Server │◄──WS───►│ Guest  │
│ (phone)│         │ (Deno Deploy)│         │ (phone)│
└────────┘         └──────────────┘         └────────┘
```

- **Relay server** (`server/main.ts`): Stateless message forwarder. No auth, no storage, no business logic. Rooms are ephemeral (2-hour TTL). Rate-limits join attempts to prevent room code enumeration.
- **Host**: Creates room → receives 8-character room code → shares via QR or text. Broadcasts `SYNC_STATE` to all guests whenever state changes.
- **Guest**: Joins via room code → identifies as a person → sends claims/tips → receives state updates.

### Message Types

**Guest → Host**: `IDENTIFY`, `CLAIM_ITEM`, `UNCLAIM_ITEM`, `SET_ASSIGNEES`, `SET_TIP`

**Host → Guest**: `SYNC_STATE` (full state snapshot), `PHASE_CHANGE`

### Session Phases

`lobby` → `claiming` → `tips` → `summary`

## PWA & Offline

Configured via `vite-plugin-pwa` with Workbox:

- **Register type**: `prompt` — user sees an update toast, not forced reload
- **Manifest**: Standalone display, portrait orientation, indigo theme
- **Runtime caching**:
  - `.traineddata` files: CacheFirst, 30-day expiry (Tesseract language data)
  - `.wasm` files: CacheFirst, 30-day expiry (Tesseract WASM binary)
- **Install banner**: Custom `InstallBanner` component detects `beforeinstallprompt`
- **Update flow**: `UpdateToast` component prompts user when new SW is available

After first visit, the entire app works offline — OCR included.

## Page Loading

All 13 pages are lazy-loaded via `React.lazy()` + `Suspense` with a spinner fallback. This keeps the initial bundle small and loads pages on demand.

```typescript
const HomePage = lazy(() => import('./pages/HomePage'))
// ... all pages follow this pattern
```

## Deployment

| Component | Platform | Trigger |
|-----------|----------|---------|
| Frontend  | Netlify  | Auto-deploy from `master` branch |
| Relay     | Deno Deploy | Manual deploy of `server/main.ts` |

- Netlify config: `netlify.toml` — build command `npm run build`, publish `dist/`, SPA fallback to `index.html`
- Relay URL: `wss://splitit-relay.chrisbrooksbank.deno.net` (overridable via `VITE_RELAY_URL` env var)

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Integer cents for all money | Eliminates floating-point rounding errors |
| English-only OCR | Keeps Tesseract download to ~4MB instead of 100MB+ |
| File input over getUserMedia | More reliable across platforms, especially iOS PWA |
| Zustand over Redux/Context | Minimal boilerplate, built-in persistence, multiple independent stores |
| Stateless relay server | No data stored server-side, rooms are ephemeral, simple to deploy and scale |
| Per-person tips | Fairer than uniform tip — each person controls their own tip percentage |
| Block summary on unassigned items | Forces completeness, prevents items from being "lost" |
| Lazy-loaded pages | Keeps initial bundle small for fast first paint |
