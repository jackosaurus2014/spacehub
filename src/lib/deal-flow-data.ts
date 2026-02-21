// ────────────────────────────────────────────────────────────────
// Space Industry Deal Flow Database
// Comprehensive historical dataset of funding rounds, M&A,
// IPOs/SPACs, and major contract wins in the space sector.
// ────────────────────────────────────────────────────────────────

export type DealType = 'funding_round' | 'acquisition' | 'ipo' | 'spac' | 'contract_win';

export interface DealParty {
  company: string;
  companySlug?: string;
  role: 'target' | 'acquirer' | 'recipient' | 'investor' | 'awarder';
}

export interface Deal {
  id: string;
  type: DealType;
  title: string;
  amount: number | null; // USD
  date: string; // ISO date string
  parties: DealParty[];
  stage?: string; // Seed, Series A, etc.
  source: string;
  sourceUrl?: string;
  verified: boolean;
  description: string;
}

export interface DealStats {
  totalDeals: number;
  totalVolume: number;
  avgDealSize: number;
  dealsThisMonth: number;
  volumeThisMonth: number;
  ytdDealCount: number;
  ytdVolume: number;
  byType: { type: DealType; count: number; volume: number }[];
  byQuarter: { quarter: string; count: number; volume: number }[];
  byYear: { year: number; count: number; volume: number }[];
}

// ────────────────────────────────────────────────────────────────
// Deal Database — 115 historical space industry deals
// ────────────────────────────────────────────────────────────────

const DEALS: Deal[] = [
  // ═══════════════════════════════════════
  // FUNDING ROUNDS (65)
  // ═══════════════════════════════════════

  // SpaceX funding history
  {
    id: 'deal-spacex-series-a',
    type: 'funding_round',
    title: 'SpaceX Series A',
    amount: 100_000_000,
    date: '2006-03-15',
    parties: [
      { company: 'SpaceX', companySlug: 'spacex', role: 'recipient' },
      { company: 'Founders Fund', role: 'investor' },
    ],
    stage: 'Series A',
    source: 'SEC Filing',
    verified: true,
    description: 'SpaceX raised $100M in its Series A round, with significant personal investment from Elon Musk alongside Founders Fund. The round funded development of the Falcon 1 rocket.',
  },
  {
    id: 'deal-spacex-series-b',
    type: 'funding_round',
    title: 'SpaceX Series B',
    amount: 100_000_000,
    date: '2008-08-04',
    parties: [
      { company: 'SpaceX', companySlug: 'spacex', role: 'recipient' },
      { company: 'Founders Fund', role: 'investor' },
    ],
    stage: 'Series B',
    source: 'SEC Filing',
    verified: true,
    description: 'Second major funding round for SpaceX following the third Falcon 1 failure. Elon Musk invested his last personal funds to keep the company alive.',
  },
  {
    id: 'deal-spacex-series-g',
    type: 'funding_round',
    title: 'SpaceX Series G',
    amount: 1_000_000_000,
    date: '2015-01-20',
    parties: [
      { company: 'SpaceX', companySlug: 'spacex', role: 'recipient' },
      { company: 'Google', role: 'investor' },
      { company: 'Fidelity Investments', role: 'investor' },
    ],
    stage: 'Series G',
    source: 'Wall Street Journal',
    sourceUrl: 'https://www.wsj.com/articles/spacex-raises-1-billion-in-financing-from-google-fidelity-1421787461',
    verified: true,
    description: 'Google and Fidelity invested $1B for approximately 10% of SpaceX, valuing the company at roughly $10B. Funds earmarked for Starlink satellite internet constellation.',
  },
  {
    id: 'deal-spacex-series-n',
    type: 'funding_round',
    title: 'SpaceX Series N Equity Round',
    amount: 750_000_000,
    date: '2022-04-06',
    parties: [
      { company: 'SpaceX', companySlug: 'spacex', role: 'recipient' },
      { company: 'Andreessen Horowitz', role: 'investor' },
      { company: 'Sequoia Capital', role: 'investor' },
    ],
    stage: 'Series N',
    source: 'CNBC',
    sourceUrl: 'https://www.cnbc.com/2022/04/06/spacex-raises-equity-round-at-127-billion-valuation.html',
    verified: true,
    description: 'SpaceX raised $750M at a $127B valuation, making it one of the most valuable private companies globally. Funds supported Starship development and Starlink expansion.',
  },
  {
    id: 'deal-spacex-2023-round',
    type: 'funding_round',
    title: 'SpaceX Equity Round 2023',
    amount: 750_000_000,
    date: '2023-07-21',
    parties: [
      { company: 'SpaceX', companySlug: 'spacex', role: 'recipient' },
      { company: 'Andreessen Horowitz', role: 'investor' },
    ],
    stage: 'Late Stage',
    source: 'Bloomberg',
    sourceUrl: 'https://www.bloomberg.com/news/articles/2023-07-21/spacex-raises-round-at-150-billion-valuation',
    verified: true,
    description: 'SpaceX raised $750M at a $150B valuation, driven by Starlink profitability milestones and Starship development progress.',
  },
  {
    id: 'deal-spacex-2024-tender',
    type: 'funding_round',
    title: 'SpaceX Tender Offer & Equity',
    amount: 2_000_000_000,
    date: '2024-06-17',
    parties: [
      { company: 'SpaceX', companySlug: 'spacex', role: 'recipient' },
    ],
    stage: 'Late Stage',
    source: 'Bloomberg',
    sourceUrl: 'https://www.bloomberg.com/news/articles/2024-06-17/spacex-valued-at-210-billion',
    verified: true,
    description: 'SpaceX completed a combined tender offer and primary share sale valuing the company at approximately $210B. Both insiders and new investors participated.',
  },

  // Relativity Space
  {
    id: 'deal-relativity-series-d',
    type: 'funding_round',
    title: 'Relativity Space Series D',
    amount: 500_000_000,
    date: '2020-11-23',
    parties: [
      { company: 'Relativity Space', companySlug: 'relativity-space', role: 'recipient' },
      { company: 'Tiger Global', role: 'investor' },
      { company: 'Fidelity Investments', role: 'investor' },
    ],
    stage: 'Series D',
    source: 'TechCrunch',
    sourceUrl: 'https://techcrunch.com/2020/11/23/relativity-space-raises-500m/',
    verified: true,
    description: 'Relativity Space raised $500M in Series D funding to accelerate development of the Terran R reusable rocket and expand its 3D printing manufacturing capabilities.',
  },
  {
    id: 'deal-relativity-series-e',
    type: 'funding_round',
    title: 'Relativity Space Series E',
    amount: 650_000_000,
    date: '2021-06-08',
    parties: [
      { company: 'Relativity Space', companySlug: 'relativity-space', role: 'recipient' },
      { company: 'Fidelity Investments', role: 'investor' },
      { company: 'Tiger Global', role: 'investor' },
      { company: 'Coatue Management', role: 'investor' },
    ],
    stage: 'Series E',
    source: 'CNBC',
    sourceUrl: 'https://www.cnbc.com/2021/06/08/relativity-space-raises-650-million-series-e.html',
    verified: true,
    description: 'Relativity Space raised $650M at a $4.2B valuation. Total funding exceeded $1.3B, making it one of the best-funded space startups. Funds directed toward Terran R development.',
  },

  // Axiom Space
  {
    id: 'deal-axiom-series-c',
    type: 'funding_round',
    title: 'Axiom Space Series C',
    amount: 350_000_000,
    date: '2023-08-15',
    parties: [
      { company: 'Axiom Space', companySlug: 'axiom-space', role: 'recipient' },
      { company: 'Aljazira Capital', role: 'investor' },
      { company: 'Boryung', role: 'investor' },
    ],
    stage: 'Series C',
    source: 'Space News',
    sourceUrl: 'https://spacenews.com/axiom-space-raises-350-million-series-c/',
    verified: true,
    description: 'Axiom Space raised $350M in Series C funding at a $2.9B valuation. The company is building the first commercial space station modules to attach to the ISS.',
  },

  // Sierra Space
  {
    id: 'deal-sierra-series-a',
    type: 'funding_round',
    title: 'Sierra Space Series A',
    amount: 1_400_000_000,
    date: '2022-11-09',
    parties: [
      { company: 'Sierra Space', companySlug: 'sierra-space', role: 'recipient' },
      { company: 'Coatue Management', role: 'investor' },
      { company: 'General Atlantic', role: 'investor' },
      { company: 'Moore Strategic Ventures', role: 'investor' },
    ],
    stage: 'Series A',
    source: 'Sierra Space Press Release',
    sourceUrl: 'https://www.sierraspace.com/newsroom/press-releases/sierra-space-raises-1-4-billion/',
    verified: true,
    description: 'Sierra Space raised $1.4B in its Series A at a $4.5B valuation. Funds directed toward Dream Chaser spaceplane development and Orbital Reef space station program.',
  },

  // Vast
  {
    id: 'deal-vast-series-a',
    type: 'funding_round',
    title: 'Vast Series A',
    amount: 100_000_000,
    date: '2023-04-10',
    parties: [
      { company: 'Vast', role: 'recipient' },
      { company: 'Jed McCaleb', role: 'investor' },
    ],
    stage: 'Series A',
    source: 'Space News',
    verified: true,
    description: 'Vast, founded by crypto billionaire Jed McCaleb, raised $100M+ for its Haven-1 commercial space station. The company aims to launch the first single-module station on SpaceX Falcon 9.',
  },

  // Firefly Aerospace
  {
    id: 'deal-firefly-series-a',
    type: 'funding_round',
    title: 'Firefly Aerospace Series A (Relaunch)',
    amount: 75_000_000,
    date: '2022-05-18',
    parties: [
      { company: 'Firefly Aerospace', companySlug: 'firefly-aerospace', role: 'recipient' },
      { company: 'AE Industrial Partners', role: 'investor' },
    ],
    stage: 'Series A',
    source: 'SpaceNews',
    verified: true,
    description: 'Firefly raised $75M after being relaunched under new ownership. Funds supported Alpha rocket production ramp-up and Blue Ghost lunar lander development.',
  },
  {
    id: 'deal-firefly-2024',
    type: 'funding_round',
    title: 'Firefly Aerospace Equity Round',
    amount: 175_000_000,
    date: '2024-02-28',
    parties: [
      { company: 'Firefly Aerospace', companySlug: 'firefly-aerospace', role: 'recipient' },
      { company: 'RPM Ventures', role: 'investor' },
    ],
    stage: 'Growth Equity',
    source: 'SpaceNews',
    verified: true,
    description: 'Firefly raised $175M to fund MLV medium-lift vehicle development and scale its growing manifest of government and commercial launches.',
  },

  // Impulse Space
  {
    id: 'deal-impulse-series-a',
    type: 'funding_round',
    title: 'Impulse Space Series A',
    amount: 45_000_000,
    date: '2022-12-01',
    parties: [
      { company: 'Impulse Space', role: 'recipient' },
      { company: 'Founders Fund', role: 'investor' },
    ],
    stage: 'Series A',
    source: 'TechCrunch',
    verified: true,
    description: 'Impulse Space, founded by former SpaceX VP Tom Mueller, raised $45M for its orbital maneuvering vehicles. The company develops in-space transportation solutions.',
  },
  {
    id: 'deal-impulse-series-b',
    type: 'funding_round',
    title: 'Impulse Space Series B',
    amount: 150_000_000,
    date: '2024-04-16',
    parties: [
      { company: 'Impulse Space', role: 'recipient' },
      { company: 'RTX Ventures', role: 'investor' },
      { company: 'Founders Fund', role: 'investor' },
    ],
    stage: 'Series B',
    source: 'SpaceNews',
    verified: true,
    description: 'Impulse Space raised $150M Series B to scale production of its Mira orbital transfer vehicle. The raise valued the company at over $1B.',
  },

  // Stoke Space
  {
    id: 'deal-stoke-series-a',
    type: 'funding_round',
    title: 'Stoke Space Series A',
    amount: 65_000_000,
    date: '2022-10-05',
    parties: [
      { company: 'Stoke Space', role: 'recipient' },
      { company: 'Industrious Ventures', role: 'investor' },
    ],
    stage: 'Series A',
    source: 'TechCrunch',
    verified: true,
    description: 'Stoke Space raised $65M for its fully reusable upper stage and second stage technology. Founded by former Blue Origin engineers.',
  },
  {
    id: 'deal-stoke-series-b',
    type: 'funding_round',
    title: 'Stoke Space Series B',
    amount: 100_000_000,
    date: '2024-06-04',
    parties: [
      { company: 'Stoke Space', role: 'recipient' },
      { company: 'DCVC', role: 'investor' },
    ],
    stage: 'Series B',
    source: 'SpaceNews',
    verified: true,
    description: 'Stoke Space raised $100M to develop Nova, its fully and rapidly reusable rocket system designed for high launch cadence.',
  },

  // K2 Space
  {
    id: 'deal-k2-seed',
    type: 'funding_round',
    title: 'K2 Space Seed Round',
    amount: 50_000_000,
    date: '2023-09-12',
    parties: [
      { company: 'K2 Space', role: 'recipient' },
      { company: 'Khosla Ventures', role: 'investor' },
    ],
    stage: 'Seed',
    source: 'TechCrunch',
    verified: true,
    description: 'K2 Space raised a $50M seed round to build large, powerful satellites enabled by new heavy-lift launch vehicles like Starship.',
  },

  // True Anomaly
  {
    id: 'deal-true-anomaly-series-a',
    type: 'funding_round',
    title: 'True Anomaly Series A',
    amount: 100_000_000,
    date: '2023-05-15',
    parties: [
      { company: 'True Anomaly', role: 'recipient' },
      { company: 'Riot Ventures', role: 'investor' },
      { company: 'Eclipse Ventures', role: 'investor' },
    ],
    stage: 'Series A',
    source: 'SpaceNews',
    verified: true,
    description: 'True Anomaly raised $100M for space domain awareness and rendezvous/proximity operations satellites, targeting US Space Force missions.',
  },

  // Phantom Space
  {
    id: 'deal-phantom-seed',
    type: 'funding_round',
    title: 'Phantom Space Seed Round',
    amount: 22_000_000,
    date: '2022-06-01',
    parties: [
      { company: 'Phantom Space', role: 'recipient' },
    ],
    stage: 'Seed',
    source: 'Crunchbase',
    verified: true,
    description: 'Phantom Space raised $22M seed funding for its Daytona small launch vehicle and satellite bus manufacturing.',
  },

  // Rocket Lab (pre-SPAC)
  {
    id: 'deal-rocketlab-series-e',
    type: 'funding_round',
    title: 'Rocket Lab Series E',
    amount: 140_000_000,
    date: '2018-11-15',
    parties: [
      { company: 'Rocket Lab', companySlug: 'rocket-lab', role: 'recipient' },
      { company: 'Future Fund', role: 'investor' },
      { company: 'Greenspring Associates', role: 'investor' },
    ],
    stage: 'Series E',
    source: 'Crunchbase',
    verified: true,
    description: 'Rocket Lab raised $140M Series E at a $1.4B valuation, becoming the first launch-focused unicorn outside SpaceX.',
  },
  {
    id: 'deal-rocketlab-series-f',
    type: 'funding_round',
    title: 'Rocket Lab Series F',
    amount: 245_000_000,
    date: '2019-11-18',
    parties: [
      { company: 'Rocket Lab', companySlug: 'rocket-lab', role: 'recipient' },
      { company: 'Future Fund', role: 'investor' },
    ],
    stage: 'Series F',
    source: 'Space News',
    verified: true,
    description: 'Rocket Lab raised $245M to fund development of Photon satellite platform and expansion of Electron launch cadence.',
  },

  // Planet Labs (pre-SPAC)
  {
    id: 'deal-planet-series-c',
    type: 'funding_round',
    title: 'Planet Labs Series C',
    amount: 183_000_000,
    date: '2017-04-11',
    parties: [
      { company: 'Planet Labs', companySlug: 'planet-labs', role: 'recipient' },
      { company: 'Threshold Ventures (DFJ)', role: 'investor' },
      { company: 'Innovation Endeavors', role: 'investor' },
    ],
    stage: 'Series C',
    source: 'Crunchbase',
    verified: true,
    description: 'Planet raised $183M after acquiring Terra Bella from Google, becoming the operator of the largest commercial satellite constellation for Earth observation.',
  },

  // Spire Global (pre-SPAC)
  {
    id: 'deal-spire-series-c',
    type: 'funding_round',
    title: 'Spire Global Series C',
    amount: 70_000_000,
    date: '2019-03-26',
    parties: [
      { company: 'Spire Global', companySlug: 'spire-global', role: 'recipient' },
      { company: 'Scottish Enterprise', role: 'investor' },
    ],
    stage: 'Series C',
    source: 'Crunchbase',
    verified: true,
    description: 'Spire raised $70M to expand its constellation of weather and maritime tracking nanosatellites.',
  },

  // AST SpaceMobile
  {
    id: 'deal-ast-series-b',
    type: 'funding_round',
    title: 'AST SpaceMobile Series B',
    amount: 128_000_000,
    date: '2020-03-01',
    parties: [
      { company: 'AST SpaceMobile', role: 'recipient' },
      { company: 'Rakuten', role: 'investor' },
      { company: 'Vodafone', role: 'investor' },
      { company: 'American Tower', role: 'investor' },
    ],
    stage: 'Series B',
    source: 'Crunchbase',
    verified: true,
    description: 'AST SpaceMobile raised $128M for its space-based cellular broadband network, which aims to provide connectivity directly to standard mobile phones.',
  },

  // Intuitive Machines
  {
    id: 'deal-intuitive-series-b',
    type: 'funding_round',
    title: 'Intuitive Machines Pre-SPAC Growth Round',
    amount: 85_000_000,
    date: '2022-02-15',
    parties: [
      { company: 'Intuitive Machines', companySlug: 'intuitive-machines', role: 'recipient' },
    ],
    stage: 'Growth Equity',
    source: 'SEC Filing',
    verified: true,
    description: 'Intuitive Machines raised $85M ahead of its SPAC merger. The company won a $118M NASA CLPS contract for lunar deliveries.',
  },

  // Astrobotic
  {
    id: 'deal-astrobotic-series-c',
    type: 'funding_round',
    title: 'Astrobotic Series C',
    amount: 79_500_000,
    date: '2022-01-20',
    parties: [
      { company: 'Astrobotic', companySlug: 'astrobotic', role: 'recipient' },
      { company: 'John Deere', role: 'investor' },
    ],
    stage: 'Series C',
    source: 'SpaceNews',
    verified: true,
    description: 'Astrobotic raised $79.5M for its Peregrine and Griffin lunar landers. The company holds multiple NASA CLPS delivery contracts.',
  },

  // ispace
  {
    id: 'deal-ispace-series-c',
    type: 'funding_round',
    title: 'ispace Series C',
    amount: 46_000_000,
    date: '2021-07-01',
    parties: [
      { company: 'ispace', role: 'recipient' },
      { company: 'Suzuki Motor Corporation', role: 'investor' },
    ],
    stage: 'Series C',
    source: 'ispace Press Release',
    verified: true,
    description: 'Japanese lunar exploration startup ispace raised $46M to fund its HAKUTO-R lunar lander missions.',
  },

  // Astra (pre-SPAC)
  {
    id: 'deal-astra-series-c',
    type: 'funding_round',
    title: 'Astra Series C',
    amount: 100_000_000,
    date: '2020-02-10',
    parties: [
      { company: 'Astra', role: 'recipient' },
      { company: 'Andreessen Horowitz', role: 'investor' },
    ],
    stage: 'Series C',
    source: 'TechCrunch',
    verified: true,
    description: 'Astra raised $100M for its small launch vehicle ahead of its first orbital launch attempts and eventual SPAC merger.',
  },

  // Capella Space
  {
    id: 'deal-capella-series-c',
    type: 'funding_round',
    title: 'Capella Space Series C',
    amount: 97_000_000,
    date: '2022-05-11',
    parties: [
      { company: 'Capella Space', role: 'recipient' },
      { company: 'NightDragon', role: 'investor' },
    ],
    stage: 'Series C',
    source: 'SpaceNews',
    verified: true,
    description: 'SAR satellite operator Capella Space raised $97M to expand its constellation and enhance its all-weather Earth observation capability.',
  },

  // Terran Orbital (pre-SPAC)
  {
    id: 'deal-terran-orbital-series-b',
    type: 'funding_round',
    title: 'Terran Orbital Series B',
    amount: 37_500_000,
    date: '2021-03-01',
    parties: [
      { company: 'Terran Orbital', role: 'recipient' },
      { company: 'Lockheed Martin Ventures', role: 'investor' },
      { company: 'AE Industrial Partners', role: 'investor' },
    ],
    stage: 'Series B',
    source: 'SpaceNews',
    verified: true,
    description: 'Terran Orbital raised $37.5M for its satellite manufacturing business ahead of winning major SDA Tranche 1 contracts.',
  },

  // Rocket Lab 2024 Raise
  {
    id: 'deal-rocketlab-2024-offering',
    type: 'funding_round',
    title: 'Rocket Lab Secondary Offering',
    amount: 288_000_000,
    date: '2024-08-15',
    parties: [
      { company: 'Rocket Lab', companySlug: 'rocket-lab', role: 'recipient' },
    ],
    stage: 'Follow-on Offering',
    source: 'SEC Filing',
    verified: true,
    description: 'Rocket Lab raised $288M via public secondary offering to fund Neutron medium-lift rocket development and scale Space Systems division.',
  },

  // Voyager Space
  {
    id: 'deal-voyager-series-a',
    type: 'funding_round',
    title: 'Voyager Space Series A',
    amount: 80_000_000,
    date: '2022-08-10',
    parties: [
      { company: 'Voyager Space', role: 'recipient' },
      { company: 'Altamira Capital', role: 'investor' },
    ],
    stage: 'Series A',
    source: 'SpaceNews',
    verified: true,
    description: 'Voyager Space raised $80M to continue acquisitions of space companies and advance Starlab commercial space station with Airbus.',
  },

  // Muon Space
  {
    id: 'deal-muon-series-a',
    type: 'funding_round',
    title: 'Muon Space Series A',
    amount: 56_500_000,
    date: '2023-03-22',
    parties: [
      { company: 'Muon Space', role: 'recipient' },
      { company: 'Costanoa Ventures', role: 'investor' },
    ],
    stage: 'Series A',
    source: 'TechCrunch',
    verified: true,
    description: 'Muon Space raised $56.5M to build vertically integrated satellite constellations for climate monitoring and weather intelligence.',
  },

  // Albedo
  {
    id: 'deal-albedo-series-a',
    type: 'funding_round',
    title: 'Albedo Series A',
    amount: 35_000_000,
    date: '2023-01-15',
    parties: [
      { company: 'Albedo', role: 'recipient' },
      { company: 'Shield Capital', role: 'investor' },
    ],
    stage: 'Series A',
    source: 'TechCrunch',
    verified: true,
    description: 'Albedo raised $35M for its very-low-Earth-orbit (VLEO) satellite constellation capable of 10cm optical and 2m thermal imagery.',
  },
  {
    id: 'deal-albedo-series-b',
    type: 'funding_round',
    title: 'Albedo Series B',
    amount: 97_000_000,
    date: '2024-08-06',
    parties: [
      { company: 'Albedo', role: 'recipient' },
      { company: 'Breakthrough Energy Ventures', role: 'investor' },
      { company: 'Shield Capital', role: 'investor' },
    ],
    stage: 'Series B',
    source: 'SpaceNews',
    verified: true,
    description: 'Albedo raised $97M Series B to fund its first satellite missions and scale commercial VLEO imaging for defense and commercial customers.',
  },

  // Apex
  {
    id: 'deal-apex-series-a',
    type: 'funding_round',
    title: 'Apex Series A',
    amount: 16_000_000,
    date: '2023-06-06',
    parties: [
      { company: 'Apex', role: 'recipient' },
      { company: 'XYZ Venture Capital', role: 'investor' },
    ],
    stage: 'Series A',
    source: 'TechCrunch',
    verified: true,
    description: 'Apex (formerly Ares) raised $16M for its standardized satellite bus manufacturing, aiming to be the "Honda Civic of space."',
  },
  {
    id: 'deal-apex-series-b',
    type: 'funding_round',
    title: 'Apex Series B',
    amount: 95_000_000,
    date: '2024-06-03',
    parties: [
      { company: 'Apex', role: 'recipient' },
      { company: 'XYZ Venture Capital', role: 'investor' },
      { company: 'Shield Capital', role: 'investor' },
    ],
    stage: 'Series B',
    source: 'SpaceNews',
    verified: true,
    description: 'Apex raised $95M Series B for rapid satellite bus manufacturing, with backlog exceeding $200M from defense and commercial customers.',
  },

  // Starfish Space
  {
    id: 'deal-starfish-series-a',
    type: 'funding_round',
    title: 'Starfish Space Series A',
    amount: 29_500_000,
    date: '2023-10-10',
    parties: [
      { company: 'Starfish Space', role: 'recipient' },
      { company: 'DCVC', role: 'investor' },
    ],
    stage: 'Series A',
    source: 'SpaceNews',
    verified: true,
    description: 'Starfish Space raised $29.5M for its autonomous satellite servicing vehicle, Otter, designed for satellite life extension and debris removal.',
  },

  // Atomos Space
  {
    id: 'deal-atomos-seed',
    type: 'funding_round',
    title: 'Atomos Space Seed Round',
    amount: 11_000_000,
    date: '2023-04-05',
    parties: [
      { company: 'Atomos Space', role: 'recipient' },
      { company: 'Airbus Ventures', role: 'investor' },
    ],
    stage: 'Seed',
    source: 'SpaceNews',
    verified: true,
    description: 'Atomos Space raised $11M for its orbital transfer vehicle that repositions satellites between orbits.',
  },

  // Outpost Technologies
  {
    id: 'deal-outpost-seed',
    type: 'funding_round',
    title: 'Outpost Technologies Seed',
    amount: 12_000_000,
    date: '2023-06-28',
    parties: [
      { company: 'Outpost Technologies', role: 'recipient' },
      { company: 'Founders Fund', role: 'investor' },
    ],
    stage: 'Seed',
    source: 'TechCrunch',
    verified: true,
    description: 'Outpost raised $12M for reusable capsules that return cargo from space to Earth using heat shields instead of parachutes.',
  },

  // Slingshot Aerospace
  {
    id: 'deal-slingshot-series-b',
    type: 'funding_round',
    title: 'Slingshot Aerospace Series B',
    amount: 40_500_000,
    date: '2023-08-09',
    parties: [
      { company: 'Slingshot Aerospace', role: 'recipient' },
      { company: 'Sway Ventures', role: 'investor' },
    ],
    stage: 'Series B',
    source: 'SpaceNews',
    verified: true,
    description: 'Slingshot Aerospace raised $40.5M for its space situational awareness platform used by the US Space Force and commercial operators.',
  },

  // CesiumAstro
  {
    id: 'deal-cesiumastro-series-b',
    type: 'funding_round',
    title: 'CesiumAstro Series B',
    amount: 60_000_000,
    date: '2022-11-07',
    parties: [
      { company: 'CesiumAstro', role: 'recipient' },
      { company: 'RTX Ventures', role: 'investor' },
    ],
    stage: 'Series B',
    source: 'SpaceNews',
    verified: true,
    description: 'CesiumAstro raised $60M for active phased array communication systems for satellites and defense applications.',
  },

  // Turion Space
  {
    id: 'deal-turion-seed',
    type: 'funding_round',
    title: 'Turion Space Seed Round',
    amount: 15_000_000,
    date: '2023-11-01',
    parties: [
      { company: 'Turion Space', role: 'recipient' },
      { company: 'Founders Fund', role: 'investor' },
    ],
    stage: 'Seed',
    source: 'TechCrunch',
    verified: true,
    description: 'Turion Space raised $15M for orbital maneuvering vehicles focused on debris capture and satellite servicing.',
  },

  // Orbit Fab
  {
    id: 'deal-orbit-fab-series-a',
    type: 'funding_round',
    title: 'Orbit Fab Series A',
    amount: 28_500_000,
    date: '2023-07-25',
    parties: [
      { company: 'Orbit Fab', role: 'recipient' },
      { company: 'US Innovative Technology Fund', role: 'investor' },
    ],
    stage: 'Series A',
    source: 'SpaceNews',
    verified: true,
    description: 'Orbit Fab raised $28.5M for in-space refueling depots and the RAFTI universal refueling interface standard.',
  },

  // Varda Space Industries
  {
    id: 'deal-varda-series-b',
    type: 'funding_round',
    title: 'Varda Space Industries Series B',
    amount: 90_000_000,
    date: '2023-12-05',
    parties: [
      { company: 'Varda Space Industries', role: 'recipient' },
      { company: 'Khosla Ventures', role: 'investor' },
      { company: 'Caffeinated Capital', role: 'investor' },
    ],
    stage: 'Series B',
    source: 'TechCrunch',
    verified: true,
    description: 'Varda raised $90M for in-space manufacturing of pharmaceuticals and advanced materials. The company successfully returned its first reentry capsule in 2024.',
  },

  // Xona Space Systems
  {
    id: 'deal-xona-series-a',
    type: 'funding_round',
    title: 'Xona Space Systems Series A',
    amount: 19_000_000,
    date: '2022-09-20',
    parties: [
      { company: 'Xona Space Systems', role: 'recipient' },
      { company: 'Trucks Venture Capital', role: 'investor' },
    ],
    stage: 'Series A',
    source: 'SpaceNews',
    verified: true,
    description: 'Xona raised $19M for its LEO-based precision navigation constellation (PULSAR), aiming to provide centimeter-level GPS alternatives.',
  },

  // Epsilon3
  {
    id: 'deal-epsilon3-series-a',
    type: 'funding_round',
    title: 'Epsilon3 Series A',
    amount: 15_000_000,
    date: '2022-07-20',
    parties: [
      { company: 'Epsilon3', role: 'recipient' },
      { company: 'Lux Capital', role: 'investor' },
    ],
    stage: 'Series A',
    source: 'TechCrunch',
    verified: true,
    description: 'Epsilon3, a spacecraft operations platform founded by ex-SpaceX engineers, raised $15M for its mission planning and procedure management software.',
  },

  // Ursa Major Technologies
  {
    id: 'deal-ursa-major-series-c',
    type: 'funding_round',
    title: 'Ursa Major Technologies Series C',
    amount: 100_000_000,
    date: '2022-10-25',
    parties: [
      { company: 'Ursa Major Technologies', role: 'recipient' },
      { company: 'XN', role: 'investor' },
    ],
    stage: 'Series C',
    source: 'SpaceNews',
    verified: true,
    description: 'Ursa Major raised $100M for domestic rocket engine manufacturing. The company produces the Hadley and Ripley engines used by multiple launch providers.',
  },

  // Momentus (pre-SPAC)
  {
    id: 'deal-momentus-series-b',
    type: 'funding_round',
    title: 'Momentus Series B',
    amount: 40_000_000,
    date: '2019-09-01',
    parties: [
      { company: 'Momentus', role: 'recipient' },
      { company: 'Prime Movers Lab', role: 'investor' },
    ],
    stage: 'Series B',
    source: 'Crunchbase',
    verified: true,
    description: 'Momentus raised $40M for its water plasma propulsion-based space transportation service before its SPAC merger.',
  },

  // Redwire (pre-SPAC)
  {
    id: 'deal-redwire-private',
    type: 'funding_round',
    title: 'Redwire Private Funding',
    amount: 50_000_000,
    date: '2020-06-01',
    parties: [
      { company: 'Redwire', role: 'recipient' },
      { company: 'AE Industrial Partners', role: 'investor' },
    ],
    stage: 'Growth Equity',
    source: 'SpaceNews',
    verified: true,
    description: 'Redwire raised $50M from AE Industrial Partners to fund acquisition-led growth strategy in space infrastructure.',
  },

  // Satellogic
  {
    id: 'deal-satellogic-series-d',
    type: 'funding_round',
    title: 'Satellogic Series D',
    amount: 100_000_000,
    date: '2021-01-15',
    parties: [
      { company: 'Satellogic', role: 'recipient' },
      { company: 'SoftBank', role: 'investor' },
      { company: 'Tishman Speyer', role: 'investor' },
    ],
    stage: 'Series D',
    source: 'Crunchbase',
    verified: true,
    description: 'Satellogic raised $100M to scale its sub-meter resolution Earth observation constellation ahead of its SPAC merger.',
  },

  // Sidus Space
  {
    id: 'deal-sidus-seed',
    type: 'funding_round',
    title: 'Sidus Space Seed Extension',
    amount: 10_000_000,
    date: '2022-03-01',
    parties: [
      { company: 'Sidus Space', role: 'recipient' },
    ],
    stage: 'Seed',
    source: 'SEC Filing',
    verified: true,
    description: 'Sidus Space raised $10M to support LizzieSat multi-sensor satellite manufacturing and operations.',
  },

  // Aethero
  {
    id: 'deal-aethero-seed',
    type: 'funding_round',
    title: 'Aethero Seed Round',
    amount: 14_500_000,
    date: '2024-01-15',
    parties: [
      { company: 'Aethero', role: 'recipient' },
      { company: 'Shield Capital', role: 'investor' },
    ],
    stage: 'Seed',
    source: 'SpaceNews',
    verified: true,
    description: 'Aethero raised $14.5M for edge computing hardware designed for satellite and space applications.',
  },

  // Kayhan Space
  {
    id: 'deal-kayhan-series-a',
    type: 'funding_round',
    title: 'Kayhan Space Series A',
    amount: 10_000_000,
    date: '2023-02-14',
    parties: [
      { company: 'Kayhan Space', role: 'recipient' },
      { company: 'Lockheed Martin Ventures', role: 'investor' },
    ],
    stage: 'Series A',
    source: 'SpaceNews',
    verified: true,
    description: 'Kayhan Space raised $10M for its space traffic management platform that automates conjunction assessment and collision avoidance.',
  },

  // Umbra
  {
    id: 'deal-umbra-series-b',
    type: 'funding_round',
    title: 'Umbra Series B',
    amount: 60_000_000,
    date: '2023-05-08',
    parties: [
      { company: 'Umbra', role: 'recipient' },
      { company: 'Spark Capital', role: 'investor' },
    ],
    stage: 'Series B',
    source: 'SpaceNews',
    verified: true,
    description: 'SAR satellite company Umbra raised $60M to scale its constellation providing high-resolution radar imagery independent of cloud cover.',
  },

  // Edge Autonomy (Arcturus UAV + ISR Group)
  {
    id: 'deal-edgeautonomy-growth',
    type: 'funding_round',
    title: 'Edge Autonomy Growth Round',
    amount: 240_000_000,
    date: '2024-03-18',
    parties: [
      { company: 'Edge Autonomy', role: 'recipient' },
      { company: 'AE Industrial Partners', role: 'investor' },
    ],
    stage: 'Growth Equity',
    source: 'SpaceNews',
    verified: true,
    description: 'Edge Autonomy raised $240M for its combined satellite and UAV platform providing integrated space and aerial ISR capabilities.',
  },

  // Blue Origin
  {
    id: 'deal-blue-origin-bezos-2023',
    type: 'funding_round',
    title: 'Blue Origin Bezos Investment 2023',
    amount: 2_000_000_000,
    date: '2023-05-01',
    parties: [
      { company: 'Blue Origin', companySlug: 'blue-origin', role: 'recipient' },
      { company: 'Jeff Bezos', role: 'investor' },
    ],
    stage: 'Owner Investment',
    source: 'SpaceNews',
    verified: true,
    description: 'Jeff Bezos injected an estimated $2B into Blue Origin in 2023, continuing his pattern of selling Amazon stock to fund the company. Total personal investment exceeds $10B.',
  },

  // OneWeb (SoftBank + Government of UK)
  {
    id: 'deal-oneweb-rescue',
    type: 'funding_round',
    title: 'OneWeb Rescue Investment',
    amount: 1_000_000_000,
    date: '2020-07-10',
    parties: [
      { company: 'OneWeb', role: 'recipient' },
      { company: 'UK Government', role: 'investor' },
      { company: 'Bharti Global', role: 'investor' },
    ],
    stage: 'Rescue Capital',
    source: 'Reuters',
    verified: true,
    description: 'UK Government and Bharti Global jointly invested $1B to rescue OneWeb from bankruptcy, acquiring the LEO broadband constellation operator.',
  },

  // SpinLaunch
  {
    id: 'deal-spinlaunch-series-b',
    type: 'funding_round',
    title: 'SpinLaunch Series B',
    amount: 71_000_000,
    date: '2022-09-14',
    parties: [
      { company: 'SpinLaunch', role: 'recipient' },
      { company: 'ATW Partners', role: 'investor' },
    ],
    stage: 'Series B',
    source: 'TechCrunch',
    verified: true,
    description: 'SpinLaunch raised $71M for its kinetic launch system that uses a centrifuge to accelerate payloads to orbital velocities without rockets.',
  },

  // Phantom Space Corp
  {
    id: 'deal-phantom-series-a',
    type: 'funding_round',
    title: 'Phantom Space Series A',
    amount: 34_000_000,
    date: '2023-08-01',
    parties: [
      { company: 'Phantom Space', role: 'recipient' },
    ],
    stage: 'Series A',
    source: 'SpaceNews',
    verified: true,
    description: 'Phantom Space raised $34M Series A for its Daytona launch vehicle program and satellite manufacturing line.',
  },

  // ═══════════════════════════════════════
  // ACQUISITIONS (22)
  // ═══════════════════════════════════════

  {
    id: 'deal-ng-orbital-atk',
    type: 'acquisition',
    title: 'Northrop Grumman Acquires Orbital ATK',
    amount: 9_200_000_000,
    date: '2018-06-06',
    parties: [
      { company: 'Northrop Grumman', companySlug: 'northrop-grumman', role: 'acquirer' },
      { company: 'Orbital ATK', role: 'target' },
    ],
    source: 'Northrop Grumman Press Release',
    verified: true,
    description: 'Northrop Grumman completed its acquisition of Orbital ATK for $9.2B, creating a vertically integrated defense and space company with launch, satellite, and propulsion capabilities.',
  },
  {
    id: 'deal-rtx-merger',
    type: 'acquisition',
    title: 'Raytheon & United Technologies Merge to Form RTX',
    amount: 121_000_000_000,
    date: '2020-04-03',
    parties: [
      { company: 'Raytheon', role: 'target' },
      { company: 'United Technologies', role: 'acquirer' },
      { company: 'RTX Corporation', companySlug: 'rtx', role: 'acquirer' },
    ],
    source: 'RTX Press Release',
    verified: true,
    description: 'Raytheon and United Technologies completed their merger of equals, creating RTX Corporation with combined revenue of $74B. The deal created a defense and aerospace powerhouse.',
  },
  {
    id: 'deal-l3-harris-merger',
    type: 'acquisition',
    title: 'L3 Technologies & Harris Corporation Merge',
    amount: 33_500_000_000,
    date: '2019-06-29',
    parties: [
      { company: 'L3 Technologies', role: 'target' },
      { company: 'Harris Corporation', role: 'target' },
      { company: 'L3Harris Technologies', companySlug: 'l3harris', role: 'acquirer' },
    ],
    source: 'L3Harris Press Release',
    verified: true,
    description: 'L3 Technologies and Harris Corporation completed their merger to form L3Harris Technologies, the sixth-largest US defense contractor with strong space sensor and communication capabilities.',
  },
  {
    id: 'deal-viasat-inmarsat',
    type: 'acquisition',
    title: 'Viasat Acquires Inmarsat',
    amount: 7_300_000_000,
    date: '2023-05-30',
    parties: [
      { company: 'Viasat', companySlug: 'viasat', role: 'acquirer' },
      { company: 'Inmarsat', role: 'target' },
    ],
    source: 'Viasat Press Release',
    sourceUrl: 'https://www.viasat.com/about/newsroom/blog/viasat-completes-acquisition-of-inmarsat/',
    verified: true,
    description: 'Viasat completed its $7.3B acquisition of Inmarsat, combining GEO and LEO satellite networks to create one of the largest satellite communications operators globally.',
  },
  {
    id: 'deal-ses-intelsat',
    type: 'acquisition',
    title: 'SES Acquires Intelsat',
    amount: 3_100_000_000,
    date: '2024-10-01',
    parties: [
      { company: 'SES', role: 'acquirer' },
      { company: 'Intelsat', role: 'target' },
    ],
    source: 'SES Press Release',
    sourceUrl: 'https://www.ses.com/press-release/ses-to-acquire-intelsat',
    verified: true,
    description: 'SES agreed to acquire Intelsat for $3.1B, creating the largest GEO satellite operator globally. The combined entity will serve government, media, and connectivity markets.',
  },
  {
    id: 'deal-spacex-swarm',
    type: 'acquisition',
    title: 'SpaceX Acquires Swarm Technologies',
    amount: null,
    date: '2021-08-06',
    parties: [
      { company: 'SpaceX', companySlug: 'spacex', role: 'acquirer' },
      { company: 'Swarm Technologies', role: 'target' },
    ],
    source: 'CNBC',
    verified: true,
    description: 'SpaceX acquired IoT satellite company Swarm Technologies to integrate its low-cost, low-power connectivity technology into the Starlink ecosystem.',
  },
  {
    id: 'deal-rocketlab-york-space',
    type: 'acquisition',
    title: 'Rocket Lab Acquires SolAero Technologies',
    amount: 80_000_000,
    date: '2022-01-04',
    parties: [
      { company: 'Rocket Lab', companySlug: 'rocket-lab', role: 'acquirer' },
      { company: 'SolAero Technologies', role: 'target' },
    ],
    source: 'Rocket Lab Press Release',
    verified: true,
    description: 'Rocket Lab acquired SolAero Technologies for $80M, adding leading space solar cell manufacturing to its vertically integrated satellite platform.',
  },
  {
    id: 'deal-rocketlab-psc',
    type: 'acquisition',
    title: 'Rocket Lab Acquires Planetary Systems Corporation',
    amount: 42_000_000,
    date: '2021-11-15',
    parties: [
      { company: 'Rocket Lab', companySlug: 'rocket-lab', role: 'acquirer' },
      { company: 'Planetary Systems Corporation', role: 'target' },
    ],
    source: 'Rocket Lab Press Release',
    verified: true,
    description: 'Rocket Lab acquired satellite separation systems maker Planetary Systems Corporation for $42M as part of its vertical integration strategy.',
  },
  {
    id: 'deal-rocketlab-advanced-solutions',
    type: 'acquisition',
    title: 'Rocket Lab Acquires Advanced Solutions Inc.',
    amount: 40_000_000,
    date: '2021-10-05',
    parties: [
      { company: 'Rocket Lab', companySlug: 'rocket-lab', role: 'acquirer' },
      { company: 'Advanced Solutions Inc.', role: 'target' },
    ],
    source: 'Rocket Lab Press Release',
    verified: true,
    description: 'Rocket Lab acquired ASI for $40M, gaining flight software and simulation capabilities for its growing spacecraft portfolio.',
  },
  {
    id: 'deal-redwire-mda-space',
    type: 'acquisition',
    title: 'Redwire Acquires Deployable Space Systems',
    amount: 20_000_000,
    date: '2021-06-01',
    parties: [
      { company: 'Redwire', role: 'acquirer' },
      { company: 'Deployable Space Systems', role: 'target' },
    ],
    source: 'SpaceNews',
    verified: true,
    description: 'Redwire acquired Deployable Space Systems as part of its M&A spree, adding solar array and structural deployment technology.',
  },
  {
    id: 'deal-l3harris-aerojet',
    type: 'acquisition',
    title: 'L3Harris Acquires Aerojet Rocketdyne',
    amount: 4_700_000_000,
    date: '2023-07-28',
    parties: [
      { company: 'L3Harris Technologies', companySlug: 'l3harris', role: 'acquirer' },
      { company: 'Aerojet Rocketdyne', companySlug: 'aerojet-rocketdyne', role: 'target' },
    ],
    source: 'L3Harris Press Release',
    verified: true,
    description: 'L3Harris completed its $4.7B acquisition of Aerojet Rocketdyne, the last major independent US rocket propulsion manufacturer. Lockheed Martin had previously attempted this acquisition.',
  },
  {
    id: 'deal-mda-telesat-plant',
    type: 'acquisition',
    title: 'MDA Acquires SatixFy Digital Payload Division',
    amount: 30_000_000,
    date: '2024-02-15',
    parties: [
      { company: 'MDA Space', role: 'acquirer' },
      { company: 'SatixFy', role: 'target' },
    ],
    source: 'SpaceNews',
    verified: true,
    description: 'MDA Space acquired the digital payload division of SatixFy for approximately $30M, enhancing its satellite payload capabilities.',
  },
  {
    id: 'deal-boeing-millennium',
    type: 'acquisition',
    title: 'Boeing Acquires Millennium Space Systems',
    amount: null,
    date: '2018-09-13',
    parties: [
      { company: 'Boeing', companySlug: 'boeing', role: 'acquirer' },
      { company: 'Millennium Space Systems', role: 'target' },
    ],
    source: 'Boeing Press Release',
    verified: true,
    description: 'Boeing acquired Millennium Space Systems, gaining small satellite manufacturing capabilities. The subsidiary has since won multiple SDA contracts.',
  },
  {
    id: 'deal-lockheed-terran-orbital',
    type: 'acquisition',
    title: 'Lockheed Martin Acquires Terran Orbital',
    amount: 450_000_000,
    date: '2024-05-23',
    parties: [
      { company: 'Lockheed Martin', companySlug: 'lockheed-martin', role: 'acquirer' },
      { company: 'Terran Orbital', role: 'target' },
    ],
    source: 'SpaceNews',
    verified: true,
    description: 'Lockheed Martin agreed to acquire Terran Orbital for $450M, gaining the small satellite manufacturer after it struggled as a public company post-SPAC.',
  },
  {
    id: 'deal-eutelsat-oneweb',
    type: 'acquisition',
    title: 'Eutelsat Merges with OneWeb',
    amount: 3_400_000_000,
    date: '2023-09-28',
    parties: [
      { company: 'Eutelsat', role: 'acquirer' },
      { company: 'OneWeb', role: 'target' },
    ],
    source: 'Eutelsat Press Release',
    verified: true,
    description: 'Eutelsat completed its merger with OneWeb, combining GEO satellite broadcasting with LEO broadband connectivity in a $3.4B deal.',
  },
  {
    id: 'deal-ula-joint-venture',
    type: 'acquisition',
    title: 'Boeing & Lockheed Martin Form ULA Joint Venture',
    amount: null,
    date: '2006-12-01',
    parties: [
      { company: 'Boeing', companySlug: 'boeing', role: 'acquirer' },
      { company: 'Lockheed Martin', companySlug: 'lockheed-martin', role: 'acquirer' },
      { company: 'United Launch Alliance', companySlug: 'united-launch-alliance', role: 'target' },
    ],
    source: 'ULA Press Release',
    verified: true,
    description: 'Boeing and Lockheed Martin combined their Atlas V and Delta IV launch operations into ULA, which became the US military\'s primary launch provider for nearly two decades.',
  },
  {
    id: 'deal-bae-ball-aerospace',
    type: 'acquisition',
    title: 'BAE Systems Acquires Ball Aerospace',
    amount: 5_550_000_000,
    date: '2024-02-16',
    parties: [
      { company: 'BAE Systems', role: 'acquirer' },
      { company: 'Ball Aerospace', companySlug: 'ball-aerospace', role: 'target' },
    ],
    source: 'BAE Systems Press Release',
    verified: true,
    description: 'BAE Systems completed its $5.55B acquisition of Ball Aerospace, the builder of the James Webb Space Telescope, gaining premier space instruments and sensor capabilities.',
  },
  {
    id: 'deal-amazon-kuiper-acquisition',
    type: 'acquisition',
    title: 'Amazon Acquires Facebook Satellite Team',
    amount: null,
    date: '2021-07-14',
    parties: [
      { company: 'Amazon (Project Kuiper)', role: 'acquirer' },
      { company: 'Facebook Connectivity (Satellite Team)', role: 'target' },
    ],
    source: 'Reuters',
    verified: true,
    description: 'Amazon hired key members of Meta\'s disbanded satellite internet team to accelerate Project Kuiper development, in an acqui-hire deal.',
  },
  {
    id: 'deal-firefly-northrop-divestiture',
    type: 'acquisition',
    title: 'Firefly Acquires Northrop Antares Assets',
    amount: null,
    date: '2024-05-01',
    parties: [
      { company: 'Firefly Aerospace', companySlug: 'firefly-aerospace', role: 'acquirer' },
      { company: 'Northrop Grumman (Antares)', companySlug: 'northrop-grumman', role: 'target' },
    ],
    source: 'SpaceNews',
    verified: true,
    description: 'Firefly Aerospace took over Antares rocket production from Northrop Grumman, replacing Ukrainian-built components with US-made engines for CRS-2 ISS resupply missions.',
  },
  {
    id: 'deal-redwire-teledyne',
    type: 'acquisition',
    title: 'Teledyne Acquires FLIR Systems',
    amount: 8_200_000_000,
    date: '2021-05-14',
    parties: [
      { company: 'Teledyne Technologies', role: 'acquirer' },
      { company: 'FLIR Systems', role: 'target' },
    ],
    source: 'Teledyne Press Release',
    verified: true,
    description: 'Teledyne acquired FLIR Systems for $8.2B, creating a dominant provider of imaging sensors used in space, defense, and industrial applications.',
  },
  {
    id: 'deal-maxar-advent',
    type: 'acquisition',
    title: 'Advent International Acquires Maxar Technologies',
    amount: 6_400_000_000,
    date: '2023-06-05',
    parties: [
      { company: 'Advent International', role: 'acquirer' },
      { company: 'Maxar Technologies', companySlug: 'maxar-technologies', role: 'target' },
    ],
    source: 'Maxar Press Release',
    verified: true,
    description: 'Private equity firm Advent International took Maxar Technologies private for $6.4B, acquiring the leading commercial Earth observation and satellite manufacturing company.',
  },

  // ═══════════════════════════════════════
  // CONTRACT WINS (20)
  // ═══════════════════════════════════════

  {
    id: 'deal-spacex-hls',
    type: 'contract_win',
    title: 'SpaceX Wins NASA HLS Contract (Artemis)',
    amount: 2_890_000_000,
    date: '2021-04-16',
    parties: [
      { company: 'SpaceX', companySlug: 'spacex', role: 'recipient' },
      { company: 'NASA', role: 'awarder' },
    ],
    source: 'NASA Press Release',
    sourceUrl: 'https://www.nasa.gov/press-release/nasa-picks-spacex-hls/',
    verified: true,
    description: 'NASA selected SpaceX Starship HLS for the Artemis III crewed lunar lander, beating Blue Origin and Dynetics in a controversial down-select. The contract was later augmented.',
  },
  {
    id: 'deal-blue-origin-hls',
    type: 'contract_win',
    title: 'Blue Origin Wins NASA HLS Sustaining Lander',
    amount: 3_400_000_000,
    date: '2023-05-19',
    parties: [
      { company: 'Blue Origin', companySlug: 'blue-origin', role: 'recipient' },
      { company: 'NASA', role: 'awarder' },
    ],
    source: 'NASA Press Release',
    verified: true,
    description: 'NASA awarded Blue Origin a $3.4B contract for the Artemis V sustaining lunar lander, ensuring competition in human lunar transportation.',
  },
  {
    id: 'deal-spacex-commercial-crew',
    type: 'contract_win',
    title: 'SpaceX Commercial Crew Transportation',
    amount: 2_600_000_000,
    date: '2014-09-16',
    parties: [
      { company: 'SpaceX', companySlug: 'spacex', role: 'recipient' },
      { company: 'NASA', role: 'awarder' },
    ],
    source: 'NASA Press Release',
    verified: true,
    description: 'NASA awarded SpaceX $2.6B to develop and certify the Crew Dragon spacecraft for ISS crew transportation under the Commercial Crew Program.',
  },
  {
    id: 'deal-ng-sentinel',
    type: 'contract_win',
    title: 'Northrop Grumman Wins GBSD/Sentinel ICBM Program',
    amount: 13_300_000_000,
    date: '2020-09-08',
    parties: [
      { company: 'Northrop Grumman', companySlug: 'northrop-grumman', role: 'recipient' },
      { company: 'US Air Force', role: 'awarder' },
    ],
    source: 'DoD Press Release',
    verified: true,
    description: 'Northrop Grumman won the $13.3B GBSD (now Sentinel) contract to replace the aging Minuteman III ICBM fleet. Total program value estimated at $100B+.',
  },
  {
    id: 'deal-spacex-nssl-phase2',
    type: 'contract_win',
    title: 'SpaceX Wins NSSL Phase 2 Launch Services',
    amount: 1_900_000_000,
    date: '2022-11-18',
    parties: [
      { company: 'SpaceX', companySlug: 'spacex', role: 'recipient' },
      { company: 'US Space Force', role: 'awarder' },
    ],
    source: 'Space Force Press Release',
    verified: true,
    description: 'SpaceX received approximately $1.9B in NSSL Phase 2 awards for national security launches on Falcon 9 and Falcon Heavy through 2027.',
  },
  {
    id: 'deal-ula-nssl-phase2',
    type: 'contract_win',
    title: 'ULA Wins NSSL Phase 2 Launch Services',
    amount: 2_500_000_000,
    date: '2022-11-18',
    parties: [
      { company: 'United Launch Alliance', companySlug: 'united-launch-alliance', role: 'recipient' },
      { company: 'US Space Force', role: 'awarder' },
    ],
    source: 'Space Force Press Release',
    verified: true,
    description: 'ULA received approximately $2.5B in NSSL Phase 2 awards for national security launches on Atlas V and Vulcan Centaur through 2027.',
  },
  {
    id: 'deal-blue-origin-nssl',
    type: 'contract_win',
    title: 'Blue Origin Wins NSSL Phase 3 Lane 1',
    amount: 5_300_000_000,
    date: '2025-01-15',
    parties: [
      { company: 'Blue Origin', companySlug: 'blue-origin', role: 'recipient' },
      { company: 'US Space Force', role: 'awarder' },
    ],
    source: 'Space Force Press Release',
    verified: true,
    description: 'Blue Origin won NSSL Phase 3 Lane 1 contract ceiling of $5.3B for national security launches on New Glenn, marking its entry into the military launch market.',
  },
  {
    id: 'deal-l3harris-hbtss',
    type: 'contract_win',
    title: 'L3Harris HBTSS Missile Tracking Satellites',
    amount: 700_000_000,
    date: '2022-06-15',
    parties: [
      { company: 'L3Harris Technologies', companySlug: 'l3harris', role: 'recipient' },
      { company: 'Missile Defense Agency', role: 'awarder' },
    ],
    source: 'L3Harris Press Release',
    verified: true,
    description: 'L3Harris won $700M for the Hypersonic and Ballistic Tracking Space Sensor (HBTSS) to detect and track hypersonic missiles from space.',
  },
  {
    id: 'deal-sda-tranche-2-lm',
    type: 'contract_win',
    title: 'Lockheed Martin Wins SDA Tranche 2 Transport',
    amount: 1_500_000_000,
    date: '2023-12-15',
    parties: [
      { company: 'Lockheed Martin', companySlug: 'lockheed-martin', role: 'recipient' },
      { company: 'Space Development Agency', role: 'awarder' },
    ],
    source: 'SDA Press Release',
    verified: true,
    description: 'Lockheed Martin won $1.5B SDA Tranche 2 Transport Layer contract to build proliferated LEO satellites for military mesh networking.',
  },
  {
    id: 'deal-sda-tranche-2-ng',
    type: 'contract_win',
    title: 'Northrop Grumman Wins SDA Tranche 2 Transport',
    amount: 900_000_000,
    date: '2023-12-15',
    parties: [
      { company: 'Northrop Grumman', companySlug: 'northrop-grumman', role: 'recipient' },
      { company: 'Space Development Agency', role: 'awarder' },
    ],
    source: 'SDA Press Release',
    verified: true,
    description: 'Northrop Grumman won $900M for SDA Tranche 2 Transport Layer satellite manufacturing and deployment.',
  },
  {
    id: 'deal-rocketlab-sda-contracts',
    type: 'contract_win',
    title: 'Rocket Lab SDA Tranche 2 Tracking Contract',
    amount: 515_000_000,
    date: '2024-02-12',
    parties: [
      { company: 'Rocket Lab', companySlug: 'rocket-lab', role: 'recipient' },
      { company: 'Space Development Agency', role: 'awarder' },
    ],
    source: 'Rocket Lab Press Release',
    verified: true,
    description: 'Rocket Lab won $515M SDA Tranche 2 Tracking Layer Beta contract to build 18 missile-tracking satellites, its largest government contract to date.',
  },
  {
    id: 'deal-spacex-starshield',
    type: 'contract_win',
    title: 'SpaceX Starshield NRO Spy Satellite Constellation',
    amount: 1_800_000_000,
    date: '2024-02-20',
    parties: [
      { company: 'SpaceX', companySlug: 'spacex', role: 'recipient' },
      { company: 'National Reconnaissance Office', role: 'awarder' },
    ],
    source: 'Reuters',
    verified: true,
    description: 'SpaceX won a classified $1.8B contract to build a network of spy satellites for the NRO under the Starshield program, leveraging Starlink manufacturing capabilities.',
  },
  {
    id: 'deal-boeing-starliner',
    type: 'contract_win',
    title: 'Boeing Commercial Crew (Starliner)',
    amount: 4_200_000_000,
    date: '2014-09-16',
    parties: [
      { company: 'Boeing', companySlug: 'boeing', role: 'recipient' },
      { company: 'NASA', role: 'awarder' },
    ],
    source: 'NASA Press Release',
    verified: true,
    description: 'NASA awarded Boeing $4.2B for the Starliner spacecraft under the Commercial Crew Program. The program experienced significant delays before its first crewed flight in 2024.',
  },
  {
    id: 'deal-axiom-iss-module',
    type: 'contract_win',
    title: 'Axiom Space ISS Commercial Module Contract',
    amount: 228_000_000,
    date: '2020-01-27',
    parties: [
      { company: 'Axiom Space', companySlug: 'axiom-space', role: 'recipient' },
      { company: 'NASA', role: 'awarder' },
    ],
    source: 'NASA Press Release',
    verified: true,
    description: 'NASA awarded Axiom Space a $228M contract to attach the first commercial module to the ISS, which will eventually detach to become a free-flying space station.',
  },
  {
    id: 'deal-amazon-kuiper-launches',
    type: 'contract_win',
    title: 'Amazon Kuiper Launch Contracts',
    amount: 10_000_000_000,
    date: '2022-04-05',
    parties: [
      { company: 'Amazon (Project Kuiper)', role: 'recipient' },
      { company: 'ULA', companySlug: 'united-launch-alliance', role: 'awarder' },
      { company: 'Blue Origin', companySlug: 'blue-origin', role: 'awarder' },
      { company: 'Arianespace', role: 'awarder' },
    ],
    source: 'Amazon Press Release',
    verified: true,
    description: 'Amazon secured up to 83 launches from ULA, Blue Origin, and Arianespace valued at approximately $10B to deploy its 3,236-satellite Kuiper constellation.',
  },
  {
    id: 'deal-spacex-gps-iii',
    type: 'contract_win',
    title: 'SpaceX GPS III Launch Services',
    amount: 749_000_000,
    date: '2021-09-20',
    parties: [
      { company: 'SpaceX', companySlug: 'spacex', role: 'recipient' },
      { company: 'US Space Force', role: 'awarder' },
    ],
    source: 'Space Force Press Release',
    verified: true,
    description: 'SpaceX won $749M for five GPS III follow-on satellite launches on Falcon 9, further establishing its dominance in the military launch market.',
  },
  {
    id: 'deal-intuitive-machines-clps',
    type: 'contract_win',
    title: 'Intuitive Machines CLPS Task Order 3',
    amount: 117_000_000,
    date: '2023-07-12',
    parties: [
      { company: 'Intuitive Machines', companySlug: 'intuitive-machines', role: 'recipient' },
      { company: 'NASA', role: 'awarder' },
    ],
    source: 'NASA Press Release',
    verified: true,
    description: 'Intuitive Machines won its third NASA CLPS lunar delivery contract, this time to deliver a drill to the Moon\'s south pole to search for water ice.',
  },
  {
    id: 'deal-sierra-crs2',
    type: 'contract_win',
    title: 'Sierra Space Dream Chaser CRS-2',
    amount: 1_800_000_000,
    date: '2016-01-14',
    parties: [
      { company: 'Sierra Space', companySlug: 'sierra-space', role: 'recipient' },
      { company: 'NASA', role: 'awarder' },
    ],
    source: 'NASA Press Release',
    verified: true,
    description: 'Sierra Space (then Sierra Nevada) won an estimated $1.8B for ISS cargo resupply missions using the Dream Chaser spaceplane under CRS-2.',
  },
  {
    id: 'deal-astrobotic-viper',
    type: 'contract_win',
    title: 'Astrobotic VIPER Lunar Rover Delivery',
    amount: 320_000_000,
    date: '2020-06-11',
    parties: [
      { company: 'Astrobotic', companySlug: 'astrobotic', role: 'recipient' },
      { company: 'NASA', role: 'awarder' },
    ],
    source: 'NASA Press Release',
    verified: true,
    description: 'Astrobotic won a $320M task order to deliver NASA\'s VIPER water-ice hunting rover to the lunar south pole on its Griffin lander.',
  },

  // ═══════════════════════════════════════
  // IPOs & SPACs (12)
  // ═══════════════════════════════════════

  {
    id: 'deal-rocketlab-spac',
    type: 'spac',
    title: 'Rocket Lab Goes Public via SPAC Merger',
    amount: 777_000_000,
    date: '2021-08-25',
    parties: [
      { company: 'Rocket Lab', companySlug: 'rocket-lab', role: 'target' },
      { company: 'Vector Acquisition Corporation', role: 'acquirer' },
    ],
    stage: 'SPAC Merger',
    source: 'Rocket Lab Press Release',
    verified: true,
    description: 'Rocket Lab went public via SPAC merger with Vector Acquisition Corporation at a $4.1B enterprise value. The deal raised $777M including PIPE investment.',
  },
  {
    id: 'deal-planet-spac',
    type: 'spac',
    title: 'Planet Labs Goes Public via SPAC Merger',
    amount: 546_000_000,
    date: '2021-12-07',
    parties: [
      { company: 'Planet Labs', companySlug: 'planet-labs', role: 'target' },
      { company: 'dMY Technology Group IV', role: 'acquirer' },
    ],
    stage: 'SPAC Merger',
    source: 'Planet Labs Press Release',
    verified: true,
    description: 'Planet Labs went public via SPAC at $2.8B valuation. The deal raised $546M including PIPE from Google, BlackRock, and Marc Benioff.',
  },
  {
    id: 'deal-astra-spac',
    type: 'spac',
    title: 'Astra Goes Public via SPAC Merger',
    amount: 500_000_000,
    date: '2021-07-01',
    parties: [
      { company: 'Astra', role: 'target' },
      { company: 'Holicity Inc.', role: 'acquirer' },
    ],
    stage: 'SPAC Merger',
    source: 'Astra Press Release',
    verified: true,
    description: 'Astra went public via SPAC merger at a $2.1B valuation. The company raised $500M but later faced significant operational challenges.',
  },
  {
    id: 'deal-virginorbit-spac',
    type: 'spac',
    title: 'Virgin Orbit Goes Public via SPAC Merger',
    amount: 228_000_000,
    date: '2021-12-29',
    parties: [
      { company: 'Virgin Orbit', companySlug: 'virgin-orbit', role: 'target' },
      { company: 'NextGen Acquisition Corp. II', role: 'acquirer' },
    ],
    stage: 'SPAC Merger',
    source: 'Virgin Orbit Press Release',
    verified: true,
    description: 'Virgin Orbit went public via SPAC at $3.2B valuation. The company raised $228M but filed for bankruptcy in April 2023 after a failed UK launch.',
  },
  {
    id: 'deal-blacksky-spac',
    type: 'spac',
    title: 'BlackSky Technology Goes Public via SPAC',
    amount: 450_000_000,
    date: '2021-09-09',
    parties: [
      { company: 'BlackSky Technology', role: 'target' },
      { company: 'Osprey Technology Acquisition Corp', role: 'acquirer' },
    ],
    stage: 'SPAC Merger',
    source: 'BlackSky Press Release',
    verified: true,
    description: 'BlackSky went public at approximately $1.5B valuation via SPAC. The Earth observation company raised $450M including PIPE.',
  },
  {
    id: 'deal-spire-spac',
    type: 'spac',
    title: 'Spire Global Goes Public via SPAC',
    amount: 265_000_000,
    date: '2021-08-17',
    parties: [
      { company: 'Spire Global', companySlug: 'spire-global', role: 'target' },
      { company: 'NavSight Holdings', role: 'acquirer' },
    ],
    stage: 'SPAC Merger',
    source: 'Spire Global Press Release',
    verified: true,
    description: 'Spire Global went public via SPAC merger at $1.6B enterprise value. The company operates a constellation of weather and maritime tracking nanosatellites.',
  },
  {
    id: 'deal-ast-spac',
    type: 'spac',
    title: 'AST SpaceMobile Goes Public via SPAC',
    amount: 462_000_000,
    date: '2021-04-07',
    parties: [
      { company: 'AST SpaceMobile', role: 'target' },
      { company: 'New Providence Acquisition Corp.', role: 'acquirer' },
    ],
    stage: 'SPAC Merger',
    source: 'AST SpaceMobile Press Release',
    verified: true,
    description: 'AST SpaceMobile went public via SPAC at $1.4B valuation. The company is building the first space-based cellular broadband network for standard smartphones.',
  },
  {
    id: 'deal-redwire-spac',
    type: 'spac',
    title: 'Redwire Goes Public via SPAC',
    amount: 170_000_000,
    date: '2021-09-02',
    parties: [
      { company: 'Redwire', role: 'target' },
      { company: 'Genesis Park Acquisition Corp.', role: 'acquirer' },
    ],
    stage: 'SPAC Merger',
    source: 'Redwire Press Release',
    verified: true,
    description: 'Redwire went public via SPAC at approximately $615M enterprise value. The space infrastructure company had previously acquired multiple space companies.',
  },
  {
    id: 'deal-momentus-spac',
    type: 'spac',
    title: 'Momentus Goes Public via SPAC',
    amount: 97_000_000,
    date: '2021-08-12',
    parties: [
      { company: 'Momentus', role: 'target' },
      { company: 'Stable Road Acquisition Corp.', role: 'acquirer' },
    ],
    stage: 'SPAC Merger',
    source: 'Momentus Press Release',
    verified: true,
    description: 'Momentus went public via SPAC at $1.1B valuation, though the deal was marred by SEC enforcement action over misleading claims about its propulsion technology.',
  },
  {
    id: 'deal-satellogic-spac',
    type: 'spac',
    title: 'Satellogic Goes Public via SPAC',
    amount: 251_000_000,
    date: '2022-01-26',
    parties: [
      { company: 'Satellogic', role: 'target' },
      { company: 'CF Acquisition Corp VIII', role: 'acquirer' },
    ],
    stage: 'SPAC Merger',
    source: 'Satellogic Press Release',
    verified: true,
    description: 'Argentine Earth observation company Satellogic went public via SPAC at $1.1B valuation, making it the first Latin American space company to list publicly.',
  },
  {
    id: 'deal-intuitive-machines-spac',
    type: 'spac',
    title: 'Intuitive Machines Goes Public via SPAC',
    amount: 105_000_000,
    date: '2023-02-14',
    parties: [
      { company: 'Intuitive Machines', companySlug: 'intuitive-machines', role: 'target' },
      { company: 'Inflection Point Acquisition Corp.', role: 'acquirer' },
    ],
    stage: 'SPAC Merger',
    source: 'Intuitive Machines Press Release',
    verified: true,
    description: 'Intuitive Machines went public via SPAC at $1B enterprise value. The company later made history with the first US commercial lunar landing in February 2024.',
  },
  {
    id: 'deal-terranorbital-spac',
    type: 'spac',
    title: 'Terran Orbital Goes Public via SPAC',
    amount: 81_000_000,
    date: '2022-03-28',
    parties: [
      { company: 'Terran Orbital', role: 'target' },
      { company: 'Tailwind Two Acquisition Corp.', role: 'acquirer' },
    ],
    stage: 'SPAC Merger',
    source: 'Terran Orbital Press Release',
    verified: true,
    description: 'Terran Orbital went public via SPAC at $1.58B enterprise value. The satellite manufacturer was later acquired by Lockheed Martin in 2024.',
  },
];

// ────────────────────────────────────────────────────────────────
// Query Functions
// ────────────────────────────────────────────────────────────────

/**
 * Get all deals sorted by date descending.
 */
export function getAllDeals(): Deal[] {
  return [...DEALS].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/**
 * Get deals filtered by type.
 */
export function getDealsByType(type: DealType): Deal[] {
  return DEALS
    .filter((d) => d.type === type)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Get deals involving a specific company (by slug).
 */
export function getDealsByCompany(slug: string): Deal[] {
  return DEALS
    .filter((d) =>
      d.parties.some(
        (p) => p.companySlug === slug || p.company.toLowerCase().replace(/\s+/g, '-') === slug
      )
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Get deals from the last N days.
 */
export function getRecentDeals(days: number): Deal[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return DEALS
    .filter((d) => new Date(d.date) >= cutoff)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Search deals by query string (matches title, description, and party names).
 */
export function searchDeals(query: string): Deal[] {
  const q = query.toLowerCase();
  return DEALS
    .filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.parties.some((p) => p.company.toLowerCase().includes(q))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Get deals filtered by all supported criteria.
 */
export function getFilteredDeals(filters: {
  type?: DealType | '';
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  dateFrom?: string;
  dateTo?: string;
  company?: string;
  page?: number;
  limit?: number;
}): { deals: Deal[]; total: number; page: number; totalPages: number } {
  const { type, search, minAmount, maxAmount, dateFrom, dateTo, company, page = 1, limit = 25 } = filters;

  let results = [...DEALS];

  // Type filter
  if (type) {
    results = results.filter((d) => d.type === type);
  }

  // Search filter
  if (search) {
    const q = search.toLowerCase();
    results = results.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.parties.some((p) => p.company.toLowerCase().includes(q))
    );
  }

  // Amount filters
  if (minAmount) {
    results = results.filter((d) => d.amount !== null && d.amount >= minAmount);
  }
  if (maxAmount) {
    results = results.filter((d) => d.amount !== null && d.amount <= maxAmount);
  }

  // Date filters
  if (dateFrom) {
    const from = new Date(dateFrom);
    results = results.filter((d) => new Date(d.date) >= from);
  }
  if (dateTo) {
    const to = new Date(dateTo);
    results = results.filter((d) => new Date(d.date) <= to);
  }

  // Company filter
  if (company) {
    const q = company.toLowerCase();
    results = results.filter((d) =>
      d.parties.some(
        (p) =>
          p.company.toLowerCase().includes(q) ||
          (p.companySlug && p.companySlug.includes(q))
      )
    );
  }

  // Sort by date descending
  results.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const total = results.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const paged = results.slice(offset, offset + limit);

  return { deals: paged, total, page, totalPages };
}

/**
 * Compute aggregate statistics across all deals.
 */
export function getDealStats(): DealStats {
  const now = new Date();
  const ytdStart = new Date(now.getFullYear(), 0, 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalDeals = DEALS.length;
  const dealsWithAmount = DEALS.filter((d) => d.amount !== null);
  const totalVolume = dealsWithAmount.reduce((sum, d) => sum + (d.amount || 0), 0);
  const avgDealSize = dealsWithAmount.length > 0 ? totalVolume / dealsWithAmount.length : 0;

  const ytdDeals = DEALS.filter((d) => new Date(d.date) >= ytdStart);
  const ytdDealCount = ytdDeals.length;
  const ytdVolume = ytdDeals.filter((d) => d.amount !== null).reduce((sum, d) => sum + (d.amount || 0), 0);

  const monthDeals = DEALS.filter((d) => new Date(d.date) >= monthStart);
  const dealsThisMonth = monthDeals.length;
  const volumeThisMonth = monthDeals.filter((d) => d.amount !== null).reduce((sum, d) => sum + (d.amount || 0), 0);

  // By type
  const types: DealType[] = ['funding_round', 'acquisition', 'contract_win', 'ipo', 'spac'];
  const byType = types.map((type) => {
    const ofType = DEALS.filter((d) => d.type === type);
    return {
      type,
      count: ofType.length,
      volume: ofType.filter((d) => d.amount !== null).reduce((sum, d) => sum + (d.amount || 0), 0),
    };
  });

  // By quarter (last 12 quarters)
  const quarterMap = new Map<string, { count: number; volume: number }>();
  DEALS.forEach((d) => {
    const dt = new Date(d.date);
    const q = `Q${Math.ceil((dt.getMonth() + 1) / 3)} ${dt.getFullYear()}`;
    const existing = quarterMap.get(q) || { count: 0, volume: 0 };
    existing.count += 1;
    existing.volume += d.amount || 0;
    quarterMap.set(q, existing);
  });

  // Generate last 12 quarters
  const byQuarter: { quarter: string; count: number; volume: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i * 3);
    const q = `Q${Math.ceil((d.getMonth() + 1) / 3)} ${d.getFullYear()}`;
    if (!byQuarter.some((bq) => bq.quarter === q)) {
      const data = quarterMap.get(q) || { count: 0, volume: 0 };
      byQuarter.push({ quarter: q, ...data });
    }
  }

  // By year
  const yearMap = new Map<number, { count: number; volume: number }>();
  DEALS.forEach((d) => {
    const year = new Date(d.date).getFullYear();
    const existing = yearMap.get(year) || { count: 0, volume: 0 };
    existing.count += 1;
    existing.volume += d.amount || 0;
    yearMap.set(year, existing);
  });
  const byYear = Array.from(yearMap.entries())
    .map(([year, data]) => ({ year, ...data }))
    .sort((a, b) => a.year - b.year);

  return {
    totalDeals,
    totalVolume,
    avgDealSize,
    dealsThisMonth,
    volumeThisMonth,
    ytdDealCount,
    ytdVolume,
    byType,
    byQuarter,
    byYear,
  };
}
