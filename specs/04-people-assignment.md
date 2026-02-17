# People Setup & Item Assignment

## Overview

Add people at the table and use a pass-around flow so each person claims their items on the same device.

## User Stories

- As a user, I want to add everyone's name so that we can split the bill fairly
- As a person at the table, I want to tap the items I ordered so that I only pay for what I had
- As a user, I want a clear handoff screen when passing the phone so that nobody sees each other's selections accidentally
- As a user, I want to split shared items (like appetizers) among multiple people

## Requirements

### People Setup Screen
- [ ] Add people by name (text input + "Add" button)
- [ ] Auto-assign colors from an accessible palette (high contrast, colorblind-friendly)
- [ ] Minimum 2 people required to proceed
- [ ] Edit/remove people before proceeding
- [ ] "Continue to Assignment" button

### Assignment Screen (the core UX)
- [ ] Step 1: "Who are you?" — person taps their name (large buttons with person's color)
- [ ] Step 2: Item list appears — tap items to claim (colored dot/badge with person's color)
- [ ] Items show who has already claimed them (colored badges)
- [ ] Share icon on any item opens shared-item bottom sheet
- [ ] "I'm Done" button triggers handoff screen
- [ ] After last person: check for unassigned items
- [ ] **Block progression** if any items are unassigned — highlight them and force assignment
- [ ] Support going back to re-assign items

### Shared Item Splitting
- [ ] Bottom sheet with person checkboxes (who shares this item?)
- [ ] Default to even split among selected people
- [ ] Advanced option: custom split with fraction/portion selector (e.g., "2 of 3 portions")

### Handoff Screen
- [ ] Full-screen overlay: "Pass the phone to [Next Person]"
- [ ] Large name display with person's color
- [ ] Animation to prevent accidental taps during handoff
- [ ] Tap/confirm to start next person's turn

### Data Stores
- [ ] `peopleStore.ts` (Zustand + persist) - people list with colors
- [ ] `assignmentStore.ts` (Zustand + persist) - Map<itemId, personId[]> assignments

### Components
- [ ] `PersonChip` - Colored chip with person name
- [ ] `AssignableItem` - Item row with colored assignment badges, tap feedback
- [ ] `SharedItemSplitter` - Bottom sheet for shared items
- [ ] `HandoffScreen` - Full-screen handoff animation

## Acceptance Criteria

- [ ] 3+ people can be added with unique colors
- [ ] Each person can claim items during their turn
- [ ] Shared items can be split evenly or with custom portions
- [ ] Handoff screen prevents accidental interaction
- [ ] Cannot proceed to tips/summary with unassigned items
- [ ] Assignment state persists if app is closed mid-flow

## Out of Scope

- Tip selection (that's spec 05)
- Final calculation (that's spec 06)
