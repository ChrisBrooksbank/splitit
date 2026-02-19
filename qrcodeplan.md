# Live Multi-Device Sessions

## Context

SplitIt's assignment flow requires passing one phone around the table. With 4+ people this is slow and awkward (the `HandoffScreen` adds 1.5s lockout per handoff). This feature lets the host generate a QR code so everyone joins from their own phone's browser — no app install needed. Each person claims items simultaneously, picks their own tip, and sees their total.

**Key constraint**: SplitIt has no backend. We use **PeerJS** (WebRTC data channels with a free signaling server) for P2P communication. The host device is the single source of truth — guests send actions, host applies them to Zustand stores and broadcasts state back. This eliminates conflict resolution entirely.

---

## New Dependencies

```
peerjs        – WebRTC abstraction with free signaling relay
qrcode.react  – QR code SVG rendering in React
```

---

## Architecture

```
HOST DEVICE                              GUEST DEVICE
┌─────────────────────┐                 ┌─────────────────────┐
│ Zustand stores      │                 │ liveSessionStore     │
│ (bill, assignment,  │◄── applies ──── │   .syncedState       │
│  tip, people)       │    actions      │   (read-only mirror) │
│         │           │                 │         ▲            │
│         ▼           │                 │         │            │
│ hostOrchestrator    │── SYNC_STATE ──►│ useLiveSessionGuest  │
│         ▲           │                 │         │            │
│         │           │                 │         ▼            │
│ PeerService (host)  │◄── WebRTC ────►│ PeerService (guest)  │
└─────────────────────┘                 └─────────────────────┘
```

- **Host** reads/writes existing Zustand stores (billStore, assignmentStore, tipStore)
- **Guests** never write to local Zustand stores — they render from `syncedState` and send actions to host
- Star topology: all guests connect to host, not to each other

---

## Message Protocol

### Guest → Host
| Message | Fields | Triggers |
|---------|--------|----------|
| `IDENTIFY` | `personId` | Guest picks "I am [name]" |
| `CLAIM_ITEM` | `itemId, personId` | `assignmentStore.assignPerson()` |
| `UNCLAIM_ITEM` | `itemId, personId` | `assignmentStore.unassignPerson()` |
| `SET_ASSIGNEES` | `itemId, personIds[], portions` | `setAssignees()` + `setPortions()` |
| `SET_TIP` | `personId, mode, percentage, fixedAmount` | `tipStore.setPersonTip*()` |

### Host → Guests
| Message | Fields | When |
|---------|--------|------|
| `SYNC_STATE` | `{lineItems, people, assignments, portions, personTips, phase}` | After every mutation + on guest connect |
| `PHASE_CHANGE` | `phase` | Host advances assign→tips→summary |

---

## New Files (14)

### Services
| File | Purpose |
|------|---------|
| `src/services/liveSession/types.ts` | Message types, `SessionPhase`, `SyncPayload` |
| `src/services/liveSession/PeerService.ts` | WebRTC wrapper — `startHost()`, `joinAsGuest()`, `broadcastToAll()`, `sendToHost()`, event emitter |
| `src/services/liveSession/hostOrchestrator.ts` | Wires PeerService events → Zustand store mutations → broadcasts state |

### Store
| File | Purpose |
|------|---------|
| `src/store/liveSessionStore.ts` | Session lifecycle (role, roomCode, phase, guests[], myPersonId, syncedState). **Not persisted** — refresh clears session |

### Hooks
| File | Purpose |
|------|---------|
| `src/hooks/useLiveSessionHost.ts` | Creates PeerService, attaches orchestrator, exposes `roomCode`, `advancePhase()`, `endSession()` |
| `src/hooks/useLiveSessionGuest.ts` | Wires guest PeerService events to store, exposes `sendAction()`, `identify()` |

### Pages
| File | Purpose |
|------|---------|
| `src/pages/LiveSessionPage.tsx` | Host: QR code display + guest presence indicators + "Everyone's Here" button |
| `src/pages/JoinPage.tsx` | Guest: connect → pick identity → delegates to claiming/tip/summary views |

### Components
| File | Purpose |
|------|---------|
| `src/components/liveSession/GuestClaimingView.tsx` | Guest item claiming — reuses `AssignableItem` + `SharedItemSplitter` with props from `syncedState` |
| `src/components/liveSession/GuestTipView.tsx` | Guest tip — reuses `PersonTipCard` |
| `src/components/liveSession/GuestSummaryView.tsx` | Guest personal total display |
| `src/components/liveSession/HostLiveAssignmentView.tsx` | Host real-time overview of all assignments |

### Utils
| File | Purpose |
|------|---------|
| `src/utils/debounce.ts` | 50ms debounce for broadcast throttling on rapid actions |

---

## Modified Files (4)

### `src/App.tsx`
- Add lazy imports for `LiveSessionPage` and `JoinPage`
- Add routes: `/live-session` and `/join/:roomCode`

### `src/pages/PeopleSetupPage.tsx` (lines 186-195)
- Replace single "Continue to Assignment" button with two buttons:
  1. **"Live Session (Each Uses Own Phone)"** → navigates to `/live-session` (primary, with Wifi icon)
  2. **"Pass Around (One Phone)"** → existing `/assign` navigation (secondary)

### `src/pages/AssignmentPage.tsx` (top of component)
- Add early return: if `isLive && role === 'host'`, render `<HostLiveAssignmentView />` instead of the pass-around state machine
- Existing single-device flow is completely untouched

### `src/pages/TipSelectionPage.tsx` (handleCalculate function)
- When `isLive && role === 'host'`: also broadcast `PHASE_CHANGE('summary')` to guests before navigating to `/summary`

---

## User Flows

### Host Flow
```
/people → "Live Session" → /live-session (QR displayed)
  → guests join, presence badges light up
  → "Everyone's Here" → /assign (HostLiveAssignmentView)
  → watches assignments update live
  → "Move to Tips" → /tips (same page as today, tips arrive from guests)
  → "Calculate" → /summary (broadcasts summary phase to guests)
```

### Guest Flow
```
Scan QR → /join/ABC123 → connecting spinner
  → pick "I am [name]" from people list
  → GuestClaimingView: tap items to claim
  → host advances → GuestTipView: pick tip
  → host advances → GuestSummaryView: see personal total
```

### Fallback
- If PeerService fails to start (no internet to signaling server): LiveSessionPage shows error + "Use Pass-Around Instead" button → `/assign`
- If guest disconnects mid-session: DisconnectedScreen with "Try Reconnecting" + "View Last State"
- Host can always fall back to pass-around for any guests who couldn't connect

---

## Component Reuse

These existing components are already prop-driven and need **zero modifications**:
- `AssignableItem` (`src/components/assignment/AssignableItem.tsx`) — used by GuestClaimingView
- `SharedItemSplitter` (`src/components/assignment/SharedItemSplitter.tsx`) — used by GuestClaimingView
- `PersonChip` (`src/components/assignment/PersonChip.tsx`) — used by HostLiveAssignmentView
- `PersonTipCard` (`src/components/tip/PersonTipCard.tsx`) — used by GuestTipView
- `StepIndicator` (`src/components/layout/StepIndicator.tsx`) — used by LiveSessionPage + HostLiveAssignmentView
- `splitCalculator` (`src/services/calculator/splitCalculator.ts`) — used by GuestSummaryView

---

## Implementation Order

### PR 1: Foundation (no UI)
1. `npm install peerjs qrcode.react`
2. `src/services/liveSession/types.ts`
3. `src/services/liveSession/PeerService.ts`
4. `src/store/liveSessionStore.ts`
5. `src/utils/debounce.ts`
6. Unit tests for PeerService (mocked PeerJS) + liveSessionStore

### PR 2: Host orchestration + hooks (no UI)
1. `src/services/liveSession/hostOrchestrator.ts`
2. `src/hooks/useLiveSessionHost.ts`
3. `src/hooks/useLiveSessionGuest.ts`
4. Unit tests for hostOrchestrator

### PR 3: Guest UI components
1. `GuestClaimingView`, `GuestTipView`, `GuestSummaryView`, `HostLiveAssignmentView`
2. Component tests

### PR 4: Pages + routing + wiring
1. `LiveSessionPage.tsx`, `JoinPage.tsx`
2. Modify `App.tsx` (routes), `PeopleSetupPage.tsx` (buttons), `AssignmentPage.tsx` (host branch), `TipSelectionPage.tsx` (phase broadcast)
3. Integration tests

### PR 5: Error handling + polish
1. Reconnection logic in JoinPage
2. Disconnected/error screens
3. Broadcast throttling via debounce

---

## Verification

1. **Unit tests**: `npm run check` — all new services, stores, and components have tests
2. **Manual test (same machine)**: Open app in two browser tabs. Host creates session, copy `/join/CODE` URL into second tab. Verify: guest connects, picks identity, claims items, host sees updates live
3. **Manual test (two devices)**: Host on phone, guest scans QR on another phone on same WiFi. Full flow through to summary
4. **Fallback test**: Disconnect WiFi before starting host → verify error screen + pass-around fallback works
5. **Disconnect test**: Guest closes tab mid-session → host shows guest as disconnected, session continues for others
