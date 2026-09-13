# Space Tycoon — the Command Center as a living headquarters

Design note, 2026-09-13. Founder prompt: *"maybe we should have the primary
interface be a control center on Earth with players looking out a window at a
launchpad in the background and all of the interfaces having a command center
type of vibe. Then as players progress their command center can move into
outer space, then in orbit of various planets, and even into new stations in
other solar systems."*

This turns the existing principle in CLAUDE.md ("Earth command center is the
main hub … a futuristic operations room on Earth") and item 2 of
`docs/GRAPHICS_REVIEW_2026-09-12.md` (the holographic Earth deck) into a
**progression system**: the headquarters is a place, it has a window, and the
window changes as the corporation grows. It is not a skin. Moving the HQ is an
economic decision with costs, scarcity and risk, and it is the one screen every
session opens on.

## 1. What the player sees

**The Bridge.** Every session opens on the Bridge: a wide console room drawn
in the game's mission-control language (true-black, cyan/amber/purple accents,
HUD lines), with a floor-to-ceiling window across the top two thirds of the
stage. The current hub panels dock as consoles around the window, exactly as
panels dock around the map today (map-as-stage stays the architecture; the
Bridge is a second stage that the Command hub uses). The window is the
headquarters' actual view:

| HQ stage | Window shows | Live elements in the window |
|---|---|---|
| Earth Operations Center (Cape/coastal launch site) | Your launch pad across the field, ocean or desert horizon, day/night from the world clock, weather | Your own launches lift off when a launch service fires; pad lights when a build completes; a vehicle on the pad while a launch contract is in progress |
| Orbital Command Deck (LEO station) | Earth's limb filling the window, terminator sweeping, your satellites as glints, sunrise every 90 min | Ships depart/arrive at the station; debris warnings streak past during hazard events; aurora during solar storms |
| Lunar / Martian / Jovian / Saturnian HQ | Surface or ring-plane vista from a station at that body, the local colony lights | Your mining rigs and depots visible as lights; dust storms, ring shadow, radiation glow during events |
| Deep-space / Interstellar HQ | Heliopause haze, then a new star's disc with an unfamiliar planet | Expedition ships returning; the new system's bodies revealed as surveyed |

Everything data-bearing stays in DOM consoles (the window is decorative for
screen readers, `aria-hidden`, with the same facts available in the panels).

## 2. Why it is a game system, not a backdrop

The brief's invariants ask that every feature carry a meaningful economic
decision, plug into P&L and corporate scale, live on a named time loop, and
extend to the interstellar era. The headquarters does all four:

- **Relocation is a decision.** Moving HQ costs money and time (a construction
  project on the campaign loop, weeks of real time at higher tiers), and each
  seat has a distinct bonus profile: Earth = cheapest hiring and contract
  negotiation; LEO = +launch cadence and satellite ops; Luna = +mining
  logistics and −Δv to the belt; Mars = +colony throughput and Martian
  contracts; Jovian/Saturnian = +outer-system extraction and science; deep
  space = +expedition returns. Bonuses are modest (±10–15%), so the choice is
  "where is my business" rather than a free win, and a corporation can only
  have one HQ.
- **Seats are scarce.** Orbital and Lagrange HQ anchorages are finite
  inventory, sold through the existing orbital-slot auctions and lease
  mechanics; a corporation that vacates a seat sells it at market. This is the
  brief's "orbital slots are finite" rule applied to the most visible asset a
  corporation owns.
- **The window is telemetry.** Because the window renders your own events
  (launches, arrivals, hazards), it doubles as the situation display: the
  player sees the solar storm before the alert card, sees the empty pad when
  fuel runs out, sees the returning hauler. That is the "designed for
  enjoyment" clause without adding UI.
- **Time loops.** Tactical: the window's live events. Daily: HQ upkeep and the
  day/night cycle. Weekly/monthly: relocation projects and seat auctions.
  Campaign: the sequence Earth → orbit → planets → interstellar mirrors the
  corporation tiers, so the HQ is the visible ladder of the whole game.

## 3. Progression ladder (tied to existing tiers)

| Tier (existing) | HQ options unlocked | Requirement to move |
|---|---|---|
| 1 Startup | Earth Operations Center (default, free) | — |
| 2 Venture | Orbital Command Deck (LEO) | Own an Orbital Outpost + a leased LEO seat; relocation project |
| 3 Enterprise | Lunar HQ (Lunar Gateway / south-pole base) | Lunar station or habitat + relocation project |
| 4 Corporation | Mars Orbital HQ | Mars relay + habitat; seat auction |
| 5 Conglomerate | Jovian or Saturnian HQ (one) | Outer-system station; seat auction |
| 6 Megacorp | Deep-space HQ (heliopause / Kuiper station) | Mothership-class flagship docked |
| 7 Transcendent | Interstellar HQ at a surveyed star | Completed interstellar expedition + colony charter |

A corporation may stay on Earth forever; nothing forces the move. Moving back
is allowed (at cost), which matters for players who over-extend.

## 4. How it is built (fits the current stack)

- **2.5D layered scene, not a second 3D canvas.** Each HQ stage is a set of
  Gemini backplates (21:9, no text) generated with `scripts/generate-art.ts`:
  far layer (sky/space), mid layer (horizon, station structure), near layer
  (console bezel). CSS parallax on pointer/tilt, a day/night colour grade
  driven by the world clock, and a small pool of SVG/CSS "actors" (a rocket
  plume, a glint, an aurora band) triggered by game events. This keeps the
  Bridge at parity on phones and inside the existing bundle budget (the page
  chunk is already 2.5 MB decoded; the review's Phase 1 asset budget applies).
- **The window is a component with a contract:** `<BridgeWindow hq=… clock=…
  events=…>` renders a stage by HQ id; a `useBridgeEvents` hook maps game
  events (launch fired, ship arrived, hazard started, build completed) to
  actors with cooldowns so the window never becomes a strobe.
- **Optional 3D globe later.** The graphics review's Phase 3 item 2 (drei
  `<View>` sharing one WebGL context) can replace the LEO stage's Earth limb
  with the real rotating globe once Phase 2 shading lands; the 2.5D version
  ships first and stays as the phone/reduced-motion path.
- **Consoles.** The Dashboard's current card grid becomes the Bridge's docked
  consoles (same components, new dock layout); the hub bar and Outliner are
  unchanged; the map remains one action away (the review's bridge mode gives
  the map the height it needs when the player goes there).
- **State.** `state.headquarters = { locationId, stage, movedAtMs, project? }`
  on GameState with a save migration (default `earth_surface`); server-side
  `GameProfile.hqLocationId` set by the relocation route (server-authoritative
  like assets), read by the public corp page and the leaderboard ("HQ: Lunar
  Gateway") so scouting shows where rivals sit.
- **Art pipeline.** Seven HQ stages × three layers × day/night ≈ 42 plates,
  generated in one batch, resized by `scripts/resize-art.ts` to 2560/1280/640
  widths; plus a 21:9 launch-pad plate per starting archetype (Cape coastal,
  Meridian's antenna field, Tracking Consortium's desert array).

## 5. Lore hooks

`docs/LORE.md` gives each stage a name and a faction shadow: the Earth centre
is licensed under the Accord of 2089; the LEO deck rents an anchorage from the
Syndicate-run station registry; the Lunar seat sits inside the Belt Rush era
infrastructure; Jovian/Saturnian seats border Void Corsair space (piracy risk
shows up in the window); the interstellar HQ is the corporation writing its own
chapter. Named NPC regulators approve each relocation charter with a line of
dialogue in the Mail console.

## 6. Accessibility and phones

The window is `aria-hidden` decoration; every fact it conveys is in a console
with text. Reduced motion freezes parallax and actors (static plate). Keyboard:
the Bridge is a landmark with the consoles in tab order; F still toggles bridge
mode; Escape returns to the Bridge from any panel. Phones get the same plates
at 640 px with the consoles stacked below the window, and the window collapses
to a 96 px banner when a console is open.

## 7. Phasing and cost

| Phase | Scope | Hours |
|---|---|---|
| CC-1 | Earth Operations Center: window with pad, day/night, three actors (launch, build complete, weather); Dashboard re-docked as consoles; state field + migration; art batch for Earth stages | 30–40 |
| CC-2 | Relocation system: LEO + Lunar HQ, relocation project, seat lease, bonuses, server route, public corp page field, tests + sim check of bonuses | 35–45 |
| CC-3 | Mars, Jovian/Saturnian, deep-space stages; hazard actors; seat auctions | 30–40 |
| CC-4 | Interstellar HQ tied to the expedition/colony systems; optional 3D globe swap for LEO | 25–35 |

Sequencing: CC-1 slots naturally after graphics Phase 1 (bridge mode and
framing are prerequisites) and before graphics Phase 2; CC-2 needs mining
Phase B's claim/lease plumbing for seats. Total ≈ 120–160 hours across the
autumn, each phase shippable and visible.

## 8. Open decisions for Jay

1. **Bonus size.** ±10–15% per seat (recommended: meaningful, never
   dominant) versus larger swings that make relocation mandatory.
2. **One HQ or HQ + regional offices.** One HQ keeps the decision sharp
   (recommended); regional offices could come later as a corporate-scale
   feature.
3. **Window realism.** Painted plates with a few live actors (recommended for
   cost and phones) versus a live 3D scene from the start.
4. **Should rivals' HQ be public?** Recommended yes on the corp page (it is
   the kind of intelligence the brief says should be visible), with the
   relocation project itself hidden until complete.
