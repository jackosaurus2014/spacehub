# Space Tycoon — Deep Stats Design

Comprehensive stat system for ships, stations, infrastructure, crew, and research. Intended as the blueprint for building a best-in-class economic / exploration / expansion MMO where every decision has measurable consequences.

## Design principles (baseline)

These are non-negotiable for every stat below:

- **Each stat measures something the player can influence.** No stat exists purely as flavor.
- **Each stat interacts with at least two others.** Isolated stats become noise. Cross-dependencies create decision space.
- **Strict upper bounds.** Uncapped stacking produces degenerate strategies. Every stat has a documented cap.
- **Diminishing returns on stacking.** The 5th cargo expander should add less than the 1st.
- **No hidden stats.** All numbers are visible in the UI. Economic warfare demands informational parity between players.
- **No PvP-damage stats.** Hull HP, shield HP, damage, etc. exist only for **hazards / NPC pirates / environmental disasters** (consistent with CLAUDE.md's "competitive economic warfare, not kinetic").

## Current stat surface (audit)

Before adding: what already exists.

**Ships (`ShipDefinition`):** id, name, icon, role, description, tooltip, **cargoCapacity**, miningRate, miningTargets, baseCost, resourceCost, requiredResearch, buildTimeSeconds, tier.

**Buildings (`BuildingDefinition`):** id, name, category, description, tooltip, **baseCost**, buildTimeMonths, **maintenanceCostPerMonth**, requiredResearch, requiredLocation, enabledServices, tier, realBuildSeconds, resourceCost, **powerRequired**, **powerGenerated**.

**Research (`ResearchDefinition`):** id, name, category, description, effect, baseCostMoney, baseTimeMonths, prerequisites, tier, unlocks, realResearchSeconds, resourceCost. Effects resolved via `effects?: ResearchEffect[]` or inferred from flavor (post-refactor).

**Crew (via `workforce` in GameState):** 4 types — engineers, scientists, miners, operators. Each has a count. Bonuses via `getWorkforceBonuses`.

**Commanders:** 60 definitions with class and rarity. Grant per-class stat multipliers (diplomat → revenue, engineer → build speed, etc.).

## Proposed new stat surface

### 1. Ships — expanded stats

```ts
interface ShipDefinition {
  // ── Existing ─────────────────────────────────────────────────────
  id, name, icon, role, description, tooltip, baseCost, resourceCost,
  requiredResearch, buildTimeSeconds, tier;
  cargoCapacity: number;       // m³
  miningRate?: number;
  miningTargets?: string[];

  // ── New: Movement & Fuel ─────────────────────────────────────────
  /** Base sublight speed — affects intra-location and short-haul times. m/s. */
  sublightSpeed: number;
  /** Warp factor — affects interplanetary travel time. Unitless multiplier. */
  warpFactor: number;
  /** Fuel tank capacity (units of methane/helium3). */
  fuelCapacity: number;
  /** Fuel consumption per hour of travel. */
  fuelBurnRate: number;
  /** Starship delta-v budget (m/s). Spent over route distance. */
  deltaVBudget: number;

  // ── New: Crew & Life Support ─────────────────────────────────────
  /** Minimum crew to operate at all. Missing crew → ship inactive. */
  crewRequired: number;
  /** Max crew housed. Surplus crew = bonus performance to certain roles. */
  crewCapacity: number;
  /** Life-support days of autonomy before resupply needed. */
  lifeSupportDays: number;

  // ── New: Hazard Resilience (no PvP) ──────────────────────────────
  /** Hull integrity — hazard/pirate damage before ship is destroyed. */
  hullIntegrity: number;
  /** Shielding rating — % of incoming hazard damage absorbed. 0-1. */
  shieldingRating: number;
  /** Point-defense — passive reduction of pirate raid success. 0-1. */
  pointDefenseRating: number;

  // ── New: Sensors & Survey ────────────────────────────────────────
  /** Survey range — distance at which this ship can prospect anomalies. */
  surveyRange: number;
  /** Survey accuracy — quality of data returned from prospecting. 0-1. */
  surveyAccuracy: number;
  /** Stealth signature — smaller = harder to detect by NPCs / pirates. */
  stealthSignature: number;

  // ── New: Reliability & Maintenance ───────────────────────────────
  /** Mean time between failures (hours) — triggers maintenance events. */
  mtbfHours: number;
  /** Maintenance cost per game-month while active. */
  maintenanceCostPerMonth: number;
  /** Insurance premium / month (optional — players may self-insure). */
  insurancePremium: number;
  /** Insured value — payout on catastrophic loss. */
  insuredValue: number;

  // ── New: Modularity ──────────────────────────────────────────────
  /** Module slots — number of upgradeable subsystems. */
  moduleSlots: number;
  /** Module hardpoint types — determines what modules fit. */
  hardpointTypes: Array<'engine' | 'shield' | 'cargo' | 'sensor' | 'drone' | 'utility'>;
}
```

**Ship role archetypes:**

| Role | High stats | Low stats | Use case |
|---|---|---|---|
| Cargo freighter | cargoCapacity, fuelCapacity, shieldingRating | sublightSpeed, surveyRange, stealth | Bulk logistics between mature hubs |
| Tanker | cargoCapacity (fuel only), hullIntegrity | warpFactor, survey | Refueling depots, deep-range support |
| Survey probe | surveyRange, surveyAccuracy, stealth | cargoCapacity, hull | First-access to anomalies; low-signature prospecting |
| Mining drone | miningRate, cargoCapacity (ore) | warpFactor, crew | Fixed-location extraction |
| Deep-space explorer | fuelCapacity, lifeSupportDays, warpFactor | mining, combat | Pushing frontier lanes, Wanderer-1 lineage |
| Fast courier | warpFactor, sublightSpeed, stealth | cargo, hull | Contract delivery on tight deadlines |

### 2. Stations / Buildings — expanded stats

```ts
interface BuildingDefinition {
  // ── Existing ─────────────────────────────────────────────────────
  id, name, category, description, tooltip, baseCost, buildTimeMonths,
  maintenanceCostPerMonth, requiredResearch, requiredLocation,
  enabledServices, tier, realBuildSeconds, resourceCost,
  powerRequired, powerGenerated;

  // ── New: Capacity & Throughput ───────────────────────────────────
  /** Docking slots — number of ships that can dock simultaneously. */
  dockingCapacity: number;
  /** Cargo / warehouse storage. */
  storageCapacity: number;
  /** Manufacturing throughput — module blueprints produced per game-month. */
  manufacturingThroughput: number;
  /** Refining throughput — raw ore → refined material per game-month. */
  refiningThroughput: number;
  /** Market liquidity contribution — if this building hosts trading. */
  marketLiquidityContribution: number;

  // ── New: Service Quality ─────────────────────────────────────────
  /** Service quality — per-service revenue multiplier. 1.0 = baseline. */
  serviceQualityMultiplier: number;
  /** Customer capacity — saturation ceiling: can serve N customers / month. */
  customerCapacity: number;
  /** Uplink bandwidth — data-service throughput (for telecom/AI/dc). */
  uplinkBandwidth: number;

  // ── New: Crew Quarters ───────────────────────────────────────────
  /** Crew quarters — people this facility houses comfortably. */
  crewQuarters: number;
  /** Crew morale modifier — life-support quality. 0-1. */
  crewMoraleModifier: number;

  // ── New: Hazard Resilience ───────────────────────────────────────
  /** Structural integrity — takes disaster damage before becoming inoperable. */
  structuralIntegrity: number;
  /** Shielding rating — solar storms / radiation mitigation. 0-1. */
  shieldingRating: number;
  /** Seismic / orbital-stability rating (location-dependent). 0-1. */
  stabilityRating: number;

  // ── New: Network & Synergy ───────────────────────────────────────
  /** Co-location bonus type — buildings of compatible type nearby multiply each other. */
  synergyTags: string[];
  /** Range of synergy (same location vs same body vs interplanetary). */
  synergyRange: 'location' | 'body' | 'system';

  // ── New: Upgrade Path ────────────────────────────────────────────
  /** Maximum upgrade level. Current upgrade is per-instance. */
  maxUpgradeLevel: number;
}
```

**Building category notes:**

- **Launch pads:** high manufacturingThroughput (outbound), low customerCapacity.
- **Ground stations:** high uplinkBandwidth, serve many customers.
- **Satellites:** tiny per-instance service but high aggregate when constellations saturate an orbit.
- **Space stations:** high crewQuarters + crewMoraleModifier, synergize with everything at same location.
- **Refineries:** high refiningThroughput, consume raw ore + power.
- **Habitats:** crewQuarters, low direct revenue, unlock higher-crew buildings.

### 3. Crew — expanded system

**Current:** 4 types × headcount. Simple.

**Proposed:**

```ts
interface CrewPool {
  // Four existing types retained (counts):
  engineers: number;
  scientists: number;
  miners: number;
  operators: number;
  // New types:
  pilots: number;          // required to operate ships (crewRequired stat)
  negotiators: number;     // improves contract bidding odds
  security: number;        // reduces NPC pirate success
  medics: number;          // reduces crew-loss on disasters

  // ── New: aggregate stats ─────────────────────────────────────────
  /** Global morale — affected by housing, pay, faction stress. 0-1. */
  morale: number;
  /** Fatigue — accumulates during extended missions, eroded by rest. 0-1. */
  fatigue: number;
  /** Training level — skill efficacy. 0-1. */
  trainingLevel: number;
  /** Monthly training budget (per crew member). */
  trainingBudgetPerCrew: number;
}
```

**Crew mechanics:**

- **Payroll:** per-type monthly cost. Scales with trainingLevel (trained crew cost more).
- **Morale:** low morale → % reduction to all ship/building output. Housing, pay, successful contracts, faction victories raise it. Defaults, low wages, high fatigue lower it.
- **Fatigue:** accumulates during ship-in-transit or high-workload months. Eroded by rotation (takes crew offline for N months).
- **Training:** paying the training budget raises trainingLevel over time. Each 10% training = 2% bonus to relevant stats.
- **Specialization tracks:** within a type, a crew member gains a specialization over months (Engineer → Structural, Mechanical, Electrical, Nuclear). Specialization multiplies effectiveness at matching buildings.

**Crew specialization tree (design, not yet implemented):**

| Type | Specializations |
|---|---|
| Engineer | Structural / Mechanical / Electrical / Nuclear |
| Scientist | Physics / Materials / Biology / Computer Science / Astronomy |
| Miner | Asteroid / Surface / Ice / Gas |
| Operator | Mission Control / Relay / Data Center / Broadcasting |
| Pilot | Cargo / Tanker / Survey / Combat-exempt |
| Negotiator | Diplomacy / Trade / Contracts / M&A |
| Security | Point Defense / Anti-Piracy / Internal Affairs |
| Medic | Trauma / Radiation Sickness / Psychiatric |

### 4. Infrastructure — cross-cutting stats

These aren't tied to one building but describe the corporation's posture at a location.

```ts
interface CorporationLocationPosture {
  /** Total power-generated vs power-required at this location. */
  powerBalance: number;
  /** Total storage used vs capacity. */
  storageUtilization: number;
  /** Total life-support supplied vs crew consuming it. */
  lifeSupportBalance: number;
  /** Aggregate disaster resilience. Weighted avg of building + ship shielding. */
  resilienceRating: number;
  /** Network density — buildings linked by synergy tags. */
  synergyScore: number;
  /** Logistical reach — how far ships based here can economically operate. */
  logisticalReach: number;
  /** NPC heat — faction attention you're drawing here. */
  npcHeat: number;
}
```

**Why this matters:**

- Players with storage utilization > 90% can't store new mined material — creates a real operational constraint.
- Power deficit already reduces revenue; this makes the balance visible.
- Life-support negative = crew attrition.
- NPC heat → higher pirate raid chance; lowering it requires diplomacy or security investment.

### 5. Research — expanded stats

**Per-research structure:**

```ts
interface ResearchDefinition {
  // ── Existing ─────────────────────────────────────────────────────
  id, name, category, description, effect, baseCostMoney, baseTimeMonths,
  prerequisites, tier, unlocks, realResearchSeconds, resourceCost;

  // ── New: effect spec (partially done — extend further) ───────────
  effects?: ResearchEffect[];        // Explicit magnitude per effect

  // ── New: lab requirements ────────────────────────────────────────
  /** Required scientist headcount. Completes slower with fewer. */
  scientistsRequired: number;
  /** Required lab quality — lab equipment rating at the research site. */
  labQualityRequired: number;
  /** Classified — cannot be accessed if corporation lacks security clearance. */
  classified: boolean;

  // ── New: reliability / prototype risk ────────────────────────────
  /** Prototype reliability — 0-1 chance the research succeeds on completion. */
  prototypeReliability: number;
  /** Failure cost — money/resources lost on failed prototype. */
  failureCostMultiplier: number;

  // ── New: obsolescence ────────────────────────────────────────────
  /** Tier at which this research becomes mostly obsolete (later research supersedes). */
  obsoletedAtTier: number;

  // ── New: broader effect types (future expansion) ─────────────────
  // Add to ResearchEffect union:
  //   - 'launchCostReduction': specific to launch_pad buildings
  //   - 'specificResourceYield': { resourceId, magnitude }
  //   - 'specificServiceRevenue': { serviceId, magnitude }
  //   - 'travelSpeed': { kind: 'sublight' | 'warp', magnitude }
  //   - 'fuelEfficiency': magnitude
  //   - 'crewMorale': magnitude
  //   - 'disasterResistance': magnitude
  //   - 'npcHeatReduction': magnitude
  //   - 'factionReputationMultiplier': { factionId?, magnitude }
}
```

**Research infrastructure (new building category):**

- **Research Lab (tier 1)** — 1 scientist slot, labQuality 1, prototypeReliability +10%.
- **Advanced Lab (tier 2)** — 3 scientists, labQuality 3, unlocks tier-3 research.
- **Institute (tier 3)** — 8 scientists, labQuality 6, parallel research capacity +1.
- **National Academy (tier 4)** — 15 scientists, labQuality 10, cross-faction collaboration bonus.

**Parallel research:**

- Research Lab = 1 queue
- Institute = 2 queues
- National Academy = 3 queues
- Megastructure (space university) = up to 5 queues

Already partially implemented (`parallel_research` unlocks Q2). Extend to support more queues.

### 6. Hazards and disasters — stat interactions

Per CLAUDE.md, combat is non-PvP. Hazards are real — this section spells out the mechanics.

**Hazard types:**

| Hazard | Trigger | Mitigations |
|---|---|---|
| Solar storm | Random ~ every 3 game-months, stronger at Mercury/Venus | shieldingRating, scientist-operated storm prediction |
| Micrometeorite strike | Random, higher at asteroid belt | hullIntegrity, pointDefense, security crew |
| Radiation burst | Random, higher at Io / Jupiter | shieldingRating, medic crew |
| Equipment failure | Ship mtbfHours elapsed | trainingLevel, engineer specialization |
| Life-support cascade | Life-support balance negative | medic crew, life-support redundancy modules |
| NPC pirate raid | npcHeat >= 70 + isolated location | pointDefense, stealthSignature, security crew |
| Regulatory inspection | High-tax faction, flagged shipment | negotiators, Accord compliance record |
| Market crash (commodity) | Aggregate oversupply cap reached | diversified resource portfolio |

**Damage model:**

- Hull/structure loses integrity per incident.
- Integrity 0 = destroyed → insurance triggers (if paid).
- Repair costs = % of baseCost based on integrity loss.
- Crew casualties = medic crew count determines mortality ratio.

### 7. Ship / station modules (customization)

Modules are consumables that go into ship hardpoint slots or building equipment bays.

```ts
interface ModuleDefinition {
  id: string;
  name: string;
  hardpointType: 'engine' | 'shield' | 'cargo' | 'sensor' | 'drone' | 'utility';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  tier: 1 | 2 | 3 | 4 | 5;
  baseCost: number;
  manufacturingInputs: Record<string, number>;  // resources to craft
  effects: ModuleEffect[];
  compatibleShipRoles?: ShipRole[];
  compatibleBuildingCategories?: string[];
  weight: number;  // ship weight affects speed/fuel
  powerDraw: number;  // some modules require extra power
}
```

Example modules:

| Module | Hardpoint | Effect |
|---|---|---|
| Extended Cargo Bay | cargo | +30% cargoCapacity, −10% sublightSpeed |
| Ion Thruster Array | engine | +20% warpFactor, +5% fuelBurnRate |
| Quantum Sensor Array | sensor | +50% surveyRange, +25% surveyAccuracy |
| Whipple Shield Plating | shield | +40% hullIntegrity against micrometeorite |
| Stealth Coating | utility | −40% stealthSignature, +10% insurancePremium |
| Mining Laser Cluster | drone | +30% miningRate, required mining-class only |
| Life Support Redundancy | utility | +7 lifeSupportDays |
| Navigation Computer Mk II | utility | +15% sublightSpeed |

Modules manufactured at a building with sufficient manufacturingThroughput. This makes manufacturing buildings directly valuable — they're the source of all ship upgrades.

### 8. Market / trading — finer stat grain

Already partially implemented (supply/demand pricing, broker fees). Proposed extensions:

- **Bid-ask spread:** Every commodity has a live bid (what you can sell for) and ask (what you can buy for). Spread widens in low-liquidity conditions.
- **Order book depth:** Visible in Market Intelligence panel already — extend to show individual large orders.
- **Commodity volatility:** Existing (`volatility` field on MarketResource). Makes price-impact proportional.
- **Insurance market:** Separate market where players can buy insurance premiums from other corporations (risk underwriting). High-resilience corps can sell insurance for passive income.
- **Futures contracts:** Promise to deliver N units at month X for a locked price. Sellers protected from price drops; buyers protected from spikes.
- **Short selling:** Borrow a commodity, sell now, buy-back later. Profits if price falls. Requires collateral.
- **Commodity indices:** Weighted baskets (e.g. "Industrial Metals Index" = iron 40% + aluminum 30% + titanium 20% + rare_earth 10%). Can hedge against broad price movement.

### 9. Station services and client acquisition

Currently services passively pay. Proposed:

- **Client acquisition:** Stations with high customerCapacity attract more clients over time. Clients stick with their provider (retention) so building early at a location is a compounding advantage.
- **Service quality tiers:** Premium / Standard / Budget. Higher tier = higher per-client revenue but fewer clients willing to pay.
- **Client churn:** % of clients leave if service-quality drops below expectations. Can be caused by power deficit, crew morale, disaster damage.
- **Network effects:** Telecom / data services benefit from N other locations covered. Broadband constellation revenue scales super-linearly once you cover 5+ locations (customers who need multi-location coverage subscribe to whoever has the widest footprint).

### 10. Exploration, discovery, and surveys

Deep spatial exploration beyond "unlock location":

- **Anomaly detection:** Survey ships prospecting at a location roll for anomalies:
  - Rich deposit (+N% mining yield for N months)
  - Ancient artifact (unlocks precursor research)
  - Derelict ship (claim salvage)
  - Uncharted asteroid (finite-resource claim)
  - Hazard zone (avoid or pay shielding)
- **Deep prospecting:** Higher-tier survey ships find higher-value anomalies.
- **Claim stakes:** Discovered anomalies can be claimed. Claims have a lifetime; unclaimed-but-discovered anomalies can be found by rivals.
- **Interstellar exploration (end-game):** Warp-class ships can push beyond the heliopause. Distance/fuel costs scale astronomically. Rewards: new resource types, new faction contact, new research tiers.

### 11. Corporate mechanics (supporting PVP)

- **Corporate wallets:** Shared treasury accessible per-role (CEO / CFO / general).
- **Corporate hangars:** Shared assets; members can withdraw per role permissions.
- **Roles & permissions:** Add-member, spend-corp-funds, sign-contracts, negotiate-treaties.
- **Acquisitions:** Tender offer to buy another corporation. Board approval ratings.
- **Dividends:** CFO can declare dividends to shareholders (other corps / players).
- **Board elections:** Alliance-level voting for alliance leadership.

### 12. Faction interactions (beyond current reputation)

Current: scalar -100 to +100 reputation per faction.

**Proposed extensions:**

- **Standing tiers modify prices:** Allied = 15% better prices at that faction's services; Hostile = 25% worse or unavailable.
- **Faction-locked content:** Some research / ships / modules only available at certain reputation tiers.
- **Bounty systems:** Factions post bounties on rival-faction actors (including players who've wronged them).
- **Diplomatic actions:** Formal treaty proposals, non-aggression pacts, trade agreements. Already implemented in diplomacy panel; extend to factions.
- **Faction specializations:** Each faction has a "home bonus" at their territory (e.g. Echo Remnants give +30% research speed to allied players operating at Triton).

### 13. End-game stats — interstellar exploration

Not to be implemented soon, but designed now:

- **Jump drives** unlock at tier-5 research. Enable travel beyond the solar system.
- **Exotic fuel:** Required for interstellar jumps. Only produced at specific refineries with the right research.
- **Signal lag:** Information travels at lightspeed. Interstellar operations involve significant decision latency — futures hedging, autonomous AI.
- **Alien contact:** Hive Collective, Echo Remnants, and new unnamed polities are the bridges between solar-system and interstellar eras.
- **Colonial ships:** Like current colony buildings but much slower to arrive. 10-year interstellar transits.
- **Interstellar markets:** Commodities unique to specific star systems. Arbitrage opportunities with long-horizon risk.

## Implementation roadmap

Graduate the above into the game over discrete phases. Each phase is self-contained and shippable.

### Phase I — Ship & building stats (1 week)

**What:** Extend ShipDefinition and BuildingDefinition interfaces with the new stat fields. Populate defaults for existing definitions. Surface in tooltips. Don't yet wire all stats into the engine — just make them declarable.

**Shipped in this session (partial):**
- ShipDefinition + BuildingDefinition interface extensions with TODO markers
- Tooltip updates showing new stats

### Phase II — Hazard system v1 (1-2 weeks)

**What:** Implement 2-3 hazard types (solar storm, micrometeorite strike, NPC pirate raid). Each triggers on conditions, applies damage to ships/buildings, respects shielding/pointDefense mitigations. Add insurance as a money-sink and protection mechanism.

### Phase III — Crew specializations (1 week)

**What:** Add 4 new crew types (pilots, negotiators, security, medics). Add morale, fatigue, trainingLevel global modifiers. Wire payroll scaling to trainingLevel.

### Phase IV — Module system (2 weeks)

**What:** Implement ModuleDefinition. Add hardpoint slots to existing ShipDefinition. Modules manufactured at buildings. Add a Module Inventory and Fit Screen panel to the Fleet UI.

### Phase V — Market depth (1 week)

**What:** Implement bid-ask spread, commodity volatility as visible stats, futures contracts as new `FuturesContract` model, short-selling as a position type.

### Phase VI — Corporate governance (2-3 weeks)

**What:** Shared corporate wallets, roles & permissions, board elections, dividend distribution.

### Phase VII — Exploration & discovery (1-2 weeks)

**What:** Anomaly generation at survey-probe targets. Claim stake system. Discovery database per corporation.

### Phase VIII — Interstellar era (4+ weeks, end-game)

**What:** Jump drive research, exotic fuel, signal lag, colonial ships, first-contact events.

## Stat caps and diminishing returns — design principles

All new numeric stats must follow these rules:

**Building-level caps:**
- No individual building stat >50% above category baseline unless tier 4+.
- Upgrade levels: each level +10% magnitude; max level 5.

**Ship-level caps:**
- Cargo +200% from modules max.
- Speed +40% from modules max.
- Shielding cap at 90% absorption.

**Corporation-level caps:**
- Aggregate research bonuses capped at 50% (existing).
- Crew morale min 0.2, max 1.2 (bonus beyond full morale).
- Power/life-support/storage > 100% capacity triggers diminishing-returns penalty (enables bursts but not permanent over-utilization).

**Stacking formulas:**
- Additive within a category (all shield modules stack)
- Multiplicative across categories (shield × trainingLevel × research)
- Diminishing returns for same-kind stacking beyond 3× (Nth shield module at 0.95^N effective, per Wave 5 commander pattern)

## Balance-testing protocol

Whenever a new stat is introduced, it must pass:

1. **Unit tests** covering boundary values and cap enforcement.
2. **Balance simulation** — run `scripts/balance-archetypes.ts` to confirm no archetype becomes dominant.
3. **Scale sim** — 100-month, 100-building playthroughs to find runaway growth or deadlock conditions.
4. **Manual playthrough** — 30 minutes of real play with the new system.

Documented in BALANCE.md; tested in `__tests__/`.

## What's already aligned

The following earlier work is consistent with this design:

- **Wave 1 market saturation:** already implements the "service saturation at high counts" principle generically.
- **Wave 2 corporate overhead:** models the "larger corps pay ops complexity" principle at the corporation level.
- **Wave 3 exec compensation:** wealth-based drag, supports the "infinite wealth hoarding is impossible" principle.
- **Wave 4 broker fee:** market friction, consistent with bid-ask spread concept.
- **Wave 5 commander stacking cap:** the 0.88^n diminishing-returns pattern referenced above.
- **Per-research custom effects (option C):** foundation for extending effect types.

## Open design questions

1. **How much of the complexity budget should be spent on hazards vs exploration vs market depth?** Current guess: hazards 30% / exploration 25% / market depth 25% / corporate 20%.
2. **Should player-to-player hazard triggering be allowed?** (e.g. players secretly contracting pirate NPCs to raid rivals.) Leans yes — it's economic warfare via intermediary, not direct combat.
3. **Crew morale as HR game vs abstraction?** Lean abstraction — a single morale number per corporation, affected by summarized inputs.
4. **Insurance underwriting by players?** Yes for economic depth; complex but fits the "economic warfare" thesis.

Open questions should be resolved by product team, not engineering. Default conservatively.

---

## Appendix — Stat summary table

Every stat added across all sections, sorted by owning entity.

### Ship stats (27 total, 9 existing + 18 new)

| Stat | Type | Range | Affects |
|---|---|---|---|
| cargoCapacity | number | 0-10,000 m³ | Cargo revenue, mining storage |
| miningRate | number | 0-100 units/min | Mining income |
| miningTargets | string[] | — | What the ship can mine |
| sublightSpeed | number | 1,000-50,000 m/s | Intra-location times |
| warpFactor | number | 0.1-5.0× | Interplanetary times |
| fuelCapacity | number | 50-10,000 | Range |
| fuelBurnRate | number | 0.5-20 /hr | Operating cost |
| deltaVBudget | number | 5,000-30,000 m/s | Total range |
| crewRequired | number | 0-50 | Activation gate |
| crewCapacity | number | 0-500 | Bonus when staffed above required |
| lifeSupportDays | number | 1-365 | Max autonomous mission length |
| hullIntegrity | number | 100-10,000 | Hazard HP |
| shieldingRating | number | 0-0.9 | Hazard mitigation |
| pointDefenseRating | number | 0-1 | Pirate raid mitigation |
| surveyRange | number | 1-50 AU | Survey capability |
| surveyAccuracy | number | 0-1 | Survey result quality |
| stealthSignature | number | 0.1-2.0 | Detection probability |
| mtbfHours | number | 100-10,000 | Failure frequency |
| maintenanceCostPerMonth | number | — | Ongoing cost |
| insurancePremium | number | — | Monthly insurance cost |
| insuredValue | number | — | Payout on loss |
| moduleSlots | number | 0-12 | Customization depth |
| hardpointTypes | string[] | — | Module compatibility |

### Building stats (22 total, 10 existing + 12 new)

| Stat | Range | Affects |
|---|---|---|
| dockingCapacity | 0-20 | Fleet throughput |
| storageCapacity | 0-100,000 m³ | Warehousing |
| manufacturingThroughput | 0-100 /month | Module production rate |
| refiningThroughput | 0-1,000 units/month | Raw ore processing |
| marketLiquidityContribution | 0-1,000 | Market stabilization |
| serviceQualityMultiplier | 0.5-2.0× | Revenue per service |
| customerCapacity | 0-100,000 | Service ceiling |
| uplinkBandwidth | 0-10,000 Gbps | Data-service throughput |
| crewQuarters | 0-500 | Crew housing |
| crewMoraleModifier | 0-1 | Contribution to global morale |
| structuralIntegrity | 100-10,000 | Disaster HP |
| shieldingRating | 0-0.9 | Storm/radiation mitigation |
| stabilityRating | 0-1 | Location-specific resilience |
| synergyTags | string[] | Co-location bonuses |
| synergyRange | enum | Bonus radius |
| maxUpgradeLevel | 1-5 | Per-instance upgrade ceiling |

### Crew stats (11 total, 4 existing + 7 new)

| Stat | Range | Affects |
|---|---|---|
| pilots | 0-1,000 | Ship crewRequired total |
| negotiators | 0-100 | Contract bid success |
| security | 0-500 | Pirate raid mitigation |
| medics | 0-200 | Crew-loss mitigation |
| morale | 0-1.2 | Global output multiplier |
| fatigue | 0-1 | Penalty during long missions |
| trainingLevel | 0-1 | Effectiveness multiplier |
| trainingBudgetPerCrew | $0-100,000/mo | Training speed |

### Research stats (13 total, 10 existing + 3 new)

| Stat | Type | Affects |
|---|---|---|
| effects | ResearchEffect[] | Concrete magnitude per stat |
| scientistsRequired | number | Research throughput |
| labQualityRequired | number | Gating at specific labs |
| classified | boolean | Security gate |
| prototypeReliability | 0-1 | Success chance |
| failureCostMultiplier | 0-1 | Wasted cost on failure |
| obsoletedAtTier | 1-5 | Relevance window |

### Module stats (new entity, 9 stats)

| Stat | Range | Affects |
|---|---|---|
| hardpointType | enum | Which slot it fits |
| rarity | 5 levels | Drop rate, power |
| tier | 1-5 | Absolute power |
| baseCost | $ | Manufacturing cost |
| manufacturingInputs | Record | Resources to craft |
| effects | ModuleEffect[] | Stat mods |
| compatibleShipRoles | enum[] | Restriction |
| compatibleBuildingCategories | enum[] | Restriction |
| weight | number | Affects ship speed/fuel |
| powerDraw | number | Affects ship power balance |
