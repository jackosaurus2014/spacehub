// Space Tycoon public dev log — the game-specific record behind
// /space-tycoon/dev-log. Curated, dated, and honest: what changed for
// players and why. The site-wide CHANGELOG (src/lib/changelog.ts) is a
// different, product-level list. Newest first.

export interface DevLogEntry {
  date: string; // ISO
  title: string;
  summary: string;
  changes: string[];
  tag: 'economy' | 'world' | 'content' | 'balance' | 'ux';
}

export const GAME_DEVLOG: DevLogEntry[] = [
  {
    date: '2026-09-02', tag: 'balance',
    title: 'First quarterly balance report published',
    summary: 'The public economic health report promised in the policy is now live: the 50-year balance simulation re-run on the unified clock with and without Mark-II refits, the first flagship payback measured in practice, inequality by decade, the live world as it actually is (two corporations), and what is watched next quarter. Every figure is sourced; nothing is estimated.',
    changes: [
      'Read it at /space-tycoon/balance-reports/2026-q3. Reports are quarterly from here on.',
      'Headline: year-50 inequality across the eight simulated archetypes falls from a Gini of 0.730 to 0.548 when corporations take Mark-II refits; the first Jupiter datacenter returns its $20B in 76 game-months on its own line; money-supply sink coverage stays 95-104% in every decade.',
      'Live world on publication day: two corporations, median net worth $236.9M, no player order-book fills in the trailing 30 days. Retention and faction balance are marked "measured next quarter" rather than invented.',
      'No balance constant changed for this report. The one constant that would move the largest deviation is named, with the recommendation to leave it alone and why.',
    ],
  },
  {
    date: '2026-09-02', tag: 'economy',
    title: 'Post-mortem: the game ran on two clocks',
    summary: "The engine credited one game-month of revenue every 60 real seconds while the world calendar advanced one game-month every 6 real hours. Income accrued 360 times faster than the world it was priced in. The tick now follows the calendar, and every balance was divided by 360 so nobody's relative position changed.",
    changes: [
      "What happened: the calendar (years, quarters, seasons, leagues, expeditions) has always run at 6 real hours per game-month. A separate engine constant said a game-month was 30 ticks of 2 seconds — 60 seconds. Revenue, costs, payroll and mining were divided by that 30 every tick, so a corporation earned a full month of income every minute. Every balance playtest was run at the 6-hour rate, which is why the numbers in the design docs never matched what players saw.",
      "How it was found: the September design review traced the top Epoch 2 corporation — $250B earned from eleven starter-tier buildings in nine days, with nothing in the catalogue worth buying — and the day-old newcomer at $482M from four buildings. The playtest tables put a week-old eleven-building corporation near $370M.",
      "What changed: ticks-per-month is now derived from the calendar (10,800 ticks of 2 s = 6 h) instead of typed; the two places that recomputed the 60-second month for ETAs use the calendar directly; offline operations accrue on the same clock and now charge corporate overhead and executive compensation like a live session; the server's money plausibility ceiling is derived from what your corporation can actually gross per calendar month, with a hard $500K/s backstop; sub-unit mining output is carried between ticks instead of rounded away.",
      "What was rescaled: on 2026-09-02 every corporation's cash, lifetime earned, lifetime spent, net worth, peak net worth and every resource stockpile were divided by 360. Buildings, ships, research, leaders, contracts and everything else were left exactly as they were. A snapshot of every profile was taken first and can be restored.",
      "Compensation: none, deliberately. Every corporation was scaled by the same factor, so rankings, tiers and relative standing are unchanged. Nobody exploited anything — the game itself was miscounting.",
      "Remaining risk: monthly run-rate displays that used to move every minute now move every 6 hours; construction and research timers were always wall-clock and are unaffected. If a number on your dashboard looks wrong after the change, use the Feedback tab — this is exactly what it is for.",
    ],
  },
  {
    date: '2026-09-01', tag: 'economy',
    title: 'NPC demand is published ahead of time',
    summary: 'The NPC industrial corporations, faction procurement drives and service demand floors now publish what they will buy and sell over the next three days — the same numbers the hourly tick executes, so you can plan production around them.',
    changes: [
      'Markets → Analytics → NPC Demand: window, corporation, resource, side, quantity, price cap and confidence for every scheduled NPC purchase and listing; filter follows the order book.',
      'Order-book header shows "NPC demand next 72h: buy X / sell Y" for the selected resource.',
      'Price campaigns are declared from the order book, with the server quote (fee, ammunition, window) shown before you confirm; Analytics links there.',
      'Rivals cards gained "Poach talent" and "View their market share"; the Competitive Posture strip opens both offense flows directly.',
      'No economic number changed — this is visibility, not a rebalance.',
    ],
  },
  {
    date: '2026-08-29', tag: 'economy',
    title: 'Hardware is manufactured, and only what someone built is for sale',
    summary: 'Components and hardware left the NPC price curve entirely. They are made at fabrication facilities from resources and reach the market only when a player or an NPC industrial corporation lists them.',
    changes: [
      'New Terrestrial Fabrication Works on Earth (T1) — the first factory; any fabrication facility of sufficient tier can now run a recipe.',
      'Five named NPC industrial corporations buy raw inputs at live prices, manufacture, list at cost-plus, and bid for what they consume — from finite treasuries.',
      'The NPC market maker rests no orders for hardware; the curve neither buys nor sells it. Player listings on the order book are the market.',
      'Life-support packs got a crafting recipe.',
    ],
  },
  {
    date: '2026-08-28', tag: 'world',
    title: 'Real rockets and real launch sites feed the simulation',
    summary: 'Every launch vehicle and spaceport on SpaceNexus now has a live page, and those live schedules are the same data the game reads for launch windows and space weather.',
    changes: ['Referral loop: invite a player, become their mentor, share in their first-month growth.', 'Public corporation pages and leaderboard.'],
  },
  {
    date: '2026-08-24', tag: 'world',
    title: 'Epoch 2',
    summary: 'The world restarted fresh. Every deposit, orbital slot and lane was unclaimed at 17:50 UTC; the Epoch 1 ledger is preserved in the Chronicle.',
    changes: ['Fresh-world restart with backups of Epoch 1.', 'Epoch banner and the public chronicle of what Epoch 1 corporations did.'],
  },
  {
    date: '2026-08-17', tag: 'balance',
    title: 'Balance passes 1–9',
    summary: 'Nine passes on money sinks, mining economics and the new-player glide path — the result of a fifty-year automated playtest.',
    changes: [
      'Boil-off and warehousing costs; storage caps by resource tier.',
      'Wage-indexed hiring; payroll shielded in the Protected Frontier.',
      'Orbital-slot gate enforced; mining duty-cycle operating costs; market-keyed campaign fees.',
      'Fourteen-day graduation glide from the Frontier into the open economy.',
    ],
  },
  {
    date: '2026-08-16', tag: 'economy',
    title: 'Economic PvP waves E1–E7 and meaningful decisions M1–M6',
    summary: 'Goods on the order book, finite demand pools, depletion, labour markets and lanes; construction purposes and takeovers (dormant until 10 active corporations).',
    changes: ['Player-to-player limit orders with escrow and a bounded NPC liquidity floor.', 'Finite demand pools so cornering a market is possible and visible.', 'Resource depletion and lane wear.'],
  },
  {
    date: '2026-08-13', tag: 'content',
    title: '4X waves: 277 technologies, a WebGL solar-system map, 80 leaders',
    summary: 'The research tree, the map and the commander roster reached their current shape.',
    changes: ['Interactive WebGL map with region art for every zone.', 'Named commanders and faction leaders with portraits.', 'Legendary hulls and event illustrations.'],
  },
];

export const DEVLOG_TAG_LABEL: Record<DevLogEntry['tag'], string> = {
  economy: 'Economy', world: 'World', content: 'Content', balance: 'Balance', ux: 'Interface',
};
