import type { Metadata } from 'next';
import Link from 'next/link';
import FAQSchema from '@/components/seo/FAQSchema';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Top 25 Space Companies to Watch in 2026 | SpaceNexus',
  description:
    'The definitive list of 25 space companies to watch in 2026 across launch providers, satellite manufacturers, Earth observation, space stations, and defense. Includes SpaceX, Rocket Lab, Axiom Space, Planet Labs, and emerging startups.',
  keywords: [
    'top space companies',
    'space companies to invest in',
    'best aerospace companies',
    'space startups 2026',
    'space companies list',
    'leading space companies',
    'commercial space companies',
    'space industry companies',
    'space company rankings',
    'new space companies',
    'space tech startups',
    'space defense companies',
  ],
  openGraph: {
    title: 'Top 25 Space Companies to Watch in 2026',
    description:
      'From SpaceX to emerging startups, discover the 25 most important companies driving the space economy across launch, satellites, defense, Earth observation, and space stations.',
    type: 'article',
    url: 'https://spacenexus.us/learn/space-companies-to-watch',
    siteName: 'SpaceNexus',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Top 25 Space Companies to Watch in 2026',
    description:
      'The 25 most important companies shaping the space industry: launch, satellites, defense, EO, and space stations.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/learn/space-companies-to-watch',
  },
};

const launchProviders = [
  {
    rank: 1,
    name: 'SpaceX',
    slug: 'spacex',
    hq: 'Hawthorne, CA',
    founded: 2002,
    employees: '13,000+',
    valuation: '$350B+ (private)',
    whyWatch: 'Dominates global launch market with 60%+ share. Starlink is the world\'s largest satellite constellation (6,000+ satellites, 4M+ subscribers). Starship — the fully reusable super-heavy lift vehicle — could reduce launch costs by 100x and enable Mars colonization.',
    keyStats: ['60+ Falcon 9 launches in 2025', '22,800 kg to LEO capacity', '$67M per dedicated launch', '4M+ Starlink subscribers'],
    recentMilestones: 'Starship orbital flight tests continuing. Starlink Direct to Cell partnership with T-Mobile. Booster reuse exceeding 20+ flights per vehicle.',
  },
  {
    rank: 2,
    name: 'Rocket Lab',
    slug: 'rocket-lab',
    hq: 'Long Beach, CA',
    founded: 2006,
    employees: '2,000+',
    valuation: '$12B (RKLB)',
    whyWatch: 'The second-most frequently launching US rocket company. Electron is the leading dedicated small-sat launcher. Neutron medium-lift reusable rocket targets 2026 first flight. Growing spacecraft and components business (reaction wheels, solar panels, star trackers).',
    keyStats: ['50+ Electron launches total', '300 kg to LEO (Electron)', '$7.5M per launch', 'Neutron: 13,000 kg to LEO'],
    recentMilestones: 'Neutron vehicle structure revealed. Archimedes engine testing underway. Multiple Electron missions for NASA, NRO, and commercial customers.',
  },
  {
    rank: 3,
    name: 'Blue Origin',
    slug: 'blue-origin',
    hq: 'Kent, WA',
    founded: 2000,
    employees: '11,000+',
    valuation: 'Private (est. $30B+)',
    whyWatch: 'New Glenn heavy-lift rocket targeting first flight. BE-4 engines power ULA Vulcan. Blue Moon lunar lander selected for NASA Artemis missions. Orbital Reef commercial space station partnership with Sierra Space.',
    keyStats: ['New Glenn: 45,000 kg to LEO', 'BE-4 engines for ULA Vulcan', 'Blue Moon lunar lander', 'Orbital Reef space station'],
    recentMilestones: 'New Glenn maiden flight preparation. Club for the Future STEM education reaching millions. New Shepard suborbital flights continuing.',
  },
  {
    rank: 4,
    name: 'ULA (United Launch Alliance)',
    slug: 'ula',
    hq: 'Centennial, CO',
    founded: 2006,
    employees: '3,600+',
    valuation: 'JV (Boeing/Lockheed)',
    whyWatch: 'Vulcan Centaur replacing both Atlas V and Delta IV. Primary launcher for US national security missions. 100% mission success rate across all programs. Amazon Kuiper constellation launch contract.',
    keyStats: ['27,200 kg to LEO (Vulcan)', '100% mission success rate', 'NSSL Phase 2 contract winner', 'Kuiper launch contract'],
    recentMilestones: 'Vulcan Centaur entering operational service. Multiple national security launches completed. Transitioning from legacy Atlas V to Vulcan.',
  },
  {
    rank: 5,
    name: 'Arianespace / ArianeGroup',
    slug: 'arianespace',
    hq: 'Paris, France',
    founded: 1980,
    employees: '7,500+ (ArianeGroup)',
    valuation: 'ESA/CNES-backed',
    whyWatch: 'Ariane 6 is Europe\'s next-generation launcher, replacing Ariane 5 after 27 years of service. Vega-C for small to medium payloads. Europe\'s guaranteed access to space. Facing competitive pressure from SpaceX driving innovation.',
    keyStats: ['21,650 kg to LEO (Ariane 6)', 'Launches from Kourou, French Guiana', 'Two variants: A62 and A64', 'European institutional launch guarantee'],
    recentMilestones: 'Ariane 6 maiden flight completed. Building launch cadence. Multiple Galileo navigation satellite launches planned.',
  },
];

const satelliteManufacturers = [
  {
    rank: 6,
    name: 'Airbus Defence and Space',
    slug: 'airbus-defence-and-space',
    hq: 'Leiden, Netherlands',
    founded: 2014,
    employees: '35,000+',
    valuation: '$165B (Airbus Group)',
    whyWatch: 'Europe\'s largest satellite manufacturer. Builds OneWeb constellation satellites. Prime contractor for Orion European Service Module. Pléiades Neo Earth observation. Leading provider of GEO communication satellites.',
    keyStats: ['$10.2B space revenue', 'OneWeb satellite production', 'Orion ESM manufacturer', 'Pléiades Neo constellation'],
    recentMilestones: 'OneWeb constellation deployment nearing completion. Orion ESM deliveries for Artemis missions. Space Inspire next-gen GEO platform.',
  },
  {
    rank: 7,
    name: 'Northrop Grumman (Space Systems)',
    slug: 'northrop-grumman',
    hq: 'Falls Church, VA',
    founded: 1939,
    employees: '90,000+ (total)',
    valuation: '$80B',
    whyWatch: 'James Webb Space Telescope prime contractor. Cygnus ISS cargo resupply. Mission Extension Vehicle (MEV) for satellite servicing. Major solid rocket motor supplier (SRBs for SLS, GEM-63XL for Vulcan). Expanding in hypersonics and missile defense.',
    keyStats: ['$10.8B space revenue', 'JWST prime contractor', 'MEV satellite servicing', 'SLS solid rocket boosters'],
    recentMilestones: 'MEV satellite life extension missions successful. Cygnus cargo flights continuing. Major GBSD (Sentinel) ICBM program.',
  },
  {
    rank: 8,
    name: 'L3Harris Technologies',
    slug: 'l3harris',
    hq: 'Melbourne, FL',
    founded: 2019,
    employees: '46,000+',
    valuation: '$48B',
    whyWatch: 'Leading space sensor manufacturer. Builds payloads for missile warning (SBIRS/OPIR), weather (GOES), and environmental monitoring satellites. Growing responsive launch/small satellite capability. Key player in proliferated LEO defense architectures.',
    keyStats: ['$8.4B space revenue', 'SBIRS/OPIR missile warning sensors', 'GOES weather satellite payloads', 'Responsive small sat production'],
    recentMilestones: 'SDA Tracking Layer satellite deliveries. Aerojet Rocketdyne acquisition completed. Expanding small satellite production lines.',
  },
  {
    rank: 9,
    name: 'Maxar Technologies',
    slug: 'maxar-technologies',
    hq: 'Westminster, CO',
    founded: 1969,
    employees: '5,000+',
    valuation: 'Acquired by Advent ($6.4B)',
    whyWatch: 'Premier commercial Earth observation company. WorldView Legion next-gen imaging constellation. SSL/MDA heritage in GEO satellite platforms. Power and Propulsion Element for NASA Gateway. Robotic arm heritage (Canadarm).',
    keyStats: ['WorldView Legion constellation', '30 cm resolution imaging', 'Gateway PPE prime contractor', '1300-class GEO platform'],
    recentMilestones: 'WorldView Legion satellites launching. Continued 30 cm-class imagery delivery. Supporting defense and intelligence community geospatial needs.',
  },
  {
    rank: 10,
    name: 'Thales Alenia Space',
    slug: 'thales-alenia-space',
    hq: 'Cannes, France',
    founded: 2007,
    employees: '8,900+',
    valuation: 'JV (Thales/Leonardo)',
    whyWatch: 'Builds pressurized modules for ISS (Columbus, Cygnus PCM), Axiom Space Station, and China\'s Tiangong. Iridium NEXT constellation manufacturer. Major European GEO satellite provider. Copernicus Earth observation systems.',
    keyStats: ['ISS module manufacturer', 'Axiom Station modules', 'Iridium NEXT satellites', 'Copernicus Sentinel systems'],
    recentMilestones: 'Axiom Station module production underway. Space Inspire GEO telecom platform deliveries. Copernicus expansion satellites.',
  },
];

const earthObservation = [
  {
    rank: 11,
    name: 'Planet Labs',
    slug: 'planet-labs',
    hq: 'San Francisco, CA',
    founded: 2010,
    employees: '900+',
    valuation: '$2.8B (PL)',
    whyWatch: 'Operates the largest Earth imaging constellation (200+ satellites). Daily global scan capability at 3m resolution. SkySat provides 50 cm imagery. AI-powered analytics platform turning imagery into actionable insights for agriculture, insurance, and defense.',
    keyStats: ['200+ satellites in orbit', 'Daily global coverage', '3m resolution (Dove)', '50 cm resolution (SkySat)'],
    recentMilestones: 'Pelican next-gen satellite program. AI analytics platform expansion. Growing defense and intelligence revenue.',
  },
  {
    rank: 12,
    name: 'BlackSky Technology',
    slug: 'blacksky',
    hq: 'Herndon, VA',
    founded: 2014,
    employees: '400+',
    valuation: '$600M (BKSY)',
    whyWatch: 'Real-time geospatial intelligence platform. Rapid revisit imaging constellation. AI-powered analytics combining satellite imagery with global data feeds. Strong government and defense customer base. Dawn-to-dusk imaging capability.',
    keyStats: ['Revisit times under 1 hour', '1m resolution constellation', 'AI-powered intelligence platform', 'Strong NRO/defense contracts'],
    recentMilestones: 'Gen-3 satellite constellation expansion. Electro-Optical/Infrared imaging capability. Growing classified revenue streams.',
  },
  {
    rank: 13,
    name: 'Spire Global',
    slug: 'spire-global',
    hq: 'Vienna, VA',
    founded: 2012,
    employees: '500+',
    valuation: '$800M (SPIR)',
    whyWatch: 'Space-as-a-service model: operates 100+ multi-purpose nanosatellites collecting weather, maritime, and aviation data. Radio occultation weather data filling gaps in government forecasting networks. Satellite-as-a-service enables third-party payloads.',
    keyStats: ['100+ nanosatellites', 'Radio occultation weather data', 'Maritime AIS tracking', 'Aviation ADS-B from space'],
    recentMilestones: 'Expanding Lemur constellation. Weather data contracts with NOAA and EUMETSAT. Space-as-a-service platform growing.',
  },
  {
    rank: 14,
    name: 'Capella Space',
    slug: 'capella-space',
    hq: 'San Francisco, CA',
    founded: 2016,
    employees: '200+',
    valuation: 'Private ($1.5B+ est.)',
    whyWatch: 'Leading commercial Synthetic Aperture Radar (SAR) constellation. SAR penetrates clouds and works at night, providing all-weather imaging capability. High demand from defense and intelligence communities for persistent surveillance.',
    keyStats: ['SAR imaging constellation', 'Sub-meter resolution', 'All-weather, day/night imaging', 'Rapid tasking capability'],
    recentMilestones: 'Constellation expansion to 10+ satellites. Growing defense and intelligence contracts. Enhanced resolution and collection capacity.',
  },
  {
    rank: 15,
    name: 'Satellogic',
    slug: 'satellogic',
    hq: 'Buenos Aires / Charlotte, NC',
    founded: 2010,
    employees: '300+',
    valuation: '$500M (SATL)',
    whyWatch: 'Building a 200+ satellite constellation for sub-meter multispectral and hyperspectral Earth observation. Lowest cost per high-res image. Expanding rapidly with government and commercial contracts. Full vertical integration from satellite design to analytics.',
    keyStats: ['Sub-meter multispectral', 'Hyperspectral imaging', 'Vertical integration', 'Lowest cost per image target'],
    recentMilestones: 'Constellation scaling toward 200+ satellites. Hyperspectral data products launching. Government contract wins in multiple countries.',
  },
];

const spaceStations = [
  {
    rank: 16,
    name: 'Axiom Space',
    slug: 'axiom-space',
    hq: 'Houston, TX',
    founded: 2016,
    employees: '1,000+',
    valuation: 'Private ($5B+ est.)',
    whyWatch: 'Building the first commercial space station, initially attached to ISS before operating independently. Won NASA Next Gen spacesuit contract (AxEMU). Three successful private astronaut missions to ISS. Thales Alenia Space building core modules.',
    keyStats: ['First commercial station', 'AxEMU spacesuit contract', '3 private ISS missions completed', 'Modules under construction'],
    recentMilestones: 'Axiom Station Module 1 in production. Ax-4 private mission planned. AxEMU suit testing for Artemis III.',
  },
  {
    rank: 17,
    name: 'Vast',
    slug: 'vast',
    hq: 'Long Beach, CA',
    founded: 2021,
    employees: '400+',
    valuation: 'Private ($2B+ est.)',
    whyWatch: 'Developing Haven-1, a single-module commercial space station launching on Falcon 9. Founded by Jed McCaleb (cryptocurrency billionaire) with significant private funding. First Haven-1 crew rotation planned via SpaceX Dragon. Focused on making space stations accessible.',
    keyStats: ['Haven-1 station on Falcon 9', 'Single module initial design', 'SpaceX Dragon crew rotation', 'Well-funded startup'],
    recentMilestones: 'Haven-1 hardware in production. SpaceX launch agreement signed. Artificial gravity station designs revealed.',
  },
  {
    rank: 18,
    name: 'Sierra Space',
    slug: 'sierra-space',
    hq: 'Louisville, CO',
    founded: 2021,
    employees: '1,500+',
    valuation: 'Private ($5.3B)',
    whyWatch: 'Dream Chaser spaceplane for ISS cargo delivery. Orbital Reef commercial space station (with Blue Origin). LIFE inflatable habitat module with 300+ cubic meters of pressurized volume. Reusable Dream Chaser lands on conventional runways.',
    keyStats: ['Dream Chaser spaceplane', 'Orbital Reef partnership', 'LIFE inflatable habitat', 'Runway landing capability'],
    recentMilestones: 'Dream Chaser Tenacity nearing first ISS cargo mission. LIFE habitat burst testing successful. Orbital Reef partnership with Blue Origin progressing.',
  },
  {
    rank: 19,
    name: 'Voyager Space / Starlab',
    slug: 'voyager-space',
    hq: 'Denver, CO',
    founded: 2019,
    employees: '400+',
    valuation: 'Private ($3B+ est.)',
    whyWatch: 'Developing Starlab commercial space station with Airbus as prime contractor. Continuously crewed station with 4 crew. George Washington Carver Science Park for research. Selected by NASA as one of three commercial LEO destination providers.',
    keyStats: ['Starlab station (with Airbus)', '4 crew capacity', 'NASA CLD selection', 'Launch on Starship planned'],
    recentMilestones: 'Airbus selected as Starlab prime contractor. NASA funding milestones achieved. Targeting late 2020s launch.',
  },
  {
    rank: 20,
    name: 'Astroscale',
    slug: 'astroscale',
    hq: 'Tokyo, Japan',
    founded: 2013,
    employees: '700+',
    valuation: 'Private ($2B+ est.)',
    whyWatch: 'Leading orbital debris removal and in-space servicing company. ELSA-d mission demonstrated capture technology. ADRAS-J mission inspected debris in orbit. Contracts with ESA, JAXA, and commercial operators. First-mover in the $3B debris removal market.',
    keyStats: ['ELSA-d capture demo', 'ADRAS-J debris inspection', 'Global office presence', 'First debris removal contracts'],
    recentMilestones: 'ADRAS-J successfully approached and inspected upper stage debris. ESA ClearSpace partnership. Growing order book for end-of-life services.',
  },
];

const defenseCompanies = [
  {
    rank: 21,
    name: 'Lockheed Martin (Space)',
    slug: 'lockheed-martin',
    hq: 'Bethesda, MD',
    founded: 1995,
    employees: '116,000+ (total)',
    valuation: '$135B',
    whyWatch: 'Largest space defense contractor. GPS III satellites. SBIRS/OPIR missile warning. Orion crew capsule for Artemis. Next Gen OPIR (missile tracking). SDA Transport and Tracking Layer satellites. Space development is a top company priority.',
    keyStats: ['$12.1B space revenue', 'GPS III satellite maker', 'Orion capsule prime', 'Next Gen OPIR producer'],
    recentMilestones: 'GPS III SV06+ deliveries. Orion Artemis II/III production. SDA Tranche 1 satellite deliveries accelerating.',
  },
  {
    rank: 22,
    name: 'RTX (Raytheon) Space',
    slug: 'rtx',
    hq: 'Arlington, VA',
    founded: 2020,
    employees: '185,000+ (total)',
    valuation: '$155B',
    whyWatch: 'Space-based infrared sensors for missile warning. GPS ground control systems. Space domain awareness radars. Advanced satellite communications. Growing electronic warfare and cyber capabilities for space.',
    keyStats: ['$5.2B space revenue', 'SBIRS/OPIR sensors', 'GPS ground control', 'Space radar systems'],
    recentMilestones: 'Next Gen OPIR sensor deliveries. Space Fence operational. Advanced EW capabilities for contested space environments.',
  },
  {
    rank: 23,
    name: 'Anduril Industries',
    slug: 'anduril',
    hq: 'Costa Mesa, CA',
    founded: 2017,
    employees: '3,000+',
    valuation: 'Private ($14B+)',
    whyWatch: 'Fast-growing defense tech company entering space with autonomous systems. Fury autonomous air vehicle adaptable for space applications. Lattice AI command and control platform. Acquiring companies to build space division. Represents the "new prime" model disrupting traditional defense.',
    keyStats: ['$14B+ valuation', 'Lattice AI/ML platform', 'Fury autonomous systems', 'Rapid prototyping model'],
    recentMilestones: 'Space division expansion. Lattice platform adoption by Space Force. Multiple acquisition targets in space domain.',
  },
  {
    rank: 24,
    name: 'SpaceX (Starshield)',
    slug: 'spacex',
    hq: 'Hawthorne, CA',
    founded: 2002,
    employees: '13,000+',
    valuation: '$350B+',
    whyWatch: 'Starshield leverages Starlink technology for national security missions. Proliferated LEO architecture for military communications and ISR. Classified contracts with NRO and Space Force. Potentially the largest new defense space player.',
    keyStats: ['Starshield military constellation', 'NRO classified contracts', 'Leverages Starlink tech', 'Rapid deployment capability'],
    recentMilestones: 'Starshield contracts expanding. NRO satellite launches. Military communications demonstrations.',
  },
  {
    rank: 25,
    name: 'York Space Systems',
    slug: 'york-space-systems',
    hq: 'Denver, CO',
    founded: 2014,
    employees: '500+',
    valuation: 'Private (est. $1B+)',
    whyWatch: 'Standard Bus platform enables rapid, affordable satellite manufacturing. Selected by SDA for Transport and Tracking Layer. Mass-production model: building satellites in weeks instead of years. Key player in DoD proliferated LEO architecture.',
    keyStats: ['SDA satellite manufacturer', 'Standard Bus platform', 'Mass production capability', 'Weeks-not-years build time'],
    recentMilestones: 'SDA Tranche 1 Transport Layer deliveries. Expanding production capacity. Multiple defense contract awards.',
  },
];

const emergingStartups = [
  {
    name: 'Relativity Space',
    slug: 'relativity-space',
    focus: '3D-printed rockets',
    valuation: 'Private ($4.2B)',
    description: 'Building Terran R, a fully reusable, largely 3D-printed rocket. Stargate is the world\'s largest 3D metal printer. Aiming to radically reduce manufacturing time and cost for launch vehicles.',
  },
  {
    name: 'Impulse Space',
    slug: 'impulse-space',
    focus: 'In-space transportation',
    valuation: 'Private ($1.2B)',
    description: 'Building orbital transfer vehicles and Mars landers. Mira kick stage for last-mile satellite delivery. Founded by SpaceX Falcon 9 propulsion lead Tom Mueller.',
  },
  {
    name: 'Stoke Space',
    slug: 'stoke-space',
    focus: 'Fully reusable rocket',
    valuation: 'Private ($1B+)',
    description: 'Developing a fully reusable launch vehicle with a novel second-stage recovery system. Completed successful hop tests. Backed by leading VC firms. Targets rapid turnaround between flights.',
  },
  {
    name: 'Phantom Space',
    slug: 'phantom-space',
    focus: 'Affordable small launch',
    valuation: 'Private ($500M+)',
    description: 'Developing low-cost Daytona rocket for dedicated small satellite launch. Vertically integrated approach including satellite bus manufacturing. Former Boeing and Virgin Orbit team members.',
  },
  {
    name: 'Turion Space',
    slug: 'turion-space',
    focus: 'In-space services',
    valuation: 'Private (est. $200M+)',
    description: 'Building Droid spacecraft for proximity operations, satellite servicing, and debris management. DARPA-funded missions. Represents the next generation of in-space servicing companies.',
  },
  {
    name: 'True Anomaly',
    slug: 'true-anomaly',
    focus: 'Space domain awareness',
    valuation: 'Private ($300M+)',
    description: 'Building Jackal autonomous orbital vehicles for space domain awareness. Mosaic software platform for space operations. Focused on the military space domain awareness mission.',
  },
  {
    name: 'Muon Space',
    slug: 'muon-space',
    focus: 'Climate monitoring',
    valuation: 'Private ($200M+)',
    description: 'Developing microwave radiometer satellites for high-resolution climate and weather data. Addresses critical data gaps in understanding methane emissions and extreme weather.',
  },
  {
    name: 'K2 Space',
    slug: 'k2-space',
    focus: 'Large satellite buses',
    valuation: 'Private ($200M+)',
    description: 'Building very large, low-cost satellite buses enabled by Starship\'s payload capacity. Rethinking satellite design for a world where launch mass is cheap. Founded by former SpaceX engineers.',
  },
];

const faqItems = [
  {
    question: 'What are the biggest space companies in 2026?',
    answer:
      'The largest space companies by space-related revenue are SpaceX (estimated $15B including Starlink), Boeing Space & Defense ($12.3B), Lockheed Martin Space ($12.1B), Northrop Grumman Space ($10.8B), and Airbus Defence and Space ($10.2B). By valuation, SpaceX leads at $350B+, followed by traditional defense primes. Among pure-play commercial space companies, Rocket Lab ($12B market cap), Planet Labs ($2.8B), and Axiom Space (private, $5B+) are the largest.',
  },
  {
    question: 'Which space companies are publicly traded?',
    answer:
      'Major publicly traded space companies include Rocket Lab (RKLB, $12B), Planet Labs (PL, $2.8B), Spire Global (SPIR, $800M), BlackSky (BKSY, $600M), Satellogic (SATL, $500M), Virgin Galactic (SPCE), and Mynaric (MYNA). The large defense primes with significant space divisions are also public: Lockheed Martin (LMT), Northrop Grumman (NOC), L3Harris (LHX), RTX (RTX), and Boeing (BA). Space ETFs like ARKX, UFO, and ROKT provide diversified exposure.',
  },
  {
    question: 'What space startups are most promising?',
    answer:
      'The most promising space startups in 2026 include Relativity Space (3D-printed rockets, $4.2B valuation), Impulse Space (in-space transportation, $1.2B), Stoke Space (fully reusable rocket, $1B+), Axiom Space (commercial space station, $5B+), True Anomaly (space domain awareness, $300M+), Capella Space (SAR imaging, $1.5B+), and Muon Space (climate monitoring). These companies are addressing large market needs with innovative technology approaches.',
  },
  {
    question: 'Which space sector is growing the fastest?',
    answer:
      'Launch services is the fastest-growing major segment at 18.6% CAGR, driven by reusable rockets and constellation deployments. Space tourism, while small, is growing at nearly 30% CAGR. Earth observation AI analytics is growing at 25%+ annually. Within defense, proliferated LEO architectures (SDA Transport and Tracking Layer) represent a new $10B+ market that did not exist five years ago. Satellite broadband (Starlink, Kuiper) is growing at 50%+ annually from a large base.',
  },
  {
    question: 'How do I invest in space companies?',
    answer:
      'You can invest in space companies through: (1) Individual stocks — Rocket Lab (RKLB), Planet Labs (PL), and defense primes (LMT, NOC, LHX) are publicly traded. (2) Space ETFs — ARKX (ARK Space Exploration), UFO (Procure Space ETF), and ROKT (SPDR S&P Kensho Final Frontiers) provide diversified exposure. (3) Private markets — accredited investors can access SpaceX, Axiom Space, and other private companies through secondary markets or SPV funds. SpaceNexus tracks investment trends at /market-intel and company profiles at /company-profiles.',
  },
];

export default function SpaceCompaniesPage() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Top 25 Space Companies to Watch in 2026',
    description:
      'The definitive list of 25 space companies to watch in 2026 across launch, satellites, Earth observation, space stations, and defense.',
    author: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
    publisher: {
      '@type': 'Organization',
      name: 'SpaceNexus',
      url: 'https://spacenexus.us',
      logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/spacenexus-logo.png' },
    },
    datePublished: '2026-02-18T00:00:00Z',
    dateModified: '2026-02-18T00:00:00Z',
    mainEntityOfPage: 'https://spacenexus.us/learn/space-companies-to-watch',
  };

  const renderCompanyCard = (company: {
    rank: number;
    name: string;
    slug: string;
    hq: string;
    founded: number;
    employees: string;
    valuation: string;
    whyWatch: string;
    keyStats: string[];
    recentMilestones: string;
  }) => (
    <div key={company.slug + company.rank} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs font-bold text-nebula-400 bg-nebula-500/10 border border-nebula-500/20 rounded-full w-7 h-7 flex items-center justify-center">
              {company.rank}
            </span>
            <h3 className="text-white font-semibold text-lg">{company.name}</h3>
          </div>
          <div className="text-xs text-slate-500">
            {company.hq} &middot; Founded {company.founded} &middot; {company.employees} employees
          </div>
        </div>
        <Link
          href={`/company-profiles/${company.slug}`}
          className="text-xs text-nebula-400 hover:underline shrink-0"
        >
          Full profile
        </Link>
      </div>
      <div className="text-sm text-slate-400 mb-3">{company.whyWatch}</div>
      <div className="flex flex-wrap gap-2 mb-3">
        {company.keyStats.map((stat) => (
          <span key={stat} className="text-xs px-2 py-1 rounded-full bg-slate-700/50 text-slate-300">
            {stat}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">
          <span className="text-slate-400 font-medium">Valuation: </span>
          {company.valuation}
        </span>
        <span className="text-slate-500 max-w-[50%] text-right">{company.recentMilestones}</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
      <FAQSchema items={faqItems} />

      <div className="container mx-auto px-4 max-w-4xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-8">
          <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/learn" className="hover:text-slate-300 transition-colors">Learning Center</Link>
          <span>/</span>
          <span className="text-slate-400">Top Space Companies 2026</span>
        </nav>

        {/* Hero */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-nebula-500/10 text-nebula-400 border border-nebula-500/20">
              Industry Analysis
            </span>
            <span className="text-xs text-slate-500">Updated February 2026</span>
            <span className="text-xs text-slate-500">14 min read</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
            Top 25 Space Companies to Watch in 2026
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed">
            The space industry is in the middle of its most dynamic period since the Apollo era. From
            SpaceX&apos;s Starship revolutionizing launch economics to Axiom Space building the first
            commercial space station, these 25 companies are defining the future of space across five
            critical sectors: launch, satellite manufacturing, Earth observation, space stations, and
            defense.
          </p>
        </header>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-nebula-400 mb-1">25</div>
            <div className="text-xs text-slate-400">Companies Profiled</div>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-nebula-400 mb-1">5</div>
            <div className="text-xs text-slate-400">Industry Sectors</div>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-nebula-400 mb-1">$800B+</div>
            <div className="text-xs text-slate-400">Combined Valuation</div>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-nebula-400 mb-1">8</div>
            <div className="text-xs text-slate-400">Emerging Startups</div>
          </div>
        </div>

        {/* Launch Providers */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-white">Launch Providers</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400">#1 - #5</span>
          </div>
          <p className="text-slate-400 text-sm mb-6">
            Launch providers are the railroads of the space economy — without them, nothing else works.
            Reusable rockets have transformed this sector from a slow-moving government monopoly into a
            competitive, rapidly innovating market.
          </p>
          <div className="space-y-4">
            {launchProviders.map(renderCompanyCard)}
          </div>
        </section>

        {/* Satellite Manufacturers */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-white">Satellite Manufacturers</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400">#6 - #10</span>
          </div>
          <p className="text-slate-400 text-sm mb-6">
            Satellite manufacturers build the hardware that delivers communications, imaging, navigation,
            and defense capabilities from orbit. The shift toward constellation production lines and
            in-space servicing is reshaping this sector.
          </p>
          <div className="space-y-4">
            {satelliteManufacturers.map(renderCompanyCard)}
          </div>
        </section>

        {/* Earth Observation */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-white">Earth Observation</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400">#11 - #15</span>
          </div>
          <p className="text-slate-400 text-sm mb-6">
            Earth observation companies turn satellite imagery into actionable intelligence for agriculture,
            insurance, climate monitoring, defense, and urban planning. AI-powered analytics are the
            differentiator.
          </p>
          <div className="space-y-4">
            {earthObservation.map(renderCompanyCard)}
          </div>
        </section>

        {/* Space Stations & In-Space Services */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-white">Space Stations & In-Space Services</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400">#16 - #20</span>
          </div>
          <p className="text-slate-400 text-sm mb-6">
            With the ISS approaching retirement, commercial space stations and in-space services are the
            next frontier. These companies are building the permanent infrastructure for humanity in low
            Earth orbit.
          </p>
          <div className="space-y-4">
            {spaceStations.map(renderCompanyCard)}
          </div>
        </section>

        {/* Defense & National Security */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-white">Defense & National Security Space</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400">#21 - #25</span>
          </div>
          <p className="text-slate-400 text-sm mb-6">
            Space is now recognized as a warfighting domain. Defense space budgets are growing rapidly,
            with proliferated LEO architectures replacing exquisite legacy systems. New entrants are
            challenging traditional defense primes.
          </p>
          <div className="space-y-4">
            {defenseCompanies.map(renderCompanyCard)}
          </div>
        </section>

        {/* Emerging Startups */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-2">Emerging Startups to Watch</h2>
          <p className="text-slate-400 text-sm mb-6">
            Beyond the top 25, these eight startups are tackling some of the hardest problems in space
            with novel approaches. Many are founded by alumni from SpaceX, Blue Origin, and other
            established players.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {emergingStartups.map((startup) => (
              <div key={startup.slug} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-semibold">{startup.name}</h3>
                  <Link
                    href={`/company-profiles/${startup.slug}`}
                    className="text-xs text-nebula-400 hover:underline"
                  >
                    Profile
                  </Link>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-nebula-500/10 text-nebula-400 border border-nebula-500/20">
                    {startup.focus}
                  </span>
                  <span className="text-xs text-slate-500">{startup.valuation}</span>
                </div>
                <p className="text-slate-400 text-sm">{startup.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Investment Summary */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Investment Trends Summary</h2>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-slate-300 text-sm">
                <span className="text-nebula-400 mt-0.5 shrink-0">&#10003;</span>
                <span><strong className="text-white">Launch consolidation</strong> — The market is converging around reusable vehicles. Companies without a reusability roadmap face existential risk. SpaceX dominance is driving competitors to innovate faster.</span>
              </div>
              <div className="flex items-start gap-3 text-slate-300 text-sm">
                <span className="text-nebula-400 mt-0.5 shrink-0">&#10003;</span>
                <span><strong className="text-white">Defense spending acceleration</strong> — US Space Force and SDA budgets are growing 15-20% annually. Proliferated LEO is the new architecture paradigm, creating demand for mass-produced satellites.</span>
              </div>
              <div className="flex items-start gap-3 text-slate-300 text-sm">
                <span className="text-nebula-400 mt-0.5 shrink-0">&#10003;</span>
                <span><strong className="text-white">EO data monetization</strong> — Earth observation is shifting from &quot;selling images&quot; to &quot;selling insights.&quot; AI analytics companies command higher margins than raw imagery providers.</span>
              </div>
              <div className="flex items-start gap-3 text-slate-300 text-sm">
                <span className="text-nebula-400 mt-0.5 shrink-0">&#10003;</span>
                <span><strong className="text-white">Commercial stations timeline</strong> — ISS retirement (late 2020s to early 2030s) creates urgency. NASA has committed $3.6B to ensure no gap in US human presence in LEO. Multiple contenders are in development.</span>
              </div>
              <div className="flex items-start gap-3 text-slate-300 text-sm">
                <span className="text-nebula-400 mt-0.5 shrink-0">&#10003;</span>
                <span><strong className="text-white">Vertical integration trend</strong> — Leading companies (SpaceX, Rocket Lab) are integrating across launch, satellite manufacturing, and services. This trend is likely to continue as margins compress in commoditized segments.</span>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="bg-slate-800/60 border border-nebula-500/30 rounded-xl p-6 text-center mb-12">
          <h3 className="text-xl font-bold text-white mb-2">Explore All Company Profiles</h3>
          <p className="text-slate-400 text-sm mb-4">
            SpaceNexus tracks 200+ space companies with detailed profiles, financial data, satellite
            assets, facility locations, and recent news. Stay informed on the companies shaping the
            space economy.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/company-profiles"
              className="inline-block bg-nebula-500 hover:bg-nebula-600 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
            >
              Browse Company Profiles
            </Link>
            <Link
              href="/market-intel"
              className="inline-block bg-slate-700/50 hover:bg-slate-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors border border-slate-600/50"
            >
              View Market Intelligence
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqItems.map((item, i) => (
              <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2">{item.question}</h3>
                <p className="text-slate-400 text-sm">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Internal Links */}
        <section className="border-t border-slate-700/50 pt-8 mb-8">
          <h3 className="text-lg font-bold text-white mb-4">Related SpaceNexus Tools & Data</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link
              href="/company-profiles"
              className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 text-center hover:border-nebula-500/50 transition-colors"
            >
              <div className="text-white text-sm font-medium">Company Profiles</div>
              <div className="text-slate-500 text-xs">200+ companies</div>
            </Link>
            <Link
              href="/market-intel"
              className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 text-center hover:border-nebula-500/50 transition-colors"
            >
              <div className="text-white text-sm font-medium">Market Intel</div>
              <div className="text-slate-500 text-xs">Live data</div>
            </Link>
            <Link
              href="/space-economy"
              className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 text-center hover:border-nebula-500/50 transition-colors"
            >
              <div className="text-white text-sm font-medium">Space Economy</div>
              <div className="text-slate-500 text-xs">Investment trends</div>
            </Link>
            <Link
              href="/space-talent"
              className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 text-center hover:border-nebula-500/50 transition-colors"
            >
              <div className="text-white text-sm font-medium">Space Talent</div>
              <div className="text-slate-500 text-xs">Jobs & careers</div>
            </Link>
          </div>
        </section>

        {/* Other Guides */}
        <section className="border-t border-slate-700/50 pt-8">
          <h3 className="text-lg font-bold text-white mb-4">More from the Learning Center</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Link
              href="/learn/satellite-launch-cost"
              className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 hover:border-nebula-500/50 transition-colors"
            >
              <div className="text-white text-sm font-medium">Satellite Launch Costs</div>
              <div className="text-slate-500 text-xs">Complete cost breakdown</div>
            </Link>
            <Link
              href="/learn/space-industry-market-size"
              className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 hover:border-nebula-500/50 transition-colors"
            >
              <div className="text-white text-sm font-medium">Space Industry Market Size</div>
              <div className="text-slate-500 text-xs">$1.8 trillion and growing</div>
            </Link>
            <Link
              href="/learn/how-to-track-satellites"
              className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 hover:border-nebula-500/50 transition-colors"
            >
              <div className="text-white text-sm font-medium">How to Track Satellites</div>
              <div className="text-slate-500 text-xs">Real-time tracking guide</div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
