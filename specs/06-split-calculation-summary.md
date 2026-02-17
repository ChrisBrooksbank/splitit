# Split Calculation & Summary

## Overview

Calculate each person's final share (items + proportional tax + individual tip) and display a summary with copy-to-clipboard.

## User Stories

- As a user, I want to see exactly how much each person owes so that we can settle the bill
- As a user, I want to copy a text summary to share with the group
- As a user, I want the math to be exact with no missing or extra cents

## Requirements

### Split Calculator (`splitCalculator.ts`)
- [ ] Proportional algorithm:
  ```
  For each person:
    subtotal = sum of (item.price * qty / shareCount) for their items
    proportion = subtotal / billSubtotal
    taxShare = round(tax * proportion)
    tipShare = calculated from person's individual tip choice
    total = subtotal + taxShare + tipShare
  ```
- [ ] Rounding adjustment: largest-share person absorbs cent difference
- [ ] All math in integer cents
- [ ] Handle edge cases: single person, equal split, shared items with custom portions

### Summary Screen
- [ ] Card per person showing:
  - Person name + color
  - Their items (with quantities)
  - Subtotal
  - Tax share
  - Their chosen tip amount + percentage
  - **Total owed**
- [ ] Grand total verification row (should match original bill + total tips)
- [ ] "Copy Summary" button — copies plain text breakdown to clipboard
- [ ] "Start New Bill" button — clears session and returns to Home
- [ ] Bill auto-saved to history on load

### Copy Summary Format
```
SplitIt Summary
[Restaurant Name] - [Date]

Alice: $24.50
  - Salmon ($18.00)
  - Iced Tea ($3.50)
  - Tax: $1.85
  - Tip (20%): $4.30

Bob: $16.75
  ...

Total: $41.25
```

### Unit Tests
- [ ] Single person gets entire bill
- [ ] Two people, all individual items
- [ ] Three people with shared items (even split)
- [ ] Shared items with custom portions
- [ ] Rounding edge cases (totals must match exactly)
- [ ] Zero-item person edge case
- [ ] Different tip percentages per person

## Acceptance Criteria

- [ ] Per-person totals sum to exactly bill total + total tips (no missing/extra cents)
- [ ] Shared items correctly split by share count or custom portions
- [ ] Copy summary produces clean, readable text
- [ ] Summary auto-saves to bill history
- [ ] "Start New Bill" clears all session state

## Out of Scope

- Payment processing
- Venmo/PayPal integration
