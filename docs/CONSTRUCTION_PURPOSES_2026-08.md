# Construction Purposes — 2026-08

**Founder directive (verbatim):** "let's come up with uses and purposes for various constructions in our game beyond just revenue/income."

This wave gives every building in the catalog at least one purpose beyond its revenue service, by wiring bounded modifiers into **existing** systems — no parallel mechanics, no new stats, nothing persisted in saves (capabilities live on `BuildingDefinition`; no save-version bump).

## 1. Audit summary (before)

39 building definitions. Purposes already present: power generation (10 defs), passive production/recipes (12), zone +15% revenue bonus (space_station category, 9), crafting-speed bonus (fabrication_facility category, 10), service enablement (all revenue defs).

**Revenue-only buildings — the founder's complaint — 15 of 39:**
launch pads ×3, ground_station, mission_control, sat_telecom, sat_sensor, sat_telecom_geo, sat_sensor_geo, datacenter_orbital, datacenter_mars_orbit, datacenter_jupiter, sat_lunar_relay, sat_mars_relay, deep_space_relay. (Their `consumesPerMonth` recipes are costs, not purposes.)

**Systems that lacked building hooks:** hazard mitigation (only ship modules/crew/research), inventory shocks (no counterplay besides insurance), freight fuel (research + lanes only), espionage detection (security levels only), LS6 program durations (fixed), away efficiency (research/crew only — the LS1 spec's `autonomous_ops_center` building was explicitly deferred), expedition transit damage (ship shielding + research + science missions), faction rep gains (flat), research speed (no infrastructure term), crew capacity (generic +1/building), shipyard slots (a `'building'` bonus type existed in shipyard-slots.ts but was never used).

**After this wave: revenue-only count = 0.** Every def either already had a non-revenue purpose or now carries `capabilities`.

## 2. Purpose taxonomy

| Class | Capabilities |
|---|---|
| **Economic** | `logisticsSupport` (freight fuel discount), `researchSpeed`, `shipyardSlots` |
| **Capability** | `trainingSpeed`, `awayAutomation`, `crewQuarters`, `expeditionSupport` |
| **Defensive** | `hazardShielding`, `inventoryProtection`, `detectionBonus` |
| **Strategic/Social** | `diplomacy` |

Power generation, passive production, zone revenue bonuses, and crafting speed remain the pre-existing purpose layers and are untouched.

## 3. Mechanics — one formula per capability

All helpers live in `src/lib/game/building-capabilities.ts`. Only **completed, operational** buildings count (`isBuildingOperational` — a mothballed station loses its umbrella with its income). Stacking is additive per copy, **capped centrally** (`CAPABILITY_CAPS`). Deterministic, pure state reads; away-parity is automatic (consumers are either on the shared catch-up path or user actions).

| Capability | Scope | Consumer formula | Cap | Notes |
|---|---|---|---|---|
| `hazardShielding` | location | `hazards.ts getBuildingHazardMitigation` / `getShipHazardMitigation` (+ optional `locationId` param; `rollMonthlyHazards` passes it) | 0.12 | Adds to shielding+crew+chain terms; global `MITIGATION_CAP` 0.90 still binds — risk pillar intact |
| `inventoryProtection` | location | `hazards.ts rollLocationInventoryShocks` — loss fraction ×(1−p) | 0.40 | Warehousing buffers supply shocks; shocks still post market flows |
| `logisticsSupport` | location (origin+dest) | `cargo-logistics.ts getFreightFuelCost` ×(1−d) | 0.15 combined | Mirrors LANE_BONUS_CAP; stacks multiplicatively with lane + research terms |
| `detectionBonus` | global (target's) | espionage `executeEspionageAction` detection rate (+ server-safe `getDetectionBonusFromBuildingList` over raw `buildingsData`) | 0.10 | Total detection min-capped at 0.95; soft-PvP prohibitions untouched |
| `trainingSpeed` | global | `programs.ts enqueueProgram` — `durationMs ×(1−t)` at enqueue time | 0.25 | Applied when the syllabus is drawn up; in-flight programs never shift |
| `awayAutomation` | global | `away-operations.ts getAwayEfficiencyInvestmentBonus` | 0.08 | The deferred `autonomous_ops_center` intent, realized on existing defs; AWAY_EFFICIENCY_INVESTMENT_CAP still binds |
| `expeditionSupport` | global | `expeditions.ts processExpeditionTick` — transit damage ×(1−s) | 0.15 | Same post-mitigation shape as W6 science bonuses |
| `diplomacy` | global | `factions.ts shiftReputation` — **positive** deltas ×(1+d), rounded | 0.25 | Rival penalty keyed to original delta; losses never softened |
| `researchSpeed` | global | game-engine research queues — one more (1+x) term in the capped stack | 0.10 | Both queues |
| `crewQuarters` | global (int) | `workforce.ts getCrewCapacity` 5th param + breakdown row "Habitat crew quarters" | — | Small ints; per-type cap math unchanged |
| `shipyardSlots` | global (int) | `shipyard-slots.ts getShipyardSlots` — once per definition | MAX 8 | Activates the dormant `'building'` bonus type; breakdown lists grantors |

## 4. Per-building assignments

Grounded in realism; magnitudes deliberately small (1–8% fractional, small ints).

| Building | Capabilities | Rationale |
|---|---|---|
| Small/Medium/Heavy Launch Pad | logistics 0.03 / 0.05 / 0.06; Heavy +1 shipyard slot | Cheap resupply launches cut freight fuel; heavy pad hosts integration |
| Ground Station | detection 0.02, expedition 0.02 | Tracking network spots spies and guides deep-space craft |
| Mission Control | training 0.10, away 0.03, detection 0.02 | Astronaut training + unattended ops + comms monitoring |
| LEO/GEO Telecom Sat | away 0.01 / 0.02 | Comm relays cut the away-efficiency penalty |
| LEO/GEO Sensor Sat | detection 0.03/0.04, expedition 0.02/0.03 | Sensor grid = counterintel + navigation data |
| Orbital Outpost | shield 0.03, crew 2 | Traffic control umbrella; quarters |
| Lunar Gateway | shield 0.04, diplomacy 0.04, crew 3 | Cislunar hub hosts envoys |
| Mars Orbital Station | shield 0.05, diplomacy 0.05, crew 4 | — |
| Orbital / Mars / Jupiter Datacenter | research 0.03 / 0.04(+away 0.02) / 0.05(+away 0.03, expedition 0.04) | Compute accelerates research; edge AI runs ops unattended |
| Lunar/Mars Habitat | crew 4/6, training 0.05/0.08 | Housing + training annexes |
| Lunar Relay Sat | shield 0.03, away 0.02 | Its debris-removal service literally reduces local strike damage |
| Mars Relay Sat | away 0.03, logistics 0.04 | Propellant brokerage infrastructure |
| Mars Manufacturing Plant | logistics 0.05 | Propellant depot service |
| Orbital Fabrication Lab | +1 shipyard slot | Orbital assembly |
| Lunar Manufacturing / Orbital Refinery | inventoryProtection 0.10 | Hardened industrial storage |
| Asteroid Refinery | inventoryProtection 0.15 | — |
| Ceres Station | shield 0.05, invProtect 0.15, diplomacy 0.04 | Belt hub: pirate deterrence + vaults + summits |
| Jovian Station | shield 0.06, diplomacy 0.05, crew 4, expedition 0.04 | — |
| Kronos Station | shield 0.06, diplomacy 0.05, crew 4, invProtect 0.15 | — |
| Deep Space Outpost | shield 0.08, diplomacy 0.08, expedition 0.06, crew 5 | End-game hub |
| Deep Space Relay | away 0.04, expedition 0.08, detection 0.03 | The expedition-support backbone |
| Propellant Plants (Lunar/Mars) | logistics 0.05 each | Fuel at the endpoint = cheaper dispatch |
| Titan Chemical Plant | logistics 0.06 | Fuel refinery |
| Agri Dome / Life Support Works | crew 2 each | Habitability supports headcount |
| Solar farms, reactors, mining ops, Kuiper platform | (none added) | Power / production are already their non-revenue purposes |

## 5. Balance posture

- Capabilities **add** value to existing buildings; nothing was removed. Per BALANCE, offsets were considered and **not** applied: the expected value of each capability is well under one maintenance step (e.g. Mission Control's full package ≈ faster training + 3% away efficiency + 2% detection — worth a few $100K/mo equivalent at mid-game against its $800K/mo maintenance). Caps prevent stacking farms: the 10th Orbital Outpost adds zero shielding.
- Income-adjacent capabilities (logistics, research, away) are all ≤ 15/10/8% and sit inside already-capped multiplier stacks. `scripts/sim-strategies.ts` verified: strategy table unchanged vs pre-wave baseline (see §7).
- Risk pillar: hazardShielding (0.12) + everything else still ≤ MITIGATION_CAP 0.90; inventory shocks still land (≥60% of rolled loss); expedition total loss still reachable uninsured.
- Soft-PvP: detectionBonus only *informs* the target; the 8 espionage prohibitions are untouched.

## 6. UI

- **BuildPanel cards**: violet "Purpose" chip row (GameIcon + HoloTip per chip explaining the exact mechanic, its consumer formula, and cap).
- **Live projection (M1)**: a "beyond P&L: …" line under the payback estimate (`summarizeCapabilities`) so a thin payback doesn't read as "worthless building".
- **WorkforcePanel**: "Habitat crew quarters" appears in the capacity breakdown.
- **Shipyard breakdown**: building grantors listed with active/inactive state.

## 7. Verification

- `src/lib/game/__tests__/building-capabilities.test.ts` — 19 tests: content coverage (all 15 ex-revenue-only defs have capabilities; authored values within caps; chip metadata complete), scoping/caps/mothball gating, and every consumer hook's math + bounds.
- Full game jest directory green; `tsc --noEmit` clean.
- `npx tsx scripts/sim-strategies.ts` — strategy tables identical to pre-wave baseline (sim doesn't exercise training/away/freight paths; research capability's ≤10% term does not change any build-order outcome).

## 8. Future candidates (not in this wave)

- Medical-bay capability feeding `updateCrewWellbeing` (fatigue/morale relief) — needs a morale-support input threaded through game-engine's writer.
- Warehouse-style hard storage caps (currently no per-location cap exists to raise).
- Location-scoped research campuses (per-category speed) — blocked on research-tree plumbing (same reason LS6 deferred it).
- NPC/faction reactions to diplomatic posts (embassy events).
