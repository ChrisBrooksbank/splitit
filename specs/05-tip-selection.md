# Tip Selection (Per-Person)

## Overview

Each person sees their pre-tip subtotal and chooses their own tip percentage or amount.

## User Stories

- As a person at the table, I want to see my subtotal before choosing a tip so that I know what I'm tipping on
- As a person, I want to pick my own tip percentage so that I'm not forced into someone else's choice
- As a group, we want the option for one person to set tips for everyone to speed things up

## Requirements

### Tip Selection Screen
- [ ] Show each person's name, color, and pre-tip subtotal (items + proportional tax share)
- [ ] Each person selects their tip: quick presets (15% / 18% / 20% / 25%)
- [ ] Custom tip option (dollar amount or custom percentage)
- [ ] Default to 20% for all people
- [ ] Two modes: pass-around (each person picks their own) OR one-person-sets-all
- [ ] "Calculate Final Split" button proceeds to Summary

### Components
- [ ] `TipSelector` - Preset percentage buttons + custom input
- [ ] `PersonTipCard` - Card showing person name, color, subtotal, and tip picker
- [ ] Tip amount shown in real-time as user changes selection

### Data
- [ ] Store tip choice per person in session state
- [ ] TipConfig type: `mode: 'percentage' | 'fixed' | 'per-person'`

## Acceptance Criteria

- [ ] Each person sees their correct pre-tip subtotal
- [ ] Tip presets calculate correct amounts
- [ ] Custom tip input works for both dollar amount and percentage
- [ ] Default is 20% for all people
- [ ] Can proceed to summary after tip selection

## Out of Scope

- Final split calculation logic (that's spec 06)
- Summary display (that's spec 06)
