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
    summary: 'Goods on the order book, finite demand pools, depletion, labour markets and lanes; construction purposes and takeovers (dormant until 25 corporations).',
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
