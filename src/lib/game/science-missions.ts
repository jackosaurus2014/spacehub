// ─── Space Tycoon: Flagship Scientific Missions (4X Upgrade Wave W6) ────────
// docs/4X_BASELINE_2026-08.md Part 2b: "a missions layer distinct from
// economic contracts — flagship science programs with multi-phase timelines,
// real instruments, and discovery payoffs." Implementation template is the
// proven expeditions.ts engine (plan → launch → deterministic per-month tick
// with catch-up, seeded hazards, insurance option). This is a SIBLING system,
// not a fork: expeditions point outward at other stars with cargo as payload;
// science missions point at the solar system with KNOWLEDGE as payload.
//
// Loop placement (SESSION_DESIGN.md): programs are monthly/quarterly-loop
// content — design/build/cruise spans real days; phase gates land weekly;
// discovery events fire tactically. Do not collapse this tempo.
//
// Design invariants honored (CLAUDE.md checklist):
//  - Meaningful decision: INSTRUMENT SELECTION. Each program offers 5-7
//    instruments; you fly exactly 3 within a mass budget. Chosen instruments
//    determine which discovery tables can roll — a mass spectrometer finds
//    chemistry, radar finds structure, a seismometer finds interiors.
//    Discovery tables are disjoint per instrument: no dominant loadout.
//  - Realistic economics: program costs are genuine money sinks (BALANCE.md
//    "far more sinks than sources") paid up front like expedition launches;
//    discovery payoffs are predominantly BUFFED PRODUCTION (miningBonuses),
//    research-speed windows (activeEffects), reputation, and rare-tech
//    ACCESS — not printed money. One-time cash payouts are sized well below
//    interstellar survey-data payouts ($8-17B): solar-system data is
//    valuable, but another star's data is an order of magnitude more.
//  - Real risk, no PvP: launch failure and cruise loss are deterministic
//    seeded rolls with an upfront single-premium insurance option (same
//    8% / 70% terms as expedition insurance). Mitigation comes from W1's
//    authored research effects (hazardResistance bucket via
//    getResearchBonuses — a real consumer of the W1 authoring pass).
//  - Determinism: every mission fixes a mulberry32 seed at start; monthly
//    rolls key on (seed, mission-month); world-shared rolls (ISO windows,
//    NPC program settlement) key on hashStringToSeed(world tag + month) —
//    the same generator and convention hazards.ts / narrative-events.ts /
//    expeditions.ts use. generateId() is used only for record ids, never
//    for gameplay outcomes.
//  - Hard science: every program is anchored to a real mission or funded
//    study; every instrument carries a real name/heritage (REASON radar,
//    MASPEX mass spectrometer, SEIS seismometry, LICIACube, DSOC...).
//
// Integration points:
//  - processScienceMissionTick is called from game-engine.processFullTick
//    beside processExpeditionTick.
//  - Heliophysics Sentinels (#9) extend the hazards.ts severe-hazard
//    forecast horizon: game-engine consumes getForecastHorizonMonths()
//    (additive hook only — hazards.ts itself is untouched) and applies
//    getScienceHazardDamageMultipliers() post-roll, the exact pattern W1
//    used for research hazardResistance (game-engine.ts hazard block).
//  - Discoveries feed the discoveries database (state.knownAnomalies via a
//    claimed entry), the reports inbox, and the rare-tech access flag list
//    (state.unlockedRareTechIds — W4's forward-compatible grant channel;
//    W10 wires the research-tree gate).
//  - Consequences apply through narrative-events.applyChainConsequence —
//    the W4 dispatcher that already routes money/reputation/faction
//    standing/morale/activeEffects/miningBonuses/rare-tech through wired
//    hooks. One consequence vocabulary across the whole narrative layer.
//  - Global first-claims ("First Europa Ocean Entry") ride the existing
//    /api/space-tycoon/milestones server race: the tick marks a mission
//    milestoneEligibleId; the page posts the claim (handleUnlockLocation
//    pattern).
//
// NOTE on fuel accounting: research effect buckets fuelEfficiency /
// expeditionRisk (W1) remain unconsumed here BY SPEC — the doc assigns
// fuelEfficiency to cargo logistics (audit C1 / wave W14) and expeditionRisk
// to interstellar expeditions; Part 2b's mission spec defines no fuel line
// item (program costs are budget-level). Do not consume them here.

import type {
  GameState,
  GameEvent,
  GameReport,
  ScienceMissionState,
  ScienceMissionPhase,
  ScienceMissionDiscoveryRecord,
} from './types';
import { generateId, formatMoney, mulberry32, hashStringToSeed } from './formulas';
import { RESEARCH_MAP, getResearchBonuses } from './research-tree';
import { applyChainConsequence, consequencePreview, type ChainConsequence } from './narrative-events';
import { MAX_EVENT_LOG, STARTING_YEAR } from './constants';
import type { FactionId } from './factions';

/** Total whole game-months elapsed since STARTING_YEAR/January — same
 *  convention as expeditions.ts / quarterly-reports.ts. Kept LOCAL (not
 *  imported from expeditions.ts) because expeditions.ts consumes this
 *  module's getExpeditionScienceBonuses — a shared import would create a
 *  circular dependency (the same reason quarterly-reports.ts keeps its own
 *  copy). */
export function getTotalGameMonths(gameDate: { year: number; month: number }): number {
  return (gameDate.year - STARTING_YEAR) * 12 + (gameDate.month - 1);
}

// ─── Tuning constants ────────────────────────────────────────────────────────

/** Single-premium program insurance — same terms as expedition insurance
 *  (expeditions.ts INSURANCE_PREMIUM_RATE/PAYOUT_RATE): 8% of the insured
 *  basis buys a 70% payout on total loss (launch failure or cruise loss).
 *  Positive-EV for the insurer while loss rates stay under ~11% — real
 *  launch-vehicle loss rates are low single digits, so skipping coverage is
 *  a legitimate gamble. That IS the decision. */
export const SCIENCE_INSURANCE_PREMIUM_RATE = 0.08;
export const SCIENCE_INSURANCE_PAYOUT_RATE = 0.70;

/** Cruise-phase monthly loss probability baseline (deep-space anomaly that
 *  ends the mission — Mars Observer-class). Per-program multipliers apply. */
export const CRUISE_BASE_MONTHLY_FAILURE_PROB = 0.004;

/** Research mitigation on launch/cruise failure odds: W1's authored
 *  hazardResistance bucket, aggregated by getResearchBonuses (capped 0.30
 *  there). A corp that researched launch-abort systems and hardened
 *  electronics flies safer programs — the authored effects are real here. */
export function getScienceRiskMitigation(completedResearch: string[]): number {
  return getResearchBonuses(completedResearch).hazardResistanceBonus || 0;
}

/** Cap on the combined post-roll hazard damage reduction the science layer
 *  can contribute in game-engine (Sentinels + deflection demo). Keeps the
 *  risk pillar real (hazards.ts's own MITIGATION_CAP philosophy). */
export const SCIENCE_HAZARD_REDUCTION_CAP = 0.35;

/** ISO window: world-shared monthly probability an interstellar object
 *  transits the inner system while an interceptor is on station. ~3%/month
 *  ≈ one actionable object every ~3 game-years — 'Oumuamua/Borisov cadence
 *  compressed to game time. Meridian's astrometric census raises detection. */
export const ISO_WINDOW_BASE_PROB = 0.03;
export const ISO_WINDOW_MERIDIAN_BONUS = 0.02;
/** Intercept science window after the window opens (game-months). */
export const ISO_INTERCEPT_OPS_MONTHS = 4;

/** Safety valve on catch-up processing (expeditions.ts convention). */
const MAX_CATCHUP_MONTHS = 20_000;

/** Instruments flown per program — the pick-3 tension. */
export const INSTRUMENTS_PER_MISSION = 3;

// ─── Definitions ─────────────────────────────────────────────────────────────

export interface InstrumentDef {
  id: string;
  /** Real instrument name / direct heritage. */
  name: string;
  /** One-line real-mission anchor shown in the picker ("MASPEX heritage"). */
  heritage: string;
  massKg: number;
  cost: number;
  /** What this instrument finds — surfaced in the picker so the tradeoff is
   *  legible before committing (published probabilities, CLAUDE.md "market
   *  intelligence is a first-class feature" applied to science). */
  finds: string;
}

export interface DiscoveryDef {
  id: string;
  name: string;
  /** Any-of instrument gating: at least one of these must be fitted for the
   *  entry to be rollable. Multi-id entries model instrument PAIRS via
   *  requiresAll (e.g. hydrobot needs the cryobot to reach the ocean). */
  requiresInstruments: string[];
  /** All-of gating (optional, on top of requiresInstruments). */
  requiresAllInstruments?: string[];
  /** Per-ops-month probability once eligible. Fires at most once. */
  monthlyProb: number;
  summary: string;
  /** Routed through narrative-events.applyChainConsequence (wired hooks). */
  payoff: ChainConsequence;
  /** Anomaly-database kind for the Discoveries tab entry (exploration.ts). */
  anomalyKind?: 'rich_deposit' | 'ancient_artifact' | 'alien_signal' | 'gravitational_lens';
}

export interface ScienceProgramDef {
  id: string;
  name: string;
  icon: string;
  /** Real-mission anchor (JWST/HWO, Europa Clipper, DART, Dragonfly...). */
  realAnchor: string;
  description: string;
  /** Phase durations in game-months (1 game-month = 60 real seconds at 1x;
   *  a 24-month build ≈ 24 real minutes; full flagship arcs span real hours
   *  to days — the campaign/monthly loop, between tier-4 research (4h) and
   *  the colony ark (24h)). */
  designMonths: number;
  buildMonths: number;
  cruiseMonths: number;
  /** Primary science-ops duration. */
  opsMonths: number;
  /** Open-ended programs transition to extended_ops after primary ops
   *  (benefits + remaining discovery rolls persist) instead of completing. */
  openEnded?: boolean;
  /** ISO interceptor: parks on station after cruise, waits for a window. */
  waitsForIsoWindow?: boolean;
  /** Program budget (design+build+ops, before instruments/insurance).
   *  Sized as true sinks against colony-scale spending (expeditions.ts:
  *   colony founding $20B, upgrades $25-200B) and real flagship costs. */
  baseCost: number;
  requiredResearch: string[];
  /** Additional corp-tier gate for the deepest programs. */
  minCorporationTier?: number;
  /** Launch-vehicle failure probability at the build→cruise boundary. */
  launchFailureProb: number;
  /** Multiplier on CRUISE_BASE_MONTHLY_FAILURE_PROB for this route. */
  cruiseRiskMult: number;
  /** Payload mass budget (kg) — the pick-3 combos must also fit this. */
  massBudgetKg: number;
  /** Map-focus location for HUD/order-queue rows (existing location ids). */
  locationId: string;
  instruments: InstrumentDef[];
  discoveryTable: DiscoveryDef[];
  /** One-time completion payout (survey-data sale) on data return. Open-ended
   *  programs pay it when primary ops conclude (entering extended_ops). */
  completionPayout: number;
  /** Standing world-effects while the mission is in science_ops/extended_ops
   *  (and, for permanent demos like the deflection test, after completion). */
  standingBenefits?: {
    /** Extra game-months of severe-hazard forecast horizon (Sentinels). */
    forecastExtraMonths?: number;
    /** Post-roll solar-storm damage reduction (Sentinels). */
    solarStormDamageReduction?: number;
    /** Post-roll micrometeorite/impact damage reduction (deflection demo);
     *  persists after completion — the technique is demonstrated forever. */
    impactDamageReduction?: number;
    /** Interstellar expedition survey-data payout bonus (Meridian census,
     *  heliopause boundary charting) — consumed in expeditions.ts. */
    expeditionSurveyPayoutBonus?: number;
    /** Interstellar expedition hazard-damage reduction (heliopause charting,
     *  GW deep-space sensing) — consumed in expeditions.ts. */
    expeditionHazardReduction?: number;
    /** Raises the ISO window probability (Meridian astrometric census). */
    isoDetectionBonus?: number;
    /** Benefits that persist after 'completed' (not just during ops). */
    persistAfterCompletion?: boolean;
  };
  /** Global first-claim milestone (server race — /api/space-tycoon/milestones).
   *  Eligibility trigger: entering science_ops (arrival-class firsts) or
   *  completing (return-class firsts). requiresInstrument gates firsts that
   *  need specific hardware (no ocean entry without the cryobot). */
  milestone?: {
    id: string;
    label: string;
    at: 'science_ops' | 'completed';
    requiresInstrument?: string;
  };
}

// ─── The 12 flagship programs (doc Part 2b table) ───────────────────────────
// Copy discipline: every claim in these strings is real science — flown
// hardware, funded studies, or published proposals. Where the game reaches
// past the current state of the art, the description says so.

export const SCIENCE_PROGRAMS: ScienceProgramDef[] = [
  // ── #1 Meridian Observatory ────────────────────────────────────────────
  {
    id: 'meridian_observatory',
    name: 'Meridian Observatory',
    icon: '🔭',
    realAnchor: 'JWST / Habitable Worlds Observatory lineage',
    description:
      'A 6-metre-class segmented infrared/optical telescope stationed at Sun–Earth L2, '
      + 'behind a five-layer sunshield. Direct-imaging exoplanet census, transit '
      + 'spectroscopy, and wide-field astrometry — the deep-sky eye that also flags '
      + 'inbound interstellar objects years earlier than ground surveys.',
    designMonths: 6, buildMonths: 18, cruiseMonths: 3, opsMonths: 24, openEnded: true,
    baseCost: 18_000_000_000,
    requiredResearch: ['infrared_telescope', 'adaptive_optics'],
    launchFailureProb: 0.03,
    cruiseRiskMult: 0.6,
    massBudgetKg: 1_300, // science-payload budget atop the 6,200 kg bus (JWST-class)
    locationId: 'geo',
    instruments: [
      { id: 'coronagraph', name: 'High-Contrast Coronagraph', heritage: 'Roman Space Telescope CGI heritage', massKg: 350, cost: 900_000_000, finds: 'Direct imaging of exoplanets — the census that prices interstellar destinations.' },
      { id: 'nirspec_ifu', name: 'Near-IR Integral-Field Spectrograph', heritage: 'JWST NIRSpec heritage', massKg: 480, cost: 750_000_000, finds: 'Exoplanet atmosphere chemistry: H₂O, CH₄, CO₂ bands — biosignature candidates.' },
      { id: 'mir_imager', name: 'Cryocooled Mid-IR Imager', heritage: 'JWST MIRI heritage (7 K cryocooler)', massKg: 520, cost: 800_000_000, finds: 'Protoplanetary disks and debris belts — where planets and ore bodies form.' },
      { id: 'astrometric_camera', name: 'Wide-Field Astrometric Camera', heritage: 'Gaia focal-plane heritage', massKg: 400, cost: 600_000_000, finds: 'Micro-arcsecond astrometry: stellar wobble planet detection + fast-mover alerts (ISO early warning).' },
      { id: 'uv_spectrograph', name: 'Far-UV Multi-Object Spectrograph', heritage: 'HWO LUMOS concept study', massKg: 380, cost: 550_000_000, finds: 'Atmospheric escape and stellar-activity environments of target systems.' },
      { id: 'guidance_survey_sensor', name: 'Fine-Guidance Survey Sensor', heritage: 'JWST FGS/NIRISS heritage', massKg: 250, cost: 300_000_000, finds: 'Continuous sky survey while pointing — serendipitous transient detection.' },
    ],
    discoveryTable: [
      { id: 'exoplanet_census', name: 'Exoplanet Census Volume I', requiresInstruments: ['coronagraph', 'astrometric_camera'], monthlyProb: 0.10,
        summary: 'A statistically complete census of planets within 15 parsecs — destination intelligence for the interstellar era.',
        payoff: { label: 'Exoplanet Census — expedition intel', moneyReward: 250_000_000, reputationPoints: 600 }, anomalyKind: 'gravitational_lens' },
      { id: 'biosignature_candidate', name: 'Biosignature-Candidate Atmosphere', requiresInstruments: ['nirspec_ifu', 'uv_spectrograph'], monthlyProb: 0.05,
        summary: 'Disequilibrium O₂/CH₄ chemistry in a temperate super-Earth atmosphere — a candidate, not a confirmation; the paper says exactly that.',
        payoff: { label: 'Biosignature Candidate', reputationPoints: 1200, researchSpeedMultiplier: 1.08, effectDurationMonths: 4 }, anomalyKind: 'alien_signal' },
      { id: 'disk_survey', name: 'Protoplanetary Disk Survey', requiresInstruments: ['mir_imager'], monthlyProb: 0.08,
        summary: 'Thermal maps of forming systems constrain where heavy elements concentrate — feedstock for planetary-resource models.',
        payoff: { label: 'Disk Survey Data Sale', moneyReward: 120_000_000, researchSpeedMultiplier: 1.04, effectDurationMonths: 3 } },
      { id: 'iso_precovery', name: 'ISO Pre-covery Pipeline', requiresInstruments: ['guidance_survey_sensor'], requiresAllInstruments: ['astrometric_camera'], monthlyProb: 0.07,
        summary: 'Survey-sensor archives cross-matched against astrometric fast-movers recover interstellar objects weeks before perihelion — the interceptor gets its warning time.',
        payoff: { label: 'ISO Early-Warning Pipeline', reputationPoints: 400 } },
    ],
    completionPayout: 2_000_000_000,
    standingBenefits: { expeditionSurveyPayoutBonus: 0.10, isoDetectionBonus: ISO_WINDOW_MERIDIAN_BONUS },
  },

  // ── #2 Europa Ocean Access ─────────────────────────────────────────────
  {
    id: 'europa_ocean_access',
    name: 'Europa Ocean Access',
    icon: '🧊',
    realAnchor: 'Europa Clipper + NASA cryobot (SESAME) studies; LORE 2119 failed contact',
    description:
      'Orbit Europa, map the ice shell, then melt through kilometres of ice with a '
      + 'nuclear-heated cryobot to sample the subsurface ocean directly. The flagship '
      + 'biosignature hunt — and, per the 2119 contact failure in the Accord archives, '
      + 'the most politically watched program a corporation can run.',
    designMonths: 8, buildMonths: 24, cruiseMonths: 14, opsMonths: 12,
    baseCost: 25_000_000_000,
    requiredResearch: ['ice_penetrator', 'ocean_exploration'],
    launchFailureProb: 0.04,
    cruiseRiskMult: 1.2,
    massBudgetKg: 3_200,
    locationId: 'jupiter_system',
    instruments: [
      { id: 'reason_radar', name: 'Ice-Penetrating Radar', heritage: 'Europa Clipper REASON heritage', massKg: 280, cost: 500_000_000, finds: 'Ice-shell thickness and water pockets — structure, and where to drill.' },
      { id: 'cryobot', name: 'Nuclear Cryobot Melt Probe', heritage: 'NASA SESAME cryobot studies', massKg: 1_800, cost: 2_500_000_000, finds: 'Physical ocean access through the ice shell. Required for ocean entry and any in-ocean science.' },
      { id: 'plume_masspec', name: 'Plume Mass Spectrometer', heritage: 'Europa Clipper MASPEX heritage', massKg: 350, cost: 700_000_000, finds: 'Isotopic and organic chemistry — the biosignature workhorse.' },
      { id: 'hydrobot', name: 'Autonomous Hydrobot Submersible', heritage: 'JPL SWIM/hydrobot concepts', massKg: 950, cost: 1_400_000_000, finds: 'In-ocean survey below the ice: currents, seafloor, vent fields. Needs the cryobot to get there.' },
      { id: 'fluxgate_mag', name: 'Fluxgate Magnetometer', heritage: 'Europa Clipper ECM heritage', massKg: 60, cost: 150_000_000, finds: 'Induced magnetic field — ocean depth and salinity from orbit, no drilling needed.' },
      { id: 'thermal_imager', name: 'Thermal Emission Imager', heritage: 'Europa Clipper E-THEMIS heritage', massKg: 120, cost: 250_000_000, finds: 'Warm chaos terrain and recent resurfacing — transport paths from ocean to surface.' },
      { id: 'dust_analyzer', name: 'Surface Dust Analyzer', heritage: 'Europa Clipper SUDA heritage', massKg: 90, cost: 200_000_000, finds: 'Composition of ejected surface grains — free samples on every low pass.' },
    ],
    discoveryTable: [
      { id: 'ocean_salinity', name: 'Ocean Salinity Profile', requiresInstruments: ['fluxgate_mag'], monthlyProb: 0.12,
        summary: 'Induction signature pins the ocean: global, salty, in contact with a rocky seafloor.',
        payoff: { label: 'Ocean Confirmed — Induction Profile', reputationPoints: 500, researchSpeedMultiplier: 1.04, effectDurationMonths: 3 } },
      { id: 'shell_chart', name: 'Ice-Shell Thickness Chart', requiresInstruments: ['reason_radar'], monthlyProb: 0.10,
        summary: 'Radargram atlas of the shell, including shallow water pockets — the drilling map every Jovian operator wants.',
        payoff: { label: 'Shell Chart — Jovian ops advantage', miningBonus: { locationId: 'jupiter_system', resourceId: 'exotic_materials', bonusPct: 15, durationMonths: 24 }, moneyReward: 100_000_000 }, anomalyKind: 'rich_deposit' },
      { id: 'disequilibrium_chemistry', name: 'Ocean Disequilibrium Chemistry', requiresInstruments: ['plume_masspec'], requiresAllInstruments: ['cryobot'], monthlyProb: 0.06,
        summary: 'The cryobot’s mass spectrometer reads redox couples no abiotic model fully explains. The Europan-biochemistry program begins.',
        payoff: { label: 'Europan Biochemistry Access', unlockRareTechId: 'europan_biochemistry', reputationPoints: 2500, factionRep: { 'echo-remnants': 8 } as Partial<Record<FactionId, number>> }, anomalyKind: 'alien_signal' },
      { id: 'vent_field', name: 'Hydrothermal Vent Field', requiresInstruments: ['hydrobot'], requiresAllInstruments: ['cryobot'], monthlyProb: 0.05,
        summary: 'The hydrobot images an active vent field on the seafloor — chemical energy in the dark, exactly where theory wanted it.',
        payoff: { label: 'Vent Field Mapped', miningBonus: { locationId: 'jupiter_system', resourceId: 'helium3', bonusPct: 12, durationMonths: 18 }, reputationPoints: 900 }, anomalyKind: 'rich_deposit' },
      { id: 'chaos_transport', name: 'Chaos-Terrain Transport Map', requiresInstruments: ['thermal_imager', 'dust_analyzer'], monthlyProb: 0.09,
        summary: 'Thermal + grain data show where ocean material reaches the surface — sampling without drilling.',
        payoff: { label: 'Transport Map Data Sale', moneyReward: 150_000_000 } },
    ],
    completionPayout: 3_000_000_000,
    milestone: { id: 'first_europa_ocean_entry', label: 'First Europa Ocean Entry', at: 'science_ops', requiresInstrument: 'cryobot' },
  },

  // ── #3 Enceladus Plume Sampler ─────────────────────────────────────────
  {
    id: 'enceladus_plume_sampler',
    name: 'Enceladus Plume Sampler',
    icon: '⛲',
    realAnchor: 'Cassini plume flythroughs / Enceladus Life Finder proposal',
    description:
      'Enceladus vents its ocean into space for free — fly through the south-polar '
      + 'plumes and catch it. No drilling: the cheapest route to fresh ocean chemistry '
      + 'anywhere in the solar system, exactly as Cassini proved in 2008.',
    designMonths: 6, buildMonths: 14, cruiseMonths: 30, opsMonths: 8,
    baseCost: 12_000_000_000,
    requiredResearch: ['sample_return', 'deep_space_nav'],
    launchFailureProb: 0.03,
    cruiseRiskMult: 1.0,
    massBudgetKg: 900,
    locationId: 'saturn_system',
    instruments: [
      { id: 'inms_masspec', name: 'High-Resolution Plume Mass Spectrometer', heritage: 'Cassini INMS / MASPEX lineage', massKg: 320, cost: 650_000_000, finds: 'Volatile and organic inventory of plume gas at unit mass resolution Cassini never had.' },
      { id: 'nephelometer', name: 'Plume Nephelometer', heritage: 'Galileo probe nephelometer lineage', massKg: 110, cost: 180_000_000, finds: 'Ice-grain size and density profiles — safe-passage corridors through the plume.' },
      { id: 'aerogel_capture', name: 'Aerogel Sample-Capture Panels', heritage: 'Stardust mission heritage', massKg: 240, cost: 400_000_000, finds: 'Intact grain capture at low encounter speed — the lab-quality sample path.' },
      { id: 'cda_dust', name: 'Cosmic Dust Analyzer', heritage: 'Cassini CDA heritage', massKg: 130, cost: 220_000_000, finds: 'Per-grain composition in flight — nanosilica means hot water at the seafloor.' },
      { id: 'gcms_lab', name: 'Microfluidic GC-MS Organics Lab', heritage: 'Enceladus Life Finder / OWLS concepts', massKg: 280, cost: 550_000_000, finds: 'Amino-acid abundance and chirality — the agnostic life-detection assay.' },
      { id: 'plume_camera', name: 'Narrow-Angle Plume Imager', heritage: 'Cassini ISS heritage', massKg: 90, cost: 150_000_000, finds: 'Jet timing vs orbital position — tidal control of the vents.' },
    ],
    discoveryTable: [
      { id: 'nanosilica', name: 'Nanosilica Grain Population', requiresInstruments: ['cda_dust'], monthlyProb: 0.14,
        summary: 'Silica nanograins require ≥90 °C water-rock reactions — active hydrothermal systems under the ice, confirmed in flight.',
        payoff: { label: 'Hydrothermal Activity Confirmed', reputationPoints: 700, researchSpeedMultiplier: 1.05, effectDurationMonths: 3 } },
      { id: 'chirality_excess', name: 'Amino-Acid Chirality Excess', requiresInstruments: ['gcms_lab'], requiresAllInstruments: ['aerogel_capture'], monthlyProb: 0.05,
        summary: 'Captured grains show an enantiomeric excess beyond abiotic expectation. Replication debates begin; xenobiochemistry becomes a research program.',
        payoff: { label: 'Chirality Anomaly — Xenobiochemistry Access', unlockRareTechId: 'xenobiochemistry', reputationPoints: 2000, factionRep: { 'hive-collective': 6 } as Partial<Record<FactionId, number>> }, anomalyKind: 'alien_signal' },
      { id: 'volatile_inventory', name: 'Plume Volatile Inventory', requiresInstruments: ['inms_masspec'], monthlyProb: 0.12,
        summary: 'H₂, CH₄, CO₂ ratios map the ocean’s redox ladder — and price its industrial volatiles.',
        payoff: { label: 'Volatile Inventory — Saturn ops advantage', miningBonus: { locationId: 'saturn_system', resourceId: 'methane', bonusPct: 12, durationMonths: 18 }, moneyReward: 80_000_000 }, anomalyKind: 'rich_deposit' },
      { id: 'jet_timing', name: 'Tidal Jet-Timing Model', requiresInstruments: ['plume_camera', 'nephelometer'], monthlyProb: 0.11,
        summary: 'Vent output tracks the tidal cycle — flyby windows can now be scheduled for maximum sample density.',
        payoff: { label: 'Jet-Timing Model Data Sale', moneyReward: 90_000_000, reputationPoints: 200 } },
    ],
    completionPayout: 1_800_000_000,
    milestone: { id: 'first_enceladus_plume_sample', label: 'First Enceladus Plume Sample Return', at: 'completed', requiresInstrument: 'aerogel_capture' },
  },

  // ── #4 Venus Aerostat Station ──────────────────────────────────────────
  {
    id: 'venus_aerostat',
    name: 'Venus Aerostat Station',
    icon: '🎈',
    realAnchor: 'HAVOC / VAMP concepts; the real 50-55 km cloud-layer habitability zone',
    description:
      'At 52 km altitude Venus offers Earth-like pressure and temperature above the '
      + 'sulfuric-acid deck — the one place off Earth where a shirtsleeve-pressure '
      + 'platform can float. A long-duration instrumented aerostat rides the '
      + 'super-rotating winds around the planet every four to five days.',
    designMonths: 6, buildMonths: 12, cruiseMonths: 4, opsMonths: 18,
    baseCost: 10_000_000_000,
    requiredResearch: ['aerostat_technology'],
    launchFailureProb: 0.04,
    cruiseRiskMult: 0.8,
    massBudgetKg: 800,
    locationId: 'leo',
    instruments: [
      { id: 'uv_imaging_spec', name: 'UV Imaging Spectrometer', heritage: 'Akatsuki UVI heritage', massKg: 140, cost: 250_000_000, finds: 'The unidentified UV absorber that soaks up half of Venus’s sunlight.' },
      { id: 'aerosol_sampler', name: 'Aerosol Sampler + Fluorescence Microscope', heritage: 'Venus Life Finder mission study', massKg: 180, cost: 400_000_000, finds: 'Cloud-droplet chemistry and any autofluorescent organics in the habitable layer.' },
      { id: 'radar_sounder', name: 'Cloud-Penetrating Radar Sounder', heritage: 'Magellan SAR lineage', massKg: 260, cost: 450_000_000, finds: 'Surface change detection through the clouds — active volcanism watch.' },
      { id: 'met_suite', name: 'Meteorology Suite', heritage: 'VEGA balloon (1985) heritage — the only aerostats ever flown at Venus', massKg: 90, cost: 120_000_000, finds: 'Super-rotation winds, gravity waves, and the station-keeping envelope for future platforms.' },
      { id: 'mmwave_spec', name: 'Millimetre-Wave Line Spectrometer', heritage: 'JCMT/ALMA phosphine-controversy follow-up', massKg: 120, cost: 300_000_000, finds: 'PH₃/SO₂ line survey in situ — settle the phosphine debate from inside the clouds.' },
      { id: 'isru_demo', name: 'Atmospheric ISRU Demonstrator', heritage: 'MOXIE-lineage CO₂ electrolysis', massKg: 200, cost: 350_000_000, finds: 'O₂ + CO production from CO₂ at cloud altitude — the consumables base for permanent platforms.' },
    ],
    discoveryTable: [
      { id: 'uv_absorber', name: 'UV Absorber Identified', requiresInstruments: ['uv_imaging_spec', 'aerosol_sampler'], monthlyProb: 0.09,
        summary: 'The century-old mystery absorber resolves into a sulfur-cycle photochemical complex — with an odd residual the models don’t close.',
        payoff: { label: 'UV Absorber Identified', reputationPoints: 800, researchSpeedMultiplier: 1.05, effectDurationMonths: 3 } },
      { id: 'phosphine_verdict', name: 'Phosphine Verdict', requiresInstruments: ['mmwave_spec'], monthlyProb: 0.08,
        summary: 'In-situ line profiles finally beat the telluric-correction arguments. The abundance is real, tiny, and volcanically explicable — and the debate moves to isotopes.',
        payoff: { label: 'Phosphine Debate Settled In Situ', reputationPoints: 900, factionRep: { 'echo-remnants': 5 } as Partial<Record<FactionId, number>> } },
      { id: 'active_volcanism', name: 'Active Volcanism Detected', requiresInstruments: ['radar_sounder'], monthlyProb: 0.08,
        summary: 'Repeat-pass radar catches a fresh flow at Maat Mons — Venus is geologically alive on human timescales.',
        payoff: { label: 'Volcanism Watch Data Sale', moneyReward: 150_000_000, reputationPoints: 300 } },
      { id: 'cloud_colony_survey', name: 'Cloud-Colony Site Survey', requiresInstruments: ['met_suite', 'isru_demo'], monthlyProb: 0.07,
        summary: 'Wind-shear climatology plus ISRU throughput close the trade study: permanent crewed aerostats are engineering, not speculation.',
        payoff: { label: 'Aerostat Colony Feasibility', moneyReward: 200_000_000, reputationPoints: 600, researchSpeedMultiplier: 1.04, effectDurationMonths: 4 } },
    ],
    completionPayout: 1_500_000_000,
  },

  // ── #5 Mars Deep Drill ─────────────────────────────────────────────────
  {
    id: 'mars_deep_drill',
    name: 'Mars Deep Drill',
    icon: '🩸',
    realAnchor: 'InSight seismometry + RSL brines + subsurface-aquifer radar science',
    description:
      'A kilometre-class rotary-percussive drill string on the Martian surface, ringed '
      + 'by a seismometer network. Orbital radar says liquid brines may persist at '
      + 'depth; the deep subsurface is also the last refuge any ancient Martian '
      + 'biosphere could still inhabit. Drill, listen, and find out.',
    designMonths: 4, buildMonths: 10, cruiseMonths: 8, opsMonths: 20,
    baseCost: 8_000_000_000,
    requiredResearch: ['deep_drilling'],
    launchFailureProb: 0.03,
    cruiseRiskMult: 0.8,
    massBudgetKg: 2_000,
    locationId: 'mars_surface',
    instruments: [
      { id: 'drill_string', name: 'Kilometre-Class Drill String', heritage: 'Planetary deep-drill (Honeybee/ESA ExoMars lineage, scaled)', massKg: 1_100, cost: 1_200_000_000, finds: 'Physical access to the deep subsurface — cores, brines, and the aquifer if it exists.' },
      { id: 'seis_network', name: 'Broadband Seismometer Network', heritage: 'InSight SEIS heritage ×4 stations', massKg: 120, cost: 300_000_000, finds: 'Marsquake tomography — crustal structure and where the subsurface holds fluids.' },
      { id: 'borehole_masspec', name: 'Borehole Mass Spectrometer', heritage: 'MSL SAM heritage, downhole-packaged', massKg: 240, cost: 500_000_000, finds: 'Organics, isotopes, and dissolved gases in cores and brines — deep-biosphere assay.' },
      { id: 'gpr_radar', name: 'Ground-Penetrating Radar', heritage: 'Perseverance RIMFAX heritage', massKg: 60, cost: 120_000_000, finds: 'Metre-scale stratigraphy ahead of the bit — steer the drill, avoid voids.' },
      { id: 'heatflow_probe', name: 'Heat-Flow Probe', heritage: 'InSight HP³ “mole” heritage — redesigned for cohesive regolith', massKg: 80, cost: 150_000_000, finds: 'Geothermal gradient — brine-stability depth and usable subsurface heat.' },
      { id: 'brine_lab', name: 'Brine Electrochemistry Lab', heritage: 'Phoenix WCL heritage', massKg: 110, cost: 200_000_000, finds: 'Perchlorate load, water activity, and habitability of any liquids the drill reaches.' },
    ],
    discoveryTable: [
      { id: 'aquifer', name: 'Deep Aquifer Tapped', requiresInstruments: ['drill_string'], requiresAllInstruments: ['gpr_radar'], monthlyProb: 0.07,
        summary: 'At 830 m the bit breaks into a perchlorate brine aquifer — liquid water, on tap, on Mars.',
        payoff: { label: 'Martian Aquifer — water economy', miningBonus: { locationId: 'mars_surface', resourceId: 'mars_water', bonusPct: 25, durationMonths: 36 }, moneyReward: 200_000_000, reputationPoints: 1000 }, anomalyKind: 'rich_deposit' },
      { id: 'deep_biosphere', name: 'Deep-Biosphere Chemistry', requiresInstruments: ['borehole_masspec'], requiresAllInstruments: ['drill_string'], monthlyProb: 0.05,
        summary: 'Core organics show isotopic fractionation patterns consistent with slow chemolithotrophic metabolism. Not proof — a research program.',
        payoff: { label: 'Deep-Biosphere Ecology Access', unlockRareTechId: 'deep_biosphere_ecology', reputationPoints: 2200 }, anomalyKind: 'alien_signal' },
      { id: 'interior_model', name: 'Crustal Tomography Model', requiresInstruments: ['seis_network'], monthlyProb: 0.12,
        summary: 'Four stations of marsquakes resolve crustal layering to 40 km — the reference interior model for every Martian build permit.',
        payoff: { label: 'Interior Model Data Sale', moneyReward: 120_000_000, researchSpeedMultiplier: 1.04, effectDurationMonths: 3 } },
      { id: 'geothermal_map', name: 'Geothermal Gradient Map', requiresInstruments: ['heatflow_probe', 'brine_lab'], monthlyProb: 0.10,
        summary: 'Heat-flow plus brine stability define the depth band where liquid water persists planet-wide.',
        payoff: { label: 'Geothermal Survey — Mars ops advantage', miningBonus: { locationId: 'mars_surface', resourceId: 'iron', bonusPct: 12, durationMonths: 18 } }, anomalyKind: 'rich_deposit' },
    ],
    completionPayout: 1_600_000_000,
    milestone: { id: 'first_martian_aquifer', label: 'First Martian Aquifer Tap', at: 'science_ops', requiresInstrument: 'drill_string' },
  },

  // ── #6 Kinetic Deflection Demonstration ────────────────────────────────
  {
    id: 'kinetic_deflection_demo',
    name: 'Kinetic Deflection Demonstration',
    icon: '🎯',
    realAnchor: 'NASA DART (2022) — the first planetary-defense test, which shortened Dimorphos’s orbit by 32 minutes',
    description:
      'Repeat DART at industrial scale: slam an impactor into a non-threatening '
      + 'near-Earth asteroid, measure the momentum-transfer β with a trailing cubesat '
      + 'and radar, and publish the deflection playbook. Every operator’s impact-risk '
      + 'models improve permanently — and the Accord notices who paid for it.',
    designMonths: 4, buildMonths: 8, cruiseMonths: 10, opsMonths: 1,
    baseCost: 2_500_000_000,
    requiredResearch: ['asteroid_deflection'],
    launchFailureProb: 0.03,
    cruiseRiskMult: 1.0,
    massBudgetKg: 1_200,
    locationId: 'asteroid_belt',
    instruments: [
      { id: 'impactor_bus', name: 'Kinetic Impactor Bus', heritage: 'DART heritage (610 kg at 6.1 km/s)', massKg: 640, cost: 500_000_000, finds: 'The impact itself. No impactor, no deflection measurement.' },
      { id: 'trailing_cubesat', name: 'Trailing Observation CubeSat', heritage: 'ASI LICIACube heritage', massKg: 14, cost: 80_000_000, finds: 'Ejecta-plume imaging seconds after impact — the β momentum-multiplier measurement.' },
      { id: 'radar_transponder', name: 'Planetary Radar Transponder', heritage: 'Goldstone/DSN radar campaign support', massKg: 45, cost: 60_000_000, finds: 'Millimetre-per-second orbit-change tracking for months after impact.' },
      { id: 'ejecta_imager', name: 'Terminal Ejecta Imager', heritage: 'DART DRACO heritage', massKg: 30, cost: 70_000_000, finds: 'Surface boulder census to the last frame — target strength properties.' },
      { id: 'laser_altimeter', name: 'Laser Altimeter', heritage: 'OSIRIS-REx OLA heritage', massKg: 25, cost: 50_000_000, finds: 'Pre-impact shape model — converts the orbit change into a precise β.' },
    ],
    discoveryTable: [
      { id: 'beta_measurement', name: 'Momentum-Transfer β Measured', requiresInstruments: ['trailing_cubesat', 'laser_altimeter'], requiresAllInstruments: ['impactor_bus'], monthlyProb: 0.9,
        summary: 'β = 3.1 ± 0.4: ejecta recoil more than doubles the imparted momentum. Deflection is now an engineering quantity.',
        payoff: { label: 'Deflection Playbook Published', reputationPoints: 1500, factionRep: { 'the-dominion': 8 } as Partial<Record<FactionId, number>>, moneyReward: 150_000_000 } },
      { id: 'rubble_structure', name: 'Rubble-Pile Interior Response', requiresInstruments: ['ejecta_imager', 'radar_transponder'], requiresAllInstruments: ['impactor_bus'], monthlyProb: 0.8,
        summary: 'The target reshaped globally — rubble piles absorb hits by flowing. Impact-hazard models across the belt update tonight.',
        payoff: { label: 'Impact-Response Model', reputationPoints: 600, researchSpeedMultiplier: 1.05, effectDurationMonths: 2 } },
    ],
    completionPayout: 800_000_000,
    standingBenefits: { impactDamageReduction: 0.20, persistAfterCompletion: true },
    milestone: { id: 'first_deflection_demo', label: 'First Commercial Deflection Demonstration', at: 'completed', requiresInstrument: 'impactor_bus' },
  },

  // ── #7 ISO Rapid-Response Interceptor ──────────────────────────────────
  {
    id: 'iso_interceptor',
    name: 'ISO Rapid-Response Interceptor',
    icon: '☄️',
    realAnchor: 'ESA Comet Interceptor (parks at L2 and waits for its target)',
    description:
      'Build it, park it at Sun–Earth L2, and wait. When the next ’Oumuamua/Borisov-'
      + 'class interstellar object is detected inbound, the interceptor burns for a '
      + 'flythrough — the only way humanity ever touches material from another star '
      + 'system without going there. If nothing comes, it waits. That is the bet.',
    designMonths: 6, buildMonths: 10, cruiseMonths: 2, opsMonths: ISO_INTERCEPT_OPS_MONTHS,
    waitsForIsoWindow: true,
    baseCost: 6_000_000_000,
    requiredResearch: ['deep_space_nav'],
    launchFailureProb: 0.03,
    cruiseRiskMult: 0.6,
    massBudgetKg: 700,
    locationId: 'geo',
    instruments: [
      { id: 'dust_impact_analyzer', name: 'Dust Impact Mass Analyzer', heritage: 'Stardust CIDA heritage', massKg: 90, cost: 180_000_000, finds: 'Per-grain elemental composition at flythrough speed — mineralogy of another star system.' },
      { id: 'nac_camera', name: 'Narrow-Angle Camera Suite', heritage: 'New Horizons LORRI heritage', massKg: 110, cost: 200_000_000, finds: 'Shape, rotation, and surface morphology through closest approach.' },
      { id: 'neutral_masspec', name: 'Neutral/Ion Mass Spectrometer', heritage: 'Rosetta ROSINA heritage', massKg: 160, cost: 350_000_000, finds: 'Coma volatiles and isotope ratios — the exotic-composition verdict lives here.' },
      { id: 'polarimeter', name: 'Imaging Polarimeter', heritage: 'Comet Interceptor OPIC-class', massKg: 60, cost: 120_000_000, finds: 'Grain structure and surface texture from polarized light.' },
      { id: 'plasma_pack', name: 'Plasma + Magnetometer Package', heritage: 'Comet Interceptor DFP-class', massKg: 70, cost: 130_000_000, finds: 'Solar-wind interaction — outgassing rate and any anomalous acceleration physics.' },
      { id: 'capture_cell', name: 'Whipple Capture Cell', heritage: 'Stardust aerogel + Whipple-shield hybrid', massKg: 140, cost: 300_000_000, finds: 'Fragment capture at hyperbolic encounter speed — destructive, partial, priceless.' },
    ],
    discoveryTable: [
      { id: 'iso_shape_model', name: 'ISO Shape + Rotation Model', requiresInstruments: ['nac_camera', 'polarimeter'], monthlyProb: 0.6,
        summary: 'The object resolves: elongated, tumbling, devolatilized crust — a Borisov-class comet with an ’Oumuamua-class shape.',
        payoff: { label: 'ISO Imaging Campaign Data Sale', moneyReward: 200_000_000, reputationPoints: 800 } },
      { id: 'iso_volatiles', name: 'Anomalous Volatile Ratios', requiresInstruments: ['neutral_masspec', 'plasma_pack'], monthlyProb: 0.45,
        summary: 'CO/H₂O far beyond solar-system comets (as on Borisov) plus a non-gravitational acceleration term the outgassing budget only just covers.',
        payoff: { label: 'ISO Volatile Chemistry', researchSpeedMultiplier: 1.08, effectDurationMonths: 4, reputationPoints: 900 } },
      { id: 'iso_exotic_composition', name: 'Exotic Composition Confirmed', requiresInstruments: ['dust_impact_analyzer'], requiresAllInstruments: ['capture_cell'], monthlyProb: 0.30,
        summary: 'Captured fragments contain condensates that formed around another star. Materials science acquires an interstellar reference sample; the Hive Collective takes an interest.',
        payoff: { label: 'ISO Materials Access', unlockRareTechId: 'iso_materials_analysis', reputationPoints: 2500, factionRep: { 'hive-collective': 10 } as Partial<Record<FactionId, number>> }, anomalyKind: 'ancient_artifact' },
    ],
    completionPayout: 1_200_000_000,
    milestone: { id: 'first_iso_intercept', label: 'First Interstellar-Object Intercept', at: 'science_ops' },
  },

  // ── #8 Restricted Sample Return ────────────────────────────────────────
  {
    id: 'restricted_sample_return',
    name: 'Restricted Sample Return',
    icon: '🧪',
    realAnchor: 'Mars Sample Return architecture + OSIRIS-REx curation; COSPAR Category V restricted-Earth-return rules',
    description:
      'Round-trip samples from a body that could plausibly host life — COSPAR '
      + 'Category V “restricted Earth return.” The variance is the point: lab-grade '
      + 'instruments on Earth see what no flight instrument can, and quarantine '
      + 'protocol is not optional. Fly the containment module or gamble the program’s '
      + 'reputation on a canister seal.',
    designMonths: 6, buildMonths: 12, cruiseMonths: 16, opsMonths: 6,
    baseCost: 15_000_000_000,
    requiredResearch: ['sample_return', 'landing_precision'],
    launchFailureProb: 0.05,
    cruiseRiskMult: 1.3,
    massBudgetKg: 1_500,
    locationId: 'mars_surface',
    instruments: [
      { id: 'ascent_canister', name: 'Sample Canister + Ascent Vehicle', heritage: 'MSR Mars Ascent Vehicle architecture', massKg: 620, cost: 1_200_000_000, finds: 'The samples themselves. Without the ascent stack nothing comes home.' },
      { id: 'bsl4_module', name: 'BSL-4 Receiving Containment Module', heritage: 'MSR Sample Receiving Facility, flight-packaged', massKg: 380, cost: 700_000_000, finds: 'Quarantine-grade curation. Prevents the contamination-scare failure mode entirely.' },
      { id: 'isotope_lab', name: 'Isotope Geochemistry Lab', heritage: 'Terrestrial IRMS lab bench, sample-return side', massKg: 160, cost: 300_000_000, finds: 'Formation ages and water histories at precisions flight instruments cannot touch.' },
      { id: 'microscopy_suite', name: 'Optical + Electron Microscopy Suite', heritage: 'OSIRIS-REx curation-lab protocol', massKg: 150, cost: 250_000_000, finds: 'Micron-scale textures — biomorphic or not, and the difference matters.' },
      { id: 'radiometric_pack', name: 'Radiometric Dating Package', heritage: 'K-Ar in-situ dating (KArLE concept), return-calibrated', massKg: 120, cost: 200_000_000, finds: 'Absolute chronology — anchors the entire regional geologic timescale.' },
      { id: 'organic_detector', name: 'Trace-Organics Detector', heritage: 'MSL SAM heritage, curation-side', massKg: 130, cost: 280_000_000, finds: 'Part-per-billion organics inventory in returned material.' },
    ],
    discoveryTable: [
      { id: 'pristine_cores', name: 'Pristine Core Chronology', requiresInstruments: ['radiometric_pack', 'isotope_lab'], requiresAllInstruments: ['ascent_canister'], monthlyProb: 0.20,
        summary: 'Returned cores date the last liquid-water epoch to ±10 Ma — textbook-rewriting precision.',
        payoff: { label: 'Core Chronology Published', moneyReward: 400_000_000, reputationPoints: 1200 } },
      { id: 'biomorphic_textures', name: 'Biomorphic Microtextures', requiresInstruments: ['microscopy_suite', 'organic_detector'], requiresAllInstruments: ['ascent_canister'], monthlyProb: 0.10,
        summary: 'Curation microscopy finds organic-rich laminae with textures at the edge of abiotic explanation — ALH84001’s debate, this time with pristine samples.',
        payoff: { label: 'Biomorphic Evidence — high-variance payoff', moneyReward: 600_000_000, reputationPoints: 1800, researchSpeedMultiplier: 1.08, effectDurationMonths: 4 }, anomalyKind: 'alien_signal' },
      { id: 'quarantine_clean', name: 'Quarantine Protocol Validated', requiresInstruments: ['bsl4_module'], monthlyProb: 0.25,
        summary: 'Full Category V receiving protocol runs clean end-to-end. The Accord’s planetary-protection board cites the program as the compliance benchmark.',
        payoff: { label: 'Category V Compliance Benchmark', reputationPoints: 800, factionRep: { 'the-dominion': 6, 'echo-remnants': 6 } as Partial<Record<FactionId, number>> } },
    ],
    completionPayout: 2_500_000_000,
    milestone: { id: 'first_restricted_sample_return', label: 'First Restricted Sample Return', at: 'completed', requiresInstrument: 'ascent_canister' },
  },

  // ── #9 Heliophysics Sentinel Constellation ─────────────────────────────
  {
    id: 'heliophysics_sentinels',
    name: 'Heliophysics Sentinel Constellation',
    icon: '☀️',
    realAnchor: 'SOHO / Parker Solar Probe / SWFO-L1 lineage + the proposed L5 vantage mission',
    description:
      'Sun-watching sentinels at L1 and L5. The L5 vantage sees active regions days '
      + 'before they rotate Earth-ward; the L1 monitor measures every CME that will '
      + 'arrive in the next hours. Together they turn the hazard forecast from one '
      + 'month of warning into two — and shave real damage off every solar storm.',
    designMonths: 4, buildMonths: 10, cruiseMonths: 6, opsMonths: 18, openEnded: true,
    baseCost: 7_000_000_000,
    requiredResearch: ['space_weather_monitoring'],
    launchFailureProb: 0.03,
    cruiseRiskMult: 0.6,
    massBudgetKg: 600,
    locationId: 'leo',
    instruments: [
      { id: 'coronagraph_wl', name: 'White-Light Coronagraph', heritage: 'SOHO LASCO / SWFO CCOR heritage', massKg: 120, cost: 250_000_000, finds: 'CME launch detection and speed — the arrival-time forecast anchor.' },
      { id: 'magnetograph', name: 'Vector Magnetograph', heritage: 'SDO/HMI heritage', massKg: 140, cost: 280_000_000, finds: 'Active-region magnetic complexity — flare probability days ahead.' },
      { id: 'faraday_cup', name: 'Solar-Wind Plasma Analyzer', heritage: 'Parker Solar Probe SWEAP Faraday cup', massKg: 60, cost: 150_000_000, finds: 'Upstream solar-wind density/speed at L1 — the last-hour severity call.' },
      { id: 'particle_suite', name: 'Energetic-Particle Detector Suite', heritage: 'GOES SEISS heritage', massKg: 70, cost: 130_000_000, finds: 'SEP event onset — radiation-storm alerts for crewed assets.' },
      { id: 'xrs_monitor', name: 'X-Ray Flare Monitor', heritage: 'GOES XRS heritage — the instrument behind every M/X flare classification', massKg: 40, cost: 90_000_000, finds: 'Real-time flare magnitude classification (the M/X scale itself).' },
      { id: 'l5_imager', name: 'L5 Heliospheric Imager', heritage: 'STEREO HI / ESA Vigil-class L5 vantage', massKg: 110, cost: 260_000_000, finds: 'Side-on CME tracking and pre-rotation active-region watch — the extra forecast month.' },
    ],
    discoveryTable: [
      { id: 'cme_catalog', name: 'CME Shock Catalog', requiresInstruments: ['coronagraph_wl', 'faraday_cup'], monthlyProb: 0.13,
        summary: 'A homogeneous launch-to-arrival CME catalog — transit-time models tighten by a third.',
        payoff: { label: 'CME Catalog Data Sale', moneyReward: 100_000_000, reputationPoints: 300 } },
      { id: 'flare_precursors', name: 'Flare Precursor Signatures', requiresInstruments: ['magnetograph', 'xrs_monitor'], monthlyProb: 0.10,
        summary: 'Shear-flow signatures precede X-class flares by 20-40 hours in the magnetograms — a genuine prediction, not a nowcast.',
        payoff: { label: 'Flare Prediction Model', reputationPoints: 700, researchSpeedMultiplier: 1.05, effectDurationMonths: 3 } },
      { id: 'sep_model', name: 'SEP Propagation Model', requiresInstruments: ['particle_suite'], requiresAllInstruments: ['l5_imager'], monthlyProb: 0.09,
        summary: 'Two-vantage particle timing (L1 detectors + the L5 imager) yields a radiation-storm arrival model crewed operators adopt fleet-wide.',
        payoff: { label: 'Radiation-Storm Model', reputationPoints: 500, moraleDelta: 0.02 } },
    ],
    completionPayout: 1_000_000_000,
    standingBenefits: { forecastExtraMonths: 1, solarStormDamageReduction: 0.15 },
  },

  // ── #10 Titan Rotorcraft Survey ────────────────────────────────────────
  {
    id: 'titan_rotorcraft',
    name: 'Titan Rotorcraft Survey',
    icon: '🚁',
    realAnchor: 'NASA Dragonfly (launched to Titan; the second powered aircraft on another world)',
    description:
      'Titan’s four-times-denser air and one-seventh gravity make it the easiest '
      + 'place in the solar system to fly. A nuclear-powered octocopter hops between '
      + 'dune fields, cryovolcanic flows, and hydrocarbon lake shores, running '
      + 'prebiotic chemistry assays at each stop — Dragonfly’s mission, at fleet scale.',
    designMonths: 6, buildMonths: 12, cruiseMonths: 34, opsMonths: 16,
    baseCost: 9_000_000_000,
    requiredResearch: ['aerial_exploration'],
    launchFailureProb: 0.03,
    cruiseRiskMult: 1.0,
    massBudgetKg: 900,
    locationId: 'saturn_system',
    instruments: [
      { id: 'rotorcraft_bus', name: 'Octocopter Mobility Bus', heritage: 'Dragonfly airframe heritage (MMRTG-powered)', massKg: 450, cost: 900_000_000, finds: 'Site-to-site mobility — tens of kilometres per hop. Ground-truth at fleet reach.' },
      { id: 'drams_gcms', name: 'GC–Mass Spectrometer', heritage: 'Dragonfly DraMS heritage', massKg: 130, cost: 350_000_000, finds: 'Prebiotic organics inventory at every landing site — tholins to amino-acid precursors.' },
      { id: 'met_station', name: 'Meteorology + Electric-Field Station', heritage: 'Huygens HASI heritage', massKg: 40, cost: 80_000_000, finds: 'Methane humidity, winds, Schumann resonances — the weather that shapes the surface.' },
      { id: 'dragns_spec', name: 'Gamma-Ray & Neutron Spectrometer', heritage: 'Dragonfly DraGNS heritage', massKg: 60, cost: 140_000_000, finds: 'Bulk surface composition under the haze — water-ice bedrock vs organic sand.' },
      { id: 'titan_seismometer', name: 'Surface Seismometer', heritage: 'InSight SEIS lineage, cryo-packaged', massKg: 50, cost: 110_000_000, finds: 'Titan-quakes and the depth of the subsurface water ocean.' },
      { id: 'radar_altimeter_ti', name: 'Radar Altimeter + Sounder', heritage: 'Cassini RADAR altimetry heritage', massKg: 70, cost: 130_000_000, finds: 'Lake bathymetry and shoreline change — the hydrocarbon-sea inventory.' },
    ],
    discoveryTable: [
      { id: 'prebiotic_ladder', name: 'Prebiotic Reaction Ladder', requiresInstruments: ['drams_gcms'], requiresAllInstruments: ['rotorcraft_bus'], monthlyProb: 0.08,
        summary: 'Site-to-site assays trace tholins reacting with transient liquid water into amino-acid precursors — prebiotic chemistry running in the wild.',
        payoff: { label: 'Prebiotic Chemistry Atlas', reputationPoints: 1400, researchSpeedMultiplier: 1.06, effectDurationMonths: 4 }, anomalyKind: 'alien_signal' },
      { id: 'lake_bathymetry', name: 'Hydrocarbon Lake Bathymetry', requiresInstruments: ['radar_altimeter_ti'], monthlyProb: 0.11,
        summary: 'Kraken Mare sounded to 300 m — the methane/ethane reserve inventory doubles, and the Nebula Reavers start asking about berth rights.',
        payoff: { label: 'Lake Inventory — Titan ops advantage', miningBonus: { locationId: 'saturn_system', resourceId: 'ethane', bonusPct: 15, durationMonths: 24 }, factionRep: { 'nebula-reavers': 6 } as Partial<Record<FactionId, number>> }, anomalyKind: 'rich_deposit' },
      { id: 'crust_composition', name: 'Crustal Composition Map', requiresInstruments: ['dragns_spec', 'met_station'], monthlyProb: 0.10,
        summary: 'Gamma-ray transects separate water-ice bedrock from organic dune seas — the terrain map every Titan build plan starts from.',
        payoff: { label: 'Composition Map Data Sale', moneyReward: 110_000_000, reputationPoints: 300 } },
      { id: 'subsurface_ocean_depth', name: 'Subsurface Ocean Sounding', requiresInstruments: ['titan_seismometer'], monthlyProb: 0.07,
        summary: 'Titan-quake echoes place the internal water ocean at 60 km depth — a second ocean world confirmed from its surface.',
        payoff: { label: 'Ocean Sounding Published', reputationPoints: 800, researchSpeedMultiplier: 1.04, effectDurationMonths: 3 } },
    ],
    completionPayout: 1_700_000_000,
  },

  // ── #11 Gravitational Wave Array ───────────────────────────────────────
  {
    id: 'gravitational_wave_array',
    name: 'Gravitational Wave Array',
    icon: '🌊',
    realAnchor: 'ESA/NASA LISA (adopted 2024, launch mid-2030s) — three drag-free spacecraft, 2.5 M km arms',
    description:
      'Three drag-free spacecraft in a triangular heliocentric formation, laser '
      + 'interferometry across million-kilometre arms, sensing millihertz spacetime '
      + 'strain: merging massive black holes, ten thousand Galactic binaries — and '
      + 'anything else that shakes spacetime at frequencies no ground detector can reach.',
    designMonths: 8, buildMonths: 20, cruiseMonths: 6, opsMonths: 24, openEnded: true,
    baseCost: 20_000_000_000,
    requiredResearch: ['gravitational_wave_det'],
    minCorporationTier: 4,
    launchFailureProb: 0.04,
    cruiseRiskMult: 0.6,
    massBudgetKg: 800,
    locationId: 'geo',
    instruments: [
      { id: 'test_mass_assy', name: 'Drag-Free Test-Mass Assemblies', heritage: 'LISA Pathfinder GRS heritage (femto-g residual acceleration)', massKg: 180, cost: 900_000_000, finds: 'The free-falling gold-platinum cubes the whole measurement hangs on.' },
      { id: 'interferometry_bench', name: 'Laser Interferometry Bench', heritage: 'LISA 1064 nm Nd:YAG metrology chain', massKg: 160, cost: 800_000_000, finds: 'Picometre pathlength readout across 2.5 million kilometres.' },
      { id: 'phasemeter', name: 'Phasemeter Electronics', heritage: 'LISA phasemeter (μcycle/√Hz)', massKg: 60, cost: 300_000_000, finds: 'The digital heart: microcycle phase tracking that turns beat notes into strain.' },
      { id: 'colloid_thrusters', name: 'Micro-Newton Colloid Thrusters', heritage: 'ST7-DRS heritage flown on LISA Pathfinder', massKg: 90, cost: 250_000_000, finds: 'Thrust so gentle the spacecraft can chase its own free-falling test mass.' },
      { id: 'telescope_assy', name: '30 cm Optical Telescope Assemblies', heritage: 'LISA telescope design', massKg: 120, cost: 350_000_000, finds: 'The transmit/receive optics that close the million-kilometre laser links.' },
      { id: 'grs_sensors', name: 'Gravitational Reference Sensors', heritage: 'LISA Pathfinder inertial-sensor heritage', massKg: 80, cost: 280_000_000, finds: 'Capacitive nanometre sensing of test-mass position inside the housings.' },
    ],
    discoveryTable: [
      { id: 'mbh_merger_catalog', name: 'Massive Black-Hole Merger Catalog', requiresInstruments: ['test_mass_assy', 'interferometry_bench'], monthlyProb: 0.09,
        summary: 'Mergers at redshift 6 arrive with months of warning and sky localization — multi-messenger astronomy’s standing appointment.',
        payoff: { label: 'Merger Catalog Published', reputationPoints: 1200, researchSpeedMultiplier: 1.06, effectDurationMonths: 4 } },
      { id: 'galactic_binary_map', name: 'Galactic Binary Foreground Map', requiresInstruments: ['phasemeter', 'telescope_assy'], monthlyProb: 0.11,
        summary: 'Ten thousand resolved white-dwarf binaries map the Galaxy in gravity — a dataset sold to every astrometry desk in the system.',
        payoff: { label: 'Binary Map Data Sale', moneyReward: 180_000_000, reputationPoints: 400 } },
      { id: 'precursor_strain_signal', name: 'Unmodeled Strain Transient', requiresInstruments: ['grs_sensors'], requiresAllInstruments: ['colloid_thrusters'], monthlyProb: 0.04,
        summary: 'A repeating millihertz transient matches no astrophysical template — and correlates, faintly, with Echo Remnant archive coordinates. They want the raw data.',
        payoff: { label: 'Precursor-Signal Hook', factionRep: { 'echo-remnants': 12 } as Partial<Record<FactionId, number>>, reputationPoints: 1000 }, anomalyKind: 'ancient_artifact' },
    ],
    completionPayout: 2_200_000_000,
    standingBenefits: { expeditionHazardReduction: 0.05 },
  },

  // ── #12 Heliopause Probe ───────────────────────────────────────────────
  {
    id: 'heliopause_probe',
    name: 'Heliopause Probe',
    icon: '🛰️',
    realAnchor: 'Voyager 1/2 crossings + JHU/APL Interstellar Probe study (2021)',
    description:
      'A fast probe out of the heliosphere — 7+ AU/year against Voyager’s 3.6 — '
      + 'charting the termination shock, heliopause, and the interstellar medium '
      + 'beyond. The boundary data de-risks every expedition that will ever leave '
      + 'the Sun’s bubble. Wanderer-1 flew through this region blind; yours won’t.',
    designMonths: 6, buildMonths: 12, cruiseMonths: 60, opsMonths: 24, openEnded: true,
    baseCost: 14_000_000_000,
    requiredResearch: ['rtg_enhanced', 'deep_space_nav'],
    minCorporationTier: 4,
    launchFailureProb: 0.04,
    cruiseRiskMult: 0.8,
    massBudgetKg: 500,
    locationId: 'outer_system',
    instruments: [
      { id: 'plasma_wave', name: 'Plasma Wave Suite', heritage: 'Voyager PWS — the instrument that heard the heliopause', massKg: 70, cost: 160_000_000, finds: 'Electron-density oscillations: the definitive boundary-crossing signature.' },
      { id: 'dust_detector_hp', name: 'Interstellar Dust Detector', heritage: 'Ulysses/Galileo dust-detector heritage', massKg: 60, cost: 140_000_000, finds: 'Interstellar grain flux and composition — what the local cloud is made of.' },
      { id: 'mag_boom', name: 'Fluxgate Magnetometer Boom', heritage: 'Voyager MAG heritage, 10 m boom', massKg: 50, cost: 110_000_000, finds: 'Field draping at the boundary — where the Sun’s magnetism actually ends.' },
      { id: 'ena_imager', name: 'Energetic Neutral Atom Imager', heritage: 'IBEX — mapper of the ENA “ribbon”', massKg: 65, cost: 150_000_000, finds: 'Global heliosphere shape imaging from inside — the map, not just the track.' },
      { id: 'mmrtg_pack', name: 'Next-Gen RTG Power Module', heritage: 'MMRTG/Pu-238 lineage (the Pu-238 supply is the real constraint)', massKg: 120, cost: 400_000_000, finds: 'Decades of power past 100 AU. Without it, the probe dies long before the boundary.' },
      { id: 'uv_photometer', name: 'Lyman-α UV Photometer', heritage: 'Voyager UVS heritage', massKg: 40, cost: 90_000_000, finds: 'Interstellar hydrogen inflow — the upstream weather of the local cloud.' },
    ],
    discoveryTable: [
      { id: 'termination_shock', name: 'Termination Shock Crossing', requiresInstruments: ['plasma_wave', 'mag_boom'], monthlyProb: 0.10,
        summary: 'The solar wind drops subsonic on schedule — first waypoint of the boundary transit, logged and telemetered.',
        payoff: { label: 'Termination Shock Charted', reputationPoints: 800, researchSpeedMultiplier: 1.04, effectDurationMonths: 3 } },
      { id: 'heliopause_crossing', name: 'Heliopause Crossing', requiresInstruments: ['plasma_wave'], requiresAllInstruments: ['mmrtg_pack'], monthlyProb: 0.07,
        summary: 'Plasma density jumps forty-fold: interstellar space. Every expedition route model inherits the boundary chart.',
        payoff: { label: 'Heliopause Charted — expedition on-ramp', reputationPoints: 2000, moneyReward: 300_000_000 }, anomalyKind: 'gravitational_lens' },
      { id: 'isd_composition', name: 'Interstellar Dust Composition', requiresInstruments: ['dust_detector_hp'], monthlyProb: 0.09,
        summary: 'The local cloud’s grain chemistry, measured in situ — feedstock intelligence for the interstellar era.',
        payoff: { label: 'ISD Composition Data Sale', moneyReward: 160_000_000, reputationPoints: 400 } },
      { id: 'ribbon_resolved', name: 'ENA Ribbon Resolved', requiresInstruments: ['ena_imager', 'uv_photometer'], monthlyProb: 0.08,
        summary: 'The IBEX ribbon resolves into the draped interstellar field — the heliosphere has a shape, and now a map.',
        payoff: { label: 'Heliosphere Map Published', reputationPoints: 900, researchSpeedMultiplier: 1.05, effectDurationMonths: 3 } },
    ],
    completionPayout: 2_800_000_000,
    standingBenefits: { expeditionSurveyPayoutBonus: 0.15, expeditionHazardReduction: 0.10, persistAfterCompletion: true },
    milestone: { id: 'first_heliopause_crossing', label: 'First Commercial Heliopause Crossing', at: 'science_ops' },
  },
];

export const SCIENCE_PROGRAM_MAP = new Map(SCIENCE_PROGRAMS.map(p => [p.id, p]));

/** Mission milestones (server first-claim race ids), keyed by program. */
export const MISSION_MILESTONES: Record<string, { id: string; label: string }> = Object.fromEntries(
  SCIENCE_PROGRAMS.filter(p => p.milestone).map(p => [p.id, { id: p.milestone!.id, label: p.milestone!.label }]),
);

// ─── NPC faction programs (world-shared, forecastable — NPC_BACKDROP) ───────
// Each NPC program runs on a fixed world cycle derived from the shared month
// index: co-fund window (design/build) → ops → settlement. Fully deterministic
// and identical for every player — published schedules players can plan
// around, exactly as NPC_BACKDROP.md prescribes.

export interface NpcProgramDef {
  id: string;
  name: string;
  factionId: FactionId;
  factionLabel: string;
  programRef: string;      // which flagship archetype the NPC is flying
  icon: string;
  description: string;
  cycleMonths: number;     // full run length
  offsetMonths: number;    // stagger so windows don't all open at once
  coFundWindowMonths: number; // first N months of each cycle accept stakes
  coFundCost: number;      // fixed stake size (meaningful, not trivial)
  /** Settlement multiplier band — world-seeded roll in [min, max] per cycle.
   *  Mean ≈ 1.1: positive expected value, real downside. The decision is a
   *  bet on a public program, not free money (BALANCE.md sink discipline:
   *  stake is an immediate sink; payout arrives a full cycle later). */
  payoutMultRange: [number, number];
  factionRepOnSettle: number;
}

export const NPC_PROGRAMS: NpcProgramDef[] = [
  {
    id: 'npc_dominion_sentinels', name: 'Accord Sentinel Network', factionId: 'the-dominion', factionLabel: 'The Dominion',
    programRef: 'heliophysics_sentinels', icon: '☀️',
    description: 'The Dominion procures a public space-weather sentinel constellation — SWFO-L1-class monitors under Accord charter. Co-funders share the data-license revenue.',
    cycleMonths: 24, offsetMonths: 0, coFundWindowMonths: 6, coFundCost: 800_000_000,
    payoutMultRange: [0.7, 1.5], factionRepOnSettle: 5,
  },
  {
    id: 'npc_echo_gw_survey', name: 'Remnant Deep-Listening Array', factionId: 'echo-remnants', factionLabel: 'Echo Remnants',
    programRef: 'gravitational_wave_array', icon: '🌊',
    description: 'The Echo Remnants fund a millihertz strain observatory — officially astrophysics, unofficially a search of their own archive coordinates. Co-funders receive catalog royalties.',
    cycleMonths: 30, offsetMonths: 8, coFundWindowMonths: 7, coFundCost: 1_200_000_000,
    payoutMultRange: [0.6, 1.7], factionRepOnSettle: 6,
  },
  {
    id: 'npc_syndicate_survey', name: 'Syndicate Prospecting Telescope', factionId: 'the-syndicate', factionLabel: 'The Syndicate',
    programRef: 'meridian_observatory', icon: '🔭',
    description: 'The Syndicate flies a survey telescope tuned to asteroid taxonomy and market-moving discovery embargoes. Co-funders get early data access, priced accordingly.',
    cycleMonths: 20, offsetMonths: 5, coFundWindowMonths: 5, coFundCost: 600_000_000,
    payoutMultRange: [0.8, 1.6], factionRepOnSettle: 4,
  },
  {
    id: 'npc_hive_plume', name: 'Hive Plume Communion', factionId: 'hive-collective', factionLabel: 'Hive Collective',
    programRef: 'enceladus_plume_sampler', icon: '⛲',
    description: 'The Hive Collective samples the Enceladus plumes for bio-material no other faction can process. Co-funders are paid in trade credit at settlement — generous when the harvest is good.',
    cycleMonths: 26, offsetMonths: 14, coFundWindowMonths: 6, coFundCost: 900_000_000,
    payoutMultRange: [0.5, 1.9], factionRepOnSettle: 6,
  },
];

export const NPC_PROGRAM_MAP = new Map(NPC_PROGRAMS.map(p => [p.id, p]));

export interface NpcProgramStatus {
  def: NpcProgramDef;
  cycleIndex: number;
  cycleStartMonth: number;
  monthsIntoCycle: number;
  phaseLabel: 'co-fund window' | 'build' | 'science ops' | 'data return';
  coFundOpen: boolean;
  settlesAtMonth: number;
  monthsToSettlement: number;
}

/** Deterministic, world-shared status of every NPC program at a month index. */
export function getNpcProgramStatuses(monthIndex: number): NpcProgramStatus[] {
  return NPC_PROGRAMS.map(def => {
    const shifted = Math.max(0, monthIndex - def.offsetMonths);
    const cycleIndex = Math.floor(shifted / def.cycleMonths);
    const cycleStartMonth = def.offsetMonths + cycleIndex * def.cycleMonths;
    const monthsIntoCycle = monthIndex - cycleStartMonth;
    const settlesAtMonth = cycleStartMonth + def.cycleMonths;
    let phaseLabel: NpcProgramStatus['phaseLabel'];
    if (monthsIntoCycle < def.coFundWindowMonths) phaseLabel = 'co-fund window';
    else if (monthsIntoCycle < Math.floor(def.cycleMonths * 0.5)) phaseLabel = 'build';
    else if (monthsIntoCycle < def.cycleMonths - 3) phaseLabel = 'science ops';
    else phaseLabel = 'data return';
    return {
      def, cycleIndex, cycleStartMonth, monthsIntoCycle, phaseLabel,
      coFundOpen: monthsIntoCycle >= 0 && monthsIntoCycle < def.coFundWindowMonths,
      settlesAtMonth,
      monthsToSettlement: Math.max(0, settlesAtMonth - monthIndex),
    };
  });
}

/** World-shared settlement multiplier for a given NPC program cycle —
 *  identical for every co-funder (a shared program outcome, not a private
 *  dice roll; hazards.ts "shared weather" principle). */
export function getNpcSettlementMultiplier(npcProgramId: string, cycleIndex: number): number {
  const def = NPC_PROGRAM_MAP.get(npcProgramId);
  if (!def) return 1;
  const rng = mulberry32(hashStringToSeed(`stw-science-npc:${npcProgramId}:${cycleIndex}`));
  const [min, max] = def.payoutMultRange;
  return min + rng() * (max - min);
}

/** Co-fund an open NPC program window. Pure; returns error reason on failure. */
export function coFundNpcProgram(
  state: GameState,
  npcProgramId: string,
  now: number = Date.now(),
): { ok: true; state: GameState } | { ok: false; reason: 'unknown_program' | 'window_closed' | 'already_funded' | 'insufficient_funds' } {
  const def = NPC_PROGRAM_MAP.get(npcProgramId);
  if (!def) return { ok: false, reason: 'unknown_program' };
  const monthIndex = getTotalGameMonths(state.gameDate);
  const status = getNpcProgramStatuses(monthIndex).find(s => s.def.id === npcProgramId);
  if (!status || !status.coFundOpen) return { ok: false, reason: 'window_closed' };
  const existing = (state.npcProgramContributions || []).some(
    c => c.npcProgramId === npcProgramId && c.cycleIndex === status.cycleIndex,
  );
  if (existing) return { ok: false, reason: 'already_funded' };
  if (state.money < def.coFundCost) return { ok: false, reason: 'insufficient_funds' };

  const contribution: NonNullable<GameState['npcProgramContributions']>[number] = {
    id: generateId(),
    npcProgramId,
    cycleIndex: status.cycleIndex,
    amount: def.coFundCost,
    contributedAtMonth: monthIndex,
    settlesAtMonth: status.settlesAtMonth,
    settled: false,
  };
  const event: GameEvent = {
    id: generateId(), date: state.gameDate, type: 'milestone',
    title: `🤝 Co-Funded: ${def.name}`,
    description: `${formatMoney(def.coFundCost)} staked in the ${def.factionLabel} program. Settlement at world month ${status.settlesAtMonth} (${status.monthsToSettlement} months out) at a shared, program-wide multiplier.`,
  };
  return {
    ok: true,
    state: {
      ...state,
      money: state.money - def.coFundCost,
      totalSpent: state.totalSpent + def.coFundCost,
      npcProgramContributions: [...(state.npcProgramContributions || []), contribution],
      eventLog: [event, ...(state.eventLog || [])].slice(0, MAX_EVENT_LOG),
    },
  };
}

// ─── Plan: validation + cost quote (pure — expeditions.ts pattern) ───────────

export interface ScienceMissionPlanRequest {
  programId: string;
  instrumentIds: string[];
  insured: boolean;
}

export interface ScienceMissionCostQuote {
  programBaseCost: number;
  instrumentsCost: number;
  insuranceBasis: number;
  insurancePremium: number;
  totalMoneyCost: number;
}

export interface ScienceMissionPlan {
  ok: true;
  program: ScienceProgramDef;
  instruments: InstrumentDef[];
  totalMassKg: number;
  totalPlannedMonths: number;
  costs: ScienceMissionCostQuote;
}

export interface ScienceMissionPlanError {
  ok: false;
  reason:
    | 'unknown_program'
    | 'missing_research'
    | 'tier_too_low'
    | 'wrong_instrument_count'
    | 'unknown_instrument'
    | 'duplicate_instrument'
    | 'over_mass_budget'
    | 'program_already_active'
    | 'insufficient_funds';
  missingResearch?: string[];
  detail?: string;
}

/** Whether a program has a live (non-terminal) mission instance. */
export function getActiveMissionForProgram(state: GameState, programId: string): ScienceMissionState | undefined {
  return (state.scienceMissions || []).find(
    m => m.programId === programId && m.phase !== 'completed' && m.phase !== 'failed',
  );
}

/** Validate a science mission and quote its full cost. Pure — never mutates. */
export function planScienceMission(
  state: GameState,
  req: ScienceMissionPlanRequest,
): ScienceMissionPlan | ScienceMissionPlanError {
  const program = SCIENCE_PROGRAM_MAP.get(req.programId);
  if (!program) return { ok: false, reason: 'unknown_program' };

  const missingResearch = program.requiredResearch.filter(id => !state.completedResearch.includes(id));
  if (missingResearch.length > 0) {
    return { ok: false, reason: 'missing_research', missingResearch };
  }
  if (program.minCorporationTier && (state.corporationTier || 1) < program.minCorporationTier) {
    return { ok: false, reason: 'tier_too_low', detail: `Requires corporation tier ${program.minCorporationTier}.` };
  }
  if (getActiveMissionForProgram(state, program.id)) {
    return { ok: false, reason: 'program_already_active' };
  }
  if (req.instrumentIds.length !== INSTRUMENTS_PER_MISSION) {
    return { ok: false, reason: 'wrong_instrument_count', detail: `Choose exactly ${INSTRUMENTS_PER_MISSION} instruments.` };
  }
  if (new Set(req.instrumentIds).size !== req.instrumentIds.length) {
    return { ok: false, reason: 'duplicate_instrument' };
  }
  const instrumentMap = new Map(program.instruments.map(i => [i.id, i]));
  const instruments: InstrumentDef[] = [];
  for (const id of req.instrumentIds) {
    const inst = instrumentMap.get(id);
    if (!inst) return { ok: false, reason: 'unknown_instrument', detail: `Unknown instrument: ${id}` };
    instruments.push(inst);
  }
  const totalMassKg = instruments.reduce((s, i) => s + i.massKg, 0);
  if (totalMassKg > program.massBudgetKg) {
    return { ok: false, reason: 'over_mass_budget', detail: `${totalMassKg} kg exceeds the ${program.massBudgetKg} kg payload budget.` };
  }

  const instrumentsCost = instruments.reduce((s, i) => s + i.cost, 0);
  const insuranceBasis = program.baseCost + instrumentsCost;
  const insurancePremium = req.insured ? Math.round(insuranceBasis * SCIENCE_INSURANCE_PREMIUM_RATE) : 0;
  const totalMoneyCost = program.baseCost + instrumentsCost + insurancePremium;
  if (state.money < totalMoneyCost) {
    return { ok: false, reason: 'insufficient_funds', detail: `Program start requires ${formatMoney(totalMoneyCost)}.` };
  }

  return {
    ok: true,
    program,
    instruments,
    totalMassKg,
    totalPlannedMonths: program.designMonths + program.buildMonths + program.cruiseMonths + program.opsMonths,
    costs: { programBaseCost: program.baseCost, instrumentsCost, insuranceBasis, insurancePremium, totalMoneyCost },
  };
}

// ─── Start ───────────────────────────────────────────────────────────────────

export interface StartScienceMissionResult {
  ok: true;
  state: GameState;
  mission: ScienceMissionState;
}

export function startScienceMission(
  state: GameState,
  req: ScienceMissionPlanRequest,
  now: number = Date.now(),
  /** Deterministic seed override for tests; defaults to a random seed —
   *  gameplay after this point is fully seed-determined (expeditions.ts). */
  seedOverride?: number,
): StartScienceMissionResult | ScienceMissionPlanError {
  const plan = planScienceMission(state, req);
  if (!plan.ok) return plan;
  const { program, costs } = plan;

  const seed = seedOverride !== undefined
    ? (seedOverride >>> 0)
    : (Math.floor(Math.random() * 0xffffffff) >>> 0);

  const mission: ScienceMissionState = {
    id: generateId(),
    programId: program.id,
    instrumentIds: [...req.instrumentIds],
    phase: 'design',
    startedAtMs: now,
    startGameMonth: getTotalGameMonths(state.gameDate),
    monthsElapsed: 0,
    seed,
    insured: req.insured,
    insurancePremiumPaid: costs.insurancePremium,
    totalCost: costs.totalMoneyCost,
    discoveries: [],
    discoveredEntryIds: [],
  };

  const event: GameEvent = {
    id: generateId(), date: state.gameDate, type: 'milestone',
    title: `${program.icon} Program Start: ${program.name}`,
    description: `${formatMoney(costs.totalMoneyCost)} committed — design ${program.designMonths} mo, build ${program.buildMonths} mo, cruise ${program.cruiseMonths} mo. Instruments: ${plan.instruments.map(i => i.name).join(', ')}. ${req.insured ? 'Launch + cruise insured.' : 'UNINSURED — loss is uncovered.'}`,
  };

  return {
    ok: true,
    mission,
    state: {
      ...state,
      money: state.money - costs.totalMoneyCost,
      totalSpent: state.totalSpent + costs.totalMoneyCost,
      scienceMissions: [...(state.scienceMissions || []), mission],
      eventLog: [event, ...(state.eventLog || [])].slice(0, MAX_EVENT_LOG),
    },
  };
}

// ─── Phase geometry helpers ─────────────────────────────────────────────────

/** Cumulative phase boundaries in mission-months (design end, build end,
 *  cruise end, primary-ops end). ISO interceptor's wait is open-ended and
 *  handled separately. */
export function getPhaseBoundaries(program: ScienceProgramDef): { designEnd: number; buildEnd: number; cruiseEnd: number; opsEnd: number } {
  const designEnd = program.designMonths;
  const buildEnd = designEnd + program.buildMonths;
  const cruiseEnd = buildEnd + program.cruiseMonths;
  const opsEnd = cruiseEnd + program.opsMonths;
  return { designEnd, buildEnd, cruiseEnd, opsEnd };
}

export const PHASE_LABEL: Record<ScienceMissionPhase, string> = {
  design: 'Design & integration studies',
  build: 'Flight hardware build',
  cruise: 'Cruise to target',
  on_station: 'On station — awaiting target',
  science_ops: 'Science operations',
  extended_ops: 'Extended operations',
  completed: 'Data returned',
  failed: 'Mission lost',
};

// ─── Standing benefits (consumed by game-engine / expeditions) ──────────────

function missionBenefitActive(m: ScienceMissionState, program: ScienceProgramDef): boolean {
  if (m.phase === 'science_ops' || m.phase === 'extended_ops') return true;
  if (m.phase === 'completed' && program.standingBenefits?.persistAfterCompletion) return true;
  return false;
}

/** Severe-hazard forecast horizon in game-months (base 1; Sentinels add 1).
 *  Consumed by game-engine's warning block — additive hook only, hazards.ts
 *  itself is untouched (forecastSevereHazards is simply called per month). */
export function getForecastHorizonMonths(state: GameState): number {
  let horizon = 1;
  for (const m of state.scienceMissions || []) {
    const program = SCIENCE_PROGRAM_MAP.get(m.programId);
    if (!program?.standingBenefits?.forecastExtraMonths) continue;
    if (missionBenefitActive(m, program)) horizon += program.standingBenefits.forecastExtraMonths;
  }
  return Math.min(3, horizon);
}

/** Post-roll hazard damage multipliers from science-mission standing
 *  benefits — the exact consumption pattern W1 used for research
 *  hazardResistance in game-engine's hazard block (post-roll, pre-apply).
 *  Reductions are capped so the risk pillar stays real. */
export function getScienceHazardDamageMultipliers(state: GameState): { solar_storm: number; micrometeorite: number } {
  let solarReduction = 0;
  let impactReduction = 0;
  for (const m of state.scienceMissions || []) {
    const program = SCIENCE_PROGRAM_MAP.get(m.programId);
    const b = program?.standingBenefits;
    if (!b || !program || !missionBenefitActive(m, program)) continue;
    if (b.solarStormDamageReduction) solarReduction += b.solarStormDamageReduction;
    if (b.impactDamageReduction) impactReduction += b.impactDamageReduction;
  }
  solarReduction = Math.min(SCIENCE_HAZARD_REDUCTION_CAP, solarReduction);
  impactReduction = Math.min(SCIENCE_HAZARD_REDUCTION_CAP, impactReduction);
  return { solar_storm: 1 - solarReduction, micrometeorite: 1 - impactReduction };
}

/** Interstellar-expedition bonuses from science charting (Meridian census,
 *  heliopause boundary chart, GW deep-space sensing). Consumed in
 *  expeditions.ts — survey payouts rise, transit hazard damage falls. */
export function getExpeditionScienceBonuses(state: GameState): { surveyPayoutMult: number; hazardDamageMult: number } {
  let payoutBonus = 0;
  let hazardReduction = 0;
  for (const m of state.scienceMissions || []) {
    const program = SCIENCE_PROGRAM_MAP.get(m.programId);
    const b = program?.standingBenefits;
    if (!b || !program || !missionBenefitActive(m, program)) continue;
    if (b.expeditionSurveyPayoutBonus) payoutBonus += b.expeditionSurveyPayoutBonus;
    if (b.expeditionHazardReduction) hazardReduction += b.expeditionHazardReduction;
  }
  return {
    surveyPayoutMult: 1 + Math.min(0.30, payoutBonus),
    hazardDamageMult: 1 - Math.min(0.25, hazardReduction),
  };
}

/** ISO window probability this world-month (Meridian raises detection). */
export function getIsoWindowProb(state: GameState): number {
  let prob = ISO_WINDOW_BASE_PROB;
  for (const m of state.scienceMissions || []) {
    const program = SCIENCE_PROGRAM_MAP.get(m.programId);
    const b = program?.standingBenefits;
    if (b?.isoDetectionBonus && program && missionBenefitActive(m, program)) prob += b.isoDetectionBonus;
  }
  return Math.min(0.10, prob);
}

// ─── Tick processing (wired into game-engine.processFullTick) ───────────────

/** Advance all science missions + settle NPC co-funding to the current
 *  game-month. Pure; returns the same state reference when idle. All
 *  gameplay randomness flows from mission seeds + month indices and
 *  world-shared hashes — no Math.random (expeditions.ts discipline). */
export function processScienceMissionTick(state: GameState, now: number = Date.now()): GameState {
  const hasWork =
    (state.scienceMissions || []).some(m => m.phase !== 'completed' && m.phase !== 'failed') ||
    (state.npcProgramContributions || []).some(c => !c.settled);
  if (!hasWork) return state;

  const currentMonth = getTotalGameMonths(state.gameDate);
  const events: GameEvent[] = [];
  const reports: GameReport[] = [];
  let out: GameState = state;
  let changed = false;

  const riskMitigation = getScienceRiskMitigation(state.completedResearch);

  // ── 1. Missions ──────────────────────────────────────────────────────────
  const missions = (state.scienceMissions || []).map(original => {
    if (original.phase === 'completed' || original.phase === 'failed') return original;
    const program = SCIENCE_PROGRAM_MAP.get(original.programId);
    if (!program) return original;

    const targetElapsed = Math.min(
      Math.max(0, currentMonth - original.startGameMonth),
      original.monthsElapsed + MAX_CATCHUP_MONTHS,
    );
    if (targetElapsed <= original.monthsElapsed) return original;
    changed = true;

    const m: ScienceMissionState = {
      ...original,
      discoveries: [...original.discoveries],
      discoveredEntryIds: [...original.discoveredEntryIds],
    };
    const bounds = getPhaseBoundaries(program);
    const fitted = new Set(m.instrumentIds);

    for (let month = m.monthsElapsed + 1; month <= targetElapsed; month++) {
      m.monthsElapsed = month;
      const rng = mulberry32((m.seed + month * 7919) >>> 0);

      // Phase: design → build (bookkeeping only — cost was paid upfront).
      if (m.phase === 'design' && month >= bounds.designEnd) {
        m.phase = 'build';
        events.push({
          id: generateId(), date: state.gameDate, type: 'milestone',
          title: `${program.icon} ${program.name}: CDR passed`,
          description: `Critical design review complete — flight hardware build begins (${program.buildMonths} months).`,
        });
      }

      // Phase: build → LAUNCH ROLL → cruise (or failed).
      if (m.phase === 'build' && month >= bounds.buildEnd) {
        const failProb = program.launchFailureProb * (1 - riskMitigation);
        if (rng() < failProb) {
          m.phase = 'failed';
          m.failedReason = 'launch_failure';
          m.completedAtMs = now;
          const payout = m.insured ? Math.round(m.totalCost * SCIENCE_INSURANCE_PAYOUT_RATE) : 0;
          if (payout > 0) {
            out = { ...out, money: out.money + payout, totalEarned: out.totalEarned + payout };
          }
          events.push({
            id: generateId(), date: state.gameDate, type: 'random_event',
            title: `💥 Launch Failure: ${program.name}`,
            description: `Vehicle lost during ascent. ${payout > 0 ? `Insurance paid ${formatMoney(payout)}.` : 'No insurance coverage — total program loss.'} The program can be restarted.`,
          });
          break;
        }
        m.launched = true;
        m.phase = 'cruise';
        events.push({
          id: generateId(), date: state.gameDate, type: 'milestone',
          title: `🚀 Launched: ${program.name}`,
          description: `Nominal insertion. Cruise to target: ${program.cruiseMonths} months.`,
        });
      }

      // Cruise hazard: monthly deep-space loss roll (research-mitigated).
      if (m.phase === 'cruise') {
        const lossProb = CRUISE_BASE_MONTHLY_FAILURE_PROB * program.cruiseRiskMult * (1 - riskMitigation);
        if (rng() < lossProb) {
          m.phase = 'failed';
          m.failedReason = 'cruise_loss';
          m.completedAtMs = now;
          const payout = m.insured ? Math.round(m.totalCost * SCIENCE_INSURANCE_PAYOUT_RATE) : 0;
          if (payout > 0) {
            out = { ...out, money: out.money + payout, totalEarned: out.totalEarned + payout };
          }
          events.push({
            id: generateId(), date: state.gameDate, type: 'random_event',
            title: `📡 Contact Lost: ${program.name}`,
            description: `Spacecraft anomaly in cruise, ${month} months into the mission. ${payout > 0 ? `Insurance paid ${formatMoney(payout)}.` : 'No insurance coverage.'}`,
          });
          break;
        }
        if (month >= bounds.cruiseEnd) {
          if (program.waitsForIsoWindow) {
            m.phase = 'on_station';
            events.push({
              id: generateId(), date: state.gameDate, type: 'milestone',
              title: `${program.icon} ${program.name}: On Station`,
              description: 'Parked and hibernating at Sun–Earth L2. The interceptor now waits for an interstellar object — the window is not scheduled; it is detected.',
            });
          } else {
            m.phase = 'science_ops';
            events.push({
              id: generateId(), date: state.gameDate, type: 'milestone',
              title: `${program.icon} Science Ops Begin: ${program.name}`,
              description: `Instruments commissioned at target. Primary science phase: ${program.opsMonths} months.`,
            });
            maybeMarkMilestone(m, program, 'science_ops');
          }
        }
      }

      // On station (ISO interceptor): world-shared window roll.
      if (m.phase === 'on_station' && m.interceptWindowMonth === undefined) {
        const worldMonth = m.startGameMonth + month;
        const windowRng = mulberry32(hashStringToSeed(`stw-science-iso-window:${worldMonth}`));
        if (windowRng() < getIsoWindowProb(out)) {
          m.interceptWindowMonth = month;
          m.phase = 'science_ops';
          events.push({
            id: generateId(), date: state.gameDate, type: 'random_event',
            title: `☄️ ISO INBOUND — Intercept Window Open`,
            description: `Deep-sky surveys flag a hyperbolic object. ${program.name} burns for intercept: ${ISO_INTERCEPT_OPS_MONTHS} months of flythrough science, then the object is gone forever.`,
          });
          maybeMarkMilestone(m, program, 'science_ops');
        }
      }

      // Science ops / extended ops: discovery rolls.
      if (m.phase === 'science_ops' || m.phase === 'extended_ops') {
        for (const entry of program.discoveryTable) {
          if (m.discoveredEntryIds.includes(entry.id)) continue;
          const anyOf = entry.requiresInstruments.some(id => fitted.has(id));
          const allOf = (entry.requiresAllInstruments || []).every(id => fitted.has(id));
          if (!anyOf || !allOf) continue;
          // Extended ops rolls at half rate — the long tail, not the spike.
          const prob = entry.monthlyProb * (m.phase === 'extended_ops' ? 0.5 : 1);
          if (rng() >= prob) continue;

          m.discoveredEntryIds.push(entry.id);
          const record: ScienceMissionDiscoveryRecord = {
            id: generateId(),
            entryId: entry.id,
            name: entry.name,
            missionMonth: month,
            summary: entry.summary,
            payoffSummary: consequencePreview(entry.payoff).join(' · '),
          };
          m.discoveries.push(record);

          // Payoff through the W4 wired-hooks dispatcher (money ledger,
          // reputation, faction standing, morale, activeEffects,
          // miningBonuses, rare-tech access flags).
          out = applyChainConsequence(out, entry.payoff, currentMonth);

          // Feed the discoveries database (Discoveries tab) — recorded as an
          // already-claimed entry: mission science is proprietary corp data,
          // not a stakeable field anomaly.
          if (entry.anomalyKind) {
            const known = out.knownAnomalies || [];
            out = {
              ...out,
              knownAnomalies: [{
                id: `sci_${record.id}`,
                kind: entry.anomalyKind,
                locationId: program.locationId,
                discoveredAtMs: now,
                fadesAtMs: now + 365 * 24 * 60 * 60 * 1000,
                claimed: true,
                claimedByCorp: out.companyName || 'Your Corporation',
                claimedAtMs: now,
                title: entry.name,
                summary: entry.summary,
                rewards: {},
              }, ...known].slice(0, 200),
            };
          }

          events.push({
            id: generateId(), date: state.gameDate, type: 'milestone',
            title: `🔬 Discovery: ${entry.name}`,
            description: `${program.name} — ${entry.summary}`,
          });
          reports.push({
            id: generateId(), type: 'probe_discovery',
            title: `${program.name}: ${entry.name}`,
            body: `${entry.summary}\n\nPayoff: ${record.payoffSummary}`,
            createdAt: now, read: false, locationId: program.locationId,
          });
        }
      }

      // Primary ops conclude.
      if (m.phase === 'science_ops') {
        const opsEnd = program.waitsForIsoWindow
          ? (m.interceptWindowMonth !== undefined ? m.interceptWindowMonth + ISO_INTERCEPT_OPS_MONTHS : Number.POSITIVE_INFINITY)
          : bounds.opsEnd;
        if (month >= opsEnd) {
          const payout = program.completionPayout;
          out = { ...out, money: out.money + payout, totalEarned: out.totalEarned + payout };
          if (program.openEnded) {
            m.phase = 'extended_ops';
            events.push({
              id: generateId(), date: state.gameDate, type: 'milestone',
              title: `${program.icon} Primary Mission Complete: ${program.name}`,
              description: `Primary dataset sold for ${formatMoney(payout)}. The observatory enters extended operations — standing benefits and the discovery long-tail continue.`,
            });
          } else {
            m.phase = 'completed';
            m.completedAtMs = now;
            events.push({
              id: generateId(), date: state.gameDate, type: 'milestone',
              title: `${program.icon} Mission Complete: ${program.name}`,
              description: `Data returned and archived. Survey dataset sold for ${formatMoney(payout)}. ${m.discoveries.length} discover${m.discoveries.length === 1 ? 'y' : 'ies'} logged.`,
            });
          }
          maybeMarkMilestone(m, program, 'completed');
        }
      }

      // Terminal states stop the catch-up loop — a completed mission's
      // month counter freezes at its completion month (keeps big-jump
      // catch-up identical to stepped processing).
      if ((m.phase as ScienceMissionPhase) === 'completed' || (m.phase as ScienceMissionPhase) === 'failed') break;
    }

    return m;
  });

  // ── 2. NPC co-funding settlements (world-shared multiplier) ──────────────
  const contributions = (state.npcProgramContributions || []).map(c => {
    if (c.settled || c.settlesAtMonth > currentMonth) return c;
    changed = true;
    const def = NPC_PROGRAM_MAP.get(c.npcProgramId);
    const mult = getNpcSettlementMultiplier(c.npcProgramId, c.cycleIndex);
    const payout = Math.round(c.amount * mult);
    out = { ...out, money: out.money + payout, totalEarned: out.totalEarned + payout };
    if (def) {
      const rep = out.factionReputation || {};
      const current = rep[def.factionId] ?? 0;
      out = {
        ...out,
        factionReputation: { ...rep, [def.factionId]: Math.max(-100, Math.min(100, current + def.factionRepOnSettle)) },
      };
    }
    events.push({
      id: generateId(), date: state.gameDate, type: 'milestone',
      title: `🤝 Program Settled: ${def?.name || c.npcProgramId}`,
      description: `Your ${formatMoney(c.amount)} stake settled at ×${mult.toFixed(2)} — ${formatMoney(payout)} paid out.${def ? ` +${def.factionRepOnSettle} standing with ${def.factionLabel}.` : ''}`,
    });
    return { ...c, settled: true, settledAtMonth: currentMonth, payout };
  });

  if (!changed && events.length === 0) return state;

  return {
    ...out,
    scienceMissions: missions,
    npcProgramContributions: contributions,
    eventLog: events.length > 0
      ? [...events, ...(out.eventLog || [])].slice(0, MAX_EVENT_LOG)
      : out.eventLog,
    reports: reports.length > 0
      ? [...(out.reports || []), ...reports].slice(-50)
      : out.reports,
  };
}

/** Mark milestone eligibility when the trigger fires (instrument-gated —
 *  no ocean entry without the cryobot). The page posts the server claim. */
function maybeMarkMilestone(m: ScienceMissionState, program: ScienceProgramDef, at: 'science_ops' | 'completed'): void {
  const ms = program.milestone;
  if (!ms || ms.at !== at || m.milestoneEligibleId) return;
  if (ms.requiresInstrument && !m.instrumentIds.includes(ms.requiresInstrument)) return;
  m.milestoneEligibleId = ms.id;
}

/** Page bookkeeping: flag a mission's milestone claim as attempted so the
 *  POST fires once (idempotent under re-renders/reloads). */
export function markMilestoneClaimAttempted(state: GameState, missionId: string): GameState {
  const missions = state.scienceMissions || [];
  if (!missions.some(m => m.id === missionId && m.milestoneEligibleId && !m.milestoneClaimAttempted)) return state;
  return {
    ...state,
    scienceMissions: missions.map(m => (m.id === missionId ? { ...m, milestoneClaimAttempted: true } : m)),
  };
}

// ─── Read-only helpers (panel / HUD) ────────────────────────────────────────

export interface ScienceMissionProgress {
  mission: ScienceMissionState;
  program: ScienceProgramDef;
  phaseLabel: string;
  /** 0-1 across design+build+cruise+primary-ops (open-ended: primary arc). */
  progressPct: number;
  /** Months to the next phase boundary (null while waiting on station). */
  monthsToNextPhase: number | null;
  totalPlannedMonths: number;
}

export function getScienceMissionProgress(state: GameState, missionId: string): ScienceMissionProgress | null {
  const mission = (state.scienceMissions || []).find(m => m.id === missionId);
  if (!mission) return null;
  const program = SCIENCE_PROGRAM_MAP.get(mission.programId);
  if (!program) return null;
  const bounds = getPhaseBoundaries(program);
  const total = bounds.opsEnd;
  let monthsToNextPhase: number | null = null;
  switch (mission.phase) {
    case 'design': monthsToNextPhase = Math.max(0, bounds.designEnd - mission.monthsElapsed); break;
    case 'build': monthsToNextPhase = Math.max(0, bounds.buildEnd - mission.monthsElapsed); break;
    case 'cruise': monthsToNextPhase = Math.max(0, bounds.cruiseEnd - mission.monthsElapsed); break;
    case 'on_station': monthsToNextPhase = null; break;
    case 'science_ops':
      monthsToNextPhase = program.waitsForIsoWindow && mission.interceptWindowMonth !== undefined
        ? Math.max(0, mission.interceptWindowMonth + ISO_INTERCEPT_OPS_MONTHS - mission.monthsElapsed)
        : Math.max(0, bounds.opsEnd - mission.monthsElapsed);
      break;
    default: monthsToNextPhase = 0;
  }
  return {
    mission,
    program,
    phaseLabel: PHASE_LABEL[mission.phase],
    progressPct: Math.min(1, mission.monthsElapsed / Math.max(1, total)),
    monthsToNextPhase,
    totalPlannedMonths: total,
  };
}

/** Missions that should appear in the order-queue HUD (live, non-terminal). */
export function getActiveScienceMissions(state: GameState): ScienceMissionState[] {
  return (state.scienceMissions || []).filter(m => m.phase !== 'completed' && m.phase !== 'failed');
}

// ─── Content integrity guards (exercised by tests) ──────────────────────────

/** Every discovery entry must be reachable by at least one legal 3-instrument
 *  loadout within the mass budget. Exported for the content-integrity test. */
export function isDiscoveryReachable(program: ScienceProgramDef, entry: DiscoveryDef): boolean {
  const ids = program.instruments.map(i => i.id);
  const massOf = new Map(program.instruments.map(i => [i.id, i.massKg]));
  // Enumerate all 3-combos (instrument lists are ≤7 — at most 35 combos).
  for (let a = 0; a < ids.length; a++) {
    for (let b = a + 1; b < ids.length; b++) {
      for (let c = b + 1; c < ids.length; c++) {
        const combo = [ids[a], ids[b], ids[c]];
        const mass = combo.reduce((s, id) => s + (massOf.get(id) || 0), 0);
        if (mass > program.massBudgetKg) continue;
        const set = new Set(combo);
        const anyOf = entry.requiresInstruments.some(id => set.has(id));
        const allOf = (entry.requiresAllInstruments || []).every(id => set.has(id));
        if (anyOf && allOf) return true;
      }
    }
  }
  return false;
}

/** All research ids referenced by programs — must exist in RESEARCH_MAP. */
export function getReferencedResearchIds(): string[] {
  const ids = new Set<string>();
  for (const p of SCIENCE_PROGRAMS) for (const r of p.requiredResearch) ids.add(r);
  return Array.from(ids);
}

/** Validate referenced research at module load in dev/test (cheap guard —
 *  a typo'd id would silently soft-lock a program). */
if (process.env.NODE_ENV !== 'production') {
  for (const id of getReferencedResearchIds()) {
    if (!RESEARCH_MAP.has(id)) {
      // eslint-disable-next-line no-console
      console.warn(`science-missions: required research id "${id}" not found in RESEARCH_MAP`);
    }
  }
}
