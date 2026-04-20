# SpaceNexus Project Context

## Deployment
- **Platform**: Railway (auto-deploys on push)
- **Branch**: `dev` branch triggers deployment
- **Database**: PostgreSQL on Railway
- **GitHub Repo**: jackosaurus2014/spacehub

## Tech Stack
- Next.js 14 (App Router)
- Prisma ORM with PostgreSQL
- TypeScript
- Tailwind CSS
- Zod (validation)
- Jest (testing)

## Key Commands
- `npm run build` - Build the project
- `npm run dev` - Start dev server
- `npm test` - Run Jest test suite
- `npx prisma db push` - Push schema changes to database
- `npx tsx scripts/<name>.ts` - Run initialization scripts

## Workflow
1. Make changes
2. Run `npm run build` to verify
3. Commit and push to `dev` branch
4. Railway auto-deploys from dev branch

## CI/CD
- GitHub Actions workflow in `.github/workflows/ci.yml`
- Railway auto-deploys from `dev` branch

## Database Initialization
When adding new modules with seed data, create a script in `scripts/` and run with `npx tsx`, or hit the `/api/<module>/init` endpoint after deployment.

## Validation & Error Handling
- **Schemas**: Zod schemas in `src/lib/validations.ts`
- **Helper**: `validateBody(schema, body)` parses and returns `{ success, data, error }`
- **Error utilities**: `src/lib/errors.ts` exports `validationError()`, `internalError()`, etc. (return `NextResponse` objects)
- **Reference**: See `src/app/api/contact/route.ts` for the standard pattern

## Testing
- **Config**: `jest.config.ts` using `next/jest` preset (requires `ts-node` devDependency)
- **Tests**: `src/lib/__tests__/` (validations, errors, contact-validation, news-categorizer)
- **Note**: Tests using `NextResponse` need `@jest-environment node` pragma; validation tests use default jsdom

## Security
- **CSRF protection**: Origin/Referer header check on mutations in `src/middleware.ts`
- **Rate limiting**: In-memory sliding window in `src/middleware.ts`
- **HTML sanitization**: `sanitize-html` used for RSS feed content

## UI Components
- **Toast notifications**: `src/lib/toast.ts` (API) + `src/components/ui/Toast.tsx` (component)
- **Skeleton loaders**: `src/components/ui/Skeleton.tsx`

## PWA
- **Icons**: `public/icons/` (192x192, 512x512)
- **Service worker**: Registration component in layout
- **Icon generation**: `scripts/generate-icons.ts` using sharp

Goal of the project:  Design and support the premier space intelligence, enthusiast and business website and portal on the internet and on app stores.  A place where: (1) enthusiasts can come read about everything going on in space exploration and space business and see livestreams of ongoing and upcoming missions; (2) company leaders and personnel can find market intelligence, business ideas, networking, job hiring, and a portal for engaging in space business-related transactions; (3) a place where people wanting to find jobs or gig work in the space industry can come to find such work being offered by companies; (4) private equity firms and other investors can come to find all of the information that investors would want to know about what's happening in the space industry, industry trends, business opportunities, companies to invest in, and all of the intelligence related to these activities; (5) startups can find investors, intelligence about where they should be directing their efforts, and a portal to announce investment rounds or investment opportunities.  Everything should be designed with this being a site for enthusiasts and very useful and functional for business people.  SAAS opportunities should be explored where possible.  We also want to have forums, speaking opportunities, a podcast directory, corporate and enterprise messaging, inter-personal messaging, and similar community engagement opportunities.  The goal is that as space business expands, this can be a central site for the space industry to find everything it needs here.  

Prioritize enthusiasts, functionality and information over profit.  I'd rather the site and app be the place for everybody to come than trying to make more money.

## Space Tycoon — Game Design Principles

Space Tycoon is intended to be a **highly complex economic PVE and PVP MMO space strategy game**, not a lightweight idle clicker. The following principles govern all design decisions for the game.

**Companion documents:**
- [`docs/LORE.md`](docs/LORE.md) — canonical 22nd-century timeline, the six factions, named NPCs, historical events, naming conventions. Reference when writing contracts, events, or dialogue.
- [`docs/POLICY.md`](docs/POLICY.md) — public-facing player policies: no pay-to-win rules, simulation integrity playbook, data and privacy commitments. Load-bearing for community trust.

### Meaningful decisions
Every player choice — what to build, where to expand, whom to hire, which resources to stockpile, which contracts to bid on — should have real economic trade-offs. Avoid dominant strategies, free wins, and cosmetic-only choices. If a decision doesn't change a player's economic situation, it shouldn't be in the game.

### Realistic economics
- **Supply and demand** drive all resource and service prices. Mass extraction of a commodity should depress its market price. Surging demand for a service should raise its revenue.
- **Profit and loss** must be tracked and visible. Players should see where they're making and losing money at building, service, location, and corporate levels.
- **Scarcity is real.** Premium locations, high-grade deposits, and orbital slots are finite and contested.
- **Logistics cost money.** Delta-v, travel time, transshipment, and storage all affect the bottom line.

### Corporate infrastructure is the core PVP loop
- **Corporations are the primary PVP mechanism and end-game.** Solo play is a viable on-ramp, but the deep competitive gameplay lives at the corporate level.
- **Expansion opportunities** — mergers, acquisitions, subsidiary creation, contested territory control, market manipulation, industrial espionage, infrastructure scaling, faction alignment — should be continuously unlocked as corporations scale.
- **Corporate warfare is economic, not kinetic.** Players compete by out-producing, out-bidding, out-researching, out-recruiting, and out-maneuvering — never by direct military combat against other players.

### No combat warfare — but real risk
- **No direct player-vs-player combat.** No fleet battles, ship destruction in PvP, or military conquest of player assets.
- **But hazards and disasters are real.** Solar storms, asteroid impacts, micrometeoroids, infrastructure failure, sabotage, piracy (from NPC factions), epidemics, regulatory crackdowns, equipment wear, and accidents can destroy ships, damage buildings, kill personnel, and wipe out inventories. Players must invest in insurance, redundancy, shielding, and contingency planning — these are strategic economic decisions.

### Long-horizon expansion
- **Solar-system gameplay is the mid-game**, not the endpoint. End-game loops extend to **interstellar exploration, colonization, and trade** — players eventually reach beyond the heliosphere.
- **Progression should reward long-term thinking.** Compounding bonuses, multi-year construction projects, generational corporate legacies, and deep research trees give committed players visible growth over weeks and months of play.

### Market intelligence is a first-class feature
If the game is economic warfare, the intelligence layer is how skill expresses itself. Data access *is* gameplay.
- **Every price has history.** Spot prices, time-series charts, moving averages, volatility indicators, and order-book depth must be available for every commodity and service.
- **Flows are visible.** Commodity supply maps, route-level volume, and exporter/importer rankings let players identify arbitrage, chokepoints, and rival concentration.
- **Corporate scouting is legitimate gameplay.** Players can view other corporations' public fleet counts, facility locations, alliance memberships, and league rankings. Deeper intelligence (production rates, research pipelines, cash reserves) is earned via espionage, paid reports, or market signals — never free and never perfect.
- **Quarterly corporate reports.** Every corporation produces an automatic public quarterly — revenue, growth rate, notable acquisitions. Fuel for rivalry and narrative.

### Session design and time horizons
Meaningful decisions happen on multiple time scales at once. A good session has tactical moves on short loops, strategic moves on medium loops, and campaign-level bets on long loops.
- **Tactical (seconds-minutes):** market orders, ship dispatch, contract bidding, event responses.
- **Daily loops:** contracts refresh, maintenance decisions, daily challenges, intelligence briefings.
- **Weekly loops:** league standings, corporate elections, faction standings reset, seasonal events.
- **Monthly/quarterly loops:** corporate quarterly reports, research tier completions, megaprojects phases.
- **Multi-month / yearly loops:** faction realignment, interstellar expedition returns, legacy milestones, corporate eras.
- **Don't collapse the tempo.** Every new feature should name which loop it lives on. Flattening everything to the daily cadence destroys the game's texture.

### Diplomacy and binding contracts between players
Economic warfare requires economic *agreements*. The social fabric is as important as the resource sheets.
- **Binding player-to-player contracts** — resource supply deals, delivery obligations, exclusivity agreements — with escrow, milestones, and automatic penalty enforcement on default.
- **Non-aggression / no-poach / territory-sharing pacts** between corporations, signed on-chain in the game's ledger and visible to the public.
- **Mergers, acquisitions, and hostile takeovers** are formal mechanisms with due-diligence, counteroffer, and minority-shareholder protections.
- **Arbitration** for disputes — a built-in neutral system (possibly faction-mediated for a fee) that settles contract breaches without devolving to unresolvable he-said-she-said.
- **Public diplomacy feed.** All signed agreements, ratings changes, and broken pacts appear in a global diplomatic timeline — reputation is legible.

### Economy integrity — no pay-to-win
Real-money purchases are allowed. Competitive advantage through them is not.
- **Cosmetic and convenience only.** Skins, commander portraits, UI themes, additional save slots, extra queue slots beyond a reasonable free cap, faster off-session notifications. Never: direct resources, direct money, research acceleration, unique gameplay content, or faster-than-earnable progression.
- **No lockboxes / gacha for game-relevant items.** Randomized cosmetics are acceptable; randomized competitive outcomes are not.
- **Sponsored/branded faction skins and real-world partnerships** are acceptable as long as they grant no mechanical edge.
- **Stated publicly.** The no-pay-to-win commitment appears in the game's marketing copy and is load-bearing for community trust.

### Spatial strategy — geography matters
Physical reality is not flavor; it's strategy.
- **Delta-v and travel time have real cost** — measured in fuel, opportunity cost of tied-up ships, and depreciation. No teleportation.
- **Chokepoints are real.** Launch windows, refueling stops, narrow belt corridors, and Lagrange stations create naturally contested locations. The game should reward corporations that invest in controlling them.
- **Orbital slots are finite.** GEO, lunar polar, stable Lagrange points, and high-value low-radiation anchorages are limited inventory. Ownership transfers at market-clearing prices.
- **Shipping lanes are investments.** Trade routes get faster, safer, and cheaper with repeated use and infrastructure investment (beacons, refueling depots, rescue stations). Abandoning a lane degrades it.

### NPC economic backdrop as MMO insurance
Player activity fluctuates. The economy should not depend on it.
- **NPC companies and factions produce and consume enough** to sustain a functioning market even at low player population. Prices should feel alive on an empty server.
- **NPC demand is visible and forecastable.** Major NPC contracts, faction procurement drives, and scheduled infrastructure projects publish ahead of time — players can plan around them.
- **NPC economy scales.** As player population grows, NPC economic share recedes proportionally. NPCs are a floor, not a ceiling.

### New-player on-ramp
A corporate-warfare endgame is hostile to newcomers unless the first 20 hours are structured.
- **Protected Frontier.** A first-month zone where new players cannot be targeted by high-tier rivals, NPC piracy is capped, and starter contracts pay generously. Graduation to the open economy happens at a set net-worth threshold.
- **Staged tab unlocks** (already in place via corporation tiers) — expose the full UI gradually, not all at once.
- **Mentorship rewards.** Veterans who sponsor new players earn real in-game bonuses tied to the mentee's success. Corporations are rewarded for recruiting and training.
- **Competitive brackets.** League seasons use net-worth brackets so newcomers compete against peers, not legends.

### Simulation integrity
Economic games are magnets for exploits. Take this seriously from day one.
- **Balance review cadence.** Quarterly economic balance reports — prices, Gini coefficient, tier concentration, active-player win rates — published publicly.
- **Exploit response playbook.** Documented process for identifying, triaging, rolling back, and transparently disclosing economic exploits. Players who accidentally benefit are not punished; deliberate exploiters are.
- **Rollback and escrow tools.** Infrastructure to reverse transactions within a defined window when exploits are found. Escrow for large trades protects against client-side fraud.
- **Anti-RMT** (real-money trading). Detection, enforcement, and a fast-response ban pipeline. Economic integrity depends on this.
- **Public post-mortems.** When something breaks, the team writes up what happened, what was changed, and what compensation (if any) was issued.

### Lore and world-building
A coherent universe makes content cohere. Everything new should reference the same timeline, the same factions, the same historical beats.
- **Timeline.** A canonical history — the rise of commercial space, the Accord of 2089, the Belt Rush of 2112, the founding of the six factions, the current year and state of interstellar exploration. Writers and artists share this vocabulary.
- **Faction motivations are legible.** The six factions (Dominion, Syndicate, Void Corsairs, Hive Collective, Nebula Reavers, Echo Remnants) each have a documented goal, internal structure, and point of view. Their contracts, demands, and reactions reflect those motivations consistently.
- **Player corporations write their own chapter.** Corporate founding dates, major acquisitions, public scandals, and legacy milestones are recorded in a permanent ledger that new players can read as history.
- **Named NPCs.** Commanders, faction leaders, regulators, and rivals have names and personalities. The game feels inhabited.

### GUI and Command Center
- **Earth command center is the main hub.** Every session opens in the player's command center — a futuristic operations room on Earth from which the entire corporation is commanded. All ships, bases, contracts, research, personnel, markets, and expansion are reachable from this central interface. Returning to the command center is always one action away.
- **Futuristic display aesthetic.** The visual language is holographic briefings, orbital schematics, live telemetry readouts, mission-control consoles, HUD overlays, cyan/amber/purple accent palette, true-black backgrounds, subtle animations, and sci-fi typography. It should feel like commanding a 22nd-century space conglomerate, not filling out a spreadsheet.
- **Rich, engaging interaction for every region.** Each area of the solar system — inner system, asteroid belt, lunar environs, Martian surface, Jovian moons, Saturnian moons, outer system, interstellar space — should have a distinct visual identity, thematic art, and interactive affordances. Flying over the belt should feel different from managing cloud cities over Venus.
- **Designed for enjoyment, not just management.** The GUI must be as fun to navigate as it is functional. Prioritize delight: smooth transitions, satisfying audio feedback, visual progress reinforcement, and information density that scales with the player's expertise (new players see guided flows, veterans see dense dashboards).
- **Mobile-parity.** All command-center features should remain usable on a phone. Touch targets, swipe gestures, and adaptive layouts are first-class concerns.

### Accessibility
Space Tycoon is a game that will run for a decade. Accessibility retrofits are expensive; commitments up front are cheap.
- **Colorblind-safe palettes** for all information-critical UI (faction colors, standing indicators, rep bars, alert levels). No critical state conveyed by color alone.
- **Reduced-motion mode** toggles off parallax, animated backgrounds, and decorative transitions.
- **Screen-reader support** for every panel: ARIA labels, logical tab order, meaningful link text.
- **Keyboard-only play** — every action reachable without a mouse, including the command center, map navigation, and modal dialogs.
- **Configurable font sizes and contrast** (already partially supported via high-contrast mode).

### Design invariants (checklist when building new features)
- Does this feature introduce a meaningful economic decision?
- Does it plug into supply/demand, P&L, or corporate scaling?
- Which time loop does it live on (tactical / daily / weekly / monthly / yearly)?
- If it can destroy something, is the loss driven by hazard/disaster or NPC action — never by PvP combat?
- Does it stay useful at corporate scale, not just solo?
- Does it extend naturally to interstellar-era gameplay, or does it cap out at the heliopause?
- Does it grant or accept real-money competitive advantage? (If yes, redesign.)
- Is the relevant market/corporate intelligence visible to players who invest in getting it?
- Is it accessible (keyboard, screen reader, colorblind, reduced motion)?
- Is it enjoyable on a phone at 60Hz?
