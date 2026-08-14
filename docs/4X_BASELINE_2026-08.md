# Space Tycoon — 4X Baseline & Upgrade Plan (Stellaris / Master of Orion 2)

**Date:** 2026-08-13 · **Author:** lead game design
**Founder mandate:** *"Baseline our game against Stellaris and Master of Orion 2. Bring our game up to the graphical quality of those games and make it as feature complete. But: based in our solar system (and nearby systems once interstellar), on HARD SCIENCE — realistic researches, scientific missions and developments. Go crazy in meeting our design goals."*

**Scope of this document:** (1) a canonical 4X feature taxonomy scored against what Space Tycoon has today, (2) the hard-science content spec that closes the content gaps (Research Tree 2.0, Scientific Missions, Event Chains, Leaders 2.0), (3) an honest graphics baseline plan, (4) ordered execution waves. No code was changed for this document.

**Ground truth used:** `docs/GAME_SYSTEMS_AUDIT_2026-08.md` and its waves A–F, all landed 2026-08-13 (`d20e311e` one-wallet economy → `48d9edeb` every-bonus-real + world-visible → `a8ea0844` real risk/honest markets/active sinks → `ecf5f172` consolidation, 28 tabs, AUDIT SPEC COMPLETE); full engine inventory of `src/lib/game/` (81 modules, ~29.6k LOC); component inventory of `src/components/game/`; `public/game/` (377 WebP); `docs/{LORE,BALANCE,SESSION_DESIGN,STATS_DESIGN,POLICY,NPC_BACKDROP}.md`.

---

## 0. Framing — what "Stellaris/MoO2 parity" means here

Stellaris and MoO2 are the genre's benchmarks for **content density** (anomalies, event chains, techs, leaders), **presentation** (a living map, art per subject, music), and **decision texture** (research choices, leader builds, diplomacy). Space Tycoon is *not* trying to be a galactic war game — CLAUDE.md's invariants forbid PvP combat and pay-to-win, and mandate the economic-warfare core, NPC backdrop, time-loop tempo, command-center GUI, accessibility, and mobile parity. So parity means:

- **Match their content density and presentation quality**, translated into hard science and economics.
- **Military features translate, never port.** Stellaris war → economic/regulatory/space-race competition. MoO2 ship combat → hazard survival, insurance, logistics under risk.
- **Our differentiator is realism.** Stellaris invents anomalies; we have Europa's real ocean, real lava tubes, real 'Oumuamua-class visitors, real delta-v budgets (already in `src/lib/game/solar-system.ts` — accurate to a few percent of the standard LEO Δv map). Lean into it: the game where the science is true.

**Where we already win** (do not rebuild): the economy. A FIFO order book with escrow, shared spot prices, mean-reversion cron, mining/NPC price pressure, futures with price bands, insurance, active sinks — Stellaris's static market and MoO2's freighters don't come close. Post-waves A–F this layer is real and server-authoritative (`server-ledger.ts`, `market-pressure.ts`, `price-band.ts`, hourly `market/mean-revert` cron at `src/lib/cron-scheduler.ts:138`).

**Where we lose today:** narrative content (4 player choices in the whole game), leader depth (no levels/traits), research *authoring* (254 techs whose effects are inferred from flavor text by a keyword parser), and presentation (2D canvas map, no music, no event art, no planet renders).

---

# PART 1 — BASELINE MATRIX

Gap legend: **NONE** (at or above benchmark) · **PARTIAL** (system exists, depth missing) · **MAJOR** (benchmark feature effectively absent).

## 1.1 Exploration — survey, anomalies, first contact

| | Detail |
|---|---|
| **Stellaris** | Science ships survey every body; leveled anomalies researched by an attached scientist; multi-stage archaeology digsites with dice-roll chapters; first-contact protocol chains; precursor storylines spanning the whole game. |
| **MoO2** | Scout-based exploration, planet "specials" (splinter colonies, artifacts, Orion), random beneficial/hostile discoveries. |
| **Space Tycoon today** | Two *parallel, unmerged* discovery systems: `ships.ts:210` `rollSurveyDiscovery` (~25 hand-authored location discoveries — "Mascon Anomaly", "Platinum-Core Asteroid", "Interstellar Object" $1B) and `exploration.ts` anomaly/claim-stake system (7 kinds, 30-day fade, 1-year claims, weights at `exploration.ts:96`; self-documented dead ends at `:210-212` — `unlocksResearchId`/`moduleId` displayed but not applied, `precursor_studies` is a dangling research id). Interstellar expeditions (`expeditions.ts`, 1,167 lines) are genuinely good: 5 real star systems at real distances, 4 phases, deterministic transit hazards, survey-data payouts. First-contact dossiers exist for Proxima (Echo Remnants) and Wolf 359 (Hive). |
| **Gap** | **PARTIAL.** The bones are here and hard-sci-flavored; missing: unified framework, multi-stage investigations (the digsite loop), scientist attachment, discovery→research→mission feedback. |
| **Hard-science translation** | Anomalies = *real scientific discoveries*: subsurface-ocean biosignature chemistry at Europa/Enceladus, lunar lava tubes (real: Marius Hills pit), Mars recurring slope lineae, mascons, ISO flybys ('Oumuamua/Borisov-class), amino-acid chirality in asteroid samples, He-3 concentration gradients. Digsites = **multi-phase scientific investigations** (Part 2b/2c): each phase needs an instrument, a leader, and time; results roll on published probabilities. Precursor storyline = the Echo Remnants' precursor-artifact arc already seeded in `LORE.md` (Triton Archive, 2149 breach) and `exploration.ts` (`ancient_artifact` → the dangling `precursor_studies`). |

## 1.2 Research — tree size, structure, rare techs, repeatables

| | Detail |
|---|---|
| **Stellaris** | ~400+ techs in 3 areas; semi-random 3-card draw (drafting tension); rare (purple) and dangerous (red) techs; endless repeatables; scientist expertise skews draws. |
| **MoO2** | 8 fields × ~25 tiers; **pick ONE tech per tier** unless Creative — the hardest research decision in the genre; techs discarded forever. |
| **Space Tycoon today** | **254 techs** (header at `research-tree.ts:2` wrongly claims "300+ across 20 categories" — actual 254 across 17), 5 tiers (10 min → 12 h real time, resource-gated from T3), true DAG with cross-category joins, ~40 roots. **~55–60% of the tree is real flown-or-in-engineering technology** (Raptor-class FFSC methalox, Hall thrusters, MOXIE-style ISRU, Whipple shields, DART-style deflection, JWST-class IR astronomy) — unusually well-grounded for the genre. Fantasy is quarantined at tier 5 and lore-licensed by the 2147 Breakthrough. **But effects are not authored:** zero techs use the supported `def.effects` field (comment at `research-tree.ts:372`); everything resolves through `inferEffectsFromFlavor()` (`:404`) — an 8-bucket keyword parser with a 30% per-effect cap — so flavor text systematically over-promises ("5x mining revenue" resolves to +30%; `getResearchMechanicalEffect()` at `:553` exists purely to display the truth next to the lie). No repeatables, no rare techs, one mechanic unlock in the whole tree (`parallel_research` → `research_queue_2`). |
| **Gap** | **PARTIAL** — size is already in the 150–250 target band; the gaps are *authoring honesty*, *choice structure* (nothing like MoO2's pick-one tension), *rare/repeatable techs*, and ~12 physics-violating entries. |
| **Hard-science translation** | Part 2a. Effects hand-authored per tech; MoO2's pick-one → **mutually exclusive engineering doctrines** (NTR-first vs NEP-first, silicon vs neuromorphic — real agencies make exactly these bets); Stellaris rare techs → **breakthrough techs unlocked only by mission discoveries** (you cannot research Europan biochemistry without an ocean sample); repeatables → bounded **process-improvement programs** (launch cadence, yield learning curves — real industrial learning). |

## 1.3 Economy — resources, pops, buildings

| | Detail |
|---|---|
| **Stellaris** | Pops with jobs/strata/habitability; districts + buildings; energy/minerals/alloys/consumer goods + strategic resources; internal market with drifting prices; trade routes with piracy. |
| **MoO2** | Colonists as farmer/worker/scientist sliders; per-colony buildings; freighter fleets; morale and taxes. |
| **Space Tycoon today** | 14 commodities (11 real substances with correct sourcing — Titan methane/ethane, lunar He-3, asteroid PGMs; `resources.ts`), 48 buildings across 8 categories (`buildings.ts` — Lunar Gateway is the real NASA program name; Europa Ice Drill, Titan Hydrocarbon Harvester are the correct resource propositions), **36 services that read like an actual space-economy market map** (`services.ts` — launch, EO, broadband, mission ops, debris removal, propellant brokerage, insurance underwriting), 12-recipe 4-tier production chains with correct chemistry (`production-chains.ts` — water electrolysis → propellant), 8 workforce types with morale/fatigue/training now live (waves A10/B, `workforce.ts:251-299`), saturation/overhead/exec-comp/broker-fee sink stack (`docs/BALANCE.md`), server order book + futures + hazard/insurance risk economy. |
| **Gap** | **NONE at the market layer — we exceed both benchmarks.** PARTIAL at the *spatial* layer: per-location inventories and cargo logistics are still unbuilt (audit C1 — `deltaVFromLEO` is stored on all 25 locations and consumed by nothing; ships transport nothing), and "pops" have no depth (workforce is global, not per-habitat). |
| **Hard-science translation** | Pops → **workforce classes + habitat capacity**: crew live somewhere real (habitat buildings set crew capacity per location; life-support research raises it). Stellaris habitability → radiation/gravity/logistics burden per body (data already in `solar-system.ts`). Freighters → audit item C1 (cargo deducts at origin, fuel charged against real Δv). This is the one economy feature this plan re-affirms from the audit rather than adds. |

## 1.4 Leaders — scientists, governors, traits, levels

| | Detail |
|---|---|
| **Stellaris** | Leaders (scientist/governor/admiral) with levels 1–10, positive+negative traits gained on level-up, council seats, veteran classes, destiny traits. |
| **MoO2** | Its most-loved system: named hireable leaders with skills (Megawealth, Researcher, Telepath…), levels from experience, ship vs colony assignment. |
| **Space Tycoon today** | 60 commanders (`commanders.ts`), 6 classes each mapping to exactly one bonus, 5 rarities setting flat magnitude (2%→20%), 8-hour deterministic shared hire pool, tier-capped roster, 0.88^n same-class stacking (BALANCE wave 5). **No levels, no XP, no traits, no assignment** — header self-describes as MVP (`commanders.ts:2`). 14 legendaries are genuinely lore-integrated named NPCs (Aria Solaris, Warchief Kraal, The Nomad, Zero). Tone bug: many common/uncommon names are combat-flavored asset-pack holdovers ("Gunner Holt", "Warlord Titan", "Siege Volkov") in a game with no combat. |
| **Gap** | **MAJOR** — this is MoO2's crown jewel and our flattest system. |
| **Hard-science translation** | Part 2d. Leaders = **named scientists, engineers, flight directors, and program managers with real specialties** — astrobiologist, propulsion engineer, planetary geologist, radiation physiologist, mission designer. XP from *assignment* (to research categories, science programs, expeditions). Traits are specialties, not superpowers. |

## 1.5 Narrative — event chains, situations, archaeology

| | Detail |
|---|---|
| **Stellaris** | Hundreds of multi-stage event chains; **situations** (progress-bar crises with approach choices — deficit spirals, revolts); archaeology; galaxy-wide midgame/endgame crises. |
| **MoO2** | Light random events (rebellion, plague, donation) — the weakest part of MoO2; Stellaris is the real bar. |
| **Space Tycoon today** | Four disconnected event systems with **zero shared vocabulary**: `random-events.ts` (13 one-shots, the only 4 player choices in the game, all binary; one is a free-money bug — `emergency_contract` accept branch *adds* $150M at `random-events.ts` despite the label saying it costs $150M), `timed-events.ts` (21 goal-chases, no narrative), `seasonal-events.ts` (693 lines, 9-phase lifecycle, brackets, season pass — **still an empty shell**, no cron instantiates rows; audit C4 unclosed), `weekly-events.ts` (6 rotating challenges). No chains, no situations, no persistent narrative state. Lore is rich but inert: `LORE.md` has 90 years of dated history (Callisto Incident 2086, Great Silence 2103, Ring Fire 2137, Europa Contact failure 2119) that no event references. |
| **Gap** | **MAJOR** — the single largest content gap versus Stellaris. |
| **Hard-science translation** | Part 2c: 40+ hard-sci narrative chains — real solar-storm classes (M/X/Carrington), ISO flyby campaigns, biosignature-replication debates, contamination scares, Accord regulatory fights, superconductor replication crises. Situations = **slow-burn corporate crises**: reserve shortfall, crew-health syndrome, regulatory inquiry — progress bars with approach choices, exactly the Stellaris situation mechanic re-skinned to a 22nd-century corporation. |

## 1.6 Diplomacy — treaties, federations, espionage

| | Detail |
|---|---|
| **Stellaris** | Treaties, federations with laws, the Galactic Community (senate resolutions with real mechanical bite), envoys, espionage operations, vassal contracts. |
| **MoO2** | Bilateral treaties, tech trading, GNN gossip, spies stealing tech/sabotaging. |
| **Space Tycoon today** | Player alliances are federation-grade already (shared treasury/research/projects/diplomacy/wars, bonuses piped through post-wave A2). Six NPC factions with reputation, standings, and envoys (`factions.ts:148` — pay-for-rep only; header admits rep "currently does nothing mechanically" beyond delivery-contract weighting/payout multipliers in `delivery-contracts.ts`). Espionage is economic-only, server-enforced, with intel perks now real (wave B) — invariant-compliant by construction. Public diplomacy feed exists as data (activity feed, wave C). Accord of 2089 + Spacefaring Commerce Court exist in lore only. |
| **Gap** | **PARTIAL.** Player-side diplomacy is fine; NPC-faction diplomacy is thin (one lever), and there is no Galactic-Community analog. |
| **Hard-science translation** | The **Accord Council** is our senate: quarterly resolutions (debris-mitigation standards, nuclear-launch licensing, planetary-protection categories, He-3 export rules) that players lobby on with faction standing and money, with real mechanical effects (cost/permission changes) — economic-regulatory competition, never combat. Faction standing gains STATS_DESIGN §12's price/access effects (Allied −15% / Hostile +25% or locked). Tech trading → **licensing deals** (pay a faction for a completed tech at premium — already sketched as dead code in `economic-systems.ts`). |

## 1.7 Internal politics — factions, edicts, policies

| | Detail |
|---|---|
| **Stellaris** | Pop factions with demands and approval; edicts (upkeep toggles); policy stances; civics/government reform; council agendas. |
| **MoO2** | Government types with global modifiers (Democracy research bonus, Unification food…). |
| **Space Tycoon today** | Effectively absent. Starting archetypes diverge the opening (`archetypes.ts`); specializations are doctrine-ish purchases (wired in wave B); corporation tiers gate the UI. No policies, no edicts, no internal constituencies. Workforce morale (now live) is the seed of an internal-politics loop but has no voice. |
| **Gap** | **MAJOR** (lowest-priority major — our "empire" is a corporation, so the translation must be corporate, not civic). |
| **Hard-science translation** | **Corporate doctrine & board politics.** Policies = corporate stances with real trade-offs (Safety Culture: −hazard damage +build time; Aggressive Schedule: inverse; Open Science: +research speed, publishes your discoveries into rivals' feeds; Proprietary: inverse). Edicts = **board directives** with monthly upkeep (Overtime Authorization, Exploration Charter). Pop factions = **workforce constituencies** (engineers' guild, science staff, belt miners' union — Iron Mara's Belt Miners' Guild is already in LORE.md with 200k members) whose approval feeds the existing morale writer (`workforce.ts:251-299`) instead of a new stat. |

## 1.8 Victory paths

| | Detail |
|---|---|
| **Stellaris** | Weak: score at end-date, conquest, federation win. |
| **MoO2** | Conquest, Antaran homeworld assault, elected Supreme Leader. |
| **Space Tycoon today** | **11 victories** (`victory-conditions.ts:130`): 6 multi-axis stat victories (Economic Dominion, Scientific Transcendence, Solar Cartographer, Industrial Titan, Fleet Admiral, Terraformer), 4 megastructure victories (Dyson Lord, Interstellar Pioneer, Space Elevator Tycoon, Architect of Worlds), 1 completionist meta (Hegemon). Bonuses wired into the engine since wave A3 (`game-engine.ts:135,:1166`). |
| **Gap** | **NONE — we beat both benchmarks.** Addition, not fix: no victory currently honors *science-first* play. |
| **Hard-science translation** | Add one victory in the missions wave: **"Laureate"** — complete N flagship science programs, confirm one biosignature-class discovery, and hold peak science reputation. Space-race *firsts* (first Europa ocean entry, first ISO intercept) already have the global first-claim milestone race mechanic to build on (`milestones` route, DB unique index). |

## 1.9 Presentation — map, art, UI, music, ambient

| | Detail |
|---|---|
| **Stellaris** | Its real moat: a living animated galaxy map (nebulae, orbiting planets, ship trails), unique art per planet class/species, event illustrations for every chain, an adaptive orchestral score, satisfying UI audio. |
| **MoO2** | 1996 benchmark: painted planet screens, leader portraits, animated buildings — per-subject art identity. |
| **Space Tycoon today** | A polished **2D** canvas map (`SolarSystemCanvas.tsx`, 1,141 lines: parallax starfield, lane pulses, bezier ship transits, circle-clipped planet sprites with fake limb darkening, hazard rings; keyboard location list for a11y; reduced-motion support) — good craft, but flat and non-physical (hand-placed normalized layout, zoom stretches x only, no orbital motion). DOM-based galactic layer (`GalacticMapView.tsx`). Strong HUD design system (`GameStyles.tsx`, 895 lines: hud-frame corner brackets, scanlines, holo-sweep, ~28 keyframes, Orbitron/JetBrains Mono). Region ambient audio is genuinely sophisticated (`sound-engine.ts`: 23 per-location synthesized drone/pad/noise profiles with 2 s adaptive glides) — **but there is zero music and zero recorded audio in the entire product** (verified: no mp3/ogg/wav anywhere). 377 WebP at 1536×1536 (79 MB): 60 commander portraits, 123 building tiers, 40 badges — but **no event illustrations, no scientist art, no usable planet sphere maps** (all squares, not equirectangular; the site's 3D page declares `/textures/*.jpg` paths that 404 — `public/textures/` does not exist, so its planets silently render untextured). 47 orphaned files (15 astraeus-*, 32 combat hulls). |
| **Gap** | **MAJOR** — the mandate's headline. Detailed plan in Part 3. |
| **Hard-science translation** | Our art direction *is* the realism: real NASA-quality planet textures, real orbital mechanics on the map, mission-patch iconography, instrument renders, event art that looks like mission imagery — not fantasy nebula soup. |

### Matrix summary

| Axis | Gap | Priority |
|---|---|---|
| Economy / markets | NONE | maintain (finish audit C1 cargo) |
| Victory | NONE | +1 science victory |
| Research | PARTIAL | **P1** — authoring honesty + choice structure |
| Exploration | PARTIAL | **P1** — unify + investigations |
| Diplomacy | PARTIAL | P2 — Accord Council + faction bite |
| Narrative | MAJOR | **P1** — chains + situations |
| Leaders | MAJOR | **P1** — levels/traits/assignment |
| Internal politics | MAJOR | P3 — corporate doctrine |
| Presentation | MAJOR | **P1** — Part 3 |

---

# PART 2 — HARD-SCIENCE CONTENT SPEC

## 2a. Research Tree 2.0

**Position:** the tree is already the right *size* (254 vs the 150–250 target) and unusually realistic (~55–60% real). Do not rebuild it. The work is five surgical operations:

### Op 1 — Author every effect (kill the inference parser)
Populate `def.effects` (the supported-but-unused field, `research-tree.ts:372`) on all 254 techs so `resolveEffects()` tier-1 path always hits. Rules:
- Effect magnitudes must be **truthful to the displayed flavor** or the flavor is rewritten (no more "5x mining revenue" resolving to +30%). Keep `PER_EFFECT_CAP` and the global caps (`:533-540`) — BALANCE.md's 50% aggregate research cap is binding — and write flavor *to* the caps.
- Existing 6 effect buckets stay; add the STATS_DESIGN §5 expansion set where waves A–F created real consumers: `launchCostReduction` (build-cost at launch-pad-dependent buildings), `travelSpeed` (dispatch ETAs are real, wave F), `fuelEfficiency` (consumed when C1 lands), `hazardResistance` (hazards.ts mitigation is real), `insuranceDiscount` (premium sink is real), `crewMorale` (morale writer is real), `expeditionRisk` (expeditions.ts danger multipliers). Every one of these hooks exists in the engine today — no new engine work to make an authored effect *do* something.
- Fix documentation drift while in the file: header count (254/17), section-banner sums, `astraeus_tech` id → `aerostat_technology`.

### Op 2 — Re-anchor the ~12 physics-violating techs
| Tech | Problem | Action |
|---|---|---|
| `em_drive_research` (T4, $5B) | Reactionless drive; debunked as thermal artifact | **REPLACE** → `photon_sail_station_keeping` — "Radiation-pressure trim for GEO assets" (real, flown: IKAROS). Same slot/effect. |
| `metallic_hydrogen` (T5) | Metastability unestablished | **KEEP, re-label speculative** — description gains "theoretical; metastability unproven". T5 is the licensed speculation band. |
| `antimatter_propulsion` / `antimatter_reactor` | Production energetics absurd | **KEEP at T5** as the lore-era bridge, but re-anchor description to "Penning-trap μg-scale production scaled by the 2147 industrial base" — explicitly lore-tech. |
| `jump_drive`, `exotic_matter_refining` | Alcubierre; negative energy | **KEEP** — the game's one licensed miracle, anchored to LORE.md's 2147 Breakthrough. Everything interstellar hangs on it; quarantine is working as designed. |
| `superconductors` (RT) | Never replicated | **KEEP at T4** but pair with the LK-99-style replication-crisis event chain (2c #31) — the tech completes *through* the narrative. |
| `fission_fragment` | Real concept; ISP claim 10× optimistic | **FIX NUMBER**: "ISP > 100,000 s" — still 0.02c-class, still a capstone. |
| `self_replicating_miners`, `programmable_matter`, `mars_warming`, `magnetic_shield`, `crew_augmentation` | Speculative-but-permitted | KEEP at T5; add one-line "state of the science" honesty note to each description (pattern: what's real today / what the tech assumes). |
| Combat-flavored dead assets | 42 combat hulls, `astraeus-*` art | Delete (Part 3 asset wave — long-standing backlog item). |

### Op 3 — Branch spines (rename categories to real domains, add ~20 NEW techs)
The 17 categories survive but each gets an explicit **spine** — the canonical real-world progression — so the tree reads as an aerospace roadmap. New techs marked ★ (net +~20, final tree ~275):

**Propulsion (chemical → NTR → NEP → fusion → beamed):**
`methane_engines` → `nuclear_thermal` (NERVA/DRACO) → `nuclear_electric` → {doctrine gate, Op 4} → `vasimr`/`mpd_thruster` → `fusion_drive` → `fission_fragment` → `laser_propulsion` (Breakthrough-Starshot beamed) → T5 lore band. ★`bimodal_ntr` ("NTR that doubles as electrical power source — real NASA concept, bridges NTR and NEP doctrines"), ★`magnetoplasma_aerocapture` ("plasma drag modulation for outer-planet capture").

**ISRU & Materials:** `isru_water` → `isru_oxygen` (MOXIE) → `regolith_processing` → `lunar_concrete` → ★`carbothermal_reduction` ("O₂+metals from regolith at scale — real ESA/NASA pilot lines"), ★`asteroid_volatile_capture` ("bag-and-bake volatile extraction — ARM heritage"), `zero_g_refining` → `carbon_nanotubes` → `graphene_production` → T5 `programmable_matter`.

**Life support & closed ecosystems (currently scattered — becomes its own spine inside `crew`):** `closed_loop_life_support` (95% ISS-class) → `bioregenerative_lss` (MELiSSA-class) → `space_agriculture` → ★`closed_ecosystem_1.0` ("full material closure at crew scale — Biosphere-2's unfinished business"; unlocks colony pop-cap growth, consuming the existing `COLONY_UPGRADE_POP_THRESHOLD` gate in `expeditions.ts`), ★`artificial_photosynthesis` ("direct CO₂→O₂/fuel electrochemistry").

**Robotics & autonomy:** `rover_autonomy` → `edge_ai` → `predictive_maintenance` → `digital_twin` → ★`dexterous_telerobotics` ("time-delay-tolerant manipulation; enables un-crewed station maintenance — cuts crewRequired"), ★`autonomous_science` ("onboard hypothesis-driven targeting — AEGIS heritage; +survey accuracy"), `swarm_intelligence` → T5 `self_replicating_miners`.

**Power (solar → fission → fusion):** `triple_junction` → `perovskite_tandem` → `fission_surface_power` (Kilopower) → `nuclear_power_spacecraft` → ★`brayton_conversion` ("closed-cycle turbine conversion for space reactors — the real efficiency unlock"), `fusion_reactor` → `space_based_solar_power` → `beamed_power`.

**Comms & navigation (laser/DSN/quantum):** `inter_satellite_links` → ★`optical_deep_space_comms` ("DSOC-heritage laser links — ×100 bandwidth at Mars range; +datacenter/relay revenue"), ★`delay_tolerant_networking` ("store-and-forward interplanetary internet — real BPv7 protocol"), ★`pulsar_navigation` ("XNAV autonomous deep-space positioning — cuts DSN dependence, +ship autonomy"), `quantum_sensors` → ★`quantum_key_distribution` ("space QKD — Micius heritage; +espionage defense", feeds the real counter-intel perk from wave B).

**Medicine in microgravity:** `space_medicine` → `zero_g_fitness` → ★`sans_countermeasures` ("Spaceflight-Associated Neuro-ocular Syndrome mitigation — real, afflicts majority of long-duration crew; +crew survival, −medic requirement"), ★`radiation_epidemiology` ("dose-model refinement; raises safe deep-space crew-months, −insurance premium for crewed assets"), ★`surgical_autonomy` ("remote/autonomous surgery for >light-minutes range — enables outer-system crewed ops"), `cryo_hibernation` (T5, re-labeled "torpor protocols").

**Planetary science instruments (the missions enabler — mostly exists, add):** `subsurface_radar` → `hyperspectral` → `magnetometer_array` → `neutrino_detector` → ★`mass_spectrometry_suite` ("in-situ isotopic analysis — the biosignature workhorse; REQUIRED for ocean-probe missions"), ★`cryobot_melt_probe` ("nuclear melt probe for ice-shell penetration — Europa access tech"), ★`quadrupole_seismometry` ("InSight-heritage seismic network; planetary interior data"), `gravitational_wave_det` (LISA).

**Astrobiology & planetary protection ★NEW mini-branch (5 techs, inside `exploration`):** ★`planetary_protection_protocols` ("COSPAR category compliance — unlocks Class IV mission licenses, −Accord event risk"), ★`biosignature_analysis` ("agnostic life-detection chemistry — chirality, isotope ratios"), ★`sample_containment` ("BSL-4-class receiving facility — required for restricted sample return"), ★`extremophile_biology` ("survivability envelopes of Earth life — contamination modeling"), ★`xenobiochemistry` (T5, **rare tech** — see Op 5; unlocked only by a confirmed biosignature discovery; consumes the dangling `precursor_studies` slot pattern and finally gives `xenogenic_biomatter` a research anchor).

### Op 4 — Doctrine choices (the MoO2 tension, without permanence cruelty)
Three **mutually exclusive doctrine pairs** at T3/T4 — picking one locks the sibling for a real cost to unlock later (2× price + 6-month retooling), not forever (roguelike permanence fights the MMO's long horizon):
1. **NTR-first vs NEP-first** (thrust now vs efficiency forever) — gates which travel-time effects arrive early.
2. **Crewed-forward vs Robotic-forward** (crew unlocks/medicine spine discounts vs autonomy spine discounts; mirrors the real Moon-vs-robots budget fight).
3. **Proprietary vs Open Science** (research speed vs +faction science standing and cheaper licensing) — doubles as the internal-politics seed (1.7).
Engine hook: `prerequisites` already supports arbitrary gating; add a `excludes: string[]` field checked in `canResearch` — S-effort.

### Op 5 — Rare techs + repeatables
- **Rare techs (~8):** flagged `rare: true`, undiscoverable until a specific mission/event grants access (`xenobiochemistry`, `europan_biochemistry`, `iso_materials_analysis`, `precursor_studies` — finally real, Echo Remnants arc, `deep_biosphere_ecology`, `vacuum_metallurgy_breakthrough`, `hive_pattern_mathematics`, `metric_engineering_refinements`). This is Stellaris's purple-tech dopamine wired to *our* discovery systems.
- **Repeatables (~6 bounded programs, 5 levels each):** "Launch Cadence Optimization I–V", "Yield Learning Curve I–V" (manufacturing), "Ops Automation I–V", "Radiation Hardening I–V", "Logistics Research I–V", "Deep Space Network Expansion I–V". Each level +2%, additive inside the existing global caps — repeatables give long-horizon players a research sink **without** breaching BALANCE.md's 50% aggregate cap (they fill toward the cap, never past it). Cost scales ×2.5/level (an active money+resource sink, per BALANCE "far more sinks than sources"). Engine: add `maxLevel`/`level` to the def — the tick already re-derives bonuses every pass.

## 2b. Scientific Missions system

**What it is:** a missions layer *distinct from economic contracts* — flagship science programs with multi-phase timelines, real instruments, and discovery payoffs. Implementation template is the proven `expeditions.ts` engine (phases, deterministic per-month event rolls, insurance/shielding options, catch-up processing) — this is "expeditions, pointed at the solar system, with science instead of cargo as the payload."

**Loop placement (SESSION_DESIGN):** programs are **monthly/quarterly-loop** content — precisely the loop the doc flags as under-served. Phase gates land on the weekly cadence; discovery events fire tactically.

**Core mechanics:**
- **Program lifecycle:** `design → build → launch → cruise → science_ops → data_return/extended_ops`, each phase with real-time duration, money+resource cost, and a required tech + leader assignment (2d). Launch and cruise consume the deterministic hazard seeds (`hazards.ts` mulberry32 pattern) — a launch failure is forecastable-risk, insurable via the existing premium/payout sink.
- **Instrument selection = the meaningful decision.** Each program has 5–7 instrument options, choose 3 (mass budget) — chosen instruments determine which discovery tables the program can roll. A mass spectrometer finds chemistry; radar finds structure; a seismometer finds interiors. No dominant loadout — discovery tables are disjoint.
- **Discovery payoffs**, in escalating rarity: survey-data cash (reuse `SURVEY_DATA_PAYOUT_PER_LY` pattern), long-duration regional mining/revenue buffs (reuse `miningBonus` shape from `ships.ts` — 24–60 month buffs already exist), **rare-tech access grants** (Op 5), **event-chain triggers** (2c), science reputation (+existing `reputation.ts` keys), and global first-claim milestones ("First Europa Ocean Entry" — server milestone race, already built).
- **Public NPC programs:** NPC factions run 1–2 programs concurrently (visible, forecastable — NPC_BACKDROP's own recommendation), and players can **co-fund** an NPC program for a share of the discovery payout — the multiplayer mega-project contribution mechanic (server ledger, wave A) reused at solar scale.

**The 12 flagship programs:**

| # | Program | Real anchor | Phases (game-months) | Key instruments | Signature payoffs |
|---|---|---|---|---|---|
| 1 | **Meridian Observatory** (large-aperture IR/optical space telescope) | JWST/HWO successor | design 6 / build 18 / L2 cruise 3 / ops open-ended | coronagraph, IR spectrometer, astrometry | Exoplanet census → interstellar destination intel (+expedition survey payouts); ISO early detection (+#7 window) |
| 2 | **Europa Clipper II / Ocean Access** | Europa Clipper + cryobot studies; LORE 2119 failed contact | 8 / 24 / 14 / 12 drill+dive | ice-penetrating radar, cryobot, mass spec, submersible | THE biosignature chain (2c #11-15); rare tech `europan_biochemistry`; first-entry milestone |
| 3 | **Enceladus Plume Sampler** | Cassini plume flythroughs / Enceladus Life Finder | 6 / 14 / 30 / 8 | mass spec, nephelometer, sample capture | Free-sample biosignature route (no drilling); contamination-scare chain |
| 4 | **Venus Aerostat Station** | VAMP/HAVOC concepts; real cloud-layer habitability zone | 6 / 12 / 4 / 18 | UV spectrometer, aerosol sampler, radar sounder | Unlocks Venus cloud colony content (`aerostat_technology` finally has a mission); phosphine-debate event |
| 5 | **Mars Deep Drill** | InSight + RSL + real subsurface-brine science | 4 / 10 / 8 / 20 | deep drill string, seismometer net, mass spec | Aquifer discoveries (buff table exists at `ships.ts` mars_surface); deep-biosphere rare tech |
| 6 | **Kinetic Deflection Demonstration** | DART (2022) | 4 / 8 / 10 / 1 impact | impactor bus, observation cubesat, radar | Permanently −asteroid-impact hazard class severity (real consumer: `hazards.ts` location multipliers); Accord goodwill |
| 7 | **ISO Rapid-Response Interceptor** | ESA Comet Interceptor (parked at L2, waits) | 6 / 10 / **wait** / intercept 4 | dust analyzer, camera suite, mass spec | Fires only when an ISO event spawns (2c #21) — the game's tensest launch window; rare tech `iso_materials_analysis` |
| 8 | **Restricted Sample Return** | Mars Sample Return + OSIRIS-REx | 6 / 12 / 16 / 6 quarantine | sample canister, containment facility (needs `sample_containment`) | Highest-variance payoff table; contamination-scare situation if run without full protocols |
| 9 | **Heliophysics Sentinel Constellation** | SOHO/Parker/SWFO lineage | 4 / 10 / 6 / open | coronagraph, magnetometers, L1/L5 sats | **+1 game-month hazard forecast horizon** (extends `forecastSevereHazards` — deterministic seeds make this honest); −solar-storm damage globally |
| 10 | **Titan Rotorcraft Survey** | Dragonfly | 6 / 12 / 34 / 16 | rotorcraft, GC-mass-spec, met station | Prebiotic-chemistry discoveries; Titan hydrocarbon buff table; Nebula Reaver faction interest |
| 11 | **Gravitational Wave Array** | LISA (2035) | 8 / 20 / 6 / open | 3× drag-free sats, laser interferometry | Deep-space sensing bonuses; precursor-signal event hook (Echo Remnants arc) |
| 12 | **Heliopause Probe** | Voyager/Interstellar Probe study | 6 / 12 / 60+ / open | plasma suite, dust detector, RTG (needs `rtg_enhanced`) | The interstellar on-ramp: +expedition survey data, −expedition risk (charts the boundary); Wanderer-1 lore callbacks |

**Engine integration points:** program state lives beside `expeditions` in GameState (same save-migration pattern, V17); ticked in `processFullTick` next to `processExpeditionTick` (`game-engine.ts`); discovery rolls reuse the unified discovery framework (wave 3 below); costs/payouts through the one-wallet ledger where multiplayer (co-funding, first-claim) is involved.

## 2c. Event & anomaly chains — 44 hard-sci narrative events

Unify the four event schemas first (one `GameEvent` type with `chainId`/`stage`, choice arrays, deterministic seeds — the `random-events.ts` choice modal and `EventChoiceModal.tsx` UI already exist). Then ship these chains. Format below: **Chain — stages (choices)**. All effects route through existing wired systems (multipliers, hazards, reputation, market events — market events price into real trades since wave E).

**Space weather (uses real flare classes; integrates `hazards.ts` + Sentinel program #9):**
1–4. **M-class flare** (radio blackout, minor sat revenue dip) → **X-class flare** (choice: safe-mode fleet [lose a month of ship productivity] vs ride it out [hazard roll at +severity]) → **Carrington-class CME** (48h forecast window; choices: emergency shielding spend / insurance top-up / evacuate crews; existing severe-hazard forecast mechanic is the delivery vehicle) → **Aftermath** (debris/repair market surge — buy the dip on repair materials).
5. **Solar radio science windfall** — a well-instrumented storm pays research points (only if Sentinel #9 flies).

**Interstellar objects ('Oumuamua/Borisov class):**
21. **ISO detected** (Meridian #1 raises detection odds) — trajectory published, weeks-scale window.
22. **Intercept decision** — only actionable with Interceptor #7 on station (else the object simply leaves — visible regret is the hook).
23. **Composition result** — rolled: mundane comet (survey cash) / anomalous acceleration (research boost + press cycle) / **exotic composition** (rare tech `iso_materials_analysis`, Hive Collective takes interest — faction rep event).

**Europa biosignature arc (the flagship chain; program #2 required):**
11. **Ambiguous chemistry** — cryobot returns disequilibrium chemistry. Choice: announce now (+reputation, but stake your name) vs replicate first (slower, safer).
12. **Replication attempt** — second descent; deterministic roll weighted by instrument quality + leader traits.
13. **The debate** — NPC scientists (named: Dr. Vale et al.) publicly split; xenogenic_biomatter futures go volatile (market event — real price impact since wave E).
14. **Resolution** — confirmed: rare tech `europan_biochemistry`, permanent science-rep floor, Accord moves to protect Europa (new restrictions — a *cost* of success); refuted: reputation hit if you announced early, partial refund of stake if you replicated first. Both outcomes are content.
15. **Planetary-protection fight** — Accord Council situation: lobbying stances (support restrictions [faction rep +Echo/+Dominion, lose Europa mining access] vs oppose [inverse]).

**Contamination & protocols:**
16. **Quarantine scare** — sample-return canister seal anomaly (program #8 without `sample_containment` tech makes this likely). Situation with approach choices: full BSL-4 hold (delay, cost) / partial release (risk roll) / destroy sample (lose payoff, gain Accord trust).
17. **Forward-contamination violation** — an uncrewed lander broke sterility categories; Accord inquiry situation → fine, license suspension, or successful defense (negotiator workforce + Dominion standing help).

**Accord Council votes (quarterly, the senate loop — each a 2-week lobbying window with faction-weighted outcomes):**
24. **Debris-mitigation standard** (pass: +deorbit costs, −Kessler event risk globally).
25. **Nuclear launch licensing** (pass: NTR/fission techs need license fee; fail: +hazard event class for everyone).
26. **He-3 export framework** (market-structure change: He-3 volatility band shifts).
27. **Planetary-protection categories** (gates which bodies allow extraction vs science-only — real scarcity stakes on Europa/Enceladus).
28. **Crewed-mission duty-of-care** (pass: +medic requirements, −crew hazard mortality).

**Industry & research shocks:**
31. **Room-temperature superconductor claim** (LK-99 pattern) — choice: license early (cost; 30% real / 70% debunked — rolled deterministically per world-month, same for all players) vs wait for replication. Ties to `superconductors` tech completion.
32. **Fusion ignition milestone** — global research-speed window on the power spine.
33. **Pu-238 shortage** — RTG-dependent programs (#12) stall unless you fund production restart (money sink with mission payoff).
34. **Kessler near-miss** — LEO conjunction cascade warning; choices mirror real debris-avoidance economics; outcome shifts vote #24 odds.
35. **Megaconstellation astronomy backlash** — your telecom revenue vs Meridian #1 science output; pick a side, factions notice.

**Crew health (consumes medicine spine + morale writer):**
36. **SANS cluster** — vision syndrome across long-duration crews; mitigate via `sans_countermeasures` or rotate crews (fatigue/morale trade).
37. **Radiation exposure audit** — dose-limit breach found; stand down crews (revenue) or contest (Accord risk).
38. **Epidemic** (LORE: Mars Dust Pandemic 2097 echo) — multi-stage situation: containment / vaccine program (scientist assignment) / evacuation. The one place "kill personnel" stakes (CLAUDE.md hazards) get a narrative face.

**Lore arcs (LORE.md finally load-bearing):**
41. **Great Silence recurrence** — Hive interface stations go dormant; xenogenic_biomatter market freezes (market event); resolution rolls after N months.
42. **Triton Archive follow-up** — Echo Remnants commission investigations (delivery contracts + espionage-flavored intel missions); ends in `precursor_studies` access for participants.
43. **Wanderer-1 data anomaly** — re-analysis of the 2147 probe telemetry; +Proxima expedition intel or a red herring.
44. **Ring Fire anniversary regulations** — Saturn operations safety review; retrofit costs vs standing.

Volume check: 44 events / ~12 chains, versus today's 13 one-shots. Every event names its loop (tactical choice windows inside weekly/monthly chains), every choice moves money, risk, reputation, or access — no cosmetic choices (CLAUDE.md invariant). Also fix in passing: the `emergency_contract` +$150M sign bug (`random-events.ts`).

## 2d. Leaders 2.0

Extend `commanders.ts` (do not replace — the hire pool, rarity economics, and 0.88^n stacking are balanced and tested):

- **Levels 1–5** with XP from *assignment*: each commander can hold one post — a research category (scientist/engineer), a science program (2b), an expedition, a zone (governor), or the market desk (magnate). Assigned leaders earn XP monthly; unassigned earn none. Level grants +1% effective magnitude per level (a level-5 legendary = 25% vs 20%), **inside** existing BALANCE stacking caps — growth fills toward caps, never past.
- **Traits (2 per leader):** one **specialty** (matches a research category, mission type, or hazard class — e.g. *Astrobiologist*: +discovery quality on ocean-world programs; *Flight Director*: −launch-phase failure odds; *Radiation Physiologist*: +crew survival) and one **quirk** with a real cost (*Publicity Hound*: +reputation, leaks program intel to the public feed; *Perfectionist*: +quality −speed; *Union Favorite*: +morale −payroll efficiency). Negative-on-levelup (Stellaris) is dropped — quirks are visible at hire, preserving informed economic choice.
- **New content:** ~20 new **scientist/engineer leaders with real-style specialties** to fill the science posts (portrait wave in Part 3), and rename the ~12 combat-flavored commons ("Gunner Holt" → "Foreman Holt", "Warlord Titan" → "Dockmaster Titan" etc.) — no-combat tone pass. Legendaries stay lore-locked (14 already map to LORE.md named NPCs — keep).
- **Mortality/retirement (optional, campaign loop):** leaders retire after ~2 real-time months of service, granting a permanent small legacy bonus (feeds `legacy-system.ts`, the healthiest progression system per the audit) — generational texture without punishing loss.

---

# PART 3 — GRAPHICS BASELINE PLAN

## 3.1 Honest assessment

Literal Stellaris parity (AAA GPU budget, orchestral score, thousands of art pieces) is not reachable in a browser MMO built by agents. **Structural parity is:** (1) a living, physically-truthful animated map, (2) per-subject visual identity (every planet, instrument, leader, event has *its own* art), (3) cinematic moments at emotional peaks, (4) information-dense-but-beautiful UI (already largely achieved — `GameStyles.tsx` hud-frame system is genuinely good), (5) sound that responds to state. Our edge: hard-science art direction — real planet textures and mission-imagery aesthetics — is *cheaper* to source than fantasy art, because NASA publishes it public-domain.

**Current stack facts that shape the plan:**
- `three` 0.182 + `@react-three/fiber` 8.18 + `@react-three/drei` 9.122 are **already dependencies**, used by `src/components/modules/solar-exploration/` — a reusable `PlanetaryScene.tsx` (Canvas + OrbitControls + drei `Stars` + 3-light rig + Suspense), `PlanetarySphere.tsx` (64-seg sphere, BackSide atmosphere shell trick), a 3D-hover→DOM-tooltip bridge, and the `next/dynamic ssr:false` + skeleton wrapper pattern (`src/app/solar-exploration/page.tsx:24-42`).
- **Bug found:** that page's planet textures 404 silently — `solar-exploration-data.ts` declares `/textures/{mars,moon,titan,venus}_texture.jpg` but `public/textures/` does not exist; planets render as flat color. Fixing this is the first deliverable of the texture wave (it upgrades the *site* too).
- The game map is 2D canvas (`SolarSystemCanvas.tsx`) with real craft: parallax starfield, lane traffic pulses, bezier transits, hazard rings, keyboard location list, reduced-motion support. It must remain as the **fallback/reduced-motion/low-power renderer** — a11y and mobile-parity invariants forbid making WebGL the only path.
- All 377 game images are 1536×1536 **square illustrations** — none are equirectangular, so none can UV-wrap a sphere. Icon-sized uses (28px medals) currently download 100–300 KB files; no size variants exist.
- Asset pipeline exists and is idle: `scripts/generate-art.ts` (Gemini `gemini-2.5-flash-image`, batch manifests, house-style prompt prefix) + `scripts/convert-game-assets.ts` (sharp → WebP, but no resizing/manifest). The `nanobanana` MCP image tools are also available in-session.

## 3.2 WebGL solar map (the centerpiece)

Replace the map tab's renderer with an R3F scene (`ssr:false` dynamic import), keeping `SolarSystemCanvas` as fallback:

- **Layout = truth, readability-compressed.** Heliocentric positions from real orbital elements; radial distance log-scaled (linear scale makes Saturn a pixel or Mercury invisible — log preserves *ordering and ratio feel*); orbital motion at real relative periods, time-compressed so Earth completes an orbit in ~10 real minutes (Mercury visibly laps it — the map breathes). Data source: extend `solar-system.ts` with `{semiMajorAxisAU, orbitalPeriodDays, inclinationDeg}` per body — real values, ~25 rows, content-data only.
- **Bodies:** textured spheres (3.3), sized on a log scale, axial rotation; Saturn ring geometry (annulus + alpha texture); Earth gets night-lights emissive + cloud layer (the hero body). Selection = raycast + the **existing keyboard location list retained verbatim** (a11y invariant); selected body gets the cyan ring shader.
- **Ships & routes:** transit arcs as `TubeGeometry`/fat-line splines with animated dash offset (bezier logic ports from the 2D canvas); ships as billboard sprites (the 4 wired role sprites) with ETA labels; expedition arcs to the galactic layer.
- **Overlays (data already flows):** hazard forecast rings (deterministic forecasts — honest weather), colony pips + player presence (wave C world visibility), lane traffic, zone influence tint. The map-first mandate: every overlay clicks through to its action panel (`MapContextPanel` unchanged).
- **Galactic layer:** keep `GalacticMapView`'s DOM approach (its header comment is right — buttons are accessibility by construction) but restage it over a drei `Stars` canvas backdrop with parallax; add real parallax-true 3D positions later only if cheap.
- **Performance budget (mobile-parity invariant):** cap `dpr` at 1.5 on mobile, ≤2 desktop; no post-processing on mobile; instanced meshes for asteroid-belt scatter; target 60 Hz on a mid-range phone, degrade to the 2D canvas below WebGL2. `prefers-reduced-motion` → static positions (no orbital animation), which the 2D fallback already handles.

## 3.3 Planet textures & the asset gap list

**Textures (the highest-leverage single asset drop):** source public-domain equirectangular maps — NASA Blue Marble (Earth + night lights + clouds), USGS Astrogeology (Moon, Mars, Mercury), Björn Jónsson/NASA mosaics (Jupiter, Saturn + rings, Venus surface/clouds, Galilean moons, Titan, Triton) — at 2048×1024 WebP (~100–200 KB each). Needed set (~18): Sun (procedural shader instead), Mercury, Venus×2 (clouds+surface), Earth×3 (day/night/clouds), Moon, Mars, Ceres, Jupiter, Io, Europa, Ganymede, Callisto, Saturn+rings, Titan, Enceladus, Uranus, Neptune, Triton, Pluto. Ship to `public/textures/` — **fixing the solar-exploration 404 and feeding the game map from one directory.**

**Generated-art gaps (Gemini pipeline, batch manifests):**

| Category | Count | Consumer |
|---|---|---|
| Event illustrations (16:9, mission-imagery aesthetic) | ~44 → start with 12 chain-heads | Cinematic event modal (3.4) |
| Science instrument renders | ~20 | Program instrument picker (2b) |
| Mission patches/emblems (flat, insignia style) | 12 | Program cards, milestone feed |
| Scientist/engineer leader portraits | ~20 | Leaders 2.0 |
| Star-system vista art (5 interstellar destinations) | 5 | Expedition planning / first-contact dossiers |
| Planet close-up "surface postcard" per landable body | ~10 | Location detail panel, region backdrops |

**Pipeline upgrades (one S-wave):** point `generate-art.ts` batches at game prompts; extend `convert-game-assets.ts` to emit size variants (1536 hero / 512 card / 128 icon) + a generated `asset-manifest.ts`; migrate icon-scale consumers (badges, medals) to the 128px variant; **delete the 47 confirmed orphans** (15 `astraeus-*`, 32 combat hulls/angles) — closes the long-standing dead-asset backlog item and ~10 MB.

## 3.4 Cinematic event presentation

`MilestoneVignette.tsx` (full-screen z-90, expanding rings, letter-spacing glow-in, localStorage dedupe) is the proven pattern. Generalize into `CinematicEventModal`: full-bleed event illustration, hud-frame caption band, choice buttons in the existing `EventChoiceModal` styling, Ken-Burns drift on the art (disabled under reduced motion), one synthesized stinger. Used by: chain-head events (2c), program phase completions (2b), first-claim milestones, expedition returns. Stellaris's event-art moment, at browser cost.

## 3.5 Audio direction

Keep the identity: the synthesized, zero-download `sound-engine.ts` is a *feature* (instant load, 23 per-region adaptive ambient profiles with 2 s glides — already more adaptive than most browser games). Close the gaps:

1. **Music, finally.** Add a music bus (second GainNode chain — currently everything hangs off one `masterGain`, no independent mix). Two options, in order of preference: (a) **generative-ambient composer** in WebAudio — slow chord-pad progressions seeded per region/state over the existing drone architecture (stays zero-download, on-brand); (b) 4–6 licensed ambient loops (~1 MB/track OGG) with crossfade scheduler. Either way: **adaptive layers** — calm base / tension layer keyed to active hazard forecasts / triumph layer post-milestone (Stellaris's trick: layers, not tracks).
2. **Fix the region-swap bug:** `setAmbientRegion()` glides drone/pads but never swaps the noise texture (Mars wind follows you to Europa) — swap the filtered-noise bed with a 4 s crossfade.
3. **New stingers:** discovery (rising harmonic series), Accord vote result, program phase complete, expedition return — same oscillator recipes, ~6 additions to the 14 existing.
4. Volume UI grows a music/SFX/ambient 3-slider mixer (`ResourceBar.tsx` already hosts the controls).

---

# PART 4 — EXECUTION WAVES

Each wave = one agent-sized workstream. Risk classes: **CONTENT** (data-only, low risk), **ENGINE** (medium), **RENDER** (high). All waves must respect: no-PvP-combat, no-P2W (nothing here is purchasable), NPC backdrop, named time-loop, BALANCE caps, keyboard/screen-reader/reduced-motion/colorblind access, mobile 60 Hz, local `npx next build` gate before push.

| # | Wave | Class | Effort | Depends | Player-felt impact |
|---|---|---|---|---|---|
| **W1** | **Research effect-authoring pass** — author `effects[]` on all 254 techs (Op 1), re-anchor fantasy techs (Op 2), fix header drift + `emergency_contract` sign bug + dangling `precursor_studies` | CONTENT | M | — | ★★★★ Every tech becomes honest; the "-15% but nothing moved" confusion dies |
| **W2** | **Texture + asset pipeline** — `public/textures/` equirect set (fixes solar-exploration 404), pipeline resize variants + manifest, delete 47 orphans, generate first art batch (12 event illustrations, 12 mission patches) | CONTENT | M | — | ★★★ Site 3D page fixed same day; art inventory ready for W5/W7 |
| **W3** | **Unified discovery/event framework** — merge `rollSurveyDiscovery` + `rollAnomalyDiscovery`; one `GameEvent` schema with `chainId`/stages/choices/deterministic seeds; wire `unlocksResearchId`/`moduleId` (the `exploration.ts:210` dead ends); seasonal cron (closes audit C4) | ENGINE | M | — | ★★★ Framework wave — enables W4/W6; seasons finally have content plumbing |
| **W4** | **Event chain content drop** — the 44 events/12 chains of 2c, incl. Accord Council quarterly votes and situations | CONTENT | L | W3 | ★★★★★ From 4 choices to ~60; the game acquires a narrative voice |
| **W5** | **Cinematic presentation** — `CinematicEventModal` generalized from MilestoneVignette; event art wired; discovery/vote/phase stingers | RENDER | S–M | W2, W3 | ★★★★ Emotional peaks look like they matter |
| **W6** | **Scientific Missions engine + first 6 programs** (#1,2,6,9,5,7) — program lifecycle on the expeditions template, instrument selection, discovery tables, NPC co-funding via ledger | ENGINE | L | W3 (W1 helpful) | ★★★★★ The mandate's centerpiece: hard-science flagship gameplay on the monthly loop |
| **W7** | **WebGL solar map v1** — R3F scene: textured orbiting bodies, real periods log-scaled, selection + keyboard list, 2D canvas retained as fallback | RENDER | L | W2 | ★★★★★ The Stellaris-map moment; the game's screenshot changes forever |
| **W8** | **Leaders 2.0** — levels/XP/assignment posts/traits; 20 new scientist/engineer leaders + portraits; combat-name tone pass | ENGINE+CONTENT | M | W6 (posts reference programs) | ★★★★ MoO2's beloved system, hard-sci flavored |
| **W9** | **WebGL map v2 overlays** — ship transit arcs, hazard forecast rings, colony/player presence, zone tint, expedition arcs; galactic layer restage | RENDER | M | W7 | ★★★ Map-first mandate completed visually |
| **W10** | **Remaining 6 programs + rare techs + repeatables + doctrine gates** (#3,4,8,10,11,12; Ops 4–5) | CONTENT+ENGINE(S) | M | W6, W1 | ★★★ Research regains MoO2 tension; long-horizon research sink |
| **W11** | **Accord Council + faction bite** — quarterly vote engine (from W4's event shell to a real senate), faction standing price/access effects (STATS_DESIGN §12), licensing deals | ENGINE | M | W4 | ★★★ Diplomacy gap closed; factions matter mechanically |
| **W12** | **Music & adaptive audio** — music bus, generative layers (calm/tension/triumph), region noise-swap fix, 3-slider mixer | RENDER(audio) | M | — | ★★★ The sense that the game has a soul; cheapest "AAA feel" per byte |
| **W13** | **Corporate doctrine & board politics** — policies/directives/constituencies feeding the morale writer (1.7) | ENGINE | M | W8 | ★★ Internal-politics gap; lowest priority of the majors |
| **W14** | **Cargo logistics (audit C1) + per-location inventory** — re-affirmed from the systems audit; Δv-priced freight makes W6/W10 supply phases physical | ENGINE | L | — (parallel-safe) | ★★★★ The economy's last missing physical truth |

**Sequencing notes:** W1+W2 are independent immediate starts (both content-only). W3 before any narrative/mission work. W7 can run parallel to W4–W6 (different files: components vs lib content). W6 is the highest-risk engine wave — it gets the expeditions template precisely to de-risk it. Impact-ranked order if forced to serialize: **W7 → W4 → W6 → W1 → W5 → W8 → W12** covers the five P1 gaps of the matrix.

**Invariant checklist applied to every wave (from CLAUDE.md):** meaningful economic decision ✓ (instrument choices, doctrine gates, vote lobbying, insurance-vs-shielding); plugs into supply/demand & P&L ✓ (program costs are sinks, discoveries are buffed *production* not printed money — BALANCE channel rules respected); named time loop ✓ (per feature above); destruction only via hazard/NPC ✓ (launch failures, storms — never PvP); corporate-scale useful ✓ (co-funding, alliance programs later); extends to interstellar ✓ (programs #1/#12 feed expeditions); no real-money advantage ✓ (nothing here purchasable); intelligence visible-if-earned ✓ (published probabilities, forecastable NPC programs); accessible + mobile ✓ (2D fallback retained, keyboard lists, reduced-motion, DPR caps).

---

## Appendix — defect ledger discovered during baselining (fix in passing, cited)

1. `random-events.ts` `emergency_contract` accept branch grants +$150M instead of net +$150M-after-cost — free money (W1).
2. `exploration.ts:210-212` — `unlocksResearchId`/`moduleId` displayed but never applied; `precursor_studies` research id doesn't exist (W3/W1).
3. `research-tree.ts:2` header claims "300+ / 20 categories" — actual 254 / 17; section banners sum to 250 (W1).
4. `solar-exploration-data.ts` texture paths 404 — `public/textures/` missing; 3D planets render untextured (W2).
5. `sound-engine.ts` `setAmbientRegion` never swaps the noise bed — wrong planet's wind follows the player (W12).
6. `SolarSystemCanvas.tsx:380` zoom multiplies x only — horizontal-stretch quirk (moot after W7; fix in fallback if kept long-term).
7. `catchup-mechanics.ts` still exists despite audit B1 delete list (fold pioneer bonus into frontier; W3 housekeeping).
8. Audit C4 (season content cron) still open — no cron instantiates `SeasonalEvent` rows (W3).
9. 47 orphaned art files (`astraeus-*` ×15, combat hulls ×32) + `solar-system.ts` field `distanceFromEarthAU` actually stores heliocentric semi-major-axis offsets — rename or document (W2/W1).
