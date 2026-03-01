# Mobile Wave 5: Progress, Motion, Images, Truncation

**Date:** 2026-03-01
**Focus:** Scroll progress indicator, reduced motion nuance, image optimization, text truncation
**Branch:** `claude/peaceful-ardinghelli`
**Commit:** 77d0889

---

## Fixes Implemented

### Fix 1: Scroll Progress Indicator (NEW COMPONENT)
- **File:** `src/components/ui/ScrollProgress.tsx`
- Fixed 3px gradient bar (purple→cyan) at viewport top
- Shows reading progress, hidden when at top
- Passive scroll listener, aria-hidden for a11y
- Wired into root `layout.tsx`

### Fix 2: Nuanced Reduced Motion (HIGH)
- **Issue:** Nuclear `prefers-reduced-motion` killed ALL animations including benign fades
- **Fix:** Split into two rules: animations → killed, transitions → limited to opacity/color/background/border/shadow
- Cards forced `transform: none` to prevent movement-based hover effects
- **File:** `src/app/globals.css`

### Fix 3: Image Sizes for Mobile (MEDIUM)
- **Issue:** NewsCard images used `fill` without `sizes` — full resolution served to all devices
- **Fix:** Added `sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"` to both NewsCard image variants
- **File:** `src/components/NewsCard.tsx`

### Fix 4: ReadMore Truncation Component (NEW COMPONENT)
- **File:** `src/components/ui/ReadMore.tsx`
- Line-clamp based truncation with configurable `lines` prop
- Auto-detects overflow via `scrollHeight > clientHeight`
- "Read more"/"Show less" toggle only shown when text actually overflows
- Ready to apply to card descriptions across the site

---

## Files Created
- `src/components/ui/ScrollProgress.tsx`
- `src/components/ui/ReadMore.tsx`

## Files Modified (3 files)
- `src/app/globals.css` — Nuanced reduced-motion
- `src/app/layout.tsx` — ScrollProgress wired in
- `src/components/NewsCard.tsx` — Image sizes
