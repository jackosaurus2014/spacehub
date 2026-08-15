// ─── Concept Glossary (Wave V2, docs/VISUAL_DEPTH_2026-08.md §V2) ───────────
// Registry backing the HoloTip nested-concept layer (src/components/game/HoloTip.tsx).
// Every entry documents a mechanic that ALREADY EXISTS in the engine — this
// file never invents new gameplay, it explains what the code in src/lib/game
// already does. When a mechanic changes, its concept entry must be updated
// in the same PR (the "no new mechanics described" invariant from the spec).
//
// Shape follows the spec exactly: { id, name, short, body, related[] }.
// `short` is a one-line sub-caption (used in compact contexts / row labels).
// `body` is the 1-3 sentence definition shown in the HoloTip's expanded page.
// `related` is how nested-concept navigation happens — see HoloTip.tsx's
// `<Concept>` component, which renders each related id as a clickable chip
// that pushes a breadcrumbed page (max depth 2) inside the open tooltip.
//
// Icon ids reference src/lib/game/icons.tsx IconName — kept optional since
// not every concept has a natural pictogram.

import type { IconName } from './icons';

export interface ConceptEntry {
  id: string;
  name: string;
  /** One-line sub-caption. */
  short: string;
  /** 1-3 sentence definition. Must match the actual mechanic — see the
   *  cited lib file in the trailing comment on each entry below. */
  body: string;
  icon?: IconName;
  related?: string[];
}

const c = (entry: ConceptEntry): ConceptEntry => entry;

export const CONCEPTS: Record<string, ConceptEntry> = {
  // ── Core economic loop ──────────────────────────────────────────────────
  'net-income': c({
    id: 'net-income', name: 'Net Income', icon: 'money',
    short: 'Revenue minus costs, per month',
    body: 'Monthly service revenue plus contract income, minus building maintenance, workforce payroll, ship upkeep, and standing-directive ops fees. This is the number that determines whether your corporation is compounding or bleeding cash.',
    related: ['maintenance', 'standing-directive', 'workforce-bonus'],
  }),
  maintenance: c({
    id: 'maintenance', name: 'Maintenance', icon: 'build',
    short: 'Monthly building upkeep cost',
    body: 'Every completed building charges a monthly maintenance cost, scaled up by its upgrade level and reduced by automation research and corporation-tier bonuses. Idle or destroyed buildings still cost nothing — only completed, standing structures bill you.',
    related: ['upgrade-level', 'corporation-tier'],
  }),
  'upgrade-level': c({
    id: 'upgrade-level', name: 'Upgrade Level', icon: 'trending-up',
    short: 'Building tier — boosts output, raises upkeep',
    body: 'Upgrading a building raises its revenue or output multiplier but also raises its maintenance cost multiplier — every upgrade is a trade, never a free win, matching the game\'s no-dominant-strategy design invariant.',
    related: ['maintenance'],
  }),
  'corporation-tier': c({
    id: 'corporation-tier', name: 'Corporation Tier', icon: 'alliance',
    short: 'Your corp\'s scale rank — unlocks + passive bonuses',
    body: 'Corporation Tier is your empire\'s overall progression rank (1 through 5+). Higher tiers grant passive revenue and maintenance-reduction bonuses and unlock new systems (command-queue slots, era chartering, deeper contracts) — tiers are earned through sustained economic growth, not purchased.',
    related: ['net-income', 'era-charter'],
  }),
  'workforce-bonus': c({
    id: 'workforce-bonus', name: 'Workforce Bonus', icon: 'workforce',
    short: 'Crew mix modifies revenue, output, and upkeep',
    body: 'Your hired engineers, scientists, miners, and operators each contribute a different passive multiplier (service revenue, research speed, mining output, maintenance reduction). The mix you hire is a real allocation decision, not just a headcount.',
  }),
  'delivery-cap': c({
    id: 'delivery-cap', name: 'Daily Delivery Cap', icon: 'clock',
    short: 'Contracts pay full price, no broker fee — capped per rolling 24h',
    body: 'Delivery contracts pay their full spot-linked value with no market broker cut, so an uncapped stream of them would out-earn a diversified corporation. Completions are capped on a rolling 24-hour window: a base of 4, +1 for researching Space Logistics Network, +1 at Corporation Tier 5 (Conglomerate) — 6 at most. Contracts stay a strong supplement to services, markets, and megaprojects, never the dominant income source.',
    related: ['net-income', 'corporation-tier'],
  }),

  // ── Standing Orders / Away Efficiency (LS1) ─────────────────────────────
  'away-efficiency': c({
    id: 'away-efficiency', name: 'Away Efficiency', icon: 'clock',
    short: 'How fast your economy runs while you\'re offline',
    body: 'There is no time cap on absences — instead, longer time away from the session runs your economy at a lower percentage rate instead of freezing it entirely. Automation research and a higher operator share of your workforce raise the efficiency ceiling for every away tier.',
    related: ['standing-directive', 'command-queue'],
  }),
  'standing-directive': c({
    id: 'standing-directive', name: 'Standing Directive', icon: 'balance',
    short: 'A hands-off automation rule (auto-sell, auto-restock…)',
    body: 'Standing directives run your economy automatically while you\'re away: auto-sell above a floor price, auto-restock below a ceiling, auto-renew expiring contracts, or hold a minimum cash reserve. Each ACTIVE directive raises the monthly ops-fee for every directive superlinearly — see Directive Ops Fee — so automating everything is never free.',
    related: ['directive-ops-fee', 'away-efficiency'],
  }),
  'directive-ops-fee': c({
    id: 'directive-ops-fee', name: 'Directive Ops Fee', icon: 'money',
    short: 'Superlinear monthly cost of standing directives',
    body: 'The monthly overhead for standing directives grows faster than linearly with how many are active at once (a fixed base rate raised to a fixed exponent per directive count) — this is a deliberate money sink from docs/BALANCE.md: a fully-automated corporation is a real ongoing expense, not a free lever.',
    related: ['standing-directive'],
  }),
  'command-queue': c({
    id: 'command-queue', name: 'Command Queue', icon: 'clock',
    short: 'Queued research/build orders that auto-start when free',
    body: 'The command queue lets you stack research and construction orders ahead of time so a freed research or build slot starts the next queued item automatically — base capacity is fixed, and is raised by automation research and by reaching Corporation Tier 5.',
    related: ['away-efficiency', 'corporation-tier'],
  }),

  // ── Programs (LS6) ───────────────────────────────────────────────────────
  'program-track': c({
    id: 'program-track', name: 'Program Track', icon: 'track-crew-cohort',
    short: 'One of three parallel EVE-style training channels',
    body: 'Programs run on three independent wall-clock channels — Crew Cohorts (certifies workforce, granting permanent bonuses), Leadership Development, and R&D Residency — each with its own queue that keeps ticking whether or not you\'re logged in.',
    related: ['leader-retirement'],
  }),
  'leader-retirement': c({
    id: 'leader-retirement', name: 'Leader Retirement', icon: 'commanders',
    short: 'Two real months of continuous assignment → retirement',
    body: 'A commander posted continuously to the same assignment for two real months retires, granting a legacy bonus and a mentor boost for your next same-class hire. Reassigning them to a different posting resets the retirement clock, so long-term postings are a deliberate commitment.',
  }),

  // ── Corporate Eras (LS4) ─────────────────────────────────────────────────
  'era-charter': c({
    id: 'era-charter', name: 'Era Charter', icon: 'scroll',
    short: 'A 90-real-day epoch with a declared bonus + malus',
    body: 'Chartering an era commits your corporation to a 90-real-day focus, granting a stated bonus paired with a stated malus — never a free win. Progress toward the charter\'s goal earns a permanent medal (Platinum/Gold/Silver/Bronze/Filed) at the era\'s close, and finished eras can be published to your public Chronicle.',
    related: ['era-medal', 'corporation-tier'],
  }),
  'era-medal': c({
    id: 'era-medal', name: 'Era Medal', icon: 'medal',
    short: 'Permanent grade earned from an era\'s goal score',
    body: 'Your era\'s goal score (actual progress divided by target) is graded into a permanent medal at close: Platinum ≥150% of target, Gold ≥100%, Silver ≥60%, Bronze ≥25%, otherwise Filed. The medal is permanent history — it never changes after the era ends.',
    related: ['era-charter'],
  }),

  // ── Economy / Markets ────────────────────────────────────────────────────
  'mean-reversion': c({
    id: 'mean-reversion', name: 'Mean Reversion', icon: 'trending-down',
    short: 'Idle prices drift back toward base price over time',
    body: 'When a commodity\'s price sits idle (no trades in the last few minutes), an hourly cron nudges it back toward its base price — roughly a 6.6-real-hour half-life, about one in-game month. A price crash or squeeze is tradeable for a session, then the market heals; recent active trading suppresses the pull so you can\'t be fought while price-discovering.',
    related: ['super-cycle', 'order-book-depth'],
  }),
  'super-cycle': c({
    id: 'super-cycle', name: 'Commodity Super-Cycle', icon: 'seasons',
    short: 'A season-long demand theme that shifts where prices heal to',
    body: 'Each 28-day season carries an announced commodity theme (e.g. a Volatiles Boom raising water/methane demand), published a week ahead on the calendar. The theme shifts the target that Mean Reversion pulls idle prices toward — it doesn\'t force a one-off price shock, it changes the market\'s resting point for the season.',
    related: ['mean-reversion'],
  }),
  'order-book-depth': c({
    id: 'order-book-depth', name: 'Order Book Depth', icon: 'market',
    short: 'Total buy/sell volume stacked at each price level',
    body: 'The order book shows every open bid and ask at its price level, with bar width scaled to quantity — deeper levels mean more volume must be absorbed before price moves past them. NPC market-maker orders are tagged separately from player orders so you can read genuine player liquidity apart from the floor.',
    related: ['escrow', 'mean-reversion'],
  }),
  escrow: c({
    id: 'escrow', name: 'Order Escrow', icon: 'lock',
    short: 'Funds/resources held the moment you place a limit order',
    body: 'Placing a buy order escrows the full cost plus the 2% fee immediately; placing a sell order escrows the resource quantity itself. Escrow is returned automatically if you cancel the order, and any unused excess is refunded the moment a buy fills below your limit price — this is what makes the order book trustworthy against client-side manipulation.',
    related: ['order-book-depth'],
  }),

  // ── Faction standing / zones ─────────────────────────────────────────────
  'zone-standing': c({
    id: 'zone-standing', name: 'Zone Standing', icon: 'faction-dominion',
    short: 'Your reputation tier with the faction controlling a zone',
    body: 'Every contested zone is influenced by the six factions; your standing there (Hostile → Neutral → Friendly → Allied) changes prices at that faction\'s services — Allied gets roughly 15% better pricing, Hostile roughly 25% worse or services withheld outright.',
    related: ['influence-share'],
  }),
  'influence-share': c({
    id: 'influence-share', name: 'Influence Share', icon: 'territory',
    short: 'Your percentage of a zone\'s total influence points',
    body: 'Influence points accrue from your economic activity in a zone (buildings, services, contracts fulfilled there) and decay daily if you stop investing. Your influence share relative to every other player and faction in that zone determines who controls it.',
    related: ['zone-standing'],
  }),

  // ── Governance / Senate ──────────────────────────────────────────────────
  'senate-docket': c({
    id: 'senate-docket', name: 'Accord Senate Docket', icon: 'governance',
    short: 'The quarter\'s open measures you can lobby on',
    body: 'Each quarter the Accord Council opens a docket of measures; players can commit lobbying resources any time the docket is open, and the published odds shift live as commitments come in. The docket resolves at the quarter boundary and the next one opens automatically.',
  }),
  'alliance-charter': c({
    id: 'alliance-charter', name: 'Season Charter', icon: 'cal-alliance-charter',
    short: 'A corp\'s chosen alliance-season focus + deadline',
    body: 'A season charter is your corporation\'s declared focus for the alliance season — it appears on the Mission Calendar with its own countdown to the season\'s end and feeds the alliance-level scoring for that period.',
  }),

  // ── Spatial / logistics ──────────────────────────────────────────────────
  'delta-v': c({
    id: 'delta-v', name: 'Δv (Delta-v)', icon: 'fleet',
    short: 'Velocity change a route costs — drives fuel + travel time',
    body: 'Δv is the propulsive effort a route between two locations requires — a physically-grounded per-route figure, not a flat distance. Higher-Δv routes cost more fuel to freight and take longer to transit; there is no teleportation in Space Tycoon, so every shipping lane is a real logistics investment.',
    related: ['freight-cost'],
  }),
  'freight-cost': c({
    id: 'freight-cost', name: 'Freight Fuel Cost', icon: 'cargo-truck',
    short: 'Fuel spent moving cargo along a route\'s Δv',
    body: 'Freight fuel cost is computed from the route\'s Δv, the ship\'s cargo load, and any transit-speed research or module bonuses that reduce it. Loading more cargo or choosing a higher-Δv route both raise the bill — logistics is a real line item, not an afterthought.',
    related: ['delta-v'],
  }),
  'lane-decay': c({
    id: 'lane-decay', name: 'Lane Decay', icon: 'fleet',
    short: 'Unused trade routes lose their built-up speed/safety bonus',
    body: 'Shipping lanes get faster, safer, and cheaper the more they\'re used, via beacon and refueling-depot investment — but an abandoned lane degrades back over time. Repeated use is what keeps a route\'s bonus alive.',
  }),
  'orbital-slot': c({
    id: 'orbital-slot', name: 'Orbital Slot', icon: 'territory',
    short: 'Finite premium anchorage (GEO, Lagrange, lunar polar…)',
    body: 'High-value anchorages — geostationary orbit, stable Lagrange points, lunar polar slots — are finite inventory. Ownership transfers at market-clearing prices, so control of the best slots is contested and earned, never free.',
  }),

  // ── Hazards / risk ────────────────────────────────────────────────────────
  insurance: c({
    id: 'insurance', name: 'Insurance', icon: 'shield',
    short: 'Partial payout when a hazard destroys an insured asset',
    body: 'Insured buildings and ships pay out a partial cash recovery when a hazard (solar storm, micrometeorite, pirate raid, equipment failure) destroys them — it softens the loss, it never prevents it. Hazards are never player-vs-player combat; they are the game\'s designed source of real economic risk.',
    related: ['hazard-damage'],
  }),
  'hazard-damage': c({
    id: 'hazard-damage', name: 'Hazard Damage', icon: 'hazard-generic',
    short: 'Partial or total loss from a random hazard event',
    body: 'A hazard either damages an asset by a percentage (recoverable, no payout) or destroys it outright (insurance payout if covered). Hazards are NPC/environmental, never inflicted by other players — direct PvP combat does not exist in Space Tycoon.',
    related: ['insurance'],
  }),

  // ── Research ──────────────────────────────────────────────────────────────
  'doctrine-lock': c({
    id: 'doctrine-lock', name: 'Doctrine Lock', icon: 'balance',
    short: 'Choosing one sibling tech permanently locks its alternative',
    body: 'Some research pairs are mutually exclusive doctrine choices — completing one permanently locks out its sibling for that playthrough. This is a deliberate specialization decision (matching the "meaningful decisions, no dominant strategy" design invariant), and the game asks for confirmation before you commit.',
  }),
  'repeatable-research': c({
    id: 'repeatable-research', name: 'Repeatable Research', icon: 'research',
    short: 'A tech you can re-research for stacking levels, up to a cap',
    body: 'Repeatable research techs can be completed multiple times, each level adding to the bonus up to a defined maximum level — cost typically rises per level, so stacking further is a real ongoing investment decision, not a one-time unlock.',
  }),

  // ── Leagues / standings ─────────────────────────────────────────────────
  'league-bracket': c({
    id: 'league-bracket', name: 'League Bracket', icon: 'leaderboard',
    short: 'Your weekly competitive peer group',
    body: 'Each weekly league season groups players into brackets so standings compare you against peers of similar scale rather than the whole server — new players are protected from being ranked against veterans, matching the game\'s new-player on-ramp commitment.',
  }),

  // ── Legacy / progression ─────────────────────────────────────────────────
  legacy: c({
    id: 'legacy', name: 'Legacy', icon: 'scroll',
    short: 'Permanent cross-run bonuses earned from past milestones',
    body: 'Legacy bonuses are small, permanent multipliers (revenue, cost reduction) earned from major milestones like completed corporate eras and retired commanders — they persist across the corporation\'s life rather than resetting, rewarding sustained long-term play.',
    related: ['era-charter'],
  }),
};

export function getConcept(id: string): ConceptEntry | undefined {
  return CONCEPTS[id];
}

/** Every concept id referenced by another concept's `related[]` must resolve
 *  — enforced by src/lib/game/__tests__/concepts.test.ts. Exported for the
 *  test rather than duplicating the traversal. */
export function getAllReferencedIds(): string[] {
  const ids = new Set<string>();
  for (const entry of Object.values(CONCEPTS)) {
    for (const rel of entry.related || []) ids.add(rel);
  }
  return Array.from(ids);
}
