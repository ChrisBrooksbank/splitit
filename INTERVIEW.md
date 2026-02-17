# SplitIt - Product Interview

**Date:** 2026-02-17
**Format:** Structured Q&A with project owner

---

## 1. MVP Scope

**Q:** What's your MVP scope? Do you want to build all 8 phases before first use, or ship a working subset first?
**A:** OCR is the MVP — the OCR scanning flow is the differentiator, ship it all together.

## 2. Target User

**Q:** Who is the primary user?
**A:** Broad public app — aiming for wide distribution, needs to feel polished and professional.

## 3. Design Style

**Q:** What visual style are you going for?
**A:** Minimal & clean — white space, subtle colors, Apple-like simplicity.

## 4. Deployment

**Q:** Where do you plan to host/deploy this?
**A:** Netlify.

## 5. Pass-Around UX

**Q:** The pass-around assignment flow is the make-or-break UX. How should it work when the phone gets passed?
**A:** Full handoff screen — big "Pass to [Name]" screen with animation, prevents accidental taps during handoff.

## 6. Shared Items

**Q:** How should shared items (e.g. appetizers, pitchers) be handled?
**A:** Both options — default to even split, but allow custom split as an advanced option.

## 7. Unassigned Items

**Q:** What should happen with unassigned items at the end?
**A:** Block summary — don't show summary until every item is assigned, forces completeness.

## 8. App Name

**Q:** Do you have a name/brand preference?
**A:** SplitIt — keep the current name.

## 9. OCR Language

**Q:** What language support does the OCR need?
**A:** English only — keeps Tesseract download small (~4MB).

## 10. Offline Support

**Q:** How important is offline functionality beyond the initial load?
**A:** Critical — must work fully offline after first visit. Restaurants often have poor wifi.

## 11. Bill History

**Q:** Should the app remember previous sessions?
**A:** Simple history — save last 5-10 bills so users can review past splits.

## 12. Accessibility

**Q:** Any accessibility requirements beyond standard best practices?
**A:** Standard a11y — WCAG 2.1 AA basics (contrast, labels, keyboard nav, touch targets).

## 13. Tipping

**Q:** Do you want to support any tipping features beyond presets?
**A:** Pre-tip total — show each person's share before tip so they can choose individually.

## 14. Sharing Results

**Q:** Should there be a way to share the final summary with the group?
**A:** Text only — just a "Copy Summary" button that copies a text breakdown.

## 15. Receipt Edge Cases

**Q:** Any specific receipt formats or edge cases you want handled well?
**A:** Standard receipts — focus on typical single-page restaurant bills for now.

## 16. Timeline

**Q:** What's your timeline expectation?
**A:** Building with AI — using Claude Code to build it fast, timeline depends on how sessions go.

---

## Key Decisions Summary

| Decision | Choice |
|----------|--------|
| MVP scope | Full OCR flow is the MVP |
| Target audience | Broad public app |
| Visual style | Minimal & clean (Apple-like) |
| Hosting | Netlify |
| Assignment UX | Full handoff screen with animation |
| Shared items | Even split default + custom split option |
| Unassigned items | Block summary until all assigned |
| OCR language | English only |
| Offline | Critical — must work fully offline |
| History | Last 5-10 bills |
| Accessibility | WCAG 2.1 AA |
| Tipping | Show pre-tip totals, individual tip choice |
| Sharing | Text copy only |
| Receipt scope | Standard single-page receipts |
