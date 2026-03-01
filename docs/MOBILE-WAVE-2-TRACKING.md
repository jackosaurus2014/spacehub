# Mobile Wave 2: Viewport, Rendering & Navigation

**Date:** 2026-03-01
**Focus:** Dynamic viewport units, content-visibility, sticky header auto-hide, safe-area insets
**Branch:** `claude/peaceful-ardinghelli`
**Commit:** 5cf89f5

---

## Fixes Implemented

### Fix 1: 100vh → 100dvh Migration (HIGH)
- **Issue:** `100vh` doesn't account for mobile browser chrome (address bar, toolbar)
- **Fix:** Migrated all 13 `calc(100vh-*)` usages across 12 files to `100dvh`
- **Files:** globals.css, QuickAccessSidebar, TableOfContents, supply-chain-map, developer/docs, company-research, login, forgot-password, register, messages (page + loading), marketplace/copilot

### Fix 2: content-visibility: auto Utility (MEDIUM)
- **Issue:** Long pages render all content eagerly, wasting mobile GPU/CPU
- **Fix:** Added `.content-auto` CSS utility class with `contain-intrinsic-size: auto 500px`
- **Applied to:** features page (below-fold sections + comparison matrix + CTA), case-studies (article cards + CTA), getting-started (use-case cards + persona tiles)
- **File:** `src/app/globals.css` + 3 page files

### Fix 3: Navigation Safe-Area Insets (MEDIUM)
- **Issue:** On notched devices (iPhone X+), nav content could overlap the notch area
- **Fix:** Added `safe-area-pt` class to `<nav>` element for `env(safe-area-inset-top)` padding
- **File:** `src/components/Navigation.tsx`

### Fix 4: Sticky Header Auto-Hide (HIGH)
- **Issue:** Fixed nav bar permanently consumes ~72px of precious mobile screen space
- **Fix:** Nav hides on scroll down (>10px delta), reappears on scroll up (<-5px delta). Respects open menus/dropdowns. Only activates past 100px scroll depth.
- **File:** `src/components/Navigation.tsx`

---

## Files Modified (16 files, 51 insertions, 24 deletions)
- `src/app/globals.css` — dvh + content-auto utility
- `src/components/Navigation.tsx` — auto-hide + safe-area-pt
- `src/components/QuickAccessSidebar.tsx` — dvh
- `src/components/ui/TableOfContents.tsx` — dvh
- `src/app/case-studies/page.tsx` — content-auto
- `src/app/company-research/page.tsx` — dvh
- `src/app/developer/docs/page.tsx` — dvh
- `src/app/features/page.tsx` — content-auto
- `src/app/forgot-password/page.tsx` — dvh
- `src/app/getting-started/page.tsx` — content-auto
- `src/app/login/page.tsx` — dvh
- `src/app/marketplace/copilot/page.tsx` — dvh
- `src/app/messages/loading.tsx` — dvh
- `src/app/messages/page.tsx` — dvh
- `src/app/register/page.tsx` — dvh
- `src/app/supply-chain-map/page.tsx` — dvh
