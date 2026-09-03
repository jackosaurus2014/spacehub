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
    title: 'Your buildings need people — and research stops selling you +0.00%',
    summary: 'Two changes that make the numbers on a card mean something. Every building and hull now names the crew it needs to run at full output, and understaffing costs you real revenue instead of nothing. And the research tree stops charging billions for techs that were mathematically worth zero: the tree now tells you, before you buy, exactly how much a tech adds to YOUR corporation.',
    changes: [
      'Every building and every hull now lists a crew requirement — a small launch pad wants one engineer and one operator; a Mars station wants twelve people; a mining hull wants pilots. The Workforce tab shows required vs hired for each role, with a Hire to crew button on whichever role you are short on.',
      'Understaffing is a real cost, not a warning. Service revenue and mining output scale from half at zero crew up to full when you are properly staffed, and it is your WORST-staffed role that sets the number — one empty role holds the whole corporation down. Overstaffing buys nothing but payroll, so there is no point hoarding people.',
      'New corporations are shielded: while you are inside the Protected Frontier the floor is 70%, not 50%, so the first few buildings stay comfortably profitable while you learn the system.',
      'Because a fleet now genuinely demands labour, the shared wage market finally responds to how much everyone is building instead of only to how many players are online. Unfilled positions bid for crew too.',
      'Research: the aggregate caps that bonuses stack toward now RISE with your corporation tier — a Transcendent corporation can push service revenue research to +95% where a startup tops out at +50%. Per-tech bonuses in the crowded categories were lowered to match, so a full research category fills a bucket instead of two techs filling it and the other eighty doing nothing.',
      'The Research panel now shows, on every tech, what your current bonus is and what it becomes if you buy it. If a tech would add +0.0% at your tier, it says so in amber before you spend the money.',
      'Five techs whose only effect was mathematically unreachable are now labelled honestly as "Prerequisite — no direct bonus" and cost a quarter of what they did. They still unlock exactly what they always unlocked. One more — Generation Ships — was given a real bonus instead of being retired: closed-loop life support now cuts your buildings’ input consumption.',
    ],
  },
  {
    date: '2026-09-02', tag: 'economy',
    title: 'Goods are where you left them — and orders to other stars travel at light speed',
    summary: 'Two changes to how distance works. Materials now have to BE at the site that uses them: a beam on Earth no longer builds a base on Mars. And an order sent to a colony in another star system is transmitted, not executed — it crosses at two game-months per light-year and takes effect when it arrives.',
    changes: [
      'Where your goods are now matters. Once you own a freight hull, building materials are paid out of the stock at the build location, crafting draws its inputs at the plant that runs the recipe and stores the output there, servicer repairs use parts on site, survey finds stay at the body you surveyed, and scrapping a remote facility leaves the salvage there. The Earth/LEO/GEO cluster is one shared pool, so near-Earth play is unchanged.',
      'The Build tab tells you what is missing and where it is — "180 iron must be hauled to Mars Surface from Earth Surface" — and offers a one-click Dispatch hauler that loads your biggest idle freighter at the source and quotes the real fuel bill before you commit. A new "Stock by location" table shows every pool at a glance.',
      'Selling still happens at Earth. The market and delivery contracts clear only from the home cluster, so ore mined at Ceres has to come home before it can be sold — that was always true, and the panels now say so plainly.',
      'Never owned a freighter? Nothing changes for you at all. The single shared stockpile keeps working exactly as before until your first transport or tanker is built.',
      'Interstellar orders now travel. Founding a colony, expanding one, opening or suspending a trade route, and recalling a survey expedition are transmitted to the destination and execute on arrival: two game-months per light-year, which is about two days to Proxima Centauri and four to Sirius. The Interstellar panel and the order queue show each one crossing, with the time remaining.',
      'The fee leaves when the order does. You can cancel an order still in transit, but there is no refund — the mission was bought when you sent it. If conditions change before it lands (someone already founded a colony there), the order fails on arrival and says so.',
      'Recalling an expedition early now pays survey data for the months actually worked, not the full projection. Getting your hull and crew back sooner is a real trade, not a free win. Colony arks hold station permanently and cannot be recalled.',
    ],
  },
  {
    date: '2026-09-02', tag: 'economy',
    title: 'Research, ships and location unlocks join the corporate registry',
    summary: 'The registry that started recording buildings this morning now records research starts, ship orders, ship scrapping and location unlocks as server transactions, and derives your active services from the buildings and research it holds. Contracts, espionage unlocks, season challenges, zone influence, demand pools, colony presence and book value read the registry for all of it.',
    changes: [
      'What changed for you: nothing in the flow. Starting research, ordering a hull, scrapping a ship and unlocking a location confirm with the registry first; a refusal (not enough cash or materials, a prerequisite you do not have, both research queues busy, every shipyard slot in use, a location whose research you have not finished) leaves your save untouched and tells you why.',
      'Location unlocks were free server-side until now — only your save file paid for them. The unlock fee is now charged through the ledger. Claiming a colony slot at a body is still its own separate fee, as before.',
      'Existing corporations: your completed research and unlocked locations were adopted into the registry on your first sync after this release, at no cost. Your fleet is adopted the first time the updated game sends it — reload once if you have been playing for a while. Nothing was removed.',
      'Services are no longer something your save file asserts: the registry derives them from the buildings and research it holds, exactly the way the game engine does. If the two disagree the difference is logged, not enforced, for now.',
      'Rollout: everything runs in shadow this week (record and compare, change nothing). Once the comparison is clean, enforcement covers buildings, research, ships, services and unlocks in one switch; anything the registry never sold you is struck on the next sync.',
    ],
  },
  {
    date: '2026-09-02', tag: 'economy',
    title: 'Buildings are ordered through the corporate registry',
    summary: 'Every build, refit, decommission, mothball, reactivation and rush repair is now a server transaction: the registry prices it, charges the wallet and materials through the same ledger every trade uses, and records the structure with a server completion time. Contracts, book value, zone influence, season challenges and milestone claims read that registry instead of the save file.',
    changes: [
      'What changed for you: nothing in the flow. The Build tab works as before. Orders confirm with the registry first; if the registry refuses (not enough cash, a contested orbit without a lease, a location that has not synced yet) the order is not placed and the reason is shown.',
      'Why: until now the server learned about your buildings only from your save file, so a forged file could claim a fleet of stations it never paid for and have contracts, rankings and zone governorships believe it. A structure now exists server-side only because a paid transaction created it.',
      'Existing corporations: your current buildings were adopted into the registry on your first sync after this release, exactly once, at no cost. Nothing was removed.',
      'Completion times: the registry finishes a build on its own clock, which ignores workforce, commander and doctrine speed bonuses (they only ever make a build faster). Your local view can show a structure complete a little before the registry does; contract checks follow the registry.',
      'Rollout: the registry runs in shadow this week (it records and compares, changes nothing). Once the comparison is clean it starts enforcing: a building the registry never sold you is removed on the next sync.',
    ],
  },
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
