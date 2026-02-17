# Image Capture & OCR Processing

## Overview

Capture or upload a receipt photo, preprocess the image, and extract text via local OCR.

## User Stories

- As a user, I want to photograph my receipt so that I don't have to type everything manually
- As a user, I want to see progress while the OCR runs so that I know the app is working
- As a user, I want the OCR to work offline so that I can use it anywhere

## Requirements

### Image Capture
- [ ] Primary capture: `<input type="file" accept="image/*" capture="environment">` (works everywhere including iOS PWA)
- [ ] Optional enhancement: `getUserMedia()` with feature detection (graceful fallback)
- [ ] Image preview with "Retake" / "Use This Photo" buttons
- [ ] Image downscaling to max 2000px longest edge via Canvas API (prevents mobile OOM)

### OCR Engine
- [ ] Tesseract.js v6 singleton worker with lazy initialization
- [ ] English-only language data (~4MB)
- [ ] Progress callback for UI updates
- [ ] WASM + language data cached via service worker (first load ~5MB, then instant)

### Image Preprocessing (Canvas API, no OpenCV)
- [ ] Grayscale conversion (luminance formula)
- [ ] Contrast stretch (histogram stretching)
- [ ] Otsu binarization (optimal threshold)

### Processing Screen
- [ ] Dimmed receipt image in background
- [ ] Animated progress bar with stage labels (Loading OCR / Processing / Extracting text)
- [ ] Auto-navigate to Item Editor when complete
- [ ] `useOcr` hook managing loading/progress/error state

### Home Screen
- [ ] "Scan a Bill" primary CTA (triggers camera/upload)
- [ ] "Enter Manually" secondary action (skips to Item Editor with empty items)
- [ ] "View History" link
- [ ] Minimal & clean design (Apple-like)

## Acceptance Criteria

- [ ] Camera capture works on iOS Safari and Android Chrome
- [ ] OCR extracts text from a clear receipt photo
- [ ] Progress bar shows meaningful stages during OCR
- [ ] Graceful fallback to manual entry on OCR failure
- [ ] Tesseract lazy-loaded only when camera path chosen
- [ ] Works fully offline after first visit

## Out of Scope

- Receipt text parsing/structuring (that's spec 03)
- Multi-language support
- Multi-page receipts
