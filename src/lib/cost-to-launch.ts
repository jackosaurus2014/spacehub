// ─── "How much does it cost to launch X?" long-tail guides ──────────────────
// The launch-cost guide is the site's largest organic asset (28.7k Search
// Console impressions/28d) and its top queries are all variants of "how much
// does it cost to launch a …". Each entry here becomes
// /guide/cost-to-launch/[thing]: a direct answer up top, a price table, the
// hidden costs, an FAQ with schema, and links back to the cost guide, the
// calculator and the rocket pages. Figures are 2026 list/rideshare prices
// consistent with src/app/guide/space-launch-cost-comparison; update both
// together.

export interface CostRow {
  option: string;
  price: string;
  notes: string;
  rocket?: string; // /rockets/[slug]
}

export interface CostToLaunchEntry {
  slug: string;
  thing: string;            // "a CubeSat"
  title: string;            // page H1
  metaTitle: string;
  description: string;
  shortAnswer: string;      // the one-paragraph answer
  rows: CostRow[];
  hiddenCosts: string[];
  faq: Array<{ q: string; a: string }>;
  related: Array<{ label: string; href: string }>;
}

export const COST_TO_LAUNCH: readonly CostToLaunchEntry[] = [
  {
    slug: 'cubesat',
    thing: 'a CubeSat',
    title: 'How Much Does It Cost to Launch a CubeSat?',
    metaTitle: 'How Much Does It Cost to Launch a CubeSat? (2026 Prices)',
    description: 'Launching a 1U CubeSat costs roughly $40,000–$80,000 on a rideshare; a 3U about $100,000–$250,000; a 6U $250,000–$500,000. Full 2026 price breakdown by size and provider, plus the costs nobody quotes.',
    shortAnswer: 'A 1U CubeSat rides to low Earth orbit for roughly $40,000–$80,000 through a rideshare broker; a 3U runs about $100,000–$250,000, and a 6U or 12U $250,000–$600,000. SpaceX\'s Transporter missions set the floor at about $7,000 per kilogram after a $350,000 minimum, but CubeSats buy a slot in a deployer rather than raw kilograms, so brokers (Exolaunch, ISILaunch, D-Orbit, Maverick) price by unit size, orbit and deployment options. The satellite itself typically costs as much again — or several times more.',
    rows: [
      { option: '1U CubeSat, rideshare via broker', price: '$40k–$80k', notes: 'Standard deployer slot on a Transporter-class mission to ~500 km SSO' },
      { option: '3U CubeSat, rideshare via broker', price: '$100k–$250k', notes: 'The most common size; price rises with late booking and custom orbits' },
      { option: '6U CubeSat, rideshare via broker', price: '$250k–$400k', notes: 'Heavier deployer, often with propulsion or larger solar arrays' },
      { option: '12U / 16U CubeSat', price: '$400k–$800k', notes: 'Approaching smallsat pricing; consider a dedicated deployer' },
      { option: 'ISS deployment (Nanoracks/Voyager, JEM airlock)', price: '$60k–$200k', notes: 'Lower altitude (~400 km) so 1–2 year lifetime; convenient for university missions', rocket: 'falcon-9' },
      { option: 'Dedicated small launcher (Electron), shared', price: '$1M+ per slot', notes: 'Exact orbit and schedule; overkill for most CubeSats', rocket: 'electron' },
    ],
    hiddenCosts: [
      'Integration and deployer fees (often bundled by brokers, not by SpaceX directly).',
      'Licensing: an FCC experimental or Part 25 licence, NOAA remote-sensing licence if you carry a camera, and ITU coordination — weeks to months and real fees.',
      'Testing: vibration, thermal-vacuum and deployer fit checks at a test house.',
      'Ground station time or a ground-station-as-a-service contract for the mission lifetime.',
      'Insurance is usually skipped for CubeSats; the satellite is the risk budget.',
    ],
    faq: [
      { q: 'What is the cheapest way to launch a CubeSat?', a: 'A university or research payload can sometimes fly free through NASA\'s CubeSat Launch Initiative or ESA\'s Fly Your Satellite programme. Commercially, a 1U slot on a rideshare broker\'s manifest at roughly $40,000–$80,000 is the floor.' },
      { q: 'How much does a CubeSat itself cost?', a: 'A basic 1U educational CubeSat can be built for $50,000–$150,000 in parts; a 3U commercial-grade bus with a real payload runs $250,000 to over $1 million. Launch is often less than half the total mission cost.' },
      { q: 'How long does it take to book a CubeSat launch?', a: 'Rideshare manifests fill 6–18 months ahead. Book once the mass and volume are frozen, before the design is finished.' },
    ],
    related: [{ label: 'Launch cost guide: every rocket compared', href: '/guide/space-launch-cost-comparison' }, { label: 'Build guide: CanSat', href: '/build-guides/build-a-cansat' }, { label: 'Learn: Space Supply Chain Fundamentals', href: '/learn/supply-chain' }],
  },
  {
    slug: 'satellite',
    thing: 'a satellite',
    title: 'How Much Does It Cost to Launch a Satellite?',
    metaTitle: 'How Much Does It Cost to Launch a Satellite? (2026, by Size)',
    description: 'From $350,000 for a 50 kg smallsat on a SpaceX rideshare to about $70 million for a dedicated Falcon 9 and $100 million-plus for a heavy GEO satellite. 2026 launch prices by satellite size and orbit.',
    shortAnswer: 'It depends almost entirely on mass and whether you buy a seat or the whole rocket. A 50 kg smallsat rides on a SpaceX Transporter mission for about $350,000 (roughly $7,000 per additional kilogram); a 150 kg satellite costs around $1 million to launch on rideshare. A dedicated small launcher such as Electron is about $8 million for up to ~300 kg to your exact orbit. A dedicated Falcon 9 lists at about $70 million and carries up to 22,800 kg to low Earth orbit — about $3,000 per kilogram for whoever fills it — while a heavy geostationary communications satellite launched to GTO typically pays $70–120 million.',
    rows: [
      { option: 'Smallsat, 50 kg, rideshare to SSO', price: '~$350k', notes: 'SpaceX Transporter minimum; ~$7,000/kg above 50 kg', rocket: 'falcon-9' },
      { option: 'Smallsat, 150 kg, rideshare', price: '~$1M', notes: 'Plus integration, transport and insurance — see the hidden costs', rocket: 'falcon-9' },
      { option: 'Dedicated small launch (Electron, ~300 kg)', price: '~$8M', notes: 'Your orbit, your schedule', rocket: 'electron' },
      { option: 'Dedicated Falcon 9 (up to 22.8 t LEO)', price: '~$70M', notes: 'About $3,000/kg at full payload', rocket: 'falcon-9' },
      { option: 'GEO comsat to GTO (Falcon 9 / Ariane 6 / Vulcan)', price: '$70M–$120M', notes: 'Heavier satellites and higher-energy orbits; dual-manifest on Ariane 64 shares the bill', rocket: 'ariane-6' },
      { option: 'Falcon Heavy, dedicated', price: '~$97M', notes: 'For very heavy or direct-to-GEO missions', rocket: 'falcon-heavy' },
    ],
    hiddenCosts: [
      'Integration, deployer and range/campaign fees — often $100,000–$300,000 for a smallsat.',
      'Launch insurance at 5–10 % of the insured value for proven vehicles; many operators self-insure smallsats.',
      'Transport in a conditioned container, cleanroom rental at the site, and a chaperone team for weeks.',
      'An orbital transfer vehicle or onboard propulsion if the rideshare drop-off orbit is not the one you need.',
      'Licensing (FCC/ITU, NOAA if imaging, export control if launching abroad).',
    ],
    faq: [
      { q: 'How much does SpaceX charge to launch a satellite?', a: 'Rideshare starts at about $350,000 for 50 kg on Transporter missions, roughly $7,000 per kilogram beyond that. A dedicated Falcon 9 lists at about $70 million; Falcon Heavy about $97 million. Government missions cost more.' },
      { q: 'How much does it cost per kilogram to launch a satellite?', a: 'Roughly $3,000 per kilogram on a full dedicated Falcon 9, about $7,000 per kilogram on rideshare, $25,000–$30,000 per kilogram on a dedicated small launcher like Electron, and a target of $100–$500 per kilogram on Starship at mature flight rates.' },
      { q: 'Can I launch a satellite for free?', a: 'Sometimes: NASA\'s CubeSat Launch Initiative, ESA educational programmes, and sponsored rideshare competitions fly selected research payloads at no launch cost. Commercial payloads pay.' },
    ],
    related: [{ label: 'Launch cost guide: every rocket compared', href: '/guide/space-launch-cost-comparison' }, { label: 'Launch cost calculator', href: '/launch-cost-calculator' }, { label: 'Learn: getting a kilogram to orbit', href: '/learn/supply-chain/space-supply-chain-fundamentals/getting-a-kilogram-to-orbit' }],
  },
  {
    slug: 'person',
    thing: 'a person',
    title: 'How Much Does It Cost to Send a Person to Space?',
    metaTitle: 'How Much Does It Cost to Send a Person to Space? (2026 Seat Prices)',
    description: 'A suborbital seat costs about $450,000–$600,000 (Virgin Galactic; Blue Origin undisclosed), an orbital seat $55–70 million (SpaceX Crew Dragon via Axiom), and a stay on the ISS adds tens of millions more. 2026 prices explained.',
    shortAnswer: 'A few minutes of weightlessness above the Kármán line costs about $450,000–$600,000 on Virgin Galactic; Blue Origin does not publish New Shepard prices, but auctioned and reported seats have ranged from under $1 million to $28 million for the first flight. Reaching orbit is a different league: a seat on a SpaceX Crew Dragon flying a private mission with Axiom Space runs roughly $55–70 million, and NASA pays SpaceX about $70 million per astronaut seat under its commercial crew contracts. A stay aboard the ISS adds NASA\'s per-day fees for life support, crew time and cargo.',
    rows: [
      { option: 'Suborbital, Virgin Galactic (Unity/Delta)', price: '~$450k–$600k', notes: 'About 90 minutes door to door, a few minutes of weightlessness' },
      { option: 'Suborbital, Blue Origin New Shepard', price: 'Undisclosed', notes: 'Reported seats from ~$1M; first-flight auction seat $28M' },
      { option: 'Orbital, private mission (Crew Dragon via Axiom)', price: '~$55M–$70M per seat', notes: 'Multi-day free-flyer or ISS visit; training included' },
      { option: 'NASA commercial crew seat (Crew Dragon)', price: '~$70M', notes: 'Government price per astronaut, six-month ISS rotation' },
      { option: 'Soyuz seat (historical, 2010s)', price: '$20M–$90M', notes: 'Rose from ~$20M to ~$90M as the US lost its own capability' },
      { option: 'Future: Starship passenger flights', price: 'Unpriced', notes: 'SpaceX has spoken of tens of thousands of dollars per seat at scale; nothing is on sale', rocket: 'starship' },
    ],
    hiddenCosts: [
      'Training: days for suborbital, months for orbital.',
      'Medical screening and, for orbital flights, insurance that many carriers will not write.',
      'Deposits are large and non-refundable in part; waiting lists run years.',
      'For ISS visits, NASA charges for crew time, life support, cargo up and down, and data.',
    ],
    faq: [
      { q: 'How much is a ticket to space with Virgin Galactic?', a: 'About $600,000 for seats sold since 2022; earlier deposits were taken at $250,000 and $450,000. The company paused sales while it builds its Delta-class ships.' },
      { q: 'How much does it cost to go to the ISS as a tourist?', a: 'Private astronaut missions with Axiom Space have been reported at $55–70 million per seat, including training and a stay of one to two weeks.' },
      { q: 'Why is orbit so much more expensive than suborbital?', a: 'Orbit needs about 28,000 km/h and a heat shield to come home; suborbital needs about 3,500 km/h and a parachute. The energy, the vehicle and the risk are all an order of magnitude larger.' },
    ],
    related: [{ label: 'Space tourism: who is selling seats', href: '/space-tourism' }, { label: 'Learn: Rockets, Orbits and Astronauts', href: '/learn/kids' }, { label: 'Artemis tracker', href: '/artemis' }],
  },
  {
    slug: 'starlink-batch',
    thing: 'a Starlink batch',
    title: 'How Much Does It Cost to Launch a Starlink Batch?',
    metaTitle: 'How Much Does a Starlink Launch Cost SpaceX? (2026 Estimate)',
    description: 'A Falcon 9 lists at ~$70 million, but SpaceX\'s internal cost for a Starlink launch with a reused booster is estimated at $15–30 million — plus roughly $500,000 per satellite. What a batch of 20–28 Starlinks really costs.',
    shortAnswer: 'A customer pays about $70 million for a Falcon 9, but SpaceX launching its own Starlink satellites pays only the marginal cost: a reused booster, a new upper stage, recovered fairings, propellant and range operations, estimated at $15–30 million per flight. Add the satellites themselves — SpaceX has cited under $1 million each and analysts estimate $500,000 or less for current V2 Minis — and a batch of 24–28 satellites costs on the order of $30–45 million to put in orbit, or roughly $1.2–1.8 million per satellite delivered. Starship is intended to cut that per-satellite figure several-fold.',
    rows: [
      { option: 'Falcon 9 list price (external customer)', price: '~$70M', notes: 'What Starlink would pay if it were a customer', rocket: 'falcon-9' },
      { option: 'Falcon 9 internal marginal cost (reused booster)', price: '$15M–$30M (est.)', notes: 'Upper stage is the largest expendable item', rocket: 'falcon-9' },
      { option: 'Starlink V2 Mini satellite, each', price: '~$0.5M (est.)', notes: 'SpaceX has said "well under $1M"' },
      { option: 'Batch of 24–28 satellites, all-in', price: '$30M–$45M (est.)', notes: 'Launch + satellites, ~$1.2–1.8M per satellite in orbit' },
      { option: 'Starship, full-size V3 satellites', price: 'Unknown', notes: 'Target: far lower cost per satellite through ~60+ per flight', rocket: 'starship' },
    ],
    hiddenCosts: [
      'Second stages are expended every flight — the biggest single hardware cost.',
      'Booster refurbishment, drone-ship operations and fairing recovery fleets.',
      'Ground gateways, user terminals sold near or below cost, and spectrum coordination — the constellation cost, not the launch cost.',
    ],
    faq: [
      { q: 'How many Starlink satellites are on one launch?', a: 'Typically 20–28 V2 Mini satellites on a Falcon 9, depending on the orbital shell. Starship is designed to carry far more of the larger V3 satellites.' },
      { q: 'How much does SpaceX spend on Starlink launches per year?', a: 'With well over 100 Starlink launches a year at an estimated $15–30 million marginal cost each, launch alone is a $2–3 billion annual line before satellites, gateways and terminals.' },
      { q: 'Is Starlink profitable?', a: 'SpaceX has said Starlink reached cash-flow positive operation, and revenue is estimated well above $10 billion a year by 2026. Launch cost is the reason: no other operator launches its own satellites at marginal cost.' },
    ],
    related: [{ label: 'Rocket page: Falcon 9', href: '/rockets/falcon-9' }, { label: 'Rocket page: Starship', href: '/rockets/starship' }, { label: 'Compare: Starlink vs AST SpaceMobile', href: '/compare/starlink-vs-ast-spacemobile' }],
  },
];

export function getCostToLaunch(slug: string): CostToLaunchEntry | null {
  return COST_TO_LAUNCH.find((c) => c.slug === slug) ?? null;
}
