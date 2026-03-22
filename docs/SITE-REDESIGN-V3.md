# SpaceNexus Site Redesign V3: Mission Control Terminal

> **Aesthetic direction**: Futuristic mission control — the Bloomberg terminal you'd use to run a space program. Ultra-clean, high-contrast, data-dense, functionally beautiful. Real aerospace UI patterns, not sci-fi cosplay.

> **Design philosophy**: Every pixel serves a purpose. Color means something. Data is the decoration. Restraint is luxury.

---

## Table of Contents

1. [Design Principles](#design-principles)
2. [Phase 1: Foundation — Color, Typography, Spacing](#phase-1-foundation)
3. [Phase 2: Hero & Landing Page](#phase-2-hero)
4. [Phase 3: Data Panels & Card System](#phase-3-data-panels)
5. [Phase 4: Pricing & Conversion Pages](#phase-4-pricing)
6. [Phase 5: Navigation & Footer](#phase-5-navigation)
7. [Anti-Patterns — What to Avoid](#anti-patterns)
8. [Implementation Reference](#implementation-reference)

---

## Design Principles

### The Five Rules

1. **Color is functional, never decorative**
   Every color conveys meaning. Green = nominal/live. Cyan = standby/interactive. Amber = caution. Red = critical. Gray = disabled. Nothing is colored "just because."

2. **Data is the hero**
   The most beautiful element on any page should be the data itself — large monospace numbers, clean tables, real-time values. Decorative elements are secondary to information.

3. **Restraint creates luxury**
   Maximum two accent colors per view. Generous whitespace. Fewer elements, better executed. Empty space is a design choice, not a gap.

4. **Real aerospace, not sci-fi**
   Inspired by NASA Open MCT, SpaceX Crew Dragon displays, and the Astro UXDS (US Space Force design system). No hexagonal grids, no gratuitous glow, no hologram effects, no star fields.

5. **Progressive density**
   Homepage = editorial (spacious). Dashboards = terminal (dense). Data pages = mission control (maximum density). Let the content dictate the density.

---

## Phase 1: Foundation — Color, Typography, Spacing {#phase-1-foundation}

### 1.1 Color System

**Kill pure black.** Move from `#000000` to warm zinc-based off-blacks that reduce eye strain during long sessions.

#### Background Scale (Zinc-based)
```
--bg-void:      #09090b    /* Page background — warm near-black */
--bg-surface:   #131316    /* Section backgrounds, containers */
--bg-elevated:  #1c1c21    /* Cards, panels, popovers */
--bg-hover:     #252529    /* Hover states on surfaces */
--bg-active:    #2e2e33    /* Active/pressed states */
```

**Why Zinc over Slate**: Zinc has no blue undertone, so accent colors pop without competing. Slate adds a blue cast that muddies cyan/indigo accents.

#### Text Scale
```
--text-primary:    #ededea    /* Primary content — not pure white, reduces blooming */
--text-secondary:  #a1a1aa    /* Descriptions, secondary info (Zinc 400) */
--text-tertiary:   #71717a    /* Disabled, hints, timestamps (Zinc 500) */
--text-muted:      #52525b    /* Barely-there labels (Zinc 600) */
```

**Key rule**: Primary text is `#ededea` (SpaceX's off-white), NOT `#ffffff`. Pure white on dark backgrounds causes optical vibration and eye fatigue.

#### Accent Colors (Mission Control Status Palette)
Derived from the Astro UXDS (US Space Force satellite operations design system):

```
/* Primary accent — interactive elements, links, focus states */
--accent-primary:    #6366f1    /* Indigo 500 — trust + innovation */
--accent-primary-bright: #818cf8  /* Indigo 400 — hover state */

/* Secondary accent — data, space/tech energy */
--accent-secondary:  #22d3ee    /* Cyan 400 — standby/active */

/* Status colors — aerospace standard */
--status-nominal:    #56F000    /* Bright green — GO/nominal */
--status-standby:    #2DCCFF    /* Cyan — standby/available */
--status-caution:    #FCE83A    /* Yellow — watch/unstable */
--status-serious:    #FFB302    /* Amber — error/attention */
--status-critical:   #FF3838    /* Red — alert/emergency */
--status-off:        #71717a    /* Zinc 500 — off/disabled */
```

**Color rules**:
- Red is ONLY for critical/destructive actions. Never decorative.
- Green means "live" or "nominal." Not for buttons or decoration.
- The accent (indigo) is the brand color — used for links, focus rings, interactive elements.
- Cyan is the secondary accent — used for data highlights, active states, code.

#### Border Scale
```
--border-subtle:   #27272a    /* Zinc 800 — card edges, dividers */
--border-default:  #3f3f46    /* Zinc 700 — visible borders */
--border-hover:    #52525b    /* Zinc 600 — hover emphasis */
--border-focus:    #6366f1    /* Indigo — focus rings */
```

**Key change**: Borders use solid Zinc values instead of `rgba(255,255,255,0.06)`. Solid colors render sharper and are more predictable across browsers.

---

### 1.2 Typography System

**Core principle**: Three fonts, three jobs. No exceptions.

#### Font Stack

| Role | Font | Source | License |
|------|------|--------|---------|
| **Display/Headings** | **Satoshi** (Variable, 300-900) | [Fontshare](https://www.fontshare.com/fonts/satoshi) | Free commercial |
| **Body/UI** | **DM Sans** (Variable, 100-1000) | [Google Fonts](https://fonts.google.com/specimen/DM+Sans) | OFL (free) |
| **Data/Mono** | **JetBrains Mono** (Variable, 100-800) | [Google Fonts](https://fonts.google.com/specimen/JetBrains+Mono) | OFL (free) |

**Why these three**:
- **Satoshi**: Swiss-modernist geometric with sharp angular details. Reads as "intentionally chosen." Used by 36+ award-winning sites. Not Inter, not Space Grotesk.
- **DM Sans**: Low-contrast geometric with distinctive single-story "a" and "g." On Google Fonts CDN. Updated 2023 with optical sizing.
- **JetBrains Mono**: Highest x-height ratio (0.73) of any monospace. 138 ligatures. Battle-tested in IDEs worldwide. Purpose-built for extended data reading.

#### Type Scale

```
/* Display — Satoshi Black */
--display-hero:   72px / 1.0  / weight 900 / spacing -0.03em
--display-lg:     48px / 1.1  / weight 800 / spacing -0.025em
--display-md:     36px / 1.15 / weight 700 / spacing -0.02em

/* Headings — Satoshi Bold/SemiBold */
--heading-lg:     28px / 1.2  / weight 700 / spacing -0.015em
--heading-md:     22px / 1.25 / weight 600 / spacing -0.01em
--heading-sm:     18px / 1.3  / weight 600 / spacing -0.005em

/* Body — DM Sans */
--body-lg:        18px / 1.6  / weight 400 / spacing 0.01em
--body-md:        15px / 1.55 / weight 400 / spacing 0.015em
--body-sm:        13px / 1.5  / weight 400 / spacing 0.02em

/* Labels — DM Sans Medium, uppercase */
--label-lg:       13px / 1.4  / weight 500 / spacing 0.08em / uppercase
--label-md:       11px / 1.4  / weight 500 / spacing 0.1em  / uppercase
--label-sm:       9px  / 1.4  / weight 600 / spacing 0.12em / uppercase

/* Data — JetBrains Mono */
--data-lg:        20px / 1.3  / weight 500 / spacing 0 / tabular-nums
--data-md:        15px / 1.4  / weight 400 / spacing 0.01em / tabular-nums
--data-sm:        12px / 1.4  / weight 400 / spacing 0.01em / tabular-nums
```

**Dark mode adjustments** (critical — light text on dark backgrounds appears heavier):
- Reduce heading weight by one step vs light mode (700 → 600)
- Increase body letter-spacing by +0.01em
- Never use weight 100-200 on dark backgrounds (too thin to read)

---

### 1.3 Spacing System

**8px base grid** (Linear's approach). Section spacing should be editorial (80-120px), not template (32-48px).

```
--space-1:    4px     /* Hairline gaps */
--space-2:    8px     /* Tight internal padding */
--space-3:    12px    /* Icon-to-text gaps */
--space-4:    16px    /* Card internal padding (minimum) */
--space-6:    24px    /* Card comfortable padding */
--space-8:    32px    /* Section internal spacing */
--space-12:   48px    /* Between content groups */
--space-16:   64px    /* Section dividers */
--space-20:   80px    /* Section spacing (minimum) */
--space-24:   96px    /* Section spacing (standard) */
--space-32:   128px   /* Section spacing (hero) */
```

**Key change**: Sections currently use `py-16 md:py-24` (64px/96px). Move to `py-20 md:py-32` (80px/128px) for editorial breathing room on the homepage.

### 1.4 Border Radius

```
--radius-sm:    4px     /* Buttons, inputs, small chips */
--radius-md:    8px     /* Cards, panels */
--radius-lg:    12px    /* Large cards, modals */
--radius-xl:    16px    /* Hero cards, featured content */
--radius-full:  9999px  /* Pills, avatars */
```

**Key change**: Move from `rounded-xl` (12px) everywhere to varied radii. Buttons get 4px (tighter, more technical). Cards get 8px. Only hero/featured content gets 16px.

### 1.5 Background Treatments

#### Noise Texture
Add a subtle SVG noise overlay to the entire page body at 3-4% opacity. This creates a "print quality" tactile feeling that separates designed surfaces from flat CSS.

```css
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
}
```

#### Accent Glow (Hero only)
One large, soft radial gradient of the primary accent at 6-10% opacity behind hero content. Not multiple scattered blobs — one intentional light source.

```css
.hero-glow {
  background: radial-gradient(
    ellipse 800px 600px at 50% 40%,
    rgba(99, 102, 241, 0.08),   /* Indigo at 8% */
    transparent 70%
  );
}
```

#### Grid Pattern (Optional — data pages only)
A faint dot grid at 2-3% opacity on dashboard/data pages evokes graph paper/technical drawings. NOT on the homepage (too busy).

---

## Phase 2: Hero & Landing Page {#phase-2-hero}

### 2.1 Hero Section Redesign

**Current problem**: Centered text with invisible gradient orbs. Generic "Space Industry Intelligence Platform" headline. Two default CTA buttons.

**New direction**: Asymmetric 60/40 layout. Left side: bold headline + CTA. Right side: live data visualization (mini dashboard preview).

#### Layout
```
┌──────────────────────────────────────────────────┐
│  ┌─────────────────────┐  ┌────────────────────┐ │
│  │                     │  │  LIVE DATA PREVIEW  │ │
│  │  The terminal       │  │  ┌──────┐ ┌──────┐ │ │
│  │  for space          │  │  │ Next │ │ Kp   │ │ │
│  │  business.          │  │  │Launch│ │Index │ │ │
│  │                     │  │  └──────┘ └──────┘ │ │
│  │  [Get Started]      │  │  ┌──────┐ ┌──────┐ │ │
│  │                     │  │  │Market│ │Sats  │ │ │
│  │  No credit card     │  │  │ +2.1%│ │10.2K │ │ │
│  │  required.          │  │  └──────┘ └──────┘ │ │
│  └─────────────────────┘  └────────────────────┘ │
└──────────────────────────────────────────────────┘
```

#### Headline Treatment
```html
<h1 class="font-satoshi font-900 text-[72px] leading-[1.0] tracking-[-0.03em]">
  The terminal<br/>
  for space<br/>
  business.
</h1>
```
- **Left-aligned**, not centered
- **Satoshi Black (900)** at 72px — dramatic scale contrast with 15px body text
- **Line breaks are intentional** — each line is a thought
- **Period at the end** — confident, declarative (like Apple's "Think different.")

#### CTA
Single primary button. Not two buttons competing for attention.
```
[Get Started — Free] →
```
- Indigo background (`#6366f1`) with subtle glow on hover
- 4px border radius (technical, not bubbly)
- No secondary "View Pricing" button in the hero (it's in the nav)

#### Right Panel: Live Data Preview
A 2x2 grid of mini data cards showing REAL data (fetched from APIs). This proves the platform is live and useful without requiring signup.

### 2.2 Section Headers (Sitewide)

**Current**: Centered `text-display text-3xl md:text-4xl` headings with `text-slate-400` descriptions.

**New**: Left-aligned headers with accent bar indicator (already started in Waves 3-10, now formalized).

```
┌─ [accent bar]  Section Title          [meta text] ─┐
│  Description text in secondary color                │
```

- 1px × 24px vertical accent bar (gradient, color varies by section)
- Title: Satoshi SemiBold 22px, tracking -0.01em
- Meta text: Label style (11px uppercase, tracking 0.1em, tertiary color)
- Description: DM Sans 14px, secondary color

### 2.3 Homepage Section Flow

```
1. Hero (asymmetric, live data preview)
2. KPI Strip (terminal chrome, live metrics with sparklines)
3. Platform Modules (bento grid with LIVE/PRO badges)
4. Explore Platform (8 destination cards)
5. Market Overview (sparkline metric cards)
6. Latest Content (blog + AI insights)
7. Data Sources & Provenance (terminal table)
8. Competitive Analysis (comparison matrix)
9. Changelog (versioned release log)
10. How It Works (3-step onboarding)
11. Newsletter Signup
12. Footer
```

Remove or demote: Space Photo of the Day (nice but not conversion-focused), redundant trust signals, persona dashboard (move to onboarding flow).

---

## Phase 3: Data Panels & Card System {#phase-3-data-panels}

### 3.1 Card Types (Not One-Size-Fits-All)

**Current problem**: Every card uses identical `.card-glass` with `rounded-xl border-white/[0.06]`.

**New system**: Four distinct card treatments based on content type.

#### A. Data Card (metrics, KPIs, live values)
```css
.card-data {
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);    /* 8px */
  padding: var(--space-4);            /* 16px — tight */
}
```
- Tighter padding (16px, not 24px)
- Monospace values, uppercase labels
- Optional status dot (left of value)

#### B. Content Card (articles, insights, descriptions)
```css
.card-content {
  background: var(--bg-surface);
  border: 1px solid transparent;       /* No border by default */
  border-radius: var(--radius-lg);     /* 12px */
  padding: var(--space-6);             /* 24px — comfortable */
}
.card-content:hover {
  border-color: var(--border-subtle);
  background: var(--bg-elevated);
}
```
- No visible border until hover (cleaner resting state)
- Larger padding for readability
- Smooth background transition on hover

#### C. Interactive Card (clickable modules, tools)
```css
.card-interactive {
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s;
}
.card-interactive:hover {
  border-color: var(--accent-primary);
  transform: translateY(-1px);
}
```
- Accent-colored border on hover (clear affordance)
- Minimal lift (1px, not 3px — subtle, not dramatic)

#### D. Terminal Panel (data tables, system status, live feeds)
```css
.card-terminal {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.card-terminal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 16px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-void);
}
```
- Terminal chrome header with traffic light dots and monospace title
- No rounded inner content — data tables fill edge to edge
- Status badge in header (LIVE/CONNECTED/etc.)

### 3.2 Terminal Chrome (Standardized)

All data panels share this window chrome pattern:

```
┌ ● ● ●   spacenexus:~/module-name         [STATUS] ─┐
│                                                      │
│  Content fills to edges                              │
│                                                      │
└──────────────────────────────────────────────────────┘
```

- Three dots: `#FF3B30` (red), `#FF9F0A` (amber), `#30D158` (green) at 40% opacity
- Path text: `font-mono text-[9px] uppercase tracking-[0.15em] text-tertiary`
- Status badge: LIVE (green) / CONNECTED (green) / PRO (indigo) / UPDATED (blue)

### 3.3 Badge System

| Badge | Background | Text | Border | Use |
|-------|-----------|------|--------|-----|
| LIVE | `rgba(86,240,0, 0.1)` | `#56F000` | `rgba(86,240,0, 0.2)` | Real-time data feeds |
| PRO | `linear-gradient(135deg, #6366f1, #4f46e5)` | `#ffffff` | none | Premium features |
| NEW | `rgba(59,130,246, 0.1)` | `#3b82f6` | `rgba(59,130,246, 0.2)` | Recently added |
| BETA | `rgba(168,85,247, 0.1)` | `#a855f7` | `rgba(168,85,247, 0.2)` | Experimental |
| FREE | `rgba(45,204,255, 0.1)` | `#2DCCFF` | `rgba(45,204,255, 0.2)` | No payment required |

Badge styling: 7-9px font size, 600-700 weight, uppercase, 0.08-0.12em tracking, 3px border-radius, 2px 6px padding.

---

## Phase 4: Pricing & Conversion Pages {#phase-4-pricing}

### 4.1 Pricing Page Redesign

**Current problem**: Template three-column pricing with "Most Popular" badge. Indistinguishable from every SaaS site.

**New direction**: Mission briefing aesthetic. Each tier is a "clearance level."

#### Tier Names (Consider renaming)
| Current | Proposed | Metaphor |
|---------|----------|----------|
| Explorer | **Observer** | Ground-level access |
| Professional | **Operator** | Mission control clearance |
| Enterprise | **Commander** | Full command authority |

#### Layout: Horizontal tier progression
Instead of three identical columns, use a horizontal progression that shows increasing access:

```
┌─────────────┐    ┌─────────────────┐    ┌─────────────────────┐
│  OBSERVER   │ →  │    OPERATOR     │ →  │     COMMANDER       │
│  $0/mo      │    │  $19.99/mo      │    │    $49.99/mo        │
│             │    │  ▓▓▓▓▓▓▓▓▓▓▓▓▓ │    │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│  Basic data │    │  Full intel      │    │  API + team access  │
│  Free tools │    │  Export + alerts │    │  Custom dashboards  │
│             │    │                  │    │                     │
│  [Start]    │    │  [14-Day Trial]  │    │  [Contact Sales]    │
└─────────────┘    └─────────────────┘    └─────────────────────┘
```

The featured tier (Operator/Pro) gets:
- Slightly wider card (not `scale` — actual width increase)
- Accent border (indigo) instead of subtle border
- "Recommended" label in accent color (not a floating badge)

#### Feature Comparison
Keep the comparison table but use the Terminal Panel card style with checkmark/dash patterns from the CompetitiveComparison redesign.

### 4.2 Conversion Micro-Copy

Replace generic trust signals with mission-control-style confidence builders:
- "No credit card required" → "Instant access. No credentials needed."
- "Cancel anytime" → "No lock-in. Downgrade or cancel in one click."
- "14-day free trial" → "Full Operator access for 14 days."
- "Secure payments" → "Payments via Stripe. Bank-grade encryption."

---

## Phase 5: Navigation & Footer {#phase-5-navigation}

### 5.1 Top Navigation

**Current problem**: Heavy glassmorphism nav with 4 mega-dropdowns containing 146 items. Information overload.

**New direction**: Minimal persistent nav with search-first architecture.

```
┌──────────────────────────────────────────────────────────────┐
│  [Logo]   Modules   Intelligence   Pricing   ⌘K    [Sign In]│
└──────────────────────────────────────────────────────────────┘
```

Key changes:
- **Reduce to 3 nav items** + search + auth (from 4 mega-menus)
- **Merge "Explore" and "Tools" into "Modules"** — one dropdown
- **Keep "Intelligence"** — the premium-feeling dropdown
- **Promote search** (⌘K) — Bloomberg users navigate by search, not menus
- **Remove "Business" dropdown** — merge into Intelligence and footer links
- Nav background: `var(--bg-void)` with 1px bottom border. No backdrop-blur.
- Height: 56px (from 72px — tighter, more technical)

### 5.2 Left Sidebar

Keep the collapsible sidebar but refine:
- Active module: Indigo left border (2px), not background highlight
- Section labels: Label-sm style (9px uppercase tracking)
- Icons: 16px, zinc-500 default, white when active
- Width: 56px collapsed, 240px expanded

### 5.3 Footer

**Current**: Comprehensive 5-column footer with 50+ links.

**New direction**: Three-zone footer.

Zone 1 — Brand + newsletter (left-aligned, not centered)
Zone 2 — Four link columns (Platform, Intelligence, Resources, Company)
Zone 3 — Legal strip with version number

Add:
- Platform version: `v3.0.0` in monospace
- Status indicator: Green dot + "All systems operational"
- Uptime: `99.9% uptime` (if tracked)

---

## Anti-Patterns — What to Avoid {#anti-patterns}

### Typography
- ~~Inter as the only font~~ → Satoshi + DM Sans + JetBrains Mono
- ~~Same font weight everywhere~~ → 900 for hero, 600 for headings, 400 for body
- ~~0 letter-spacing~~ → Negative for headings, positive for body/labels

### Color
- ~~Pure black (#000000)~~ → Warm off-black (#09090b)
- ~~Pure white (#ffffff)~~ → Off-white (#ededea)
- ~~rgba(255,255,255,0.06) borders~~ → Solid zinc values (#27272a)
- ~~Colors at 3-4% opacity~~ → Bold at 8-15% for backgrounds, 100% for text/icons
- ~~Multiple accent colors competing~~ → One primary (indigo), one secondary (cyan)

### Layout
- ~~Everything centered~~ → Left-aligned headers, asymmetric hero
- ~~Identical section spacing~~ → Varied: 80px, 96px, 128px
- ~~Same card style everywhere~~ → Four card types based on content
- ~~Symmetric 3-column grids~~ → Asymmetric bento with varied spans

### Animation
- ~~Fade-in on every element~~ → Choreographed stagger on key sections only
- ~~0.4s ease-out~~ → `cubic-bezier(0.16, 1, 0.3, 1)` (Linear's springy easing)
- ~~Uniform stagger delays~~ → Varied: 50ms, 75ms, 100ms depending on content
- ~~Backdrop blur on everything~~ → Solid backgrounds, blur only on nav overlay

### UI Patterns
- ~~Glassmorphism cards~~ → Solid elevated surfaces with subtle borders
- ~~rounded-xl (12px) everywhere~~ → 4px buttons, 8px cards, 12px featured
- ~~Gradient text~~ → Solid white or accent color text
- ~~Emoji as design elements~~ → Custom SVG icons or no icons at all
- ~~"Live data from 50+ sources" badges~~ → Show the actual data instead

---

## Implementation Reference {#implementation-reference}

### CSS Custom Properties (globals.css)
All values defined as CSS custom properties for consistency. See Phase 1 for complete token list.

### Font Loading (layout.tsx)
```typescript
import { DM_Sans } from 'next/font/google';
import localFont from 'next/font/local';

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});

const satoshi = localFont({
  src: [
    { path: '../public/fonts/Satoshi-Variable.woff2', style: 'normal' },
    { path: '../public/fonts/Satoshi-VariableItalic.woff2', style: 'italic' },
  ],
  variable: '--font-display',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});
```

### Tailwind Config Extensions
```typescript
theme: {
  extend: {
    fontFamily: {
      display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      mono: ['var(--font-mono)', 'monospace'],
    },
    colors: {
      surface: {
        void: '#09090b',
        base: '#131316',
        elevated: '#1c1c21',
        hover: '#252529',
        active: '#2e2e33',
      },
      border: {
        subtle: '#27272a',
        DEFAULT: '#3f3f46',
        hover: '#52525b',
        focus: '#6366f1',
      },
    },
    borderRadius: {
      sm: '4px',
      md: '8px',
      lg: '12px',
      xl: '16px',
    },
  },
}
```

### Easing Functions
```css
--ease-smooth: cubic-bezier(0.25, 0.46, 0.45, 0.94);  /* Standard */
--ease-spring: cubic-bezier(0.16, 1, 0.3, 1);          /* Springy (Linear-style) */
--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);      /* Overshoot */
```

### Sources & References
- [NASA Open MCT](https://nasa.github.io/openmct/) — Mission control UI patterns
- [Astro UXDS](https://www.astrouxds.com/) — US Space Force design system, status colors
- [SpaceX Crew Dragon UI](https://iss-sim.spacex.com/) — Futuristic but functional
- [Linear Design](https://linear.app/now/behind-the-latest-design-refresh) — Premium dark UI
- [Stripe Design](https://stripe.com) — Typography and conversion optimization
- [Vercel Geist](https://vercel.com/geist) — Color system and design tokens
- [Satoshi Font](https://www.fontshare.com/fonts/satoshi) — Display typeface
- [JetBrains Mono](https://www.jetbrains.com/lp/mono/) — Data/monospace typeface

---

*This document is the source of truth for the SpaceNexus V3 redesign. All implementation work should reference these specifications. When in doubt, choose the more restrained option.*
