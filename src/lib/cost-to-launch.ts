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
  {
    slug: 'gps-satellite',
    thing: 'a GPS satellite',
    title: 'How Much Does It Cost to Launch a GPS Satellite?',
    metaTitle: 'How Much Does It Cost to Launch a GPS Satellite? (GPS III, 2026)',
    description: 'A GPS III satellite launch on Falcon 9 runs roughly $70-100 million under Space Force contracts, on top of a ~$500 million satellite. What the US pays to keep navigation running, and why.',
    shortAnswer: 'The launch alone runs roughly $70-100 million: GPS III satellites have flown on Falcon 9 under National Security Space Launch contracts priced above the ~$70 million commercial list because of mission-assurance requirements, direct-to-medium-Earth-orbit insertion and government oversight. The satellite is the bigger number: Lockheed Martin builds GPS III for roughly $500 million each, so a delivered GPS satellite is a $600 million-plus program per bird, replaced on a 15-year cycle.',
    rows: [
      { option: 'Launch, Falcon 9 (NSSL mission assurance)', price: '$70M-$100M', notes: 'MEO insertion at ~20,200 km; expendable or recovered booster depending on mass margin', rocket: 'falcon-9' },
      { option: 'Launch, Vulcan Centaur (NSSL Phase 2/3)', price: '$100M-$150M', notes: 'ULA share of NSSL missions; price per mission varies by orbit', rocket: 'vulcan-centaur' },
      { option: 'GPS III satellite (Lockheed Martin)', price: '~$500M each', notes: 'GPS IIIF follow-on units are contracted lower per unit over the block buy' },
      { option: 'Ground segment share (OCX)', price: 'Billions, program-wide', notes: 'The next-generation operational control system exceeded $6B; spread across the constellation' },
    ],
    hiddenCosts: ['Mission assurance and government engineering oversight are why NSSL launches cost more than commercial ones.', 'Direct MEO insertion needs upper-stage performance a commercial LEO launch does not.', 'On-orbit checkout can take months before the satellite is declared operational.'],
    faq: [
      { q: 'Why do military launches cost more than commercial ones?', a: 'Mission assurance: additional testing, independent verification, government access to data and the right to delay for cause. The Space Force pays for certainty, not just a ride.' },
      { q: 'How many GPS satellites are there?', a: 'The operational constellation is 31 satellites in six orbital planes; spares bring the count higher. New GPS III and IIIF units replace 1990s and 2000s satellites one at a time.' },
    ],
    related: [{ label: 'Rocket page: Falcon 9', href: '/rockets/falcon-9' }, { label: 'Rocket page: Vulcan Centaur', href: '/rockets/vulcan-centaur' }, { label: 'Procurement: NSSL and defense contracts', href: '/procurement' }],
  },
  {
    slug: 'iss-resupply',
    thing: 'an ISS resupply mission',
    title: 'How Much Does an ISS Resupply Mission Cost?',
    metaTitle: 'How Much Does an ISS Resupply Mission Cost? (Dragon, Cygnus, HTV-X)',
    description: 'NASA pays roughly $150-250 million per cargo mission to the International Space Station under Commercial Resupply Services, about $40,000-$90,000 per kilogram delivered. The numbers behind Dragon, Cygnus and HTV-X.',
    shortAnswer: 'Under NASA Commercial Resupply Services contracts, a cargo flight to the ISS costs the agency roughly $150-250 million, covering the launch, the spacecraft, integration and the return of cargo where the vehicle can bring it back. With 2,500-3,500 kg of pressurized cargo per flight, that is on the order of $40,000-$90,000 per kilogram delivered to the station, far above a commercial LEO launch price, because the vehicle, not the rocket, is most of the cost.',
    rows: [
      { option: 'SpaceX Cargo Dragon (CRS-2)', price: '~$150M-$200M per mission (est.)', notes: 'Only vehicle that returns cargo to Earth intact; launches on Falcon 9', rocket: 'falcon-9' },
      { option: 'Northrop Grumman Cygnus', price: '~$200M-$250M per mission (est.)', notes: 'Disposes of trash on re-entry; has flown on Antares and Falcon 9' },
      { option: 'JAXA HTV-X', price: 'Government program', notes: 'Japan in-kind contribution to ISS operations; launches on H3', rocket: 'h3' },
      { option: 'Sierra Space Dream Chaser (planned)', price: 'CRS-2 contract', notes: 'Runway landing; first flight pending' },
    ],
    hiddenCosts: ['Late-load cargo, cold-stowage science and time-critical biology drive the schedule and the price.', 'Return capability (Dragon) is worth a premium to researchers; disposal-only vehicles carry trash down.', 'ISS retirement (~2030) is why commercial stations are courting the same cargo providers now.'],
    faq: [
      { q: 'How much cargo does one mission carry?', a: 'Cargo Dragon carries up to ~3,300 kg of pressurized and unpressurized cargo; Cygnus around 3,500-3,750 kg pressurized. Crew supplies, spare parts and science experiments compete for the manifest.' },
      { q: 'Why is it so much more than $3,000 per kilogram?', a: 'The launch is only part of the bill. A pressurized, docking, life-support-compatible spacecraft that NASA certifies for proximity operations at a crewed station costs far more than the rocket under it.' },
    ],
    related: [{ label: 'Space stations: ISS and what comes after', href: '/space-stations' }, { label: 'Compare: Axiom vs Vast', href: '/compare/axiom-vs-vast' }, { label: 'Mission Control: upcoming cargo flights', href: '/mission-control' }],
  },
  {
    slug: 'mars-rover',
    thing: 'a Mars rover',
    title: 'How Much Does It Cost to Launch a Mars Rover?',
    metaTitle: 'How Much Does It Cost to Launch a Mars Rover? (Perseverance Numbers)',
    description: 'Perseverance cost about $2.7 billion in total; the launch on an Atlas V 541 was roughly $243 million of that. Why a Mars launch costs more than a satellite launch, and what a cheaper Mars mission could look like.',
    shortAnswer: 'The launch is the small part. NASA paid about $243 million for the Atlas V 541 that sent Perseverance to Mars in 2020, more than a commercial launch because Mars needs a high-energy escape trajectory, a precisely timed window that opens for a few weeks every 26 months, and planetary-protection handling. The rover itself, its cruise stage and sky-crane landing system cost about $2.2 billion to develop, and operations add roughly $300 million for the prime mission, for a program total near $2.7 billion.',
    rows: [
      { option: 'Perseverance launch, Atlas V 541 (2020)', price: '~$243M', notes: 'Includes launch services, payload processing and mission-unique support', rocket: 'atlas-v' },
      { option: 'Perseverance development (rover + EDL)', price: '~$2.2B', notes: 'Sky-crane landing system, nuclear power source, instruments' },
      { option: 'Prime-mission operations', price: '~$300M', notes: 'Roughly one Mars year of surface operations' },
      { option: 'Falcon Heavy to Mars (commercial, dedicated)', price: '~$100M-$150M', notes: 'The route future commercial Mars payloads are likely to use', rocket: 'falcon-heavy' },
      { option: 'Small Mars orbiters on a shared ride (ESCAPADE)', price: '$20M-$50M class', notes: 'Rocket Lab twin orbiters launched on New Glenn in 2025 for well under a flagship budget', rocket: 'new-glenn' },
    ],
    hiddenCosts: ['The 26-month launch window: miss it and the mission waits two years, which is why Mars programs carry schedule margin nobody else does.', 'Planetary protection: sterilization and clean-room handling to avoid contaminating Mars.', 'A radioisotope power source (MMRTG) adds cost and regulatory steps a solar rover avoids.'],
    faq: [
      { q: 'How much did Perseverance cost in total?', a: 'About $2.7 billion including development, launch and prime-mission operations, per NASA and The Planetary Society accounting.' },
      { q: 'Could Starship make a Mars mission cheaper?', a: 'Starship intended mass to Mars would remove the need for exquisite mass optimization, which is where much of a flagship cost comes from. Nothing is priced yet; the first uncrewed attempts are what will set the number.' },
    ],
    related: [{ label: 'Mars Planner: windows and missions', href: '/mars-planner' }, { label: 'Learn: Orbital Mechanics 101', href: '/learn/orbital-mechanics' }, { label: 'Rocket page: Starship', href: '/rockets/starship' }],
  },
  {
    slug: 'weather-satellite',
    thing: 'a weather satellite',
    title: 'How Much Does It Cost to Launch a Weather Satellite?',
    metaTitle: 'How Much Does It Cost to Launch a Weather Satellite? (GOES, JPSS)',
    description: 'A GOES-class geostationary weather satellite launch costs roughly $100-170 million on Atlas V or Falcon Heavy; the satellite itself is $400-600 million. Polar orbiters and commercial smallsat weather constellations cost far less per unit.',
    shortAnswer: 'For the big geostationary weather satellites such as NOAA GOES-R series, the launch runs about $100-170 million (GOES-T flew on Atlas V 541 for roughly $165 million; GOES-U on Falcon Heavy for about $153 million) and the satellite $400-600 million, plus ground systems. Polar-orbiting weather satellites (JPSS) launch to sun-synchronous orbit for less, and the new commercial weather constellations from Spire, Tomorrow.io and PlanetiQ put radio-occultation and radar sensors on smallsats launched by rideshare for a few hundred thousand dollars each.',
    rows: [
      { option: 'GOES-U on Falcon Heavy (2024)', price: '~$153M', notes: 'Direct-to-GEO capable heavy lift', rocket: 'falcon-heavy' },
      { option: 'GOES-T on Atlas V 541 (2022)', price: '~$165M', notes: 'Last of the GOES-R launches on Atlas', rocket: 'atlas-v' },
      { option: 'GOES-R series satellite (Lockheed Martin)', price: '~$400M-$600M each', notes: 'Four-satellite program near $11B including ground segment and operations' },
      { option: 'JPSS polar orbiter launch (Vandenberg)', price: '~$70M-$110M', notes: 'Sun-synchronous orbit on Atlas V / Falcon 9', rocket: 'falcon-9' },
      { option: 'Commercial weather smallsat, rideshare', price: '$0.3M-$1M per satellite', notes: 'GNSS radio-occultation or microwave sounders on 3U-16U buses', rocket: 'falcon-9' },
    ],
    hiddenCosts: ['Geostationary satellites need a high-energy transfer and months of orbit-raising and checkout.', 'The ground segment (antennas, processing, distribution to forecasters) is a program-scale cost that dwarfs launch.', 'Weather satellites are single points of failure for forecasts, so agencies keep on-orbit spares, paid for twice.'],
    faq: [
      { q: 'Who pays for weather satellites?', a: 'National agencies: NOAA in the US, EUMETSAT in Europe, JMA in Japan, CMA in China. Commercial weather data providers sell supplementary data under government purchase programs.' },
      { q: 'Why not launch weather satellites on rideshare?', a: 'The big ones are too heavy and go to GEO; rideshare drops you in LEO. The small commercial weather sensors do exactly that, which is why they cost a thousand times less per unit.' },
    ],
    related: [{ label: 'Space Environment: weather and operations', href: '/space-environment' }, { label: 'Launches by site: Vandenberg', href: '/launches/vandenberg' }, { label: 'Learn: Space Communications 101', href: '/learn/communications' }],
  },
  {
    slug: 'space-telescope',
    thing: 'a space telescope',
    title: 'How Much Does It Cost to Launch a Space Telescope?',
    metaTitle: 'How Much Does It Cost to Launch a Space Telescope? (Webb, Roman, Hubble)',
    description: 'Launch is a rounding error on a flagship telescope: the Roman telescope Falcon Heavy ride is about $255 million on a ~$4 billion observatory; Webb rode an ESA-provided Ariane 5 against a ~$10 billion program. The real costs, and what a small telescope costs to fly.',
    shortAnswer: 'Launch is usually a few percent of a flagship telescope budget. NASA is paying SpaceX about $255 million to launch the Nancy Grace Roman Space Telescope on a Falcon Heavy against an observatory costing roughly $4 billion; the James Webb Space Telescope rode an Ariane 5 supplied by ESA as its contribution to a ~$10 billion program. At the other end, a smallsat telescope or an astrophysics CubeSat launches on a rideshare for a few hundred thousand dollars. The optics, the pointing and the detectors are where the money goes.',
    rows: [
      { option: 'Roman Space Telescope, Falcon Heavy (2026-27)', price: '~$255M', notes: 'Launch to the Sun-Earth L2 point', rocket: 'falcon-heavy' },
      { option: 'James Webb, Ariane 5 (2021)', price: 'ESA-provided', notes: 'Launch was the European in-kind contribution; total program ~$10B' },
      { option: 'Hubble, Space Shuttle (1990)', price: 'Shuttle-era flight (~$500M each)', notes: 'Plus five servicing missions, each a Shuttle flight' },
      { option: 'Smallsat / CubeSat telescope, rideshare', price: '$0.3M-$2M', notes: 'ASTERIA and HaloSat-class missions; optics limited by aperture', rocket: 'falcon-9' },
      { option: 'Habitable Worlds Observatory (2040s, planned)', price: 'Unpriced', notes: 'Starship-class lift is part of the argument for a larger aperture', rocket: 'starship' },
    ],
    hiddenCosts: ['Cryogenic cooling, sunshields and deployment mechanisms: the Webb cost was engineering, not launch.', 'Operations: a flagship observatory costs tens of millions a year to run for decades.', 'Launch environment testing: a telescope must survive vibration it will never see again.'],
    faq: [
      { q: 'How much did the James Webb Space Telescope cost?', a: 'About $10 billion over its development, launch and first years of operations, according to NASA; most of it engineering and schedule, not the rocket.' },
      { q: 'Why are telescopes sent to L2?', a: 'The second Sun-Earth Lagrange point keeps the Sun, Earth and Moon on one side of the telescope, so a single sunshield keeps the optics cold and the view unobstructed.' },
    ],
    related: [{ label: 'Rocket page: Falcon Heavy', href: '/rockets/falcon-heavy' }, { label: 'Learn: Orbital Mechanics 101', href: '/learn/orbital-mechanics' }, { label: 'Space history timeline', href: '/history' }],
  },
  {
    slug: 'crew-to-the-moon',
    thing: 'a crew to the Moon',
    title: 'How Much Does It Cost to Send a Crew to the Moon?',
    metaTitle: 'How Much Does It Cost to Send a Crew to the Moon? (Artemis, 2026)',
    description: 'Each Artemis mission costs NASA roughly $4.1 billion for the SLS rocket, Orion and ground systems alone, per the NASA inspector general, before the lander. Apollo in today\'s dollars and the commercial alternatives, compared.',
    shortAnswer: 'The NASA Office of Inspector General puts the cost of a single Artemis launch (the Space Launch System rocket, the Orion spacecraft and ground systems) at about $4.1 billion. A landing adds the Human Landing System: the SpaceX Starship HLS contract is $2.9 billion for the Artemis III demonstration, and the Blue Origin Blue Moon contract $3.4 billion for Artemis V. Apollo cost roughly $25 billion between 1960 and 1973, about $250-300 billion in today\'s dollars, for six landings. The whole point of Starship-class reusability is to make the per-mission number an order of magnitude smaller.',
    rows: [
      { option: 'SLS + Orion + ground systems, per Artemis mission', price: '~$4.1B (NASA OIG)', notes: 'Expendable rocket, reusable Orion crew module' },
      { option: 'Starship HLS, Artemis III demonstration', price: '$2.9B (contract)', notes: 'Includes an uncrewed landing demo; requires orbital refueling', rocket: 'starship' },
      { option: 'Blue Moon (Blue Origin), Artemis V', price: '$3.4B (contract)', notes: 'Launches on New Glenn', rocket: 'new-glenn' },
      { option: 'Apollo program, six landings (1960-73)', price: '~$25B then / ~$250-300B today', notes: 'Roughly 4% of the federal budget at its 1966 peak' },
      { option: 'Commercial lunar cargo lander (CLPS), robotic', price: '$80M-$150M per mission', notes: 'Intuitive Machines, Firefly: cargo, not crew', rocket: 'falcon-9' },
    ],
    hiddenCosts: ['Spacesuits (Axiom AxEMU), Gateway station modules, and the ground infrastructure at KSC are separate multi-billion-dollar lines.', 'Orbital refueling: Starship HLS needs many tanker flights per landing; the count is the open question.', 'Cadence: SLS flies roughly once a year, so fixed costs sit on very few missions.'],
    faq: [
      { q: 'How much did Apollo cost?', a: 'About $25.4 billion through 1973 in then-year dollars, roughly $250-300 billion adjusted for inflation depending on the deflator used.' },
      { q: 'Why does Artemis cost so much per launch?', a: 'SLS is expendable, flies rarely, and inherits Shuttle-era contracts. The NASA inspector general has called the per-launch cost unsustainable; commercial landers and Starship are the bet to bring it down.' },
    ],
    related: [{ label: 'Artemis tracker', href: '/artemis' }, { label: 'Cislunar economy', href: '/cislunar' }, { label: 'Rocket page: Starship', href: '/rockets/starship' }],
  },
  {
    slug: 'constellation',
    thing: 'a satellite constellation',
    title: 'How Much Does It Cost to Launch a Satellite Constellation?',
    metaTitle: 'How Much Does It Cost to Launch a Satellite Constellation? (2026)',
    description: 'A 20-satellite smallsat constellation costs roughly $10-20 million in launch alone; Starlink-scale is billions a year. Dedicated vs rideshare, orbital planes, replenishment: the launch economics of constellations.',
    shortAnswer: 'Launch cost for a constellation is set by how many orbital planes you need, not just how many satellites. Twenty 100-kilogram satellites in one plane ride a single rideshare for roughly $10-15 million; the same twenty spread across five planes need five launches or an orbital transfer vehicle, and the bill doubles or triples. At the top of the market, SpaceX launches Starlink at marginal cost, an estimated $15-30 million per Falcon 9, and still spends $2-3 billion a year on launch. Replenishment is permanent: a five-year design life means relaunching 20% of the constellation every year, forever.',
    rows: [
      { option: '20 x 100 kg smallsats, one plane, rideshare', price: '~$10M-$15M', notes: 'SpaceX Transporter at ~$6,000-7,000/kg plus deployers', rocket: 'falcon-9' },
      { option: 'Same 20 satellites across 5 planes', price: '~$25M-$50M', notes: 'Multiple rideshares or dedicated Electron flights, or an OTV to drift planes', rocket: 'electron' },
      { option: 'Dedicated Falcon 9 for one plane (up to ~60 smallsats)', price: '~$70M', notes: 'Exact plane and altitude; the choice for operators past a few dozen satellites', rocket: 'falcon-9' },
      { option: 'Starlink-scale (100+ launches/yr, internal cost)', price: '$2B-$3B per year (est.)', notes: 'Only possible for a launch provider that owns the constellation', rocket: 'falcon-9' },
      { option: 'Amazon Leo (Kuiper) launch procurement', price: '$10B+ across 80+ launches', notes: 'Atlas V, Vulcan, Ariane 6, New Glenn and Falcon 9 contracts', rocket: 'vulcan-centaur' },
    ],
    hiddenCosts: ['Orbital planes are the hidden multiplier; electric propulsion to drift between planes costs months of time instead of extra launches.', 'Replenishment: design life sets a permanent annual launch budget.', 'Deorbit rules (the FCC five-year rule) shorten usable life and raise replacement cadence.', 'Ground stations and spectrum coordination scale with the constellation, not with launches.'],
    faq: [
      { q: 'What is the cheapest way to launch a constellation?', a: 'Put as many satellites as possible in as few planes as possible and ride a dedicated Falcon 9 per plane; use onboard electric propulsion to spread within the plane. Rideshare wins only for small counts.' },
      { q: 'How much does Amazon Leo (Kuiper) spend on launches?', a: 'Amazon bought more than 80 launches across ULA, Arianespace, Blue Origin and SpaceX, reported as the largest commercial launch procurement in history, in excess of $10 billion.' },
    ],
    related: [{ label: 'Constellation Designer', href: '/constellation-designer' }, { label: 'Constellations: operator intel', href: '/constellations' }, { label: 'Compare: Starlink vs AST SpaceMobile', href: '/compare/starlink-vs-ast-spacemobile' }],
  },
  {
    slug: 'hosted-payload',
    thing: 'a hosted payload',
    title: 'How Much Does It Cost to Fly a Hosted Payload?',
    metaTitle: 'How Much Does It Cost to Fly a Hosted Payload? (2026 Guide)',
    description: 'Hosting an instrument on someone else\'s satellite costs roughly $5-50 million depending on mass, power and orbit, a fraction of a dedicated satellite. When hosting beats building, and who sells slots.',
    shortAnswer: 'A hosted payload, your sensor flying on somebody else\'s satellite, typically costs $5-50 million all-in, set by the mass, power and data the host must give up and by the orbit. Compared with building, launching and operating a dedicated satellite (often $100 million-plus for a GEO mission), it can be a tenth of the price. The trade is control: you fly when the host flies, point where the host points, and live as long as the host lives.',
    rows: [
      { option: 'Small instrument on a GEO comsat', price: '$5M-$20M', notes: 'Classic model: environmental or navigation sensors on Intelsat/SES buses' },
      { option: 'Large instrument on a GEO comsat (TEMPO/GOLD class)', price: '$30M-$50M+ hosting fee', notes: 'NASA science instruments on commercial Intelsat and SES satellites' },
      { option: 'Hosted slot on a LEO smallsat bus', price: '$1M-$5M', notes: 'Loft Orbital, Spire and others sell standardized space-as-a-service slots', rocket: 'falcon-9' },
      { option: 'Dedicated smallsat instead (build + launch)', price: '$5M-$30M', notes: 'For comparison; you own the schedule and pointing' },
    ],
    hiddenCosts: ['Integration deadlines belong to the host: miss the host ship date and the slot is gone.', 'Data downlink and pointing are negotiated, not owned.', 'Anomalies on the host satellite end your mission too.'],
    faq: [
      { q: 'Who sells hosted payload slots?', a: 'GEO operators (Intelsat, SES, Eutelsat) on their communications satellites, and LEO bus-as-a-service companies such as Loft Orbital and Spire that fly customer instruments on standard buses.' },
      { q: 'Is a hosted payload faster than a dedicated satellite?', a: 'Usually. You join a satellite already being built, so 18-24 months from contract to orbit is common versus 3-5 years for a new spacecraft.' },
    ],
    related: [{ label: 'Company profiles: satellite operators', href: '/company-profiles' }, { label: 'Learn: Space Supply Chain Fundamentals', href: '/learn/supply-chain' }, { label: 'Cost to launch a satellite', href: '/guide/cost-to-launch/satellite' }],
  },
];


export function getCostToLaunch(slug: string): CostToLaunchEntry | null {
  return COST_TO_LAUNCH.find((c) => c.slug === slug) ?? null;
}
