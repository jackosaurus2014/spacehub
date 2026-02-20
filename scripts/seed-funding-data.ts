import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ════════════════════════════════════════════════════════════════
// Space Investors (~50 major investors)
// ════════════════════════════════════════════════════════════════

interface InvestorData {
  name: string;
  type: string;
  description?: string;
  website?: string;
  headquarters?: string;
  foundedYear?: number;
  aum?: number;
  fundSize?: number;
  investmentStage: string[];
  sectorFocus: string[];
  portfolioCount?: number;
  notableDeals: string[];
  linkedinUrl?: string;
  status?: string;
}

const SPACE_INVESTORS: InvestorData[] = [
  {
    name: 'Bessemer Venture Partners',
    type: 'vc',
    description: 'One of the oldest VC firms in the US with a dedicated space investment thesis and strong track record in space infrastructure.',
    website: 'https://www.bvp.com',
    headquarters: 'San Francisco, CA',
    foundedYear: 1911,
    aum: 20000000000,
    investmentStage: ['seed', 'series_a', 'series_b', 'growth'],
    sectorFocus: ['satellite', 'earth_observation', 'ground_segment'],
    portfolioCount: 8,
    notableDeals: ['Rocket Lab (pre-IPO)', 'Spire Global', 'Planet Labs'],
  },
  {
    name: 'Founders Fund',
    type: 'vc',
    description: 'Peter Thiel-founded VC firm known for backing revolutionary companies including early SpaceX investment.',
    website: 'https://foundersfund.com',
    headquarters: 'San Francisco, CA',
    foundedYear: 2005,
    aum: 11000000000,
    investmentStage: ['seed', 'series_a', 'series_b', 'growth'],
    sectorFocus: ['launch', 'satellite', 'in_space'],
    portfolioCount: 6,
    notableDeals: ['SpaceX (early investor)', 'Planet Labs', 'Relativity Space'],
  },
  {
    name: 'a16z (Andreessen Horowitz)',
    type: 'vc',
    description: 'Premier Silicon Valley VC firm with growing interest in defense and space technology companies.',
    website: 'https://a16z.com',
    headquarters: 'Menlo Park, CA',
    foundedYear: 2009,
    aum: 35000000000,
    investmentStage: ['seed', 'series_a', 'series_b', 'growth'],
    sectorFocus: ['launch', 'satellite', 'in_space', 'defense'],
    portfolioCount: 5,
    notableDeals: ['Relativity Space', 'Skydio', 'Anduril'],
  },
  {
    name: 'Lux Capital',
    type: 'vc',
    description: 'Deep tech VC firm with one of the strongest space and defense portfolios. Focuses on frontier technologies.',
    website: 'https://luxcapital.com',
    headquarters: 'New York, NY',
    foundedYear: 2000,
    aum: 5000000000,
    investmentStage: ['seed', 'series_a', 'series_b'],
    sectorFocus: ['launch', 'defense', 'in_space', 'earth_observation'],
    portfolioCount: 12,
    notableDeals: ['Hadrian', 'Hermeus', 'True Anomaly', 'Impulse Space'],
  },
  {
    name: 'In-Q-Tel',
    type: 'government',
    description: 'CIA-backed strategic investment firm focused on technologies that support US intelligence community and national security.',
    website: 'https://www.iqt.org',
    headquarters: 'Arlington, VA',
    foundedYear: 1999,
    investmentStage: ['seed', 'series_a'],
    sectorFocus: ['defense', 'earth_observation', 'satellite'],
    portfolioCount: 15,
    notableDeals: ['Planet Labs', 'Spire Global', 'HawkEye 360', 'BlackSky'],
  },
  {
    name: 'Space Capital',
    type: 'vc',
    description: 'Dedicated space economy VC fund investing in companies building the infrastructure for the space economy.',
    website: 'https://www.spacecapital.com',
    headquarters: 'New York, NY',
    foundedYear: 2017,
    fundSize: 100000000,
    investmentStage: ['seed', 'series_a'],
    sectorFocus: ['satellite', 'earth_observation', 'ground_segment', 'in_space'],
    portfolioCount: 20,
    notableDeals: ['Isotropic Systems', 'Phase Four', 'Pixxel'],
  },
  {
    name: 'Seraphim Space',
    type: 'vc',
    description: 'World\'s largest space tech VC fund, publicly listed on London Stock Exchange. Deep space-only focus.',
    website: 'https://seraphim.vc',
    headquarters: 'London, UK',
    foundedYear: 2016,
    aum: 300000000,
    investmentStage: ['seed', 'series_a', 'series_b'],
    sectorFocus: ['earth_observation', 'satellite', 'in_space'],
    portfolioCount: 25,
    notableDeals: ['Iceye', 'D-Orbit', 'LeoLabs', 'Arqit'],
  },
  {
    name: 'Boeing HorizonX',
    type: 'corporate',
    description: 'Boeing\'s venture capital arm investing in disruptive technologies across aerospace, autonomy, and space.',
    website: 'https://www.boeing.com',
    headquarters: 'Arlington, VA',
    foundedYear: 2017,
    investmentStage: ['seed', 'series_a', 'series_b'],
    sectorFocus: ['launch', 'satellite', 'in_space', 'defense'],
    portfolioCount: 6,
    notableDeals: ['SparkCognition', 'Matternet', 'Wisk Aero'],
  },
  {
    name: 'Lockheed Martin Ventures',
    type: 'corporate',
    description: 'Strategic venture investment arm of Lockheed Martin, the world\'s largest defense contractor.',
    website: 'https://www.lockheedmartin.com/ventures',
    headquarters: 'Bethesda, MD',
    foundedYear: 2007,
    investmentStage: ['series_a', 'series_b'],
    sectorFocus: ['defense', 'satellite', 'in_space'],
    portfolioCount: 10,
    notableDeals: ['Terran Orbital', 'Rocket Lab', 'Cognitive Space'],
  },
  {
    name: 'Airbus Ventures',
    type: 'corporate',
    description: 'Airbus\' strategic venture arm investing in startups that complement and disrupt the aerospace value chain.',
    website: 'https://airbusventures.vc',
    headquarters: 'Menlo Park, CA',
    foundedYear: 2015,
    investmentStage: ['seed', 'series_a', 'series_b'],
    sectorFocus: ['satellite', 'earth_observation', 'launch'],
    portfolioCount: 8,
    notableDeals: ['Spire Global', 'Mynaric', 'Loft Orbital'],
  },
  {
    name: 'DCVC (Data Collective)',
    type: 'vc',
    description: 'Deep tech VC firm investing at the convergence of data science and world-changing technologies.',
    website: 'https://www.dcvc.com',
    headquarters: 'San Francisco, CA',
    foundedYear: 2011,
    aum: 3000000000,
    investmentStage: ['seed', 'series_a', 'series_b'],
    sectorFocus: ['earth_observation', 'satellite', 'defense'],
    portfolioCount: 6,
    notableDeals: ['Capella Space', 'Planet Labs', 'Descartes Labs'],
  },
  {
    name: 'Spark Capital',
    type: 'vc',
    description: 'Early-stage VC firm that backed Twitter, Slack, and selectively invests in space infrastructure.',
    website: 'https://www.sparkcapital.com',
    headquarters: 'Boston, MA',
    foundedYear: 2005,
    aum: 4000000000,
    investmentStage: ['seed', 'series_a', 'series_b'],
    sectorFocus: ['launch', 'satellite'],
    portfolioCount: 2,
    notableDeals: ['Relativity Space'],
  },
  {
    name: 'ACME Capital',
    type: 'vc',
    description: 'Seed and early-stage VC focused on emerging technology sectors including new space.',
    website: 'https://www.acme.vc',
    headquarters: 'San Francisco, CA',
    foundedYear: 2015,
    investmentStage: ['pre_seed', 'seed'],
    sectorFocus: ['launch', 'in_space', 'defense'],
    portfolioCount: 4,
    notableDeals: ['Astra', 'Momentus'],
  },
  {
    name: 'Khosla Ventures',
    type: 'vc',
    description: 'Vinod Khosla-founded firm investing in technology that impacts major industries including space.',
    website: 'https://www.khoslaventures.com',
    headquarters: 'Menlo Park, CA',
    foundedYear: 2004,
    aum: 15000000000,
    investmentStage: ['seed', 'series_a', 'series_b', 'growth'],
    sectorFocus: ['launch', 'satellite', 'in_space'],
    portfolioCount: 3,
    notableDeals: ['Relativity Space', 'Astra'],
  },
  {
    name: 'Tiger Global',
    type: 'pe',
    description: 'Crossover hedge fund and PE firm known for large growth-stage investments in technology.',
    website: 'https://www.tigerglobal.com',
    headquarters: 'New York, NY',
    foundedYear: 2001,
    aum: 80000000000,
    investmentStage: ['series_b', 'growth', 'late_stage'],
    sectorFocus: ['launch', 'satellite'],
    portfolioCount: 3,
    notableDeals: ['SpaceX', 'Relativity Space'],
  },
  {
    name: 'Fidelity Investments',
    type: 'pe',
    description: 'One of the world\'s largest financial services companies with substantial private equity space holdings.',
    website: 'https://www.fidelity.com',
    headquarters: 'Boston, MA',
    foundedYear: 1946,
    aum: 4900000000000,
    investmentStage: ['growth', 'late_stage'],
    sectorFocus: ['launch', 'satellite'],
    portfolioCount: 2,
    notableDeals: ['SpaceX'],
  },
  {
    name: 'T. Rowe Price',
    type: 'pe',
    description: 'Global investment management firm with selective private market exposure to space leaders.',
    website: 'https://www.troweprice.com',
    headquarters: 'Baltimore, MD',
    foundedYear: 1937,
    aum: 1400000000000,
    investmentStage: ['growth', 'late_stage'],
    sectorFocus: ['launch'],
    portfolioCount: 1,
    notableDeals: ['SpaceX'],
  },
  {
    name: 'Tribe Capital',
    type: 'vc',
    description: 'Data-driven VC firm founded by former Social Capital team members. Invested in multiple space companies.',
    website: 'https://tribecap.co',
    headquarters: 'San Francisco, CA',
    foundedYear: 2018,
    aum: 2000000000,
    investmentStage: ['series_a', 'series_b', 'growth'],
    sectorFocus: ['launch', 'satellite'],
    portfolioCount: 3,
    notableDeals: ['Relativity Space', 'Astra'],
  },
  {
    name: 'Y Combinator',
    type: 'accelerator',
    description: 'The world\'s most prolific startup accelerator with a growing space portfolio from batch graduates.',
    website: 'https://www.ycombinator.com',
    headquarters: 'San Francisco, CA',
    foundedYear: 2005,
    investmentStage: ['pre_seed', 'seed'],
    sectorFocus: ['launch', 'satellite', 'in_space', 'earth_observation', 'ground_segment'],
    portfolioCount: 15,
    notableDeals: ['Astranis', 'Stoke Space', 'Albedo', 'Epsilon3', 'Phase Four'],
  },
  {
    name: 'Techstars',
    type: 'accelerator',
    description: 'Global accelerator network including the Techstars Starburst Space Accelerator.',
    website: 'https://www.techstars.com',
    headquarters: 'Boulder, CO',
    foundedYear: 2006,
    investmentStage: ['pre_seed', 'seed'],
    sectorFocus: ['satellite', 'earth_observation', 'ground_segment'],
    portfolioCount: 8,
    notableDeals: ['Swarm Technologies', 'Pixxel'],
  },
  {
    name: 'Promus Ventures',
    type: 'vc',
    description: 'Defense and national security focused VC fund based in Washington DC with strong intelligence community ties.',
    website: 'https://promusventures.com',
    headquarters: 'Washington, DC',
    foundedYear: 2018,
    fundSize: 50000000,
    investmentStage: ['seed', 'series_a'],
    sectorFocus: ['defense', 'satellite', 'earth_observation'],
    portfolioCount: 8,
    notableDeals: ['HawkEye 360', 'Umbra'],
  },
  {
    name: 'Shield Capital',
    type: 'vc',
    description: 'National security VC fund investing at the intersection of defense and commercial technology.',
    website: 'https://shieldcap.com',
    headquarters: 'San Francisco, CA',
    foundedYear: 2021,
    fundSize: 185000000,
    investmentStage: ['seed', 'series_a'],
    sectorFocus: ['defense', 'satellite'],
    portfolioCount: 6,
    notableDeals: ['True Anomaly', 'Anduril'],
  },
  {
    name: 'Geodesic Capital',
    type: 'vc',
    description: 'Late-stage VC fund connecting Silicon Valley with Asian investors.',
    website: 'https://geodesiccap.com',
    headquarters: 'New York, NY',
    foundedYear: 2016,
    investmentStage: ['series_a', 'series_b', 'growth'],
    sectorFocus: ['launch', 'satellite'],
    portfolioCount: 2,
    notableDeals: ['SpaceX'],
  },
  {
    name: 'Koch Disruptive Technologies',
    type: 'pe',
    description: 'Koch Industries\' investment arm focused on disruptive technologies including space launch.',
    website: 'https://www.kochdisruptivetechnologies.com',
    headquarters: 'Wichita, KS',
    foundedYear: 2017,
    investmentStage: ['series_b', 'growth'],
    sectorFocus: ['launch', 'in_space'],
    portfolioCount: 3,
    notableDeals: ['Rocket Lab (pre-IPO)', 'Impulse Space'],
  },
  {
    name: 'Samsung NEXT',
    type: 'corporate',
    description: 'Samsung\'s venture arm investing in frontier technologies including satellite communications.',
    website: 'https://www.samsungnext.com',
    headquarters: 'Seoul, South Korea',
    foundedYear: 2013,
    investmentStage: ['series_a', 'series_b'],
    sectorFocus: ['satellite', 'ground_segment'],
    portfolioCount: 3,
    notableDeals: ['AST SpaceMobile', 'Kymeta'],
  },
  {
    name: 'Playground Global',
    type: 'vc',
    description: 'Deep tech venture fund founded by Andy Rubin (creator of Android) with investments in space hardware.',
    website: 'https://playground.global',
    headquarters: 'Palo Alto, CA',
    foundedYear: 2015,
    aum: 800000000,
    investmentStage: ['seed', 'series_a', 'series_b'],
    sectorFocus: ['launch', 'satellite', 'in_space'],
    portfolioCount: 3,
    notableDeals: ['Relativity Space', 'Momentus'],
  },
  {
    name: 'Venrock',
    type: 'vc',
    description: 'Rockefeller family-founded VC firm with selective investments in space and defense technology.',
    website: 'https://www.venrock.com',
    headquarters: 'Palo Alto, CA',
    foundedYear: 1969,
    aum: 3000000000,
    investmentStage: ['seed', 'series_a', 'series_b'],
    sectorFocus: ['satellite', 'earth_observation'],
    portfolioCount: 3,
    notableDeals: ['Planet Labs', 'Spire Global'],
  },
  {
    name: 'General Atlantic',
    type: 'pe',
    description: 'Global growth equity firm with selective investments in high-growth space companies.',
    website: 'https://www.generalatlantic.com',
    headquarters: 'New York, NY',
    foundedYear: 1980,
    aum: 84000000000,
    investmentStage: ['growth', 'late_stage'],
    sectorFocus: ['satellite', 'launch'],
    portfolioCount: 2,
    notableDeals: ['SpaceX'],
  },
  {
    name: 'Coatue Management',
    type: 'pe',
    description: 'Technology-focused hedge fund and growth equity investor with major space positions.',
    website: 'https://www.coatue.com',
    headquarters: 'New York, NY',
    foundedYear: 1999,
    aum: 48000000000,
    investmentStage: ['series_b', 'growth', 'late_stage'],
    sectorFocus: ['launch', 'satellite', 'defense'],
    portfolioCount: 4,
    notableDeals: ['SpaceX', 'Anduril', 'Planet Labs'],
  },
  {
    name: 'Radical Ventures',
    type: 'vc',
    description: 'AI-focused VC with investments in AI-powered space companies and autonomous systems.',
    website: 'https://radical.vc',
    headquarters: 'Toronto, Canada',
    foundedYear: 2017,
    aum: 1000000000,
    investmentStage: ['seed', 'series_a', 'series_b'],
    sectorFocus: ['satellite', 'earth_observation', 'defense'],
    portfolioCount: 2,
    notableDeals: ['Muon Space'],
  },
  {
    name: 'Point72 Ventures',
    type: 'vc',
    description: 'Steve Cohen-backed venture firm investing in transformative technology including space.',
    website: 'https://www.point72ventures.com',
    headquarters: 'New York, NY',
    foundedYear: 2016,
    investmentStage: ['seed', 'series_a', 'series_b'],
    sectorFocus: ['satellite', 'earth_observation', 'defense'],
    portfolioCount: 3,
    notableDeals: ['Umbra', 'Hawkeye 360'],
  },
  {
    name: 'Draper Associates',
    type: 'vc',
    description: 'Tim Draper\'s VC firm with early bets on transformative space companies.',
    website: 'https://www.draper.vc',
    headquarters: 'San Mateo, CA',
    foundedYear: 1985,
    investmentStage: ['seed', 'series_a'],
    sectorFocus: ['launch', 'satellite', 'in_space'],
    portfolioCount: 4,
    notableDeals: ['SpaceX (early)', 'Planet Labs', 'Firefly Aerospace'],
  },
  {
    name: 'First Round Capital',
    type: 'vc',
    description: 'Seed-stage VC firm with selective space investments through their institutional fund.',
    website: 'https://firstround.com',
    headquarters: 'San Francisco, CA',
    foundedYear: 2004,
    aum: 3000000000,
    investmentStage: ['pre_seed', 'seed'],
    sectorFocus: ['satellite', 'ground_segment'],
    portfolioCount: 2,
    notableDeals: ['Astranis'],
  },
  {
    name: 'Revolution',
    type: 'vc',
    description: 'Steve Case-founded VC firm investing in transformative companies outside Silicon Valley, including space.',
    website: 'https://revolution.com',
    headquarters: 'Washington, DC',
    foundedYear: 2005,
    aum: 2500000000,
    investmentStage: ['seed', 'series_a', 'series_b', 'growth'],
    sectorFocus: ['launch', 'satellite', 'defense'],
    portfolioCount: 3,
    notableDeals: ['Firefly Aerospace'],
  },
  {
    name: 'AE Industrial Partners',
    type: 'pe',
    description: 'Private equity firm specializing in aerospace, defense, and government services M&A.',
    website: 'https://www.aeroequity.com',
    headquarters: 'Boca Raton, FL',
    foundedYear: 2009,
    aum: 8000000000,
    investmentStage: ['growth', 'late_stage'],
    sectorFocus: ['defense', 'satellite', 'launch'],
    portfolioCount: 5,
    notableDeals: ['Firefly Aerospace (majority stake)', 'Blue Halo'],
  },
  {
    name: 'Advent International',
    type: 'pe',
    description: 'One of the largest global PE firms, completed the $6.4B take-private of Maxar Technologies.',
    website: 'https://www.adventinternational.com',
    headquarters: 'Boston, MA',
    foundedYear: 1984,
    aum: 91000000000,
    investmentStage: ['late_stage'],
    sectorFocus: ['satellite', 'earth_observation'],
    portfolioCount: 1,
    notableDeals: ['Maxar Technologies (acquired $6.4B)'],
  },
  {
    name: 'Neutron Star Ventures',
    type: 'vc',
    description: 'Space-only VC fund focused on seed and early-stage space startups across Europe and US.',
    website: 'https://neutronstar.vc',
    headquarters: 'Berlin, Germany',
    foundedYear: 2020,
    fundSize: 50000000,
    investmentStage: ['pre_seed', 'seed'],
    sectorFocus: ['satellite', 'in_space', 'ground_segment'],
    portfolioCount: 10,
    notableDeals: ['Loft Orbital', 'Morpheus Space'],
  },
  {
    name: 'Type One Ventures',
    type: 'vc',
    description: 'Early-stage VC focused exclusively on the space industry and frontier tech.',
    website: 'https://typeone.vc',
    headquarters: 'Los Angeles, CA',
    foundedYear: 2019,
    fundSize: 30000000,
    investmentStage: ['pre_seed', 'seed'],
    sectorFocus: ['launch', 'satellite', 'in_space', 'earth_observation'],
    portfolioCount: 8,
    notableDeals: ['Varda Space Industries', 'Epsilon3'],
  },
  {
    name: 'RRE Ventures',
    type: 'vc',
    description: 'NYC-based early-stage VC with a growing space and defense portfolio.',
    website: 'https://www.rre.com',
    headquarters: 'New York, NY',
    foundedYear: 1994,
    aum: 2000000000,
    investmentStage: ['seed', 'series_a'],
    sectorFocus: ['satellite', 'defense', 'earth_observation'],
    portfolioCount: 3,
    notableDeals: ['Capella Space'],
  },
  {
    name: 'Google Ventures (GV)',
    type: 'corporate',
    description: 'Google/Alphabet\'s venture capital arm with investments in space-related companies.',
    website: 'https://www.gv.com',
    headquarters: 'Mountain View, CA',
    foundedYear: 2009,
    aum: 8000000000,
    investmentStage: ['seed', 'series_a', 'series_b', 'growth'],
    sectorFocus: ['satellite', 'earth_observation', 'ground_segment'],
    portfolioCount: 3,
    notableDeals: ['SpaceX', 'Planet Labs'],
  },
  {
    name: 'Baillie Gifford',
    type: 'pe',
    description: 'Scottish investment management firm known for long-term growth investments including SpaceX.',
    website: 'https://www.bailliegifford.com',
    headquarters: 'Edinburgh, UK',
    foundedYear: 1908,
    aum: 230000000000,
    investmentStage: ['growth', 'late_stage'],
    sectorFocus: ['launch', 'satellite'],
    portfolioCount: 2,
    notableDeals: ['SpaceX', 'Rocket Lab'],
  },
  {
    name: 'Sequoia Capital',
    type: 'vc',
    description: 'One of Silicon Valley\'s most storied VC firms with selective space investments.',
    website: 'https://www.sequoiacap.com',
    headquarters: 'Menlo Park, CA',
    foundedYear: 1972,
    aum: 85000000000,
    investmentStage: ['seed', 'series_a', 'series_b', 'growth'],
    sectorFocus: ['launch', 'satellite', 'defense'],
    portfolioCount: 2,
    notableDeals: ['SpaceX'],
  },
  {
    name: 'B612 Foundation/Ventures',
    type: 'vc',
    description: 'Space-focused philanthropic and venture entity dedicated to planetary defense and asteroid tracking.',
    website: 'https://b612foundation.org',
    headquarters: 'Mill Valley, CA',
    foundedYear: 2002,
    investmentStage: ['pre_seed', 'seed'],
    sectorFocus: ['earth_observation', 'defense'],
    portfolioCount: 2,
    notableDeals: ['LeoLabs'],
  },
  {
    name: 'Decisive Point',
    type: 'vc',
    description: 'National security focused VC investing in dual-use technologies for defense and commercial space.',
    website: 'https://www.decisivepoint.com',
    headquarters: 'Washington, DC',
    foundedYear: 2020,
    fundSize: 100000000,
    investmentStage: ['seed', 'series_a'],
    sectorFocus: ['defense', 'satellite', 'in_space'],
    portfolioCount: 5,
    notableDeals: ['True Anomaly', 'Muon Space'],
  },
  {
    name: 'Marlinspike Capital',
    type: 'vc',
    description: 'Growth-stage investor focused on deep tech and aerospace platforms.',
    website: 'https://marlinspikecapital.com',
    headquarters: 'Miami, FL',
    foundedYear: 2019,
    investmentStage: ['series_a', 'series_b'],
    sectorFocus: ['launch', 'satellite', 'in_space'],
    portfolioCount: 3,
    notableDeals: ['Impulse Space', 'Varda Space Industries'],
  },
  {
    name: 'Bain Capital',
    type: 'pe',
    description: 'Global private investment firm with selective defense and space investments.',
    website: 'https://www.baincapital.com',
    headquarters: 'Boston, MA',
    foundedYear: 1984,
    aum: 185000000000,
    investmentStage: ['growth', 'late_stage'],
    sectorFocus: ['defense', 'satellite'],
    portfolioCount: 2,
    notableDeals: ['Blue Origin (co-invest)'],
  },
  {
    name: 'Bond (formerly ICONIQ Capital)',
    type: 'pe',
    description: 'Wealth management and venture firm managing capital for notable tech founders.',
    website: 'https://bond.vc',
    headquarters: 'San Francisco, CA',
    foundedYear: 2011,
    aum: 80000000000,
    investmentStage: ['series_b', 'growth', 'late_stage'],
    sectorFocus: ['launch', 'satellite'],
    portfolioCount: 2,
    notableDeals: ['SpaceX'],
  },
  {
    name: 'Marc Bell Capital',
    type: 'angel',
    description: 'Angel investor and space entrepreneur behind Terran Orbital and other space ventures.',
    website: 'https://www.marcbellcapital.com',
    headquarters: 'Boca Raton, FL',
    foundedYear: 2015,
    investmentStage: ['pre_seed', 'seed', 'series_a'],
    sectorFocus: ['satellite', 'in_space'],
    portfolioCount: 4,
    notableDeals: ['Terran Orbital', 'Sidus Space'],
  },
  {
    name: 'Breakthrough Energy Ventures',
    type: 'vc',
    description: 'Bill Gates-backed climate fund that has invested in space-adjacent companies.',
    website: 'https://www.breakthroughenergy.org',
    headquarters: 'Kirkland, WA',
    foundedYear: 2016,
    aum: 3500000000,
    investmentStage: ['seed', 'series_a', 'series_b'],
    sectorFocus: ['earth_observation', 'satellite'],
    portfolioCount: 2,
    notableDeals: ['Muon Space'],
  },
];

// ════════════════════════════════════════════════════════════════
// Historical Funding Rounds (~200 rounds across 2020-2026)
// ════════════════════════════════════════════════════════════════

interface FundingRoundData {
  companyName: string;
  date: string; // ISO string
  amount?: number; // In USD
  seriesLabel?: string;
  roundType?: string;
  preValuation?: number;
  postValuation?: number;
  leadInvestor?: string;
  investors: string[];
  source?: string;
  sourceUrl?: string;
}

const FUNDING_ROUNDS: FundingRoundData[] = [
  // ── SpaceX Rounds ──
  {
    companyName: 'SpaceX',
    date: '2020-08-18',
    amount: 1900000000,
    seriesLabel: 'Series N',
    roundType: 'equity',
    postValuation: 46000000000,
    leadInvestor: 'Sequoia Capital',
    investors: ['Sequoia Capital', 'Fidelity Investments', 'Google Ventures (GV)'],
    source: 'Press Release',
  },
  {
    companyName: 'SpaceX',
    date: '2021-02-16',
    amount: 850000000,
    seriesLabel: 'Series N-1',
    roundType: 'equity',
    postValuation: 74000000000,
    leadInvestor: 'Sequoia Capital',
    investors: ['Sequoia Capital', 'Fidelity Investments', 'Baillie Gifford', 'Founders Fund'],
    source: 'SEC Filing',
  },
  {
    companyName: 'SpaceX',
    date: '2022-05-25',
    amount: 1680000000,
    seriesLabel: 'Series O',
    roundType: 'equity',
    postValuation: 127000000000,
    leadInvestor: 'a16z (Andreessen Horowitz)',
    investors: ['a16z (Andreessen Horowitz)', 'Sequoia Capital', 'Baillie Gifford', 'Fidelity Investments', 'Tiger Global'],
    source: 'SEC Filing',
  },
  {
    companyName: 'SpaceX',
    date: '2023-07-20',
    amount: 750000000,
    seriesLabel: 'Series P',
    roundType: 'equity',
    postValuation: 150000000000,
    leadInvestor: 'a16z (Andreessen Horowitz)',
    investors: ['a16z (Andreessen Horowitz)', 'Founders Fund', 'Gigafund', 'Fidelity Investments'],
    source: 'SEC Filing',
  },
  {
    companyName: 'SpaceX',
    date: '2024-06-10',
    amount: 5000000000,
    seriesLabel: 'Tender Offer',
    roundType: 'equity',
    postValuation: 210000000000,
    leadInvestor: 'General Atlantic',
    investors: ['General Atlantic', 'Fidelity Investments', 'T. Rowe Price', 'Baillie Gifford'],
    source: 'Bloomberg',
  },
  {
    companyName: 'SpaceX',
    date: '2025-03-15',
    amount: 2000000000,
    seriesLabel: 'Series Q',
    roundType: 'equity',
    postValuation: 350000000000,
    leadInvestor: 'Fidelity Investments',
    investors: ['Fidelity Investments', 'Sequoia Capital', 'Gigafund', 'a16z (Andreessen Horowitz)'],
    source: 'SEC Filing',
  },

  // ── Rocket Lab ──
  {
    companyName: 'Rocket Lab',
    date: '2020-11-05',
    amount: 75000000,
    seriesLabel: 'Series F',
    roundType: 'equity',
    postValuation: 1400000000,
    leadInvestor: 'Future Fund',
    investors: ['Future Fund', 'Bessemer Venture Partners', 'Lockheed Martin Ventures', 'DCVC (Data Collective)'],
    source: 'Press Release',
  },
  {
    companyName: 'Rocket Lab',
    date: '2021-03-01',
    amount: 777000000,
    seriesLabel: 'SPAC Merger',
    roundType: 'spac',
    postValuation: 4100000000,
    leadInvestor: 'Vector Acquisition Corp',
    investors: ['Vector Acquisition Corp', 'BlackRock', 'Neuberger Berman'],
    source: 'SEC Filing',
  },

  // ── Relativity Space ──
  {
    companyName: 'Relativity Space',
    date: '2020-11-23',
    amount: 500000000,
    seriesLabel: 'Series D',
    roundType: 'equity',
    postValuation: 2300000000,
    leadInvestor: 'Tiger Global',
    investors: ['Tiger Global', 'Fidelity Investments', 'Baillie Gifford', 'Spark Capital', 'Tribe Capital'],
    source: 'Press Release',
  },
  {
    companyName: 'Relativity Space',
    date: '2021-06-08',
    amount: 650000000,
    seriesLabel: 'Series E',
    roundType: 'equity',
    postValuation: 4200000000,
    leadInvestor: 'Fidelity Investments',
    investors: ['Fidelity Investments', 'Tiger Global', 'a16z (Andreessen Horowitz)', 'Spark Capital', 'Khosla Ventures', 'Tribe Capital', 'Coatue Management'],
    source: 'Press Release',
  },

  // ── Planet Labs ──
  {
    companyName: 'Planet Labs',
    date: '2021-07-07',
    amount: 250000000,
    seriesLabel: 'SPAC Merger',
    roundType: 'spac',
    postValuation: 2800000000,
    leadInvestor: 'dMY Technology Group',
    investors: ['dMY Technology Group', 'BlackRock', 'Google Ventures (GV)'],
    source: 'SEC Filing',
  },
  {
    companyName: 'Planet Labs',
    date: '2020-04-20',
    amount: 100000000,
    seriesLabel: 'Series D',
    roundType: 'equity',
    leadInvestor: 'Draper Associates',
    investors: ['Draper Associates', 'Founders Fund', 'Bessemer Venture Partners', 'DCVC (Data Collective)'],
    source: 'Crunchbase',
  },

  // ── Astra ──
  {
    companyName: 'Astra',
    date: '2021-02-02',
    amount: 500000000,
    seriesLabel: 'SPAC Merger',
    roundType: 'spac',
    postValuation: 2100000000,
    leadInvestor: 'Holicity',
    investors: ['Holicity', 'BlackRock', 'Fidelity Investments'],
    source: 'SEC Filing',
  },
  {
    companyName: 'Astra',
    date: '2020-06-15',
    amount: 100000000,
    seriesLabel: 'Series C',
    roundType: 'equity',
    leadInvestor: 'ACME Capital',
    investors: ['ACME Capital', 'Khosla Ventures', 'Tribe Capital'],
    source: 'Press Release',
  },

  // ── AST SpaceMobile ──
  {
    companyName: 'AST SpaceMobile',
    date: '2021-04-07',
    amount: 462000000,
    seriesLabel: 'SPAC Merger',
    roundType: 'spac',
    postValuation: 1800000000,
    leadInvestor: 'New Providence Acquisition Corp',
    investors: ['New Providence Acquisition Corp', 'Samsung NEXT', 'Vodafone'],
    source: 'SEC Filing',
  },
  {
    companyName: 'AST SpaceMobile',
    date: '2023-01-15',
    amount: 100000000,
    seriesLabel: 'Follow-on',
    roundType: 'equity',
    leadInvestor: 'Samsung NEXT',
    investors: ['Samsung NEXT', 'Vodafone Ventures', 'American Tower'],
    source: 'Press Release',
  },
  {
    companyName: 'AST SpaceMobile',
    date: '2025-06-20',
    amount: 155000000,
    seriesLabel: 'Follow-on Offering',
    roundType: 'equity',
    leadInvestor: 'Google Ventures (GV)',
    investors: ['Google Ventures (GV)', 'Samsung NEXT'],
    source: 'SEC Filing',
  },

  // ── Impulse Space ──
  {
    companyName: 'Impulse Space',
    date: '2023-11-14',
    amount: 150000000,
    seriesLabel: 'Series B',
    roundType: 'equity',
    leadInvestor: 'a16z (Andreessen Horowitz)',
    investors: ['a16z (Andreessen Horowitz)', 'Lux Capital', 'Koch Disruptive Technologies'],
    source: 'Press Release',
  },
  {
    companyName: 'Impulse Space',
    date: '2022-06-01',
    amount: 30000000,
    seriesLabel: 'Series A',
    roundType: 'equity',
    leadInvestor: 'Lux Capital',
    investors: ['Lux Capital', 'Koch Disruptive Technologies'],
    source: 'Crunchbase',
  },

  // ── Stoke Space ──
  {
    companyName: 'Stoke Space',
    date: '2023-12-05',
    amount: 100000000,
    seriesLabel: 'Series B',
    roundType: 'equity',
    leadInvestor: 'DCVC (Data Collective)',
    investors: ['DCVC (Data Collective)', 'Breakthrough Energy Ventures', 'Y Combinator'],
    source: 'Press Release',
  },
  {
    companyName: 'Stoke Space',
    date: '2022-03-15',
    amount: 65000000,
    seriesLabel: 'Series A',
    roundType: 'equity',
    leadInvestor: 'Y Combinator',
    investors: ['Y Combinator', 'DCVC (Data Collective)'],
    source: 'Crunchbase',
  },

  // ── True Anomaly ──
  {
    companyName: 'True Anomaly',
    date: '2024-02-13',
    amount: 100000000,
    seriesLabel: 'Series B',
    roundType: 'equity',
    leadInvestor: 'Lux Capital',
    investors: ['Lux Capital', 'Shield Capital', 'Decisive Point'],
    source: 'Press Release',
  },
  {
    companyName: 'True Anomaly',
    date: '2023-02-01',
    amount: 30000000,
    seriesLabel: 'Series A',
    roundType: 'equity',
    leadInvestor: 'Shield Capital',
    investors: ['Shield Capital', 'Lux Capital'],
    source: 'Crunchbase',
  },

  // ── Capella Space ──
  {
    companyName: 'Capella Space',
    date: '2022-04-05',
    amount: 97000000,
    seriesLabel: 'Series C',
    roundType: 'equity',
    leadInvestor: 'DCVC (Data Collective)',
    investors: ['DCVC (Data Collective)', 'NVP', 'RRE Ventures'],
    source: 'Press Release',
  },
  {
    companyName: 'Capella Space',
    date: '2020-08-10',
    amount: 60000000,
    seriesLabel: 'Series B',
    roundType: 'equity',
    leadInvestor: 'DCVC (Data Collective)',
    investors: ['DCVC (Data Collective)', 'In-Q-Tel'],
    source: 'Crunchbase',
  },

  // ── HawkEye 360 ──
  {
    companyName: 'HawkEye 360',
    date: '2022-09-14',
    amount: 68000000,
    seriesLabel: 'Series D',
    roundType: 'equity',
    leadInvestor: 'Advance',
    investors: ['Advance', 'Promus Ventures', 'In-Q-Tel', 'Point72 Ventures'],
    source: 'Press Release',
  },
  {
    companyName: 'HawkEye 360',
    date: '2020-10-01',
    amount: 55000000,
    seriesLabel: 'Series C',
    roundType: 'equity',
    leadInvestor: 'Promus Ventures',
    investors: ['Promus Ventures', 'In-Q-Tel'],
    source: 'Crunchbase',
  },

  // ── Muon Space ──
  {
    companyName: 'Muon Space',
    date: '2023-08-22',
    amount: 56700000,
    seriesLabel: 'Series A',
    roundType: 'equity',
    leadInvestor: 'Radical Ventures',
    investors: ['Radical Ventures', 'Decisive Point', 'Breakthrough Energy Ventures'],
    source: 'Press Release',
  },

  // ── Albedo ──
  {
    companyName: 'Albedo',
    date: '2024-01-23',
    amount: 48000000,
    seriesLabel: 'Series B',
    roundType: 'equity',
    leadInvestor: 'Shield Capital',
    investors: ['Shield Capital', 'Y Combinator'],
    source: 'Press Release',
  },
  {
    companyName: 'Albedo',
    date: '2022-05-10',
    amount: 10000000,
    seriesLabel: 'Seed',
    roundType: 'equity',
    leadInvestor: 'Y Combinator',
    investors: ['Y Combinator'],
    source: 'Crunchbase',
  },

  // ── Epsilon3 ──
  {
    companyName: 'Epsilon3',
    date: '2024-03-19',
    amount: 30000000,
    seriesLabel: 'Series B',
    roundType: 'equity',
    leadInvestor: 'Lux Capital',
    investors: ['Lux Capital', 'Y Combinator', 'Type One Ventures'],
    source: 'Press Release',
  },

  // ── Astranis ──
  {
    companyName: 'Astranis',
    date: '2023-03-28',
    amount: 250000000,
    seriesLabel: 'Series C',
    roundType: 'equity',
    postValuation: 1700000000,
    leadInvestor: 'a16z (Andreessen Horowitz)',
    investors: ['a16z (Andreessen Horowitz)', 'First Round Capital', 'Y Combinator', 'Venrock'],
    source: 'Press Release',
  },
  {
    companyName: 'Astranis',
    date: '2021-04-15',
    amount: 90000000,
    seriesLabel: 'Series B',
    roundType: 'equity',
    leadInvestor: 'a16z (Andreessen Horowitz)',
    investors: ['a16z (Andreessen Horowitz)', 'Y Combinator', 'First Round Capital'],
    source: 'Crunchbase',
  },

  // ── D-Orbit ──
  {
    companyName: 'D-Orbit',
    date: '2021-11-15',
    amount: 110000000,
    seriesLabel: 'Series B',
    roundType: 'equity',
    leadInvestor: 'Seraphim Space',
    investors: ['Seraphim Space', 'Neva SGR'],
    source: 'Press Release',
  },
  {
    companyName: 'D-Orbit',
    date: '2023-09-05',
    amount: 100000000,
    seriesLabel: 'Growth Round',
    roundType: 'equity',
    leadInvestor: 'Seraphim Space',
    investors: ['Seraphim Space', 'European Innovation Council'],
    source: 'Press Release',
  },

  // ── Iceye ──
  {
    companyName: 'Iceye',
    date: '2022-07-28',
    amount: 93000000,
    seriesLabel: 'Series D',
    roundType: 'equity',
    leadInvestor: 'Seraphim Space',
    investors: ['Seraphim Space', 'BAE Systems'],
    source: 'Press Release',
  },
  {
    companyName: 'Iceye',
    date: '2020-12-01',
    amount: 87000000,
    seriesLabel: 'Series C',
    roundType: 'equity',
    leadInvestor: 'True Ventures',
    investors: ['True Ventures', 'Seraphim Space'],
    source: 'Crunchbase',
  },

  // ── BlackSky ──
  {
    companyName: 'BlackSky',
    date: '2021-02-18',
    amount: 450000000,
    seriesLabel: 'SPAC Merger',
    roundType: 'spac',
    postValuation: 1500000000,
    leadInvestor: 'Osprey Technology Acquisition Corp',
    investors: ['Osprey Technology Acquisition Corp', 'In-Q-Tel'],
    source: 'SEC Filing',
  },

  // ── Spire Global ──
  {
    companyName: 'Spire Global',
    date: '2021-03-01',
    amount: 245000000,
    seriesLabel: 'SPAC Merger',
    roundType: 'spac',
    postValuation: 1600000000,
    leadInvestor: 'NavSight Holdings',
    investors: ['NavSight Holdings', 'Bessemer Venture Partners', 'Airbus Ventures', 'Seraphim Space'],
    source: 'SEC Filing',
  },

  // ── Momentus ──
  {
    companyName: 'Momentus',
    date: '2021-08-12',
    amount: 350000000,
    seriesLabel: 'SPAC Merger',
    roundType: 'spac',
    postValuation: 1200000000,
    leadInvestor: 'Stable Road Capital',
    investors: ['Stable Road Capital', 'Playground Global'],
    source: 'SEC Filing',
  },

  // ── Firefly Aerospace ──
  {
    companyName: 'Firefly Aerospace',
    date: '2021-05-19',
    amount: 75000000,
    seriesLabel: 'Series A',
    roundType: 'equity',
    leadInvestor: 'AE Industrial Partners',
    investors: ['AE Industrial Partners', 'Draper Associates'],
    source: 'Press Release',
  },
  {
    companyName: 'Firefly Aerospace',
    date: '2022-10-12',
    amount: 300000000,
    seriesLabel: 'Series B',
    roundType: 'equity',
    postValuation: 1500000000,
    leadInvestor: 'AE Industrial Partners',
    investors: ['AE Industrial Partners', 'Revolution'],
    source: 'Press Release',
  },
  {
    companyName: 'Firefly Aerospace',
    date: '2024-04-15',
    amount: 175000000,
    seriesLabel: 'Series C',
    roundType: 'equity',
    postValuation: 2500000000,
    leadInvestor: 'AE Industrial Partners',
    investors: ['AE Industrial Partners', 'RPM Ventures'],
    source: 'Press Release',
  },

  // ── ABL Space Systems ──
  {
    companyName: 'ABL Space Systems',
    date: '2021-10-25',
    amount: 200000000,
    seriesLabel: 'Series B',
    roundType: 'equity',
    postValuation: 2400000000,
    leadInvestor: 'Fidelity Investments',
    investors: ['Fidelity Investments', 'T. Rowe Price', 'Baillie Gifford', 'Venrock'],
    source: 'Press Release',
  },

  // ── Axiom Space ──
  {
    companyName: 'Axiom Space',
    date: '2023-08-15',
    amount: 350000000,
    seriesLabel: 'Series C',
    roundType: 'equity',
    postValuation: 3300000000,
    leadInvestor: 'Aljazira Capital',
    investors: ['Aljazira Capital', 'Boryung'],
    source: 'Press Release',
  },
  {
    companyName: 'Axiom Space',
    date: '2021-02-16',
    amount: 130000000,
    seriesLabel: 'Series B',
    roundType: 'equity',
    postValuation: 1250000000,
    leadInvestor: 'C5 Capital',
    investors: ['C5 Capital', 'The Venture Collective'],
    source: 'Press Release',
  },

  // ── Sierra Space ──
  {
    companyName: 'Sierra Space',
    date: '2022-11-14',
    amount: 1400000000,
    seriesLabel: 'Series A',
    roundType: 'equity',
    postValuation: 5300000000,
    leadInvestor: 'Coatue Management',
    investors: ['Coatue Management', 'General Atlantic', 'Moore Strategic Ventures'],
    source: 'Press Release',
  },

  // ── Vast ──
  {
    companyName: 'Vast',
    date: '2023-10-01',
    amount: 150000000,
    seriesLabel: 'Series A',
    roundType: 'equity',
    leadInvestor: 'Lux Capital',
    investors: ['Lux Capital', 'Founders Fund'],
    source: 'Press Release',
  },
  {
    companyName: 'Vast',
    date: '2024-09-10',
    amount: 250000000,
    seriesLabel: 'Series B',
    roundType: 'equity',
    postValuation: 2300000000,
    leadInvestor: 'Lux Capital',
    investors: ['Lux Capital', 'Founders Fund', 'a16z (Andreessen Horowitz)'],
    source: 'Press Release',
  },

  // ── Blue Origin ──
  {
    companyName: 'Blue Origin',
    date: '2021-01-01',
    amount: 1000000000,
    seriesLabel: 'Bezos Investment',
    roundType: 'equity',
    leadInvestor: 'Jeff Bezos',
    investors: ['Jeff Bezos'],
    source: 'Press Release',
  },
  {
    companyName: 'Blue Origin',
    date: '2023-01-01',
    amount: 1000000000,
    seriesLabel: 'Bezos Investment',
    roundType: 'equity',
    leadInvestor: 'Jeff Bezos',
    investors: ['Jeff Bezos'],
    source: 'Press Release',
  },

  // ── Virgin Orbit (bankrupt) ──
  {
    companyName: 'Virgin Orbit',
    date: '2021-12-30',
    amount: 228000000,
    seriesLabel: 'SPAC Merger',
    roundType: 'spac',
    postValuation: 3200000000,
    leadInvestor: 'NextGen Acquisition Corp II',
    investors: ['NextGen Acquisition Corp II', 'Boeing HorizonX'],
    source: 'SEC Filing',
  },

  // ── Terran Orbital ──
  {
    companyName: 'Terran Orbital',
    date: '2022-03-28',
    amount: 235000000,
    seriesLabel: 'SPAC Merger',
    roundType: 'spac',
    postValuation: 1600000000,
    leadInvestor: 'Tailwind Two Acquisition Corp',
    investors: ['Tailwind Two Acquisition Corp', 'Lockheed Martin Ventures', 'AE Industrial Partners'],
    source: 'SEC Filing',
  },
  {
    companyName: 'Terran Orbital',
    date: '2024-08-15',
    amount: 2400000000,
    seriesLabel: 'Acquisition',
    roundType: 'equity',
    leadInvestor: 'Lockheed Martin',
    investors: ['Lockheed Martin'],
    source: 'Press Release',
  },

  // ── Redwire ──
  {
    companyName: 'Redwire',
    date: '2021-09-02',
    amount: 100000000,
    seriesLabel: 'SPAC Merger',
    roundType: 'spac',
    postValuation: 615000000,
    leadInvestor: 'Genesis Park',
    investors: ['Genesis Park', 'AE Industrial Partners'],
    source: 'SEC Filing',
  },

  // ── Maxar Technologies ──
  {
    companyName: 'Maxar Technologies',
    date: '2023-01-03',
    amount: 6400000000,
    seriesLabel: 'Acquisition',
    roundType: 'equity',
    leadInvestor: 'Advent International',
    investors: ['Advent International', 'BCI'],
    source: 'Press Release',
  },

  // ── Varda Space Industries ──
  {
    companyName: 'Varda Space Industries',
    date: '2022-12-12',
    amount: 42000000,
    seriesLabel: 'Series A',
    roundType: 'equity',
    leadInvestor: 'Khosla Ventures',
    investors: ['Khosla Ventures', 'Lux Capital', 'Founders Fund', 'Caffeinated Capital'],
    source: 'Press Release',
  },
  {
    companyName: 'Varda Space Industries',
    date: '2024-05-15',
    amount: 90000000,
    seriesLabel: 'Series B',
    roundType: 'equity',
    postValuation: 700000000,
    leadInvestor: 'Khosla Ventures',
    investors: ['Khosla Ventures', 'Founders Fund', 'Lux Capital', 'General Catalyst'],
    source: 'Press Release',
  },

  // ── Pixxel ──
  {
    companyName: 'Pixxel',
    date: '2022-03-22',
    amount: 36000000,
    seriesLabel: 'Series B',
    roundType: 'equity',
    leadInvestor: 'Google Ventures (GV)',
    investors: ['Google Ventures (GV)', 'Space Capital', 'Techstars'],
    source: 'Press Release',
  },

  // ── LeoLabs ──
  {
    companyName: 'LeoLabs',
    date: '2022-06-21',
    amount: 65000000,
    seriesLabel: 'Series B',
    roundType: 'equity',
    leadInvestor: 'Insight Partners',
    investors: ['Insight Partners', 'Seraphim Space'],
    source: 'Press Release',
  },

  // ── Umbra ──
  {
    companyName: 'Umbra',
    date: '2023-05-15',
    amount: 62000000,
    seriesLabel: 'Series B',
    roundType: 'equity',
    leadInvestor: 'Point72 Ventures',
    investors: ['Point72 Ventures', 'Promus Ventures'],
    source: 'Press Release',
  },

  // ── Phantom Space ──
  {
    companyName: 'Phantom Space',
    date: '2022-01-18',
    amount: 20000000,
    seriesLabel: 'Series A',
    roundType: 'equity',
    leadInvestor: 'SpaceFund',
    investors: ['SpaceFund'],
    source: 'Press Release',
  },

  // ── Sidus Space ──
  {
    companyName: 'Sidus Space',
    date: '2021-12-14',
    amount: 25000000,
    seriesLabel: 'IPO',
    roundType: 'equity',
    leadInvestor: 'Maxim Group',
    investors: ['Maxim Group'],
    source: 'SEC Filing',
  },

  // ── Mynaric ──
  {
    companyName: 'Mynaric',
    date: '2022-11-01',
    amount: 35000000,
    seriesLabel: 'Growth Round',
    roundType: 'equity',
    leadInvestor: 'Airbus Ventures',
    investors: ['Airbus Ventures', 'L3Harris'],
    source: 'Press Release',
  },

  // ── Spire Global (additional) ──
  {
    companyName: 'Spire Global',
    date: '2020-03-01',
    amount: 70000000,
    seriesLabel: 'Series D',
    roundType: 'equity',
    leadInvestor: 'Bessemer Venture Partners',
    investors: ['Bessemer Venture Partners', 'Airbus Ventures', 'Seraphim Space'],
    source: 'Crunchbase',
  },

  // ── Arqit ──
  {
    companyName: 'Arqit',
    date: '2021-09-07',
    amount: 400000000,
    seriesLabel: 'SPAC Merger',
    roundType: 'spac',
    postValuation: 1400000000,
    leadInvestor: 'Centricus Acquisition Corp',
    investors: ['Centricus Acquisition Corp', 'Seraphim Space'],
    source: 'SEC Filing',
  },

  // ── Isar Aerospace ──
  {
    companyName: 'Isar Aerospace',
    date: '2021-07-21',
    amount: 140000000,
    seriesLabel: 'Series B',
    roundType: 'equity',
    postValuation: 1000000000,
    leadInvestor: 'Lombard Odier',
    investors: ['Lombard Odier', 'Airbus Ventures', 'Lakestar'],
    source: 'Press Release',
  },

  // ── Loft Orbital ──
  {
    companyName: 'Loft Orbital',
    date: '2022-11-01',
    amount: 140000000,
    seriesLabel: 'Series B',
    roundType: 'equity',
    leadInvestor: 'B Capital Group',
    investors: ['B Capital Group', 'Airbus Ventures', 'Neutron Star Ventures'],
    source: 'Press Release',
  },

  // ── Morpheus Space ──
  {
    companyName: 'Morpheus Space',
    date: '2022-09-20',
    amount: 28000000,
    seriesLabel: 'Series A',
    roundType: 'equity',
    leadInvestor: 'Alpine Space Ventures',
    investors: ['Alpine Space Ventures', 'Neutron Star Ventures', 'In-Q-Tel'],
    source: 'Press Release',
  },

  // ── Phase Four ──
  {
    companyName: 'Phase Four',
    date: '2021-10-05',
    amount: 26000000,
    seriesLabel: 'Series B',
    roundType: 'equity',
    leadInvestor: 'Space Capital',
    investors: ['Space Capital', 'Lockheed Martin Ventures', 'Y Combinator'],
    source: 'Press Release',
  },

  // ── Cognitive Space ──
  {
    companyName: 'Cognitive Space',
    date: '2023-04-10',
    amount: 8000000,
    seriesLabel: 'Series A',
    roundType: 'equity',
    leadInvestor: 'Lockheed Martin Ventures',
    investors: ['Lockheed Martin Ventures'],
    source: 'Press Release',
  },

  // ── Hermeus ──
  {
    companyName: 'Hermeus',
    date: '2022-04-20',
    amount: 100000000,
    seriesLabel: 'Series B',
    roundType: 'equity',
    leadInvestor: 'Sam Altman',
    investors: ['Lux Capital', 'Khosla Ventures'],
    source: 'Press Release',
  },

  // ── Hadrian ──
  {
    companyName: 'Hadrian',
    date: '2023-08-08',
    amount: 117000000,
    seriesLabel: 'Series B',
    roundType: 'equity',
    postValuation: 630000000,
    leadInvestor: 'Lux Capital',
    investors: ['Lux Capital', 'a16z (Andreessen Horowitz)', 'Founders Fund'],
    source: 'Press Release',
  },
  {
    companyName: 'Hadrian',
    date: '2022-02-01',
    amount: 65000000,
    seriesLabel: 'Series A',
    roundType: 'equity',
    leadInvestor: 'Lux Capital',
    investors: ['Lux Capital', 'Founders Fund', 'a16z (Andreessen Horowitz)'],
    source: 'Crunchbase',
  },

  // ── Anduril ──
  {
    companyName: 'Anduril',
    date: '2022-12-12',
    amount: 1500000000,
    seriesLabel: 'Series E',
    roundType: 'equity',
    postValuation: 8480000000,
    leadInvestor: 'Valor Equity Partners',
    investors: ['Valor Equity Partners', 'a16z (Andreessen Horowitz)', 'Founders Fund', 'Lux Capital', 'General Atlantic'],
    source: 'Press Release',
  },
  {
    companyName: 'Anduril',
    date: '2024-08-07',
    amount: 1500000000,
    seriesLabel: 'Series F',
    roundType: 'equity',
    postValuation: 14000000000,
    leadInvestor: 'Founders Fund',
    investors: ['Founders Fund', 'a16z (Andreessen Horowitz)', 'Coatue Management', 'General Atlantic'],
    source: 'Press Release',
  },

  // ── Skydio ──
  {
    companyName: 'Skydio',
    date: '2022-02-27',
    amount: 230000000,
    seriesLabel: 'Series E',
    roundType: 'equity',
    postValuation: 2200000000,
    leadInvestor: 'a16z (Andreessen Horowitz)',
    investors: ['a16z (Andreessen Horowitz)', 'Levitate Capital'],
    source: 'Press Release',
  },

  // ── Isotropic Systems ──
  {
    companyName: 'Isotropic Systems',
    date: '2022-06-30',
    amount: 40000000,
    seriesLabel: 'Series C',
    roundType: 'equity',
    leadInvestor: 'Space Capital',
    investors: ['Space Capital', 'Boeing HorizonX'],
    source: 'Press Release',
  },

  // ── Wisk Aero ──
  {
    companyName: 'Wisk Aero',
    date: '2022-01-18',
    amount: 450000000,
    seriesLabel: 'Series B',
    roundType: 'equity',
    leadInvestor: 'Boeing HorizonX',
    investors: ['Boeing HorizonX'],
    source: 'Press Release',
  },

  // ── Descartes Labs ──
  {
    companyName: 'Descartes Labs',
    date: '2020-10-08',
    amount: 60000000,
    seriesLabel: 'Series C',
    roundType: 'equity',
    leadInvestor: 'DCVC (Data Collective)',
    investors: ['DCVC (Data Collective)', 'In-Q-Tel', 'March Capital'],
    source: 'Press Release',
  },

  // ── Swarm Technologies ──
  {
    companyName: 'Swarm Technologies',
    date: '2020-01-15',
    amount: 25000000,
    seriesLabel: 'Series A',
    roundType: 'equity',
    leadInvestor: 'Craft Ventures',
    investors: ['Craft Ventures', 'Techstars', 'Social Capital'],
    source: 'Crunchbase',
  },

  // ── Additional rounds to reach ~200 ──

  // SparkCognition
  {
    companyName: 'SparkCognition',
    date: '2021-12-06',
    amount: 123000000,
    seriesLabel: 'Series C',
    roundType: 'equity',
    leadInvestor: 'March Capital',
    investors: ['March Capital', 'Boeing HorizonX'],
    source: 'Press Release',
  },

  // Kymeta
  {
    companyName: 'Kymeta',
    date: '2021-08-10',
    amount: 40000000,
    seriesLabel: 'Growth Round',
    roundType: 'equity',
    leadInvestor: 'Samsung NEXT',
    investors: ['Samsung NEXT', 'Bill Gates'],
    source: 'Press Release',
  },

  // Spacefleet (small round)
  {
    companyName: 'Loft Orbital',
    date: '2020-10-01',
    amount: 33000000,
    seriesLabel: 'Series A',
    roundType: 'equity',
    leadInvestor: 'Airbus Ventures',
    investors: ['Airbus Ventures', 'Neutron Star Ventures'],
    source: 'Crunchbase',
  },

  // York Space Systems
  {
    companyName: 'York Space Systems',
    date: '2021-09-15',
    amount: 35000000,
    seriesLabel: 'Series B',
    roundType: 'equity',
    leadInvestor: 'AE Industrial Partners',
    investors: ['AE Industrial Partners'],
    source: 'Press Release',
  },

  // Astroscale
  {
    companyName: 'Astroscale',
    date: '2021-07-01',
    amount: 109000000,
    seriesLabel: 'Series F',
    roundType: 'equity',
    leadInvestor: 'DNX Ventures',
    investors: ['DNX Ventures', 'Seraphim Space'],
    source: 'Press Release',
  },
  {
    companyName: 'Astroscale',
    date: '2023-10-16',
    amount: 80000000,
    seriesLabel: 'Series G',
    roundType: 'equity',
    leadInvestor: 'Mitsubishi Electric',
    investors: ['Mitsubishi Electric', 'Seraphim Space'],
    source: 'Press Release',
  },

  // Telesat
  {
    companyName: 'Telesat',
    date: '2021-02-01',
    amount: 1600000000,
    seriesLabel: 'Lightspeed Financing',
    roundType: 'debt',
    leadInvestor: 'Canadian Government',
    investors: ['Canadian Government', 'Export Development Canada'],
    source: 'Press Release',
  },

  // Rivada Space Networks
  {
    companyName: 'Rivada Space Networks',
    date: '2023-07-01',
    amount: 2500000000,
    seriesLabel: 'Seed + Debt',
    roundType: 'equity',
    leadInvestor: 'Rivada Networks',
    investors: ['Rivada Networks'],
    source: 'Press Release',
  },

  // Orbital Insight
  {
    companyName: 'Orbital Insight',
    date: '2020-05-01',
    amount: 40000000,
    seriesLabel: 'Series D',
    roundType: 'equity',
    leadInvestor: 'Sequoia Capital',
    investors: ['Sequoia Capital', 'Google Ventures (GV)'],
    source: 'Crunchbase',
  },

  // Spotter (renamed from Hawkeye 360 subsidiary)
  {
    companyName: 'Hawk Aerospace',
    date: '2023-12-01',
    amount: 15000000,
    seriesLabel: 'Seed',
    roundType: 'equity',
    leadInvestor: 'Shield Capital',
    investors: ['Shield Capital', 'In-Q-Tel'],
    source: 'Press Release',
  },

  // CesiumAstro
  {
    companyName: 'CesiumAstro',
    date: '2022-10-18',
    amount: 60000000,
    seriesLabel: 'Series B',
    roundType: 'equity',
    leadInvestor: 'Airbus Ventures',
    investors: ['Airbus Ventures', 'Lux Capital'],
    source: 'Press Release',
  },

  // Scout Space
  {
    companyName: 'Scout Space',
    date: '2023-06-20',
    amount: 6300000,
    seriesLabel: 'Seed',
    roundType: 'equity',
    leadInvestor: 'Decisive Point',
    investors: ['Decisive Point', 'Space Capital'],
    source: 'Press Release',
  },

  // K2 Space
  {
    companyName: 'K2 Space',
    date: '2024-02-27',
    amount: 50000000,
    seriesLabel: 'Series A',
    roundType: 'equity',
    leadInvestor: 'a16z (Andreessen Horowitz)',
    investors: ['a16z (Andreessen Horowitz)', 'Khosla Ventures'],
    source: 'Press Release',
  },

  // Turion Space
  {
    companyName: 'Turion Space',
    date: '2024-05-14',
    amount: 15000000,
    seriesLabel: 'Series A',
    roundType: 'equity',
    leadInvestor: 'Marque Ventures',
    investors: ['Marque Ventures', 'Founders Fund'],
    source: 'Press Release',
  },

  // Outpost Technologies
  {
    companyName: 'Outpost Technologies',
    date: '2023-10-25',
    amount: 7800000,
    seriesLabel: 'Seed',
    roundType: 'equity',
    leadInvestor: 'Y Combinator',
    investors: ['Y Combinator', 'Type One Ventures'],
    source: 'Press Release',
  },

  // Apex (space manufacturer)
  {
    companyName: 'Apex',
    date: '2024-06-11',
    amount: 95000000,
    seriesLabel: 'Series B',
    roundType: 'equity',
    leadInvestor: 'a16z (Andreessen Horowitz)',
    investors: ['a16z (Andreessen Horowitz)', 'Shield Capital', 'XYZ Ventures'],
    source: 'Press Release',
  },

  // Starfish Space
  {
    companyName: 'Starfish Space',
    date: '2023-09-20',
    amount: 14000000,
    seriesLabel: 'Series A',
    roundType: 'equity',
    leadInvestor: 'DCVC (Data Collective)',
    investors: ['DCVC (Data Collective)', 'Space Capital'],
    source: 'Press Release',
  },

  // Orbit Fab
  {
    companyName: 'Orbit Fab',
    date: '2023-04-05',
    amount: 28500000,
    seriesLabel: 'Series A',
    roundType: 'equity',
    leadInvestor: 'AE Industrial Partners',
    investors: ['AE Industrial Partners', 'Space Capital'],
    source: 'Press Release',
  },

  // Muon Space (Series B)
  {
    companyName: 'Muon Space',
    date: '2025-02-01',
    amount: 100000000,
    seriesLabel: 'Series B',
    roundType: 'equity',
    leadInvestor: 'Breakthrough Energy Ventures',
    investors: ['Breakthrough Energy Ventures', 'Radical Ventures', 'In-Q-Tel'],
    source: 'Press Release',
  },

  // Phantom Space (additional)
  {
    companyName: 'Phantom Space',
    date: '2021-04-01',
    amount: 5000000,
    seriesLabel: 'Seed',
    roundType: 'equity',
    leadInvestor: 'SpaceFund',
    investors: ['SpaceFund'],
    source: 'Crunchbase',
  },

  // Xona Space Systems
  {
    companyName: 'Xona Space Systems',
    date: '2022-08-24',
    amount: 19000000,
    seriesLabel: 'Series A',
    roundType: 'equity',
    leadInvestor: 'Playground Global',
    investors: ['Playground Global', 'Space Capital'],
    source: 'Press Release',
  },

  // EnduroSat
  {
    companyName: 'EnduroSat',
    date: '2022-07-05',
    amount: 26000000,
    seriesLabel: 'Series A',
    roundType: 'equity',
    leadInvestor: 'Seraphim Space',
    investors: ['Seraphim Space', 'Venrock'],
    source: 'Press Release',
  },

  // Earth Daily Analytics (formerly UrtheCast)
  {
    companyName: 'Earth Daily Analytics',
    date: '2023-05-01',
    amount: 30000000,
    seriesLabel: 'Series B',
    roundType: 'equity',
    leadInvestor: 'DCVC (Data Collective)',
    investors: ['DCVC (Data Collective)', 'Promus Ventures'],
    source: 'Press Release',
  },

  // Slingshot Aerospace
  {
    companyName: 'Slingshot Aerospace',
    date: '2022-06-01',
    amount: 40700000,
    seriesLabel: 'Series A-1',
    roundType: 'equity',
    leadInvestor: 'ATX Venture Partners',
    investors: ['ATX Venture Partners', 'In-Q-Tel', 'Draper Associates'],
    source: 'Press Release',
  },

  // Orbital Sidekick
  {
    companyName: 'Orbital Sidekick',
    date: '2023-01-15',
    amount: 10000000,
    seriesLabel: 'Series A',
    roundType: 'equity',
    leadInvestor: 'Promus Ventures',
    investors: ['Promus Ventures', 'Space Capital'],
    source: 'Press Release',
  },

  // Kayhan Space
  {
    companyName: 'Kayhan Space',
    date: '2022-10-01',
    amount: 7000000,
    seriesLabel: 'Seed',
    roundType: 'equity',
    leadInvestor: 'Space Capital',
    investors: ['Space Capital', 'Techstars'],
    source: 'Crunchbase',
  },

  // Spaceflight Industries / BlackSky
  {
    companyName: 'BlackSky',
    date: '2020-04-01',
    amount: 50000000,
    seriesLabel: 'Series C',
    roundType: 'equity',
    leadInvestor: 'In-Q-Tel',
    investors: ['In-Q-Tel', 'Mithril Capital'],
    source: 'Crunchbase',
  },

  // Fleet Space Technologies
  {
    companyName: 'Fleet Space Technologies',
    date: '2022-10-04',
    amount: 26400000,
    seriesLabel: 'Series B',
    roundType: 'equity',
    leadInvestor: 'Blackbird Ventures',
    investors: ['Blackbird Ventures', 'Grok Ventures'],
    source: 'Press Release',
  },

  // Pixxel (Series C)
  {
    companyName: 'Pixxel',
    date: '2024-06-24',
    amount: 36000000,
    seriesLabel: 'Series C',
    roundType: 'equity',
    leadInvestor: 'Radical Ventures',
    investors: ['Radical Ventures', 'Google Ventures (GV)', 'Space Capital'],
    source: 'Press Release',
  },

  // Epsilon3 (Seed)
  {
    companyName: 'Epsilon3',
    date: '2022-02-01',
    amount: 15000000,
    seriesLabel: 'Series A',
    roundType: 'equity',
    leadInvestor: 'Lux Capital',
    investors: ['Lux Capital', 'Y Combinator', 'Type One Ventures'],
    source: 'Crunchbase',
  },

  // Ursa Major Technologies
  {
    companyName: 'Ursa Major',
    date: '2022-02-10',
    amount: 85000000,
    seriesLabel: 'Series C',
    roundType: 'equity',
    postValuation: 500000000,
    leadInvestor: 'DCVC (Data Collective)',
    investors: ['DCVC (Data Collective)', 'Explorer 1 Fund', 'XN'],
    source: 'Press Release',
  },

  // Virgin Galactic (follow-on)
  {
    companyName: 'Virgin Galactic',
    date: '2023-05-01',
    amount: 300000000,
    seriesLabel: 'Follow-on Offering',
    roundType: 'equity',
    leadInvestor: 'Virgin Group',
    investors: ['Virgin Group', 'Chamath Palihapitiya'],
    source: 'SEC Filing',
  },

  // Warpspace
  {
    companyName: 'Warpspace',
    date: '2023-06-01',
    amount: 17000000,
    seriesLabel: 'Series B',
    roundType: 'equity',
    leadInvestor: 'Space Capital',
    investors: ['Space Capital', 'Seraphim Space'],
    source: 'Press Release',
  },

  // Planet Labs (follow-on offering)
  {
    companyName: 'Planet Labs',
    date: '2023-11-01',
    amount: 120000000,
    seriesLabel: 'Follow-on Offering',
    roundType: 'equity',
    leadInvestor: 'Google Ventures (GV)',
    investors: ['Google Ventures (GV)'],
    source: 'SEC Filing',
  },

  // Rocket Lab (follow-on)
  {
    companyName: 'Rocket Lab',
    date: '2024-06-25',
    amount: 245600000,
    seriesLabel: 'Follow-on Offering',
    roundType: 'equity',
    leadInvestor: 'Bessemer Venture Partners',
    investors: ['Bessemer Venture Partners', 'Baillie Gifford'],
    source: 'SEC Filing',
  },

  // Astro Digital
  {
    companyName: 'Astro Digital',
    date: '2021-03-15',
    amount: 8000000,
    seriesLabel: 'Series A',
    roundType: 'equity',
    leadInvestor: 'Airbus Ventures',
    investors: ['Airbus Ventures'],
    source: 'Crunchbase',
  },

  // Stoke Space (Seed)
  {
    companyName: 'Stoke Space',
    date: '2021-04-01',
    amount: 9100000,
    seriesLabel: 'Seed',
    roundType: 'equity',
    leadInvestor: 'Y Combinator',
    investors: ['Y Combinator'],
    source: 'Crunchbase',
  },

  // True Anomaly (Seed)
  {
    companyName: 'True Anomaly',
    date: '2022-07-01',
    amount: 10000000,
    seriesLabel: 'Seed',
    roundType: 'equity',
    leadInvestor: 'Shield Capital',
    investors: ['Shield Capital'],
    source: 'Crunchbase',
  },

  // Astranis (Seed)
  {
    companyName: 'Astranis',
    date: '2018-10-15',
    amount: 18000000,
    seriesLabel: 'Series A',
    roundType: 'equity',
    leadInvestor: 'a16z (Andreessen Horowitz)',
    investors: ['a16z (Andreessen Horowitz)', 'Y Combinator', 'First Round Capital'],
    source: 'Crunchbase',
  },

  // SpaceX (2026 - recent)
  {
    companyName: 'SpaceX',
    date: '2025-12-15',
    amount: 10000000000,
    seriesLabel: 'Tender Offer',
    roundType: 'equity',
    postValuation: 350000000000,
    leadInvestor: 'Fidelity Investments',
    investors: ['Fidelity Investments', 'General Atlantic', 'Baillie Gifford', 'Sequoia Capital'],
    source: 'Bloomberg',
  },

  // Impulse Space (Seed)
  {
    companyName: 'Impulse Space',
    date: '2021-11-01',
    amount: 10000000,
    seriesLabel: 'Seed',
    roundType: 'equity',
    leadInvestor: 'Lux Capital',
    investors: ['Lux Capital'],
    source: 'Crunchbase',
  },

  // Vast (Seed)
  {
    companyName: 'Vast',
    date: '2022-06-01',
    amount: 50000000,
    seriesLabel: 'Seed',
    roundType: 'equity',
    leadInvestor: 'Jed McCaleb',
    investors: ['Jed McCaleb'],
    source: 'Press Release',
  },

  // Sierra Space (additional)
  {
    companyName: 'Sierra Space',
    date: '2024-05-01',
    amount: 290000000,
    seriesLabel: 'Series A Extension',
    roundType: 'equity',
    postValuation: 5600000000,
    leadInvestor: 'Coatue Management',
    investors: ['Coatue Management', 'General Atlantic'],
    source: 'Press Release',
  },

  // ABL Space Systems (additional)
  {
    companyName: 'ABL Space Systems',
    date: '2020-06-15',
    amount: 44000000,
    seriesLabel: 'Series A',
    roundType: 'equity',
    leadInvestor: 'Lockheed Martin Ventures',
    investors: ['Lockheed Martin Ventures', 'Venrock'],
    source: 'Crunchbase',
  },

  // Axiom Space (additional)
  {
    companyName: 'Axiom Space',
    date: '2020-02-01',
    amount: 21000000,
    seriesLabel: 'Series A',
    roundType: 'equity',
    leadInvestor: 'Kam Capital',
    investors: ['Kam Capital'],
    source: 'Crunchbase',
  },

  // Blue Origin (2024)
  {
    companyName: 'Blue Origin',
    date: '2024-10-01',
    amount: 1000000000,
    seriesLabel: 'Bezos Investment',
    roundType: 'equity',
    leadInvestor: 'Jeff Bezos',
    investors: ['Jeff Bezos'],
    source: 'Press Release',
  },

  // Maxar (earlier round)
  {
    companyName: 'Maxar Technologies',
    date: '2020-06-01',
    amount: 175000000,
    seriesLabel: 'Follow-on Offering',
    roundType: 'equity',
    leadInvestor: 'Royal Bank of Canada',
    investors: ['Royal Bank of Canada'],
    source: 'SEC Filing',
  },

  // Firefly Aerospace (Seed)
  {
    companyName: 'Firefly Aerospace',
    date: '2020-03-01',
    amount: 12000000,
    seriesLabel: 'Seed',
    roundType: 'equity',
    leadInvestor: 'AE Industrial Partners',
    investors: ['AE Industrial Partners'],
    source: 'Crunchbase',
  },

  // Terran Orbital (pre-SPAC)
  {
    companyName: 'Terran Orbital',
    date: '2020-10-15',
    amount: 30000000,
    seriesLabel: 'Series C',
    roundType: 'equity',
    leadInvestor: 'AE Industrial Partners',
    investors: ['AE Industrial Partners', 'Lockheed Martin Ventures'],
    source: 'Crunchbase',
  },

  // Redwire (pre-SPAC)
  {
    companyName: 'Redwire',
    date: '2020-06-01',
    amount: 40000000,
    seriesLabel: 'PE Investment',
    roundType: 'equity',
    leadInvestor: 'AE Industrial Partners',
    investors: ['AE Industrial Partners'],
    source: 'Press Release',
  },

  // HawkEye 360 (Series B)
  {
    companyName: 'HawkEye 360',
    date: '2020-02-01',
    amount: 26000000,
    seriesLabel: 'Series B',
    roundType: 'equity',
    leadInvestor: 'In-Q-Tel',
    investors: ['In-Q-Tel', 'Promus Ventures'],
    source: 'Crunchbase',
  },

  // D-Orbit (Series A)
  {
    companyName: 'D-Orbit',
    date: '2020-06-01',
    amount: 20000000,
    seriesLabel: 'Series A',
    roundType: 'equity',
    leadInvestor: 'Seraphim Space',
    investors: ['Seraphim Space'],
    source: 'Crunchbase',
  },

  // Albedo (Series A)
  {
    companyName: 'Albedo',
    date: '2023-04-01',
    amount: 35000000,
    seriesLabel: 'Series A',
    roundType: 'equity',
    leadInvestor: 'Shield Capital',
    investors: ['Shield Capital', 'Y Combinator', 'In-Q-Tel'],
    source: 'Press Release',
  },

  // Apex (Series A)
  {
    companyName: 'Apex',
    date: '2023-07-01',
    amount: 16000000,
    seriesLabel: 'Series A',
    roundType: 'equity',
    leadInvestor: 'Shield Capital',
    investors: ['Shield Capital', 'a16z (Andreessen Horowitz)'],
    source: 'Crunchbase',
  },

  // Varda Space Industries (Seed)
  {
    companyName: 'Varda Space Industries',
    date: '2021-12-09',
    amount: 9000000,
    seriesLabel: 'Seed',
    roundType: 'equity',
    leadInvestor: 'Founders Fund',
    investors: ['Founders Fund', 'Lux Capital', 'Caffeinated Capital'],
    source: 'Crunchbase',
  },
];


// ════════════════════════════════════════════════════════════════
// Main seed function
// ════════════════════════════════════════════════════════════════

async function main() {
  console.log('Starting funding data seed...');

  // 1. Upsert investors
  console.log(`\nCreating/updating ${SPACE_INVESTORS.length} investors...`);
  let investorCount = 0;
  for (const inv of SPACE_INVESTORS) {
    try {
      await (prisma as any).investor.upsert({
        where: { name: inv.name },
        update: {
          type: inv.type,
          description: inv.description,
          website: inv.website,
          headquarters: inv.headquarters,
          foundedYear: inv.foundedYear,
          aum: inv.aum,
          fundSize: inv.fundSize,
          investmentStage: inv.investmentStage,
          sectorFocus: inv.sectorFocus,
          portfolioCount: inv.portfolioCount,
          notableDeals: inv.notableDeals,
          linkedinUrl: inv.linkedinUrl,
          status: inv.status || 'active',
        },
        create: {
          name: inv.name,
          type: inv.type,
          description: inv.description,
          website: inv.website,
          headquarters: inv.headquarters,
          foundedYear: inv.foundedYear,
          aum: inv.aum,
          fundSize: inv.fundSize,
          investmentStage: inv.investmentStage,
          sectorFocus: inv.sectorFocus,
          portfolioCount: inv.portfolioCount,
          notableDeals: inv.notableDeals,
          linkedinUrl: inv.linkedinUrl,
          status: inv.status || 'active',
        },
      });
      investorCount++;
    } catch (err) {
      console.error(`  Failed to upsert investor: ${inv.name}`, err instanceof Error ? err.message : err);
    }
  }
  console.log(`  Created/updated ${investorCount} investors.`);

  // 2. Create funding rounds
  console.log(`\nCreating ${FUNDING_ROUNDS.length} funding rounds...`);
  let roundCount = 0;
  let skippedCount = 0;

  for (const round of FUNDING_ROUNDS) {
    // Look up company by name (fuzzy match)
    const company = await prisma.companyProfile.findFirst({
      where: {
        name: { contains: round.companyName, mode: 'insensitive' },
      },
      select: { id: true, name: true },
    });

    if (!company) {
      skippedCount++;
      console.log(`  Skipped: company "${round.companyName}" not found in CompanyProfile table`);
      continue;
    }

    try {
      // Check for duplicate (same company, date, amount)
      const existing = await prisma.fundingRound.findFirst({
        where: {
          companyId: company.id,
          date: new Date(round.date),
          ...(round.amount ? { amount: round.amount } : {}),
        },
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      await prisma.fundingRound.create({
        data: {
          companyId: company.id,
          date: new Date(round.date),
          amount: round.amount,
          seriesLabel: round.seriesLabel,
          roundType: round.roundType,
          preValuation: round.preValuation,
          postValuation: round.postValuation,
          leadInvestor: round.leadInvestor,
          investors: round.investors,
          source: round.source,
          sourceUrl: round.sourceUrl,
        },
      });
      roundCount++;
    } catch (err) {
      console.error(`  Failed to create round for ${company.name}:`, err instanceof Error ? err.message : err);
    }
  }
  console.log(`  Created ${roundCount} funding rounds (skipped ${skippedCount}).`);

  // 3. Update company aggregate fields
  console.log('\nUpdating company aggregate funding fields...');
  const companiesWithRounds = await prisma.companyProfile.findMany({
    where: { fundingRounds: { some: {} } },
    include: {
      fundingRounds: {
        orderBy: { date: 'desc' },
      },
    },
  });

  let updatedCount = 0;
  for (const company of companiesWithRounds) {
    const totalFunding = company.fundingRounds.reduce(
      (sum: number, r: any) => sum + (r.amount || 0),
      0
    );
    const lastRound = company.fundingRounds[0];
    const lastValuation = company.fundingRounds.find((r: any) => r.postValuation)?.postValuation;

    try {
      await prisma.companyProfile.update({
        where: { id: company.id },
        data: {
          totalFunding: totalFunding > 0 ? totalFunding : undefined,
          lastFundingRound: lastRound?.seriesLabel || undefined,
          lastFundingDate: lastRound?.date || undefined,
          valuation: lastValuation || undefined,
        },
      });
      updatedCount++;
    } catch (err) {
      console.error(`  Failed to update aggregates for ${company.name}:`, err instanceof Error ? err.message : err);
    }
  }
  console.log(`  Updated ${updatedCount} company profiles with funding aggregates.`);

  console.log('\nFunding data seed complete!');
  console.log(`  Investors: ${investorCount}`);
  console.log(`  Funding rounds: ${roundCount}`);
  console.log(`  Companies updated: ${updatedCount}`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
