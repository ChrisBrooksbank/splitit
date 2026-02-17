# Receipt Parsing & Item Editor

## Overview

Parse OCR text into structured line items and provide an editor for users to review and correct the results.

## User Stories

- As a user, I want the app to automatically identify items and prices from the receipt so that I save time
- As a user, I want to correct any OCR mistakes before splitting the bill
- As a user, I want to manually add items that the OCR missed

## Requirements

### Receipt Parser (`receiptParser.ts`)
- [ ] Split OCR text into lines
- [ ] Match price pattern: `$X.XX` or `X.XX` at end of line
- [ ] Extract quantity prefixes: `2x`, `3 X`, `2 ×`
- [ ] Identify & separate metadata lines (SUBTOTAL, TAX, TOTAL, payment info)
- [ ] Skip noise lines (THANK YOU, date/time, server name, separators, address)
- [ ] Handle common OCR errors (e.g., `$l2.99` → `$12.99`, `O` → `0`)
- [ ] Return `{ lineItems[], detectedSubtotal, detectedTax, detectedTotal }`
- [ ] Confidence score per item (based on pattern match quality)

### Receipt Patterns (`receiptPatterns.ts`)
- [ ] Regex collection for prices, quantities, skip patterns
- [ ] Metadata line patterns (subtotal, tax, total, tip, change, payment)

### Item Editor Screen
- [ ] `LineItemRow` - Display name/qty/price, tap to edit inline, low-confidence warning badge, delete button
- [ ] `LineItemList` - Scrollable list of items
- [ ] "Add Item" button for manual additions
- [ ] `AddItemForm` - Name + price + quantity quick-entry
- [ ] `TaxConfig` - Tax amount input (pre-filled from OCR detection)
- [ ] `BillSummaryCard` - Sticky footer showing Subtotal | Tax | Grand Total (pre-tip)
- [ ] "Continue" button to proceed to People Setup

### Data Store
- [ ] `billStore.ts` (Zustand with persist middleware)
- [ ] CRUD actions for line items
- [ ] Tax amount storage
- [ ] All prices stored as integer cents

### Unit Tests
- [ ] 10+ real receipt text samples covering different formats
- [ ] Edge cases: OCR errors, missing prices, quantity prefixes
- [ ] Items with special characters, long names
- [ ] Tax/subtotal/total detection accuracy

## Acceptance Criteria

- [ ] Parser correctly extracts items from typical restaurant receipts
- [ ] Low-confidence items are visually flagged for review
- [ ] Users can add, edit, and delete items
- [ ] Tax amount is pre-filled from OCR when detected
- [ ] Sticky footer shows correct running totals
- [ ] All tests pass

## Out of Scope

- Person assignment (that's spec 04)
- Tip calculation (that's spec 05)
