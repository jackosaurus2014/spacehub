# Mobile Wave 3: Typography, Shimmer, Bottom-Sheet, Table Cards

**Date:** 2026-03-01
**Focus:** Fluid typography, skeleton upgrades, mobile modal UX, responsive data tables
**Branch:** `claude/peaceful-ardinghelli`
**Commit:** 71d0c1e

---

## Fixes Implemented

### Fix 1: Fluid Typography with clamp() (HIGH)
- **Issue:** All text scaling used Tailwind breakpoints (text-3xl md:text-5xl) with jumps between sizes
- **Fix:** Added CSS custom properties with clamp() for smooth 320px→1200px scaling
- **Variables:** `--fs-display`, `--fs-h1`, `--fs-h2`, `--fs-h3`
- **Utility classes:** `.text-fluid-display`, `.text-fluid-h1`, `.text-fluid-h2`, `.text-fluid-h3`
- **Applied to:** LandingHero h1 heading
- **Files:** `src/app/globals.css`, `src/components/LandingHero.tsx`

### Fix 2: Skeleton Shimmer Animation (MEDIUM)
- **Issue:** Skeleton loaders used basic `animate-pulse` (opacity fade) — static-looking
- **Fix:** Added `.skeleton-shimmer` class with gradient sweep animation (1.5s ease-in-out)
- **Details:** Dark-mode optimized gradient (slate-400/15%), respects prefers-reduced-motion
- **Backward compat:** `shimmer` prop defaults to true, set `shimmer={false}` for old pulse
- **File:** `src/components/ui/Skeleton.tsx`, `src/app/globals.css`

### Fix 3: Bottom-Sheet Modal on Mobile (HIGH)
- **Issue:** Modals centered on mobile wasted vertical space and felt non-native
- **Fix:** `.modal-bottom-sheet` CSS class makes modals slide up from bottom on <768px
- **Details:** 85dvh max height, rounded top corners, safe-area padding, drag handle indicator, slide-up animation
- **File:** `src/components/ui/Modal.tsx`, `src/app/globals.css`

### Fix 4: Responsive Table-to-Card CSS (MEDIUM)
- **Issue:** Data tables forced horizontal scrolling on mobile
- **Fix:** `.table-cards` CSS utility transforms tables into stacked cards on <640px
- **Details:** Hides thead (visually, not for screen readers), uses data-label pseudo-elements, space-themed styling
- **File:** `src/app/globals.css`

---

## Files Modified (4 files, 121 insertions, 5 deletions)
- `src/app/globals.css` — All 4 CSS utilities
- `src/components/LandingHero.tsx` — Fluid hero typography
- `src/components/ui/Skeleton.tsx` — Shimmer prop + class
- `src/components/ui/Modal.tsx` — Bottom-sheet class + drag handle
