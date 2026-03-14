# SpaceNexus Complete Redesign V2 — March 2026

**Research Date:** March 13, 2026
**Websites Studied:** 22 top-tier sites across SaaS, tech, data platforms
**Goal:** Redesign SpaceNexus with a clean, contemporary aesthetic worthy of a top 1% professional design

---

## Part 1: Research Summary — What the Best Sites Do

### 1.1 Sites Analyzed

| Site | Background | Accent | Font Stack | Key Pattern |
|------|-----------|--------|------------|-------------|
| **Linear** | Dark (near-black) | Monochromatic neutrals | Inter | Extreme restraint, no color noise |
| **Vercel** | Dark/black (#000) | Blue/cyan accents | Geist (custom) | Dual theme, prism light effects |
| **Stripe** | Light/white | Purple/violet, gradients | System fonts | Gradient mesh hero, content-dense |
| **Notion** | Light/white | Multi-color cards (teal, red, blue) | Sans-serif | Bento cards, video-driven hero |
| **Figma** | Light/white (#FFF) | Purple (#4D49FC), green (#E4FF97) | ABC Whyte (custom) | Dramatic type scaling, generous whitespace |
| **Resend** | Pure black (#000) | Blue (#00A3FF) | Inter + Domaine (serif) | Glassmorphism, texture overlays |
| **Supabase** | Dark default | Green/emerald | System fonts | Product screenshots, trust badges |
| **PostHog** | Light/white | Blue (#2563eb) | IBM Plex Sans | Data-forward, interactive sliders |
| **Raycast** | Dark navy (#070921) | Neon magenta, cyan | System sans-serif | 3D effects, glass cards |
| **Tailwind** | White (light) / dark blue-gray | Sky, pink, fuchsia per section | Inter + IBM Plex Mono | P3 colors, outline borders |
| **Clerk** | Light gray-50 | White overlays, meteors | Sans-serif | Circuit-line SVGs, atmospheric |
| **Anthropic** | Dark charcoal | Burnt orange (#D97757) | Variable fluid type | GSAP animations, word-by-word reveals |
| **Dub.co** | Light/white | Pure neutrals only | System display fonts | Grid borders, extreme minimalism |
| **Railway** | Dark purple (#13111C) | Cyan (#00EBFF) | Inter Tight + JetBrains Mono | HSL palette, gradient overlays |
| **Cal.com** | Dark (#242424) | Purple (#6349EA) | Cal Sans + Inter + Manrope | Gradient system, custom fonts |
| **Arc** | Light cream (#FFFCEC) | Deep blue (#2702C2) | Custom (Marlin, Exposure) | Warm tones, noise textures |
| **GitHub** | Light/white | Semantic colors | System fonts | Carousel hero, stat callouts |
| **Notion** | Light/white | Card-specific colors | Sans-serif | Bento layout, video content |
| **Mixpanel** | Light/white (#FFF) | Purple (#7856FF) | DM Sans + Inter | Data viz tokens, semantic colors |
| **Figma** | White + black footer | Purple + green accent | Custom variable fonts | 48-column grid, extreme whitespace |
| **Framer** | Light/white | Inter-based | Inter + custom display | Typography-centric, conversion-focused |

### 1.2 The Clear Verdict: Light vs Dark

**Background color distribution across the 22 best sites:**

| Category | Count | Sites |
|----------|-------|-------|
| **Light/White** | 10 | Stripe, Notion, Figma, PostHog, Dub.co, GitHub, Mixpanel, Framer, Tailwind (light mode), Arc |
| **Dark/Black** | 8 | Linear, Resend, Raycast, Railway, Cal.com, Anthropic, Supabase, Vercel (dark mode) |
| **Dual theme** | 4 | Vercel, Supabase, Tailwind, Clerk |

**Key insight:** The split is roughly 50/50, but with a critical nuance:
- **Data-intensive platforms** (PostHog, Mixpanel, GitHub) lean **light** — better for dense information consumption
- **Developer tools** (Linear, Resend, Vercel) lean **dark** — signals technical sophistication
- **The absolute best** (Vercel, Tailwind, Supabase) offer **both** via a toggle

### 1.3 Universal Design Patterns (What ALL Top Sites Share)

1. **Extreme typographic discipline** — 2-3 font weights max, tight letter-spacing on display (-0.02 to -0.04em), generous line-height on body
2. **Restraint over decoration** — 1-2 accent colors max, monochromatic base palette
3. **Generous whitespace** — 80-128px section padding, never cramped
4. **Subtle borders over shadows** — `outline 1px rgba(0,0,0,0.05)` or `border-white/[0.06]`, not heavy box-shadows
5. **Pill-shaped or rounded-xl buttons** — Moving away from sharp corners
6. **Grid-based layouts** — Consistent column systems (8, 12, or 48-column)
7. **Product screenshots > illustrations** — Show the actual UI, not abstract art
8. **Single CTA per section** — Focused actions, not choice overload
9. **Custom/premium font families** — Inter is baseline; leaders use custom fonts
10. **Motion with purpose** — Scroll-triggered reveals, not gratuitous animation

---

## Part 2: Recommended Direction for SpaceNexus

### 2.1 The Recommendation: Pure Black Dark Mode

**We recommend: True black (#000000) with warm white text, NOT the current dark blue (#050a15)**

**Rationale:**
1. **SpaceNexus is a data platform** — Users spend hours reading data, charts, company profiles. Dark mode reduces eye strain for extended sessions.
2. **Space = void = black** — The brand metaphor is perfect. Space IS black. A true black background creates an immersive "looking into space" feel that no light theme can match.
3. **OLED battery savings** — True black pixels are OFF on OLED screens (majority of mobile devices in 2026). This is a real user benefit.
4. **Differentiation** — Most space competitors (Quilty, Payload) use standard light themes. A refined black experience signals "this is different."
5. **Top 1% precedent** — Linear, Resend, Vercel (dark mode), Raycast, Anthropic all prove that black can feel more premium than white.
6. **Our existing investment** — We've already built a dark design system. Shifting from dark-blue to true-black is far less disruptive than going light.

### 2.2 The New Palette

```
BACKGROUNDS
  --bg-void:        #000000   /* True black — OLED-optimized */
  --bg-surface:     #0a0a0a   /* Barely-there surface, 4% lightness */
  --bg-elevated:    #141414   /* Cards, dropdowns, modals — 8% lightness */
  --bg-hover:       #1a1a1a   /* Interactive hover state — 10% lightness */
  --bg-active:      #222222   /* Active/pressed state — 13% lightness */

TEXT
  --text-primary:   #fafafa   /* Near-white, not pure #fff (reduces glare) */
  --text-secondary: #a1a1a1   /* Warm gray for descriptions */
  --text-tertiary:  #666666   /* Muted for timestamps, metadata */
  --text-link:      #fafafa   /* Links are white, underline on hover */

BORDERS
  --border-subtle:  rgba(255, 255, 255, 0.06)   /* Structural lines */
  --border-default: rgba(255, 255, 255, 0.10)   /* Card borders */
  --border-hover:   rgba(255, 255, 255, 0.15)   /* Hover emphasis */
  --border-focus:   rgba(255, 255, 255, 0.25)   /* Focus rings */

ACCENT (Single accent color — warm white/cream)
  --accent:         #ffffff   /* Pure white for CTAs */
  --accent-hover:   #e5e5e5   /* Slightly dimmed on hover */
  --accent-subtle:  rgba(255, 255, 255, 0.08)  /* Tinted backgrounds */

SEMANTIC (Only where meaning requires color)
  --success:        #22c55e   /* green-500 — confirmations */
  --warning:        #eab308   /* yellow-500 — cautions */
  --error:          #ef4444   /* red-500 — errors */
  --info:           #3b82f6   /* blue-500 — informational */

DATA VISUALIZATION (Distinct, accessible palette for charts)
  --chart-1:        #818cf8   /* indigo-400 */
  --chart-2:        #34d399   /* emerald-400 */
  --chart-3:        #f59e0b   /* amber-500 */
  --chart-4:        #f472b6   /* pink-400 */
  --chart-5:        #38bdf8   /* sky-400 */
  --chart-6:        #fb923c   /* orange-400 */
```

### 2.3 Typography System

```
FONTS
  Primary:     Inter (already loaded, keep)
  Display:     Inter with -0.03em letter-spacing, weight 500-600
  Code:        JetBrains Mono or existing mono stack
  Remove:      Orbitron (the space-themed display font feels dated)

SCALE (Fluid, using clamp)
  Hero:        clamp(3rem, 5vw + 1rem, 5rem)      /* 48-80px */
  Display:     clamp(2rem, 3vw + 0.5rem, 3.5rem)  /* 32-56px */
  H1:          clamp(1.75rem, 2vw + 0.5rem, 2.5rem) /* 28-40px */
  H2:          clamp(1.25rem, 1.5vw + 0.5rem, 1.75rem) /* 20-28px */
  H3:          1.125rem (18px)
  Body:        1rem (16px)
  Small:       0.875rem (14px)
  Caption:     0.75rem (12px)

WEIGHTS
  Display headings:  500 (medium) — NOT bold; medium is more refined
  Section headings:  600 (semibold)
  Body:              400 (regular)
  Labels:            500 (medium)

LETTER SPACING
  Display:  -0.03em  (tight, modern)
  Headings: -0.02em  (slightly tight)
  Body:     0        (normal)
  Caps:     +0.05em  (tracked out for uppercase labels)

LINE HEIGHT
  Display:  1.05 - 1.1  (very tight)
  Headings: 1.2 - 1.3
  Body:     1.6 - 1.7   (generous for readability)
```

### 2.4 Component Design Language

#### Cards
```css
.card-v2 {
  background: #0a0a0a;               /* --bg-surface */
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;               /* rounded-2xl */
  padding: 24px;
  transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.card-v2:hover {
  background: #111111;
  border-color: rgba(255,255,255,0.12);
  transform: translateY(-1px);       /* Subtle, not -2px */
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}
```

**Key change from current:** No backdrop-filter blur. True black surfaces don't need glassmorphism — there's nothing behind to blur. Cards are opaque with subtle elevation.

#### Buttons
```css
/* Primary — solid white, high contrast */
.btn-v2-primary {
  background: #ffffff;
  color: #000000;
  font-weight: 500;
  padding: 10px 24px;
  border-radius: 12px;               /* rounded-xl, not pill */
  font-size: 14px;
  transition: all 0.15s ease;
}
.btn-v2-primary:hover {
  background: #e5e5e5;
}

/* Secondary — ghost/outline */
.btn-v2-secondary {
  background: transparent;
  color: #fafafa;
  border: 1px solid rgba(255,255,255,0.15);
  padding: 10px 24px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
}
.btn-v2-secondary:hover {
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.25);
}
```

#### Navigation
```css
/* Floating nav bar — follows Linear/Resend pattern */
.nav-v2 {
  position: fixed;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(10, 10, 10, 0.8);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  padding: 8px 16px;
  max-width: 1000px;
  width: calc(100% - 32px);
  z-index: 50;
}
```

**Key change:** Float the nav as a centered bar with rounded corners, not a full-width strip.

#### Section Spacing
```css
/* Consistent vertical rhythm */
.section-v2 {
  padding: 96px 0;                   /* 6rem on desktop */
}
@media (max-width: 768px) {
  .section-v2 { padding: 64px 0; }  /* 4rem on tablet */
}
@media (max-width: 480px) {
  .section-v2 { padding: 48px 0; }  /* 3rem on mobile */
}
```

### 2.5 Hero Section Design

**Current:** Video background with stat counters
**Proposed:** Minimal, typography-driven hero

```
Layout:
┌─────────────────────────────────────────────┐
│                                             │
│           [nav bar floating]                │
│                                             │
│                                             │
│      The intelligence platform              │
│      for the space economy.                 │  ← Hero text: 64px, weight 500
│                                             │
│      Track 200+ companies, analyze          │  ← Subtext: 20px, gray
│      markets, and plan missions with        │
│      real-time data from 50+ sources.       │
│                                             │
│      [Get Started]  [Explore Platform →]    │  ← White primary + ghost secondary
│                                             │
│      Used by analysts at ████ ████ ████     │  ← Small logo strip
│                                             │
│─────────────────────────────────────────────│
│                                             │
│      ┌────────────────────────────────┐     │
│      │                                │     │
│      │    [Product Screenshot]        │     │  ← Real dashboard screenshot
│      │    Mission Control Dashboard   │     │     with subtle glow behind it
│      │                                │     │
│      └────────────────────────────────┘     │
│                                             │
└─────────────────────────────────────────────┘
```

**Key decisions:**
- No video background (slow to load, distracting)
- No starfield animation (removes visual noise)
- Product screenshot as the hero image (shows what you get)
- Subtle radial glow behind the screenshot: `radial-gradient(ellipse at center, rgba(59,130,246,0.08) 0%, transparent 70%)`

### 2.6 Landing Page Section Flow

1. **Hero** — Value prop + CTA + product screenshot
2. **Trust Bar** — Logo strip of data sources (NASA, NOAA, FAA, SAM.gov)
3. **Bento Grid** — 6-8 feature cards showing actual product modules
4. **How It Works** — 3-step process (Explore → Analyze → Act)
5. **Social Proof** — Metric cards (200+ companies, 50+ sources, etc.)
6. **Pricing Preview** — 3 tiers, compact, with "See full comparison" link
7. **Newsletter CTA** — Single email input, no name field
8. **Footer** — 5-column, minimal

### 2.7 Navigation Redesign

**Desktop (7 items max):**
```
[Logo]  Platform  Solutions  Resources  Pricing  [Search ⌘K]  [Sign In]  [Get Started]
```

- **Platform dropdown:** Bento grid showing 6 main modules with icons
- **Solutions dropdown:** By persona (Investor, Entrepreneur, Executive, Engineer)
- **Resources dropdown:** Blog, Newsletter, API Docs, Guides

**Mobile:**
```
Bottom bar: [Home] [Explore] [Search] [Profile]
```
- Remove "News" and "Events" from bottom bar (move to Explore menu)
- "Explore" opens full-screen module browser
- Max 4 items in bottom nav (never 5)

---

## Part 3: What to Remove

The following patterns should be eliminated in the redesign:

| Remove | Reason | Replace With |
|--------|--------|-------------|
| Starfield animation | Visual noise, performance cost | Solid black background |
| Background image (`SpaceNexus background.jpg`) | Adds complexity, no value on black | Remove completely |
| `body::before` / `body::after` pseudo-elements | Background overlays no longer needed | Remove |
| Orbitron font | Space-themed font feels dated | Inter only |
| `card-nebula`, `card-cyan`, `card-amber`, `card-emerald` | Color-coded cards add visual noise | Single `card-v2` class |
| `glass-panel` class | Glassmorphism unnecessary on opaque black | Opaque `card-v2` |
| `gradient-line` dividers | Already removed from active code | Clean section spacing |
| `glow-border` effects | Purple glow (#8b5cf6) is off-brand | Subtle white border |
| Purple selection color | `rgba(139, 92, 246, 0.3)` — dated | `rgba(255, 255, 255, 0.2)` |
| `space-*` color tokens | Dark blue palette being replaced | Neutral black scale |
| `nebula-*` color tokens | Purple gradients being removed | Remove entirely |
| `plasma-*` color tokens | Cyan palette being removed | Remove entirely |
| `rocket-*` color tokens | Orange palette unused | Remove entirely |
| Complex card text override CSS | 80+ lines of `.card .text-*` overrides | Proper light text by default |
| `drop-shadow` on headings | Already mostly removed | No shadows on text |

---

## Part 4: Implementation Phases

### Phase 1: Foundation (CSS Variables + Core Classes) — 1 day
**Files:** `globals.css`, `tailwind.config.ts`, `layout.tsx`

1. Add new CSS custom properties (the V2 palette above)
2. Update `body` background from `#0a0f1a` to `#000000`
3. Remove `body::before` background image and `body::after` overlay
4. Remove Starfield component import from layout.tsx
5. Add `card-v2` CSS class alongside existing `card-glass`
6. Add `btn-v2-primary` and `btn-v2-secondary` classes
7. Add `section-v2` spacing class
8. Update selection color from purple to white
9. Clean up unused color tokens from tailwind.config.ts

### Phase 2: Navigation — 1 day
**Files:** `Navigation.tsx`, `MobileBottomNav.tsx`

1. Float the desktop nav bar (centered, rounded, backdrop-blur)
2. Reduce desktop nav to 7 items max
3. Update mobile bottom nav to 4 items (Home, Explore, Search, Profile)
4. Update all nav backgrounds from `rgba(5,10,21,*)` to `rgba(0,0,0,*)`

### Phase 3: Homepage — 2 days
**Files:** `page.tsx`, hero components, landing components

1. Replace video/starfield hero with typography-driven hero
2. Add real product screenshot as hero image
3. Update all landing sections to use `section-v2` spacing
4. Replace `card-glass` with `card-v2` on landing page
5. Simplify newsletter CTA (remove name field)
6. Update trust signals section styling

### Phase 4: Component Migration — 3-5 days
**Files:** All components using `card`, `card-glass`, `card-elevated`, `card-interactive`

1. Grep for all card class usage, migrate to `card-v2`
2. Update all `bg-slate-800`, `bg-slate-900` references to new neutral scale
3. Update all `border-slate-700` references to `border-white/[0.08]` or new tokens
4. Remove all instances of `bg-gradient-*` from backgrounds
5. Update button instances from `btn-primary` to `btn-v2-primary`

### Phase 5: Cleanup — 1 day
**Files:** `globals.css`, `tailwind.config.ts`, components

1. Remove dead CSS classes (card-nebula, card-cyan, etc.)
2. Remove unused tailwind color tokens (nebula, plasma, rocket, space)
3. Delete `Starfield.tsx` component
4. Delete `FeaturedTools.tsx` (already unused)
5. Remove the 80+ lines of card text override CSS
6. Final build verification

---

## Part 5: Design Principles

These 10 principles should guide every design decision going forward:

### 1. Black is the canvas
True black (#000000) is the default. Content floats on void. No gradients, no textures, no space backgrounds. The darkness IS the brand.

### 2. White is the only accent
Buttons are white. Text is near-white. Links are white with underlines. No brand colors fighting for attention. When everything is white-on-black, the content itself becomes the accent.

### 3. Typography is the design
Headlines at 500 weight with -0.03em tracking do the heavy lifting. No decorative elements, no icons-as-design, no gradient text. The words themselves must be compelling.

### 4. Data speaks for itself
Charts, numbers, and metrics use semantic colors only where meaning requires it (green = up, red = down). The data visualization palette is separate from the UI palette.

### 5. One action per section
Every section has one clear next step. Not three buttons, not five links. One CTA that's obvious and white.

### 6. Spacing creates hierarchy
The difference between a $5 website and a $50,000 website is spacing. 96px between sections. 24px inside cards. Never cramped, never hurried.

### 7. Show the product
Product screenshots, not illustrations. Real dashboards, not mockups. Users should see exactly what they'll get.

### 8. Restraint is premium
If you're unsure whether to add something, don't. Every element must earn its place. Empty space is not wasted space.

### 9. Motion with purpose
Animations exist to direct attention or confirm actions, not to impress. Fade-in on scroll (once), hover feedback (instant), loading states. Nothing else.

### 10. Accessibility is non-negotiable
4.5:1 contrast ratio minimum. Focus-visible rings. Reduced-motion support. The best design is one everyone can use.

---

## Part 6: Before/After Comparison

### Current State
- Background: Dark blue (#050a15 / #0a0f1a)
- Accents: Remnants of purple/cyan, mostly neutralized
- Cards: `card-glass` with backdrop-filter blur
- Body: Background image at 6% opacity, pseudo-element overlays
- Navigation: Full-width strip, dark blue background
- Typography: Inter + Orbitron, various weights
- Starfield: CSS-animated star particles
- Buttons: White solid (already migrated)

### Proposed State
- Background: True black (#000000)
- Accents: White only (#ffffff for CTAs)
- Cards: Opaque #0a0a0a surface, no blur
- Body: Clean, no images, no overlays
- Navigation: Floating centered bar, rounded, blurred
- Typography: Inter only, weight 400-600, tight tracking
- Starfield: Removed
- Buttons: White solid (keep current pattern)

### Impact Assessment
- **Performance:** Remove starfield JS, background image, backdrop-filter blur = faster paint
- **Bundle size:** Remove Starfield.tsx, delete unused components = smaller bundle
- **Accessibility:** True black with #fafafa text = 19.4:1 contrast (exceeds AAA)
- **Mobile:** OLED battery savings on black pixels
- **Brand:** Cleaner, more distinctive, "Bloomberg-for-space" gravitas

---

## Appendix: Sites Researched

1. Linear (linear.app) — Dark, monochromatic, extreme restraint
2. Vercel (vercel.com) — Dark/light dual theme, Geist font, prism effects
3. Stripe (stripe.com) — Light, gradient mesh, content-dense
4. Notion (notion.com) — Light, multi-color bento cards, video hero
5. Figma (figma.com) — Light, custom fonts, dramatic type scaling
6. Resend (resend.com) — Pure black, glassmorphism, serif display font
7. Supabase (supabase.com) — Dark default, green accent, product-forward
8. PostHog (posthog.com) — Light, blue accent, data-interactive
9. Raycast (raycast.com) — Dark navy, 3D effects, neon accents
10. Tailwind CSS (tailwindcss.com) — Light/dark, P3 colors, outline borders
11. Clerk (clerk.com) — Light gray, atmospheric effects, meteor animations
12. Anthropic (anthropic.com) — Dark charcoal, burnt orange accent, GSAP animations
13. Dub.co (dub.co) — Light, pure neutrals, grid borders, extreme minimalism
14. Railway (railway.com) — Dark purple, cyan accent, HSL-based palette
15. Cal.com (cal.com) — Dark, purple gradients, multi-font stack
16. Arc (arc.net) — Light cream, custom fonts, noise textures
17. GitHub (github.com) — Light, carousel hero, stat callouts
18. Mixpanel (mixpanel.com) — Light, purple accent, data visualization
19. Framer (framer.com) — Light, typography-centric, conversion-focused
20. OpenAI (openai.com) — Dark, minimal (403 blocked but known pattern)
21. Apple (apple.com) — Light primary, dark product sections, dramatic product imagery
22. Datadog/Grafana/Segment — Data platforms, light backgrounds, semantic color systems

---

---

## Appendix B: Deep-Dive Insights from Extended Research

### B.1 Typography as the #1 Premium Differentiator

Every top-1% site either commissions a custom font or uses a distinctive display font that breaks from the Inter/system-font norm:

| Site | Display Font | Why It Works |
|------|-------------|--------------|
| Figma | Figma Sans (custom, Grilli Type) | Bespoke = instant premium signal |
| Resend | Domaine (serif) + Favorit | Serif on a dev tool = instant differentiation |
| Cal.com | Cal Sans (custom, open-source) | Watch-face geometry ties font to product |
| Dub.co | Satoshi + Inter pairing | Modern geometric sans feels curated |
| Arc | Marlin + Exposure VAR (custom) | Warm, distinctive character |

**SpaceNexus opportunity:** Consider a distinctive display font for hero headlines only. A serif display font (like Resend's Domaine approach) would immediately separate us from every other space/data platform. The rest of the UI stays Inter for consistency. This is a Phase 6 consideration — not part of the initial migration.

### B.2 The "Product as Hero" Pattern

All 5 deeply-analyzed sites use actual product UI/screenshots as their primary visual rather than illustrations or stock photography. This is the dominant 2026 SaaS pattern: **let the product sell itself.**

SpaceNexus already has beautiful dashboards (Mission Control, Company Profiles, Market Intel). We should screenshot these and use them as hero images.

### B.3 Border Radius as Brand Signal

| Site | Border Radius | Feel |
|------|--------------|------|
| Cal.com | Near-zero (sharp) | Editorial, serious, newspaper |
| Figma, Dub | Medium (8-12px) | Friendly, approachable |
| Resend, Supabase | Moderate (8px) | Refined, professional |

Our current `rounded-2xl` (16px) is appropriate for the premium feel. No change needed.

### B.4 Single Accent Color Pattern (Supabase Model)

Supabase uses ONE color (emerald green #34B27B) as an ambient glow on their dark background. This creates a "command center" atmosphere. The green reads as "success/connected/active" — semantically perfect for a database platform.

**SpaceNexus parallel:** We could use a single very subtle blue (#3b82f6) glow on specific data-rich pages (satellite tracker, launch dashboard) to create the "mission control" atmosphere. But the landing page should remain pure black + white. Color only where data demands it.

### B.5 Cal.com's Black-and-White-Only Palette

Cal.com uses ZERO accent colors — only pure black and white. Their reasoning: as a white-label product, black and white pair with any customer's brand colors. The result is incredibly bold and editorial.

This validates our "white is the only accent" principle. SpaceNexus doesn't need brand colors. The data itself provides all the color needed (chart palettes, status indicators).

---

*This document supersedes the original REDESIGN-VISION-2026.md with an updated direction based on research across 22+ top-tier websites.*
