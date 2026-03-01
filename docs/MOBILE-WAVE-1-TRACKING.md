# Mobile Wave 1: Foundation — Touch Targets, Forms, Layout Fixes

**Date:** 2026-03-01
**Focus:** Critical mobile UX fixes based on research + audit
**Branch:** `claude/peaceful-ardinghelli`

---

## Research Basis
- 30 mobile-first design techniques cataloged from 2025-2026 best practices
- Full mobile UX audit of current codebase (10 issues identified)
- Top sources: Google Material Design, Apple HIG, Smashing Magazine, NN/g, web.dev

---

## Fixes Implemented

### Fix 1: KPI Strip Horizontal Scroll (HIGH)
- **Issue:** `min-w-[480px]` forced 480px width on mobile, causing horizontal overflow
- **Fix:** Removed min-width constraint — `grid-cols-3` handles layout naturally
- **File:** `src/components/landing/KPIStrip.tsx`

### Fix 2: ExitIntentPopup Close Button Touch Target (HIGH)
- **Issue:** Close button was ~17px (p-1.5 + w-5 icon) — well below 44px WCAG minimum
- **Fix:** Increased to p-2.5 padding + w-6 h-6 icon = ~44px touch target
- **File:** `src/components/marketing/ExitIntentPopup.tsx`

### Fix 3: Form autoComplete Attributes (MEDIUM)
- **Issue:** Missing autoComplete attributes causing manual typing on mobile
- **Fixes:**
  - Contact form: Added autoComplete="name" and autoComplete="email"
  - Book Demo form: Added name, email, organization, organization-title
  - Register form: Already had all correct attributes (no changes needed)
- **Files:** `src/app/contact/page.tsx`, `src/app/book-demo/page.tsx`

### Fix 4: MobileTabBar Grid Responsiveness (MEDIUM)
- **Issue:** 3-column grid too cramped on phones <400px wide
- **Fix:** Changed to 2-col on small phones, 3-col on larger: `grid-cols-2 min-[400px]:grid-cols-3`
- **File:** `src/components/mobile/MobileTabBar.tsx`

### Fix 5: Pricing Table Mobile Optimization (MEDIUM)
- **Issue:** 640px min-width table forcing excessive horizontal scroll
- **Fixes:**
  - Reduced min-width from 640px to 520px
  - Added "Swipe left/right" hint text on mobile
  - Responsive header/cell padding (smaller on mobile)
  - Added scroll-smooth for better touch scrolling
- **File:** `src/app/pricing/page.tsx`

---

## Files Modified
- `src/components/landing/KPIStrip.tsx` — Remove min-width
- `src/components/marketing/ExitIntentPopup.tsx` — Larger close button
- `src/app/contact/page.tsx` — autoComplete attributes
- `src/app/book-demo/page.tsx` — autoComplete attributes
- `src/components/mobile/MobileTabBar.tsx` — Responsive grid
- `src/app/pricing/page.tsx` — Table mobile optimizations
