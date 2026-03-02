# Mobile Waves 15–18: Role-Based Mobile Optimization (PM → CEO → CTO → Marketing VP)

**Date:** 2026-03-01
**Branch:** `claude/peaceful-ardinghelli`
**Commits:** 962c9c0 (W15) → a21197b (W16) → 001aab9 (W17) → 2452de0 (W18)
**Total:** 4 files new, 35 files modified, ~1,437 lines added

---

## Wave 15 — Project Manager (962c9c0)
**Focus:** Calculator decimal keyboards, spaceport mobile cards
**Files:** 11 files, 53 insertions

### Changes
1. **inputMode="decimal" on 16 number inputs** across 10 calculator pages
   - orbital-calculator, link-budget, power-budget, constellation-designer
   - thermal-calculator, radiation-calculator, mission-cost, launch-cost
   - unit-economics, mission-simulator
   - Triggers numeric keypad with decimal point on mobile

2. **Spaceport mobile card layout**
   - 10-column table was unreadable on mobile
   - Added `md:hidden` card view + `hidden md:block` table
   - File: `src/app/spaceports/page.tsx`

---

## Wave 16 — CEO (a21197b)
**Focus:** Compact numbers, bookmarks, code deduplication
**Files:** 6 files, 81 insertions

### Changes
1. **useCompactNumber + useIsMobile hooks** (`src/hooks/useCompactNumber.ts`)
   - Shared responsive number formatting (12.6K on mobile, 12,567 on desktop)

2. **KPIStrip** — replaced local formatNumber with shared formatCompact

3. **Dashboard AnimatedCounter** — compact notation on mobile via useIsMobile

4. **Contract Awards** — replaced duplicate formatCurrency with shared import

5. **BookmarkButton** (`src/components/ui/BookmarkButton.tsx`)
   - Rewrote from auth-required API to lightweight localStorage-based
   - Max 50 bookmarks, 44px touch target, "Saved!" flash tooltip
   - Integrated into NewsCard

---

## Wave 17 — CTO (001aab9)
**Focus:** Progressive images, View Transitions, bundle reduction
**Files:** 7 files, 60 insertions

### Changes
1. **CSS View Transitions API** — `@view-transition { navigation: auto; }` in globals.css
   - Progressive enhancement (ignored by unsupported browsers)
   - `nav-persistent` class on Navigation for seamless transitions

2. **Blur placeholder utility** (`src/lib/blur-placeholder.ts`)
   - SVG-based shimmer data URLs matching dark theme
   - Exports: BLUR_PLACEHOLDER_16_9, BLUR_PLACEHOLDER_1_1, BLUR_PLACEHOLDER_4_3
   - Applied to NewsCard, MissionThumbnail, SponsorBanner

3. **Dynamic imports** — 5 more components lazy-loaded:
   - CookieConsent, PWAInstallPrompt, PageTracker, WebVitals, ErrorReporter

---

## Wave 18 — Marketing VP (2452de0)
**Focus:** Push notification opt-in, streak gamification, feature announcements
**Files:** 6 files, 1,243 insertions

### New Components

1. **PushOptInBanner** (`src/components/mobile/PushOptInBanner.tsx` — 381 lines)
   - Smart push notification opt-in banner for mobile
   - Shows after 5+ page views (localStorage: `spacenexus-push-views`)
   - 14-day dismiss cooldown (localStorage: `spacenexus-push-dismiss`)
   - Never shows if: already granted/denied, unsupported, standalone PWA
   - Permission flow: requestPermission → pushManager.subscribe → success toast
   - Gradient accent, bell icon, "Never miss a launch" messaging
   - Positioned above MobileTabBar (bottom-16), safe-area padding

2. **StreakBadge** (`src/components/mobile/StreakBadge.tsx` — 242 lines)
   - Daily visit streak tracker with 2 variants:
     - `compact`: Pill badge "🔥 7" (for nav/header)
     - `full`: Card with streak, longest streak, milestone, total visits
   - Flame flicker CSS animation
   - Celebratory toast on new milestone achievement
   - Integrated into dashboard welcome header (compact variant)

3. **streak.ts** (`src/lib/streak.ts` — 174 lines)
   - localStorage-based streak utility (`spacenexus-streak`)
   - `recordVisit()`: Idempotent per day, increments on consecutive days, resets on gap
   - 7 milestone tiers: Getting Started (3d), Week Warrior (7d), Dedicated Explorer (14d),
     Mission Veteran (30d), Space Commander (60d), Legend (100d), Orbital Master (365d)
   - Corrupted data recovery, SSR-safe

4. **WhatsNew** (`src/components/mobile/WhatsNew.tsx` — 434 lines)
   - Feature announcement system with 3 exports:
     - `WhatsNewDot`: Pulsing cyan indicator dot for unseen announcements
     - `WhatsNewModal`: Bottom-sheet timeline of recent features
     - `WhatsNew` (default): Combined trigger button + modal
   - 5 hardcoded announcements (v2.14–v2.18)
   - Unseen tracking via localStorage (`spacenexus-whats-new-seen`)
   - Accessible: focus trap, Escape to close, aria-modal, body scroll lock
   - "Mark all as read" button, relative date formatting

### Integration
- `layout.tsx`: Dynamic imports for PushOptInBanner + WhatsNew
- `dashboard/page.tsx`: StreakBadge compact variant in welcome header

---

## localStorage Keys Added (Waves 15–18)
| Key | Component | Purpose |
|-----|-----------|---------|
| `spacenexus-push-views` | PushOptInBanner | Track page views for opt-in threshold |
| `spacenexus-push-dismiss` | PushOptInBanner | Dismiss cooldown timestamp |
| `spacenexus-streak` | streak.ts | Streak data (current, longest, lastVisit, totalVisits) |
| `spacenexus-whats-new-seen` | WhatsNew | Last seen announcement ID |
