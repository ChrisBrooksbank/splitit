# Polish & Accessibility

## Overview

Final polish pass covering error handling, accessibility, performance, and edge cases.

## User Stories

- As a user, I want the app to recover gracefully if something goes wrong
- As a user with accessibility needs, I want to use the app with assistive technology
- As a user, I want the app to be fast and responsive

## Requirements

### Error Handling
- [ ] OCR failure graceful fallback → redirect to manual entry with helpful message
- [ ] Session recovery: "Continue previous bill?" prompt on app load if session exists
- [ ] Handle edge cases: zero items, zero people, unassigned items, very long names

### Accessibility (WCAG 2.1 AA)
- [ ] Proper aria labels on all interactive elements
- [ ] Minimum 44px touch targets
- [ ] Color contrast ratios meet AA standards (4.5:1 text, 3:1 UI)
- [ ] Keyboard navigation support
- [ ] Screen reader compatible flow
- [ ] Focus management during screen transitions

### Performance
- [ ] Lazy-load Tesseract.js (only when camera path chosen)
- [ ] `React.lazy()` for page components with Suspense
- [ ] Full offline support — service worker caches all assets + Tesseract WASM/traineddata

### Visual Polish
- [ ] Minimal & clean design throughout (Apple-like simplicity)
- [ ] Consistent spacing and typography
- [ ] Smooth transitions between screens
- [ ] Loading states for async operations
- [ ] Step indicator showing progress through the flow

## Acceptance Criteria

- [ ] App works fully offline after first visit
- [ ] No accessibility violations (automated audit)
- [ ] Graceful error recovery in all failure scenarios
- [ ] Smooth, polished feel on mobile devices
- [ ] All Lighthouse PWA checks pass

## Out of Scope

- Multi-language UI
- Dark mode (future enhancement)
- Analytics/tracking
