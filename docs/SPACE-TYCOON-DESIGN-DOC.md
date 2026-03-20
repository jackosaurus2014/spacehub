# Space Tycoon — Game Design Document

**Version:** 1.0
**Date:** 2026-03-19
**Status:** Active Development

---

## 1. Game Overview

**Space Tycoon** is a browser-based space economy simulation game where players build and manage a space enterprise spanning the solar system. Starting with a launch pad on Earth, players research technologies, deploy satellites, build space stations, establish mining operations, and expand to the outer planets over a simulated 100+ year timeline.

### Core Loop
```
Earn Revenue → Research Technology → Build Infrastructure → Unlock Locations → Expand Services → Earn More Revenue
```

### Genre
Idle/Tycoon simulation with strategic research tree and geographic expansion

### Platform
Browser-based (Next.js), playable on desktop and mobile. No downloads required. Saves to localStorage.

---

## 2. Game Mechanics

### 2.1 Time System
- One game tick = one in-game month
- 5 speed settings: Pause, 1x (2s/mo), 2x (1s/mo), 5x (0.4s/mo), 10x (0.2s/mo)
- Game starts in January 2025, simulating present-day to 100+ years into the future
- Players can pause at any time to make decisions

### 2.2 Economy
- **Starting capital:** $500M (well-funded space startup)
- **Revenue sources:** 7 service types (launch, telecom, sensors, AI compute, mining, tourism, fabrication)
- **Cost structure:** Building construction, monthly maintenance, service operating costs, research investment
- **Cost scaling:** Buildings get 15% more expensive per duplicate at the same location
- **Revenue scaling:** Research bonuses multiply service income (+10% per relevant research)

### 2.3 Research Tree
- **9 branches:** Rocketry, Spacecraft Design, Sensors, AI Chips, Satellite Components, Solar Arrays, Mining, Infrastructure, Propulsion
- **5 tiers per branch:** Present-day (Tier 1) → Speculative/transformative (Tier 5)
- **45 total technologies** with cross-branch prerequisites creating meaningful choices
- **One research at a time** — forces prioritization

### 2.4 Solar System
- **11 locations** from Earth Surface to the Outer System
- **Progression gated** by research and unlock costs ($0 to $500B)
- **Real orbital mechanics** — delta-V values and travel times based on Hohmann transfers
- **Each location** has unique available buildings and services

### 2.5 Buildings
- **30+ building types** across 9 categories: launch pads, satellites, space stations, datacenters, mining, fabrication, solar farms, habitats, ground stations
- **Construction time** ranges from 3 months (satellite) to 48 months (deep space mining)
- **Automatic service activation** — when a building completes, eligible services start generating revenue

---

## 3. UI Design Philosophy

### 3.1 Design Principles

Based on research from [Game UI Database](https://www.gameuidatabase.com/), [Dribbble space game UI](https://dribbble.com/tags/space_game_ui), and [DevTeam.Space Game UI guide](https://www.devteam.space/blog/how-to-design-great-game-ui/):

1. **Information hierarchy** — Most important info (money, income, date) always visible in persistent resource bar
2. **Progressive disclosure** — Start simple, reveal complexity as player progresses (grayed-out locked items show what's coming)
3. **Immediate feedback** — Every action has visual + audio feedback (building placed, research started, milestone reached)
4. **Spatial memory** — Consistent layout so players know where to find things
5. **Satisfying numbers** — Animated counters, money ticking up, progress bars filling

### 3.2 Visual Style

**Theme:** Dark sci-fi with cyan/purple accent gradient (matching SpaceNexus brand)
- Background: Deep space black (#0a0a0f) with subtle star field
- Cards: Glass-morphism with white/[0.04] backgrounds and white/[0.06] borders
- Accents: Cyan (#06b6d4) for primary actions, Purple (#8b5cf6) for research, Green (#22c55e) for revenue, Amber (#f59e0b) for construction, Red (#ef4444) for costs
- Typography: Inter (body), monospace for numbers/money

**Inspiration:** Factorio (clean resource bars), Stellaris (space map), Kerbal Space Program (rocket building satisfaction), Eve Online (dark sci-fi aesthetic), Idle Space Miner (mobile tycoon progression)

### 3.3 UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│  💰 $2.3B    +$45M/mo    📅 Mar 2038    ⏸ 1x 2x 5x 10x   │  ← Resource Bar (always visible)
├─────────────────────────────────────────────────────────────┤
│  📊 Dashboard │ 🏗️ Build │ 🔬 Research │ 🗺️ Map │ 💰 Svc  │  ← Tab Navigation
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Revenue  │ │ Costs    │ │ Buildings│ │ Research │       │  ← Stats Grid
│  │ $1.2B   │ │ $800M    │ │ 24/30    │ │ 18/45   │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                             │
│  ┌─────────────────────────────────────────────────┐       │
│  │           Income History (Recharts)              │       │  ← Line Chart
│  │  📈 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ │       │
│  └─────────────────────────────────────────────────┘       │
│                                                             │
│  ┌──────────────┐  ┌──────────────────────────────┐       │
│  │ Event Log    │  │ Active Services               │       │
│  │ Mar 2038: ...│  │ LEO Broadband    +$5M/mo     │       │
│  │ Feb 2038: ...│  │ Sensor Service   +$4M/mo     │       │
│  └──────────────┘  └──────────────────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 Solar System Map Design (3D)

Using React Three Fiber (already installed):
- **Sun** at center with glow effect
- **Planets/locations** as spheres at scaled distances
- **Orbit paths** as semi-transparent rings
- **Player assets** shown as icons near owned locations
- **Camera** — orbital controls, click planet to zoom in
- **Unlocked locations** glow cyan, locked ones are dimmed
- **Tooltip on hover** — shows location name, building count, status

### 3.5 Research Tree Visualization

- **Horizontal flowchart** organized by branch (9 rows)
- **Nodes connected** with SVG lines showing prerequisites
- **Color coding:** Green (completed), Cyan pulsing (active), White (available), Gray (locked)
- **Click to start** — opens confirmation with cost/time
- **Zoom/scroll** for mobile support

---

## 4. Sound Design

Using Web Audio API (OscillatorNode) for synthesized sounds — no audio file downloads needed. Based on [MDN Web Audio API docs](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API):

### Sound Effects (all synthesized)
| Event | Sound | Implementation |
|-------|-------|---------------|
| Button click | Short crisp blip | 800Hz sine, 50ms, quick decay |
| Build started | Rising tone | 200→600Hz sweep, 200ms |
| Build complete | Triumphant chord | C-E-G triad, 300ms, reverb |
| Research started | Sci-fi beep | 1200Hz square wave, 100ms, filter sweep |
| Research complete | Discovery chime | Ascending arpeggio C-E-G-C, 500ms |
| Location unlocked | Expansive tone | Low 100Hz → 400Hz sweep with reverb, 500ms |
| Milestone reached | Achievement fanfare | Major chord with shimmer, 800ms |
| Tick (month pass) | Subtle click | 2000Hz sine, 10ms (only at 1x/2x speed) |
| Error/can't afford | Dull thud | 100Hz sine, 80ms, no sustain |
| Money earned | Coin sound | 4000Hz triangle, 30ms, quick decay |

### Audio Manager
- Global mute toggle (persisted to localStorage)
- Volume control
- Sounds disabled when tab not visible (Page Visibility API)
- All sounds generated at runtime via OscillatorNode — zero file downloads

---

## 5. Animation Specifications

### 5.1 Resource Bar
- **Money counter:** Animated number roll when value changes (CSS counter animation)
- **Income indicator:** Green glow pulse when positive, red when negative
- **Speed buttons:** Active speed has pulsing glow ring

### 5.2 Building Cards
- **Hover:** Subtle lift + border glow
- **Build click:** Card flashes cyan, construction progress bar appears
- **Completion:** Gold shimmer sweep across card + particle burst

### 5.3 Research Nodes
- **Available:** Gentle white border pulse
- **Active research:** Rotating ring animation around node
- **Completed:** Green checkmark fade-in + node color fill

### 5.4 Solar System Map (3D)
- **Planets:** Slow rotation on axis
- **Orbit paths:** Dash animation (moving dashes)
- **Satellites:** Small dots orbiting player locations
- **Camera transitions:** Smooth tween when clicking locations
- **Unlock animation:** Location brightens with expanding ring

### 5.5 Dashboard
- **Stat counters:** Animated count-up when panel opens
- **Income chart:** Line draws in from left on render
- **Event log:** New events slide in from top with fade

---

## 6. Technical Architecture

### 6.1 File Structure
```
src/
  lib/game/
    types.ts              ✅ Complete
    constants.ts          ✅ Complete
    formulas.ts           ✅ Complete
    solar-system.ts       ✅ Complete
    research-tree.ts      ✅ Complete
    buildings.ts          ✅ Complete
    services.ts           ✅ Complete
    game-engine.ts        ✅ Complete
    save-load.ts          ✅ Complete
    sound-engine.ts       🔨 To Build — Web Audio API synthesizer

  components/game/
    GameShell.tsx          🔨 To Build — Main container, replaces inline components
    ResourceBar.tsx        🔨 To Build — Enhanced with animations
    DashboardPanel.tsx     🔨 To Build — With Recharts income chart
    BuildPanel.tsx         🔨 To Build — Enhanced building cards
    ResearchPanel.tsx      🔨 To Build — Visual tree with SVG connections
    SolarSystemMap3D.tsx   🔨 To Build — React Three Fiber 3D map
    ServicesPanel.tsx      🔨 To Build — Enhanced service cards
    EventLog.tsx           🔨 To Build — Animated event feed
    TimeControls.tsx       🔨 To Build — Speed controls with visual feedback
    GameStartMenu.tsx      🔨 To Build — Cinematic start screen
    MilestoneToast.tsx     🔨 To Build — Achievement popups

  app/space-tycoon/
    page.tsx              ✅ Complete (will be refactored to use component files)
    layout.tsx            ✅ Complete
    loading.tsx           ✅ Complete
    error.tsx             ✅ Complete
```

### 6.2 Dependencies (already installed)
- Three.js + React Three Fiber + Drei — 3D solar system
- Recharts — Income/expense charts
- Tailwind CSS — Styling with custom animations
- Web Audio API — Native browser API, no library needed

### 6.3 Performance Targets
- 60fps UI interactions
- <100ms tick processing
- <2MB total game code (excluding Three.js shared bundle)
- Lazy-load 3D map only when Map tab is active

---

## 7. Progression Design

### 7.1 Era Milestones

| Era | Year Range | Unlocks | Key Moment |
|-----|-----------|---------|------------|
| Startup | 2025-2030 | First satellite, first service revenue | Breaking even |
| Growth | 2030-2040 | Moon base, constellation deployment | $1B net worth |
| Expansion | 2040-2060 | Mars colony, asteroid mining | First interplanetary income |
| Dominance | 2060-2090 | Jupiter/Saturn operations, mega-structures | $1T net worth |
| Transcendence | 2090-2125+ | Fusion drive, outer system, Dyson swarm elements | Solar system economy |

### 7.2 Achievement System (Future)
- First Launch
- First Satellite Deployed
- Break Even (net income > 0)
- Lunar Entrepreneur (first Moon building)
- Martian Pioneer (first Mars building)
- Trillionaire
- Solar System Complete (all locations unlocked)
- Tech Singularity (all research complete)

---

## 8. Mobile Considerations

- Tab bar at bottom of screen (matching SpaceNexus MobileTabBar pattern)
- Touch-friendly build/research buttons (min 44px touch targets)
- 3D map: pinch-to-zoom, drag-to-rotate
- Swipe between tabs
- Portrait-optimized layouts with collapsible sections

---

## 9. Future Enhancements (Post-MVP)

- **Multiplayer leaderboards** — Compare progress with other players
- **Random events** — Market booms, equipment failures, contract opportunities
- **Crew management** — Hire and assign crew to stations
- **Diplomacy** — Interact with AI space agencies
- **Achievements/badges** — Displayed on SpaceNexus profile
- **Seasonal events** — Real-world launch events trigger in-game bonuses

---

## Sources & Research

- [Game UI Database](https://www.gameuidatabase.com/) — 55,000+ game UI screenshots
- [Dribbble Space Game UI](https://dribbble.com/tags/space_game_ui) — Design inspiration
- [DevTeam.Space Game UI Guide](https://www.devteam.space/blog/how-to-design-great-game-ui/) — UI fundamentals
- [MDN Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) — Synthesized sound effects
- [MDN Audio for Web Games](https://developer.mozilla.org/en-US/docs/Games/Techniques/Audio_for_Web_Games) — Game audio best practices
- [React Three Fiber Solar System](https://github.com/Vaibhavii3/3D-Solar-System) — 3D reference implementation
- [Idle Tycoon UI on Behance](https://www.behance.net/gallery/185718025/Idle-Tycoon-Ui-game) — Tycoon UI patterns
- [Passive Resource Systems](https://adriancrook.com/passive-resource-systems-in-idle-games/) — Idle game economy design
- [CraftPix Space Game UI](https://craftpix.net/categorys/space-game-ui/) — Space UI asset reference
- [Web Game Dev HTML/CSS UI](https://www.webgamedev.com/graphics/html-css-ui) — Browser game UI techniques
