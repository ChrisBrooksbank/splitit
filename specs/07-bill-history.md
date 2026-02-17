# Bill History

## Overview

Save and display previous bill-splitting sessions so users can review past splits.

## User Stories

- As a user, I want to see my past bills so that I can reference them later
- As a user, I want to delete old bills I no longer need

## Requirements

### History Screen
- [ ] Accessible from Home screen ("View History" link)
- [ ] Show last 10 bills: date, total amount, people count, restaurant name (if detected)
- [ ] Tap a bill to view its summary (read-only)
- [ ] Swipe or button to delete individual entries
- [ ] Empty state when no history exists
- [ ] Route: `/history`

### Data Store
- [ ] `historyStore.ts` (Zustand + persist to localStorage)
- [ ] Auto-save completed sessions
- [ ] Cap at 10 sessions, prune oldest on save
- [ ] Each saved session includes: id, date, restaurant name, people, line items, assignments, totals

## Acceptance Criteria

- [ ] Completed bills appear in history
- [ ] Past summaries are viewable in read-only mode
- [ ] Individual bills can be deleted
- [ ] Maximum 10 bills stored (oldest pruned automatically)
- [ ] History persists across app restarts

## Out of Scope

- Cloud sync
- Exporting history
- Editing past bills
