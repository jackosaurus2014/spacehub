'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ExportButton from '@/components/ui/ExportButton';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import FAQSchema from '@/components/seo/FAQSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import AdSlot from '@/components/ads/AdSlot';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type FundingStage = 'Pre-Seed' | 'Seed' | 'Series A' | 'Series B' | 'Series C' | 'Series D+' | 'Public' | 'Acquired';
type StartupCategory = 'Launch' | 'Satellites' | 'Earth Observation' | 'In-Space Services' | 'Space Tourism' | 'Space Mining' | 'Manufacturing' | 'Defense' | 'Communications' | 'Propulsion' | 'Space Stations' | 'Software & Data' | 'Energy';

interface SpaceStartup {
  name: string;
  slug: string;
  description: string;
  category: StartupCategory;
  founded: number;
  headquarters: string;
  country: string;
  flag: string;
  fundingStage: FundingStage;
  totalFunding: string;
  valuation: string | null;
  employeeEstimate: string;
  keyInvestors: string[];
  website: string;
  isTrending: boolean;
  trendingReason?: string;
  isOneToWatch: boolean;
  oneToWatchReason?: string;
}

// ────────────────────────────────────────
// Startup Data (40+ entries)
// ────────────────────────────────────────

const STARTUPS: SpaceStartup[] = [
  // ── ONES TO WATCH (highlighted) ──
  {
    name: 'Stoke Space',
    slug: 'stoke-space',
    description: 'Developing the world\'s first fully and rapidly reusable rocket with a novel second-stage recovery approach using a heat-shield-equipped upper stage.',
    category: 'Launch',
    founded: 2019,
    headquarters: 'Kent, WA',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    fundingStage: 'Series B',
    totalFunding: '$175M',
    valuation: '$1B',
    employeeEstimate: '200-300',
    keyInvestors: ['Founders Fund', 'Breakthrough Energy Ventures', 'Industrious Ventures'],
    website: 'https://www.stokespace.com',
    isTrending: true,
    trendingReason: 'Successfully hot-fired full-scale upper stage with 30 engines in 2025',
    isOneToWatch: true,
    oneToWatchReason: 'Only company pursuing full second-stage reusability -- could transform launch economics',
  },
  {
    name: 'Varda Space Industries',
    slug: 'varda-space',
    description: 'Pioneer in space manufacturing, producing pharmaceuticals and advanced materials in microgravity with autonomous reentry capsules.',
    category: 'Manufacturing',
    founded: 2020,
    headquarters: 'El Segundo, CA',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    fundingStage: 'Series B',
    totalFunding: '$150M',
    valuation: '$500M',
    employeeEstimate: '80-120',
    keyInvestors: ['Khosla Ventures', 'Caffeinated Capital', 'General Catalyst', 'Founders Fund'],
    website: 'https://www.varda.com',
    isTrending: true,
    trendingReason: 'Successfully returned second manufacturing capsule from orbit in 2025',
    isOneToWatch: true,
    oneToWatchReason: 'First company to manufacture and return products from space commercially',
  },
  {
    name: 'K2 Space',
    slug: 'k2-space',
    description: 'Building very large, low-cost satellites for commercial and government customers using simplified architecture and commodity components.',
    category: 'Satellites',
    founded: 2022,
    headquarters: 'Los Angeles, CA',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    fundingStage: 'Series A',
    totalFunding: '$70M',
    valuation: '$300M',
    employeeEstimate: '60-100',
    keyInvestors: ['a16z', 'Founders Fund', 'Khosla Ventures'],
    website: 'https://www.k2space.com',
    isTrending: true,
    trendingReason: 'Raised major Series A in 2024 with top-tier VC backing',
    isOneToWatch: true,
    oneToWatchReason: 'Rethinking satellite design from first principles with SpaceX alumni leadership',
  },
  {
    name: 'AstroForge',
    slug: 'astroforge',
    description: 'Asteroid mining startup developing spacecraft to extract and refine platinum-group metals from near-Earth asteroids.',
    category: 'Space Mining',
    founded: 2022,
    headquarters: 'Huntington Beach, CA',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    fundingStage: 'Series A',
    totalFunding: '$55M',
    valuation: '$250M',
    employeeEstimate: '40-60',
    keyInvestors: ['Initialized Capital', 'Seven Seven Six (Alexis Ohanian)', 'EarthRise Technologies'],
    website: 'https://www.astroforge.io',
    isTrending: true,
    trendingReason: 'Launched asteroid flyby mission Odin in 2025',
    isOneToWatch: true,
    oneToWatchReason: 'Leading the asteroid mining race with actual flight hardware and missions',
  },
  {
    name: 'True Anomaly',
    slug: 'true-anomaly',
    description: 'Space security company developing autonomous spacecraft and software for orbital domain awareness and space defense.',
    category: 'Defense',
    founded: 2022,
    headquarters: 'Denver, CO',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    fundingStage: 'Series B',
    totalFunding: '$155M',
    valuation: '$800M',
    employeeEstimate: '150-200',
    keyInvestors: ['Riot Ventures', 'Eclipse', 'Venrock', 'Lockheed Martin Ventures'],
    website: 'https://www.trueanomaly.space',
    isTrending: true,
    trendingReason: 'Won multiple DoD contracts for space domain awareness in 2025',
    isOneToWatch: true,
    oneToWatchReason: 'Fastest-growing space defense startup backed by major defense primes',
  },
  {
    name: 'Albedo Space',
    slug: 'albedo-space',
    description: 'Very-low-Earth-orbit satellite company delivering unprecedented 10cm resolution commercial optical and thermal imagery.',
    category: 'Earth Observation',
    founded: 2020,
    headquarters: 'Denver, CO',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    fundingStage: 'Series B',
    totalFunding: '$170M',
    valuation: '$800M',
    employeeEstimate: '80-120',
    keyInvestors: ['Breakthrough Energy Ventures', 'Shield Capital', 'Cubit Capital', 'NVIDIA'],
    website: 'https://www.albedo.com',
    isTrending: true,
    trendingReason: 'Secured NVIDIA investment and major NRO contract in 2025',
    isOneToWatch: true,
    oneToWatchReason: 'Pushing the boundaries of commercial satellite resolution at 10cm -- game-changing for analytics',
  },

  // ── LAUNCH ──
  {
    name: 'Impulse Space',
    slug: 'impulse-space',
    description: 'In-space transportation company building orbital maneuvering vehicles and Mars transfer stages, founded by former SpaceX VP of propulsion.',
    category: 'Launch',
    founded: 2021,
    headquarters: 'Redondo Beach, CA',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    fundingStage: 'Series B',
    totalFunding: '$225M',
    valuation: '$1.2B',
    employeeEstimate: '120-180',
    keyInvestors: ['Founders Fund', 'RTX Ventures', 'Lux Capital'],
    website: 'https://www.impulsespace.com',
    isTrending: true,
    trendingReason: 'Completed first orbital mission with Mira vehicle in 2025',
    isOneToWatch: false,
  },
  {
    name: 'Isar Aerospace',
    slug: 'isar-aerospace',
    description: 'European launch company building the Spectrum rocket for dedicated small and medium satellite launches from multiple spaceports.',
    category: 'Launch',
    founded: 2018,
    headquarters: 'Ottobrunn, Germany',
    country: 'Germany',
    flag: '\u{1F1E9}\u{1F1EA}',
    fundingStage: 'Series C',
    totalFunding: '$310M',
    valuation: '$1.2B',
    employeeEstimate: '300-400',
    keyInvestors: ['Porsche SE', 'HV Capital', 'Lakestar', 'Lombard Odier'],
    website: 'https://www.isaraerospace.com',
    isTrending: false,
    isOneToWatch: false,
  },
  {
    name: 'Skyroot Aerospace',
    slug: 'skyroot-aerospace',
    description: 'India\'s first private company to launch a rocket to space, developing the Vikram series of launch vehicles with 3D-printed engines.',
    category: 'Launch',
    founded: 2018,
    headquarters: 'Hyderabad, India',
    country: 'India',
    flag: '\u{1F1EE}\u{1F1F3}',
    fundingStage: 'Series C',
    totalFunding: '$80M',
    valuation: '$350M',
    employeeEstimate: '250-350',
    keyInvestors: ['GIC Singapore', 'Google for Startups', 'Nexus Venture Partners'],
    website: 'https://www.skyroot.in',
    isTrending: true,
    trendingReason: 'Preparing Vikram-1 orbital launch attempt',
    isOneToWatch: false,
  },
  {
    name: 'Orbex',
    slug: 'orbex',
    description: 'European micro-launcher company developing the Prime rocket using bio-propane fuel from the new SaxaVord Spaceport in Scotland.',
    category: 'Launch',
    founded: 2015,
    headquarters: 'Forres, Scotland',
    country: 'UK',
    flag: '\u{1F1EC}\u{1F1E7}',
    fundingStage: 'Series C',
    totalFunding: '$100M',
    valuation: '$300M',
    employeeEstimate: '100-150',
    keyInvestors: ['BGF', 'Octopus Ventures', 'Jacobs Engineering'],
    website: 'https://orbex.space',
    isTrending: false,
    isOneToWatch: false,
  },
  {
    name: 'PLD Space',
    slug: 'pld-space',
    description: 'Spanish launch company that flew Europe\'s first private rocket (MIURA 1), developing reusable Miura 5 orbital vehicle.',
    category: 'Launch',
    founded: 2011,
    headquarters: 'Elche, Spain',
    country: 'Spain',
    flag: '\u{1F1EA}\u{1F1F8}',
    fundingStage: 'Series C',
    totalFunding: '$120M',
    valuation: '$500M',
    employeeEstimate: '120-180',
    keyInvestors: ['JME Ventures', 'Alantra', 'CDTI (Spanish govt)'],
    website: 'https://www.pldspace.com',
    isTrending: true,
    trendingReason: 'MIURA 5 orbital vehicle on track for 2026 debut',
    isOneToWatch: false,
  },
  {
    name: 'Agnikul Cosmos',
    slug: 'agnikul-cosmos',
    description: 'Indian startup building the world\'s first single-piece 3D-printed rocket engine, with customizable small launch vehicles.',
    category: 'Launch',
    founded: 2017,
    headquarters: 'Chennai, India',
    country: 'India',
    flag: '\u{1F1EE}\u{1F1F3}',
    fundingStage: 'Series B',
    totalFunding: '$50M',
    valuation: '$200M',
    employeeEstimate: '150-250',
    keyInvestors: ['Mayfield India', 'pi Ventures', 'ISRO (advisory)'],
    website: 'https://agnikul.in',
    isTrending: true,
    trendingReason: 'Completed first suborbital flight of Agnibaan SOrTeD',
    isOneToWatch: false,
  },
  {
    name: 'Latitude (formerly Venture Orbital Systems)',
    slug: 'latitude',
    description: 'French micro-launcher developing the Zephyr rocket to provide dedicated European small satellite access to orbit.',
    category: 'Launch',
    founded: 2019,
    headquarters: 'Reims, France',
    country: 'France',
    flag: '\u{1F1EB}\u{1F1F7}',
    fundingStage: 'Series A',
    totalFunding: '$50M',
    valuation: '$200M',
    employeeEstimate: '60-100',
    keyInvestors: ['Bpifrance', 'CNES', 'EQT Ventures'],
    website: 'https://www.latitude.eu',
    isTrending: false,
    isOneToWatch: false,
  },

  // ── SATELLITES ──
  {
    name: 'Apex',
    slug: 'apex-space',
    description: 'Satellite bus manufacturer building standardized spacecraft platforms (Aries) for faster and cheaper satellite delivery.',
    category: 'Satellites',
    founded: 2022,
    headquarters: 'Los Angeles, CA',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    fundingStage: 'Series B',
    totalFunding: '$120M',
    valuation: '$750M',
    employeeEstimate: '100-150',
    keyInvestors: ['XYZ Venture Capital', 'Shield Capital', 'Andreessen Horowitz'],
    website: 'https://www.apex.aero',
    isTrending: true,
    trendingReason: 'Delivered first Aries satellite buses to customers in record time',
    isOneToWatch: false,
  },
  {
    name: 'Astranis',
    slug: 'astranis',
    description: 'Building small, low-cost GEO broadband satellites that serve individual countries or regions, disrupting the traditional telecom satellite market.',
    category: 'Satellites',
    founded: 2015,
    headquarters: 'San Francisco, CA',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    fundingStage: 'Series C',
    totalFunding: '$500M',
    valuation: '$3.2B',
    employeeEstimate: '350-450',
    keyInvestors: ['a16z', 'BlackRock', 'Venrock'],
    website: 'https://www.astranis.com',
    isTrending: false,
    isOneToWatch: false,
  },

  // ── EARTH OBSERVATION ──
  {
    name: 'Pixxel',
    slug: 'pixxel',
    description: 'Indian hyperspectral imaging company deploying a constellation of satellites for detailed environmental and agricultural monitoring.',
    category: 'Earth Observation',
    founded: 2019,
    headquarters: 'Bangalore, India',
    country: 'India',
    flag: '\u{1F1EE}\u{1F1F3}',
    fundingStage: 'Series B',
    totalFunding: '$70M',
    valuation: '$300M',
    employeeEstimate: '120-180',
    keyInvestors: ['Google', 'Radical Ventures', 'Blume Ventures', 'Omnivore Partners'],
    website: 'https://www.pixxel.space',
    isTrending: true,
    trendingReason: 'Launched first batch of Firefly hyperspectral constellation',
    isOneToWatch: false,
  },
  {
    name: 'Muon Space',
    slug: 'muon-space',
    description: 'Climate monitoring satellite company building multi-sensor constellations for wildfire detection, weather, and environmental intelligence.',
    category: 'Earth Observation',
    founded: 2021,
    headquarters: 'Mountain View, CA',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    fundingStage: 'Series B',
    totalFunding: '$82M',
    valuation: '$400M',
    employeeEstimate: '80-110',
    keyInvestors: ['Innovation Endeavors', 'Costanoa Ventures', 'Congruent Ventures'],
    website: 'https://www.muonspace.com',
    isTrending: false,
    isOneToWatch: false,
  },
  {
    name: 'Umbra',
    slug: 'umbra-space',
    description: 'SAR satellite company providing the highest resolution commercially available synthetic aperture radar imagery on-demand.',
    category: 'Earth Observation',
    founded: 2015,
    headquarters: 'Santa Barbara, CA',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    fundingStage: 'Series C',
    totalFunding: '$160M',
    valuation: '$600M',
    employeeEstimate: '100-150',
    keyInvestors: ['Spark Capital', 'Lockheed Martin Ventures', 'True Ventures'],
    website: 'https://umbra.space',
    isTrending: false,
    isOneToWatch: false,
  },
  {
    name: 'ICEYE',
    slug: 'iceye',
    description: 'Finnish SAR satellite operator with the world\'s largest commercial synthetic aperture radar constellation, focused on disaster response and defense.',
    category: 'Earth Observation',
    founded: 2014,
    headquarters: 'Espoo, Finland',
    country: 'Finland',
    flag: '\u{1F1EB}\u{1F1EE}',
    fundingStage: 'Series D+',
    totalFunding: '$380M',
    valuation: '$1.6B',
    employeeEstimate: '500-700',
    keyInvestors: ['Seraphim Space', 'BAE Systems', 'True Ventures'],
    website: 'https://www.iceye.com',
    isTrending: false,
    isOneToWatch: false,
  },
  {
    name: 'Orbital Sidekick',
    slug: 'orbital-sidekick',
    description: 'Hyperspectral satellite company detecting methane emissions, pipeline leaks, and infrastructure anomalies from space.',
    category: 'Earth Observation',
    founded: 2016,
    headquarters: 'San Francisco, CA',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    fundingStage: 'Series B',
    totalFunding: '$40M',
    valuation: '$180M',
    employeeEstimate: '40-60',
    keyInvestors: ['Playground Global', 'Decisive Point', 'True Ventures'],
    website: 'https://www.orbitalsidekick.com',
    isTrending: false,
    isOneToWatch: false,
  },
  {
    name: 'Capella Space',
    slug: 'capella-space',
    description: 'SAR satellite operator providing all-weather, day-and-night Earth observation with sub-meter resolution for defense and commercial customers.',
    category: 'Earth Observation',
    founded: 2016,
    headquarters: 'San Francisco, CA',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    fundingStage: 'Series C',
    totalFunding: '$230M',
    valuation: '$1B',
    employeeEstimate: '150-250',
    keyInvestors: ['NVP', 'DCVC', 'Spark Capital'],
    website: 'https://www.capellaspace.com',
    isTrending: false,
    isOneToWatch: false,
  },

  // ── IN-SPACE SERVICES ──
  {
    name: 'Astroscale',
    slug: 'astroscale',
    description: 'Global leader in on-orbit servicing and debris removal, developing commercial solutions for space sustainability with active missions.',
    category: 'In-Space Services',
    founded: 2013,
    headquarters: 'Tokyo, Japan',
    country: 'Japan',
    flag: '\u{1F1EF}\u{1F1F5}',
    fundingStage: 'Series D+',
    totalFunding: '$400M',
    valuation: '$1.5B',
    employeeEstimate: '300-400',
    keyInvestors: ['SPARX Group', 'DNX Ventures', 'Seraphim Space'],
    website: 'https://astroscale.com',
    isTrending: true,
    trendingReason: 'ADRAS-J debris inspection mission confirmed success, preparing removal demo',
    isOneToWatch: false,
  },
  {
    name: 'Orbit Fab',
    slug: 'orbit-fab',
    description: 'Building the first gas stations in space -- in-orbit refueling infrastructure for satellites and spacecraft using the RAFTI fueling interface.',
    category: 'In-Space Services',
    founded: 2018,
    headquarters: 'San Francisco, CA',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    fundingStage: 'Series A',
    totalFunding: '$35M',
    valuation: '$150M',
    employeeEstimate: '40-60',
    keyInvestors: ['SpaceFund', 'Munich Re Ventures', 'U.S. Space Force'],
    website: 'https://www.orbitfab.com',
    isTrending: false,
    isOneToWatch: false,
  },
  {
    name: 'Starfish Space',
    slug: 'starfish-space',
    description: 'On-orbit servicing company developing the Otter spacecraft for satellite life extension, repositioning, and debris capture.',
    category: 'In-Space Services',
    founded: 2019,
    headquarters: 'Kent, WA',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    fundingStage: 'Series A',
    totalFunding: '$65M',
    valuation: '$300M',
    employeeEstimate: '40-60',
    keyInvestors: ['MaC Venture Capital', 'NFX', 'PSL Ventures'],
    website: 'https://www.starfishspace.com',
    isTrending: false,
    isOneToWatch: false,
  },
  {
    name: 'ClearSpace',
    slug: 'clearspace',
    description: 'Swiss debris removal company developing ESA-backed missions to capture and deorbit defunct satellites using robotic arms.',
    category: 'In-Space Services',
    founded: 2018,
    headquarters: 'Lausanne, Switzerland',
    country: 'Switzerland',
    flag: '\u{1F1E8}\u{1F1ED}',
    fundingStage: 'Series B',
    totalFunding: '$60M',
    valuation: '$250M',
    employeeEstimate: '60-80',
    keyInvestors: ['Lakestar', 'OTB Ventures', 'ESA (contract)'],
    website: 'https://clearspace.today',
    isTrending: false,
    isOneToWatch: false,
  },
  {
    name: 'Turion Space',
    slug: 'turion-space',
    description: 'Space domain awareness and debris remediation company building inspection, characterization, and removal spacecraft.',
    category: 'In-Space Services',
    founded: 2020,
    headquarters: 'Irvine, CA',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    fundingStage: 'Series A',
    totalFunding: '$30M',
    valuation: '$150M',
    employeeEstimate: '30-50',
    keyInvestors: ['Founders Fund', 'Draper Associates', 'RTX Ventures'],
    website: 'https://www.turionspace.com',
    isTrending: true,
    trendingReason: 'Won USSF contract for on-orbit inspection demo mission',
    isOneToWatch: false,
  },
  {
    name: 'Inversion Space',
    slug: 'inversion-space',
    description: 'Space logistics company developing reentry capsules for rapid point-to-point delivery of cargo from orbit to anywhere on Earth.',
    category: 'In-Space Services',
    founded: 2021,
    headquarters: 'Torrance, CA',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    fundingStage: 'Series A',
    totalFunding: '$71M',
    valuation: '$300M',
    employeeEstimate: '40-60',
    keyInvestors: ['Spark Capital', 'Two Sigma Ventures', 'Lockheed Martin Ventures'],
    website: 'https://www.inversionspace.com',
    isTrending: false,
    isOneToWatch: false,
  },

  // ── SPACE TOURISM ──
  {
    name: 'Space Perspective',
    slug: 'space-perspective',
    description: 'Offering gentle stratospheric balloon flights to the edge of space aboard Spaceship Neptune, a luxury pressurized capsule.',
    category: 'Space Tourism',
    founded: 2019,
    headquarters: 'Titusville, FL',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    fundingStage: 'Series B',
    totalFunding: '$115M',
    valuation: '$500M',
    employeeEstimate: '80-120',
    keyInvestors: ['One Small Step Fund', 'Prime Movers Lab', 'Fischer Group'],
    website: 'https://spaceperspective.com',
    isTrending: true,
    trendingReason: 'Conducting uncrewed test flights, commercial flights expected 2026',
    isOneToWatch: false,
  },

  // ── SPACE MINING ──
  {
    name: 'Interlune',
    slug: 'interlune',
    description: 'Lunar resource company focused on extracting helium-3 from the Moon for fusion energy, quantum computing, and medical imaging.',
    category: 'Space Mining',
    founded: 2022,
    headquarters: 'Seattle, WA',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    fundingStage: 'Seed',
    totalFunding: '$18M',
    valuation: '$80M',
    employeeEstimate: '20-30',
    keyInvestors: ['Seven Seven Six', 'Soma Capital', 'Type One Ventures'],
    website: 'https://www.interlune.space',
    isTrending: false,
    isOneToWatch: false,
  },
  {
    name: 'TransAstra',
    slug: 'transastra',
    description: 'Space mining company developing optical mining technology using concentrated sunlight to extract resources from asteroids.',
    category: 'Space Mining',
    founded: 2015,
    headquarters: 'Lake View Terrace, CA',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    fundingStage: 'Series A',
    totalFunding: '$35M',
    valuation: '$150M',
    employeeEstimate: '25-40',
    keyInvestors: ['Deep Ventures', 'Armada Investment AG', 'NASA (SBIR/NIAC)'],
    website: 'https://www.transastra.com',
    isTrending: false,
    isOneToWatch: false,
  },

  // ── MANUFACTURING ──
  {
    name: 'Space Forge',
    slug: 'space-forge',
    description: 'UK company developing returnable and reusable satellite platforms for manufacturing advanced semiconductors and alloys in microgravity.',
    category: 'Manufacturing',
    founded: 2018,
    headquarters: 'Cardiff, Wales',
    country: 'UK',
    flag: '\u{1F1EC}\u{1F1E7}',
    fundingStage: 'Series A',
    totalFunding: '$25M',
    valuation: '$100M',
    employeeEstimate: '50-70',
    keyInvestors: ['Type One Ventures', 'In-Q-Tel', 'UK Space Agency'],
    website: 'https://www.spaceforge.co.uk',
    isTrending: false,
    isOneToWatch: false,
  },
  {
    name: 'Orbital Matter',
    slug: 'orbital-matter',
    description: 'Polish startup developing autonomous in-orbit 3D printing technology for constructing spacecraft components and structures in space.',
    category: 'Manufacturing',
    founded: 2021,
    headquarters: 'Warsaw, Poland',
    country: 'Poland',
    flag: '\u{1F1F5}\u{1F1F1}',
    fundingStage: 'Seed',
    totalFunding: '$5M',
    valuation: null,
    employeeEstimate: '15-25',
    keyInvestors: ['European Space Agency', 'SMOK Ventures', 'PKO VC'],
    website: 'https://www.orbitalmatter.com',
    isTrending: false,
    isOneToWatch: false,
  },

  // ── DEFENSE ──
  {
    name: 'HawkEye 360',
    slug: 'hawkeye360',
    description: 'RF geospatial analytics company using satellite clusters to detect, characterize, and geolocate radio frequency signals worldwide.',
    category: 'Defense',
    founded: 2015,
    headquarters: 'Herndon, VA',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    fundingStage: 'Series D+',
    totalFunding: '$300M',
    valuation: '$1.3B',
    employeeEstimate: '180-250',
    keyInvestors: ['Insight Partners', 'NightDragon', 'Adage Capital'],
    website: 'https://www.he360.com',
    isTrending: false,
    isOneToWatch: false,
  },
  {
    name: 'Scout Space',
    slug: 'scout-space',
    description: 'Space domain awareness company deploying AI-powered orbital sensors for real-time tracking and characterization of objects in space.',
    category: 'Defense',
    founded: 2019,
    headquarters: 'Arlington, VA',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    fundingStage: 'Series A',
    totalFunding: '$25M',
    valuation: '$120M',
    employeeEstimate: '30-50',
    keyInvestors: ['Draper Associates', 'Techstars', 'Space Capital'],
    website: 'https://www.scout.space',
    isTrending: false,
    isOneToWatch: false,
  },

  // ── COMMUNICATIONS ──
  {
    name: 'Aalyria Technologies',
    slug: 'aalyria',
    description: 'Google spinoff developing laser communications (Tightbeam) and AI network orchestration (Spacetime) for seamless space-terrestrial networks.',
    category: 'Communications',
    founded: 2022,
    headquarters: 'Livermore, CA',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    fundingStage: 'Series A',
    totalFunding: '$100M',
    valuation: '$600M',
    employeeEstimate: '80-120',
    keyInvestors: ['J2 Ventures', 'Crosslink Capital', 'Anthem Venture Partners'],
    website: 'https://www.aalyria.com',
    isTrending: true,
    trendingReason: 'Awarded $100M+ DoD DEUCSI contract for comms architecture',
    isOneToWatch: false,
  },
  {
    name: 'Hubble Network',
    slug: 'hubble-network',
    description: 'World\'s first company to achieve direct Bluetooth-to-satellite connectivity, enabling IoT devices to communicate via LEO satellites.',
    category: 'Communications',
    founded: 2021,
    headquarters: 'Seattle, WA',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    fundingStage: 'Series A',
    totalFunding: '$30M',
    valuation: '$150M',
    employeeEstimate: '30-45',
    keyInvestors: ['a16z', 'Transpose Platform', 'Type One Ventures'],
    website: 'https://www.hubblenetwork.com',
    isTrending: true,
    trendingReason: 'Demonstrated first-ever Bluetooth signal from space',
    isOneToWatch: false,
  },
  {
    name: 'Sateliot',
    slug: 'sateliot',
    description: 'Spanish nanosatellite operator deploying the first 5G NB-IoT constellation for massive global IoT connectivity.',
    category: 'Communications',
    founded: 2018,
    headquarters: 'Barcelona, Spain',
    country: 'Spain',
    flag: '\u{1F1EA}\u{1F1F8}',
    fundingStage: 'Series B',
    totalFunding: '$60M',
    valuation: '$250M',
    employeeEstimate: '50-70',
    keyInvestors: ['Indico Capital', 'Kibo Ventures', 'Caixa Capital Risc'],
    website: 'https://www.sateliot.com',
    isTrending: false,
    isOneToWatch: false,
  },
  {
    name: 'CesiumAstro',
    slug: 'cesiumastro',
    description: 'Active phased array antenna manufacturer providing multi-beam communications for satellites, aircraft, and UAVs.',
    category: 'Communications',
    founded: 2017,
    headquarters: 'Austin, TX',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    fundingStage: 'Series C',
    totalFunding: '$130M',
    valuation: '$500M',
    employeeEstimate: '150-250',
    keyInvestors: ['Airbus Ventures', 'RTX Ventures', 'Kleiner Perkins'],
    website: 'https://www.cesiumastro.com',
    isTrending: false,
    isOneToWatch: false,
  },

  // ── PROPULSION ──
  {
    name: 'Pulsar Fusion',
    slug: 'pulsar-fusion',
    description: 'UK propulsion company developing nuclear fusion rocket engines that could enable 30-day trips to Mars, using machine learning for plasma control.',
    category: 'Propulsion',
    founded: 2011,
    headquarters: 'Bletchley, UK',
    country: 'UK',
    flag: '\u{1F1EC}\u{1F1E7}',
    fundingStage: 'Series A',
    totalFunding: '$20M',
    valuation: '$100M',
    employeeEstimate: '40-60',
    keyInvestors: ['UK Space Agency', 'British Business Bank', 'private angels'],
    website: 'https://www.pulsarfusion.com',
    isTrending: true,
    trendingReason: 'Partnered with Princeton Satellite Systems for fusion plasma modeling',
    isOneToWatch: false,
  },
  {
    name: 'Morpheus Space',
    slug: 'morpheus-space',
    description: 'German electric propulsion company providing scalable ion thruster systems for satellite constellations and orbital maneuvering.',
    category: 'Propulsion',
    founded: 2018,
    headquarters: 'Dresden, Germany',
    country: 'Germany',
    flag: '\u{1F1E9}\u{1F1EA}',
    fundingStage: 'Series B',
    totalFunding: '$50M',
    valuation: '$200M',
    employeeEstimate: '70-100',
    keyInvestors: ['Alpine Space Ventures', 'Vsquared Ventures', 'DTCP'],
    website: 'https://www.morpheus-space.com',
    isTrending: false,
    isOneToWatch: false,
  },
  {
    name: 'Exotrail',
    slug: 'exotrail',
    description: 'French space mobility company providing Hall-effect electric propulsion systems and mission software for small satellite operators.',
    category: 'Propulsion',
    founded: 2017,
    headquarters: 'Massy, France',
    country: 'France',
    flag: '\u{1F1EB}\u{1F1F7}',
    fundingStage: 'Series C',
    totalFunding: '$90M',
    valuation: '$350M',
    employeeEstimate: '120-170',
    keyInvestors: ['Eurazeo', 'Bpifrance', '360 Capital'],
    website: 'https://www.exotrail.com',
    isTrending: false,
    isOneToWatch: false,
  },

  // ── SPACE STATIONS ──
  {
    name: 'Vast',
    slug: 'vast-space',
    description: 'Building Haven-1, the world\'s first commercial space station with artificial gravity capabilities for long-duration human spaceflight.',
    category: 'Space Stations',
    founded: 2021,
    headquarters: 'Long Beach, CA',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    fundingStage: 'Series A',
    totalFunding: '$400M',
    valuation: '$1.2B',
    employeeEstimate: '200-300',
    keyInvestors: ['Jed McCaleb (founder-funded)', 'private investors'],
    website: 'https://www.vastspace.com',
    isTrending: true,
    trendingReason: 'Haven-1 on track for 2026 launch aboard SpaceX Falcon 9',
    isOneToWatch: false,
  },
  {
    name: 'Max Space',
    slug: 'max-space',
    description: 'Developing expandable inflatable space habitat modules that are 100x the volume of rigid modules, for commercial space stations.',
    category: 'Space Stations',
    founded: 2022,
    headquarters: 'San Mateo, CA',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    fundingStage: 'Series A',
    totalFunding: '$46M',
    valuation: '$200M',
    employeeEstimate: '30-50',
    keyInvestors: ['8090 Partners', 'Real Ventures', 'Boost VC'],
    website: 'https://www.maxspace.com',
    isTrending: false,
    isOneToWatch: false,
  },

  // ── SOFTWARE & DATA ──
  {
    name: 'Epsilon3',
    slug: 'epsilon3',
    description: 'Operating system for spacecraft and launch vehicle operations, replacing paper procedures with collaborative real-time software.',
    category: 'Software & Data',
    founded: 2021,
    headquarters: 'Los Angeles, CA',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    fundingStage: 'Series B',
    totalFunding: '$50M',
    valuation: '$200M',
    employeeEstimate: '40-60',
    keyInvestors: ['Lux Capital', 'a16z', 'Y Combinator'],
    website: 'https://www.epsilon3.io',
    isTrending: false,
    isOneToWatch: false,
  },
  {
    name: 'Privateer Space',
    slug: 'privateer',
    description: 'Space sustainability platform providing open-access data on orbital objects for traffic coordination and collision avoidance.',
    category: 'Software & Data',
    founded: 2021,
    headquarters: 'Maui, HI',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    fundingStage: 'Series A',
    totalFunding: '$80M',
    valuation: '$300M',
    employeeEstimate: '50-70',
    keyInvestors: ['Steve Wozniak (co-founder)', 'Standard Industries', 'Karman+'],
    website: 'https://www.privateer.com',
    isTrending: false,
    isOneToWatch: false,
  },

  // ── ENERGY ──
  {
    name: 'Aetherflux',
    slug: 'aetherflux',
    description: 'Developing space-based solar power infrastructure and orbital data centers, backed by major semiconductor investors.',
    category: 'Energy',
    founded: 2023,
    headquarters: 'Silicon Valley, CA',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    fundingStage: 'Seed',
    totalFunding: '$50M',
    valuation: '$250M',
    employeeEstimate: '25-40',
    keyInvestors: ['Nvidia', 'Peter Thiel', 'Founders Fund'],
    website: 'https://www.aetherflux.com',
    isTrending: true,
    trendingReason: 'Raised $50M seed round with Nvidia backing for orbital compute',
    isOneToWatch: false,
  },
  {
    name: 'Reflect Orbital',
    slug: 'reflect-orbital',
    description: 'Using orbital reflectors to extend sunlight hours for solar farms on Earth, potentially adding hours of productive solar generation.',
    category: 'Energy',
    founded: 2022,
    headquarters: 'Los Angeles, CA',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    fundingStage: 'Seed',
    totalFunding: '$5M',
    valuation: null,
    employeeEstimate: '10-20',
    keyInvestors: ['Y Combinator', 'climate-focused angels'],
    website: 'https://www.reflectorbital.com',
    isTrending: false,
    isOneToWatch: false,
  },
  {
    name: 'Star Catcher Industries',
    slug: 'star-catcher',
    description: 'Building orbital power grids with wireless energy transmission between satellites, enabling power-as-a-service in space.',
    category: 'Energy',
    founded: 2022,
    headquarters: 'Denver, CO',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    fundingStage: 'Seed',
    totalFunding: '$12M',
    valuation: null,
    employeeEstimate: '15-25',
    keyInvestors: ['Space Capital', 'Embedded Ventures', 'Lockheed Martin Ventures'],
    website: 'https://www.starcatcher.space',
    isTrending: false,
    isOneToWatch: false,
  },

  // ── ADDITIONAL ──
  {
    name: 'Lumen Orbit',
    slug: 'lumen-orbit',
    description: 'Space-based data center company developing orbital computing infrastructure for AI workloads where energy and cooling are abundant.',
    category: 'Software & Data',
    founded: 2023,
    headquarters: 'San Francisco, CA',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    fundingStage: 'Seed',
    totalFunding: '$11M',
    valuation: null,
    employeeEstimate: '10-20',
    keyInvestors: ['Founders Fund', 'Y Combinator'],
    website: 'https://www.lumenorbit.com',
    isTrending: true,
    trendingReason: 'Part of growing orbital data center trend backed by hyperscalers',
    isOneToWatch: false,
  },
  {
    name: 'Digantara',
    slug: 'digantara',
    description: 'Indian space situational awareness company building space-based and ground sensor networks for comprehensive debris and object tracking.',
    category: 'Defense',
    founded: 2018,
    headquarters: 'Bangalore, India',
    country: 'India',
    flag: '\u{1F1EE}\u{1F1F3}',
    fundingStage: 'Series A',
    totalFunding: '$16M',
    valuation: '$80M',
    employeeEstimate: '50-70',
    keyInvestors: ['Peak XV Partners', 'Kalaari Capital', 'Indian Angel Network'],
    website: 'https://www.digantara.com',
    isTrending: false,
    isOneToWatch: false,
  },
  {
    name: 'Vyoma',
    slug: 'vyoma',
    description: 'German space traffic management company providing automated collision avoidance and space sustainability monitoring services.',
    category: 'Software & Data',
    founded: 2020,
    headquarters: 'Darmstadt, Germany',
    country: 'Germany',
    flag: '\u{1F1E9}\u{1F1EA}',
    fundingStage: 'Series A',
    totalFunding: '$14M',
    valuation: '$60M',
    employeeEstimate: '30-40',
    keyInvestors: ['Earlybird', 'Vsquared Ventures', 'ESA BIC'],
    website: 'https://www.vyoma.space',
    isTrending: false,
    isOneToWatch: false,
  },
];

// ────────────────────────────────────────
// Constants
// ────────────────────────────────────────

const ALL_CATEGORIES: StartupCategory[] = [
  'Launch', 'Satellites', 'Earth Observation', 'In-Space Services',
  'Space Tourism', 'Space Mining', 'Manufacturing', 'Defense',
  'Communications', 'Propulsion', 'Space Stations', 'Software & Data', 'Energy',
];

const CATEGORY_ICONS: Record<StartupCategory, string> = {
  'Launch': '\u{1F680}',
  'Satellites': '\u{1F4E1}',
  'Earth Observation': '\u{1F30D}',
  'In-Space Services': '\u{1F6E0}\u{FE0F}',
  'Space Tourism': '\u{2708}\u{FE0F}',
  'Space Mining': '\u{26CF}\u{FE0F}',
  'Manufacturing': '\u{1F3ED}',
  'Defense': '\u{1F6E1}\u{FE0F}',
  'Communications': '\u{1F4F6}',
  'Propulsion': '\u{26A1}',
  'Space Stations': '\u{1F6F0}\u{FE0F}',
  'Software & Data': '\u{1F4BB}',
  'Energy': '\u{2600}\u{FE0F}',
};

const FUNDING_STAGE_COLORS: Record<FundingStage, { bg: string; text: string }> = {
  'Pre-Seed': { bg: 'bg-slate-500/20', text: 'text-slate-400' },
  'Seed': { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  'Series A': { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  'Series B': { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  'Series C': { bg: 'bg-green-500/20', text: 'text-green-400' },
  'Series D+': { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  'Public': { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  'Acquired': { bg: 'bg-rose-500/20', text: 'text-rose-400' },
};

const FUNDING_STAGES: FundingStage[] = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D+', 'Public', 'Acquired'];

// ────────────────────────────────────────
// Components
// ────────────────────────────────────────

function FundingBadge({ stage }: { stage: FundingStage }) {
  const colors = FUNDING_STAGE_COLORS[stage];
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>
      {stage}
    </span>
  );
}

function TrendingBadge({ reason }: { reason?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-orange-500/20 text-orange-400"
      title={reason}
    >
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
      </svg>
      Hot
    </span>
  );
}

function StartupCard({ startup }: { startup: SpaceStartup }) {
  const [expanded, setExpanded] = useState(false);
  const profileUrl = `/company-profiles/${startup.slug}`;

  return (
    <div className={`card p-5 transition-all hover:border-nebula-500/40 ${startup.isOneToWatch ? 'ring-1 ring-yellow-500/30 border-yellow-500/20' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={profileUrl} className="font-semibold text-white hover:text-nebula-200 transition-colors text-lg">
              {startup.name}
            </Link>
            {startup.isTrending && <TrendingBadge reason={startup.trendingReason} />}
            {startup.isOneToWatch && (
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                One to Watch
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-slate-400">
            <span>{startup.flag}</span>
            <span>{startup.headquarters}</span>
            <span className="text-slate-600">|</span>
            <span>Est. {startup.founded}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className={`text-xs font-medium px-2 py-0.5 rounded bg-slate-700/50 text-slate-300`}>
            {CATEGORY_ICONS[startup.category]} {startup.category}
          </span>
          <FundingBadge stage={startup.fundingStage} />
        </div>
      </div>

      {/* Description */}
      <p className="text-slate-400 text-sm mb-3 leading-relaxed">{startup.description}</p>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider">Funding</div>
          <div className="text-white font-medium text-sm">{startup.totalFunding}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider">Valuation</div>
          <div className="text-white font-medium text-sm">{startup.valuation || 'Undisclosed'}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider">Employees</div>
          <div className="text-white font-medium text-sm">{startup.employeeEstimate}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider">Founded</div>
          <div className="text-white font-medium text-sm">{startup.founded}</div>
        </div>
      </div>

      {/* Trending Reason */}
      {startup.isTrending && startup.trendingReason && (
        <div className="text-xs text-orange-400/80 bg-orange-500/10 rounded px-3 py-1.5 mb-3 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
          </svg>
          {startup.trendingReason}
        </div>
      )}

      {/* Expandable Investors Section */}
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-nebula-300 hover:text-nebula-200 transition-colors flex items-center gap-1"
        >
          <svg className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          Key Investors ({startup.keyInvestors.length})
        </button>
        {expanded && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {startup.keyInvestors.map((investor) => (
              <span key={investor} className="text-xs bg-slate-700/40 text-slate-300 px-2 py-1 rounded">
                {investor}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Links */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-700/50">
        <Link href={profileUrl} className="text-xs text-nebula-300 hover:text-nebula-200 transition-colors">
          Full Profile
        </Link>
        <a href={startup.website} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-slate-300 transition-colors">
          Website
        </a>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Main Content
// ────────────────────────────────────────

function StartupTrackerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [selectedCategory, setSelectedCategory] = useState<StartupCategory | ''>(
    (searchParams.get('category') as StartupCategory | '') || ''
  );
  const [selectedStage, setSelectedStage] = useState<FundingStage | ''>(
    (searchParams.get('stage') as FundingStage | '') || ''
  );
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [showTrendingOnly, setShowTrendingOnly] = useState(searchParams.get('trending') === 'true');
  const [sortBy, setSortBy] = useState<'name' | 'founded' | 'funding'>(
    (searchParams.get('sort') as 'name' | 'founded' | 'funding') || 'name'
  );

  // Filter and sort startups
  const filteredStartups = useMemo(() => {
    let results = [...STARTUPS];

    if (selectedCategory) {
      results = results.filter((s) => s.category === selectedCategory);
    }
    if (selectedStage) {
      results = results.filter((s) => s.fundingStage === selectedStage);
    }
    if (showTrendingOnly) {
      results = results.filter((s) => s.isTrending);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.headquarters.toLowerCase().includes(q) ||
          s.keyInvestors.some((inv) => inv.toLowerCase().includes(q))
      );
    }

    // Sort
    results.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'founded') return b.founded - a.founded;
      // Sort by funding amount (parse the string)
      const parseFunding = (f: string) => {
        const num = parseFloat(f.replace(/[^0-9.]/g, ''));
        if (f.includes('B')) return num * 1000;
        return num;
      };
      return parseFunding(b.totalFunding) - parseFunding(a.totalFunding);
    });

    return results;
  }, [selectedCategory, selectedStage, showTrendingOnly, searchQuery, sortBy]);

  const onesToWatch = STARTUPS.filter((s) => s.isOneToWatch);
  const trendingCount = STARTUPS.filter((s) => s.isTrending).length;

  // Stats
  const categoryDistribution = useMemo(() => {
    const dist: Partial<Record<StartupCategory, number>> = {};
    STARTUPS.forEach((s) => {
      dist[s.category] = (dist[s.category] || 0) + 1;
    });
    return dist;
  }, []);

  const stageDistribution = useMemo(() => {
    const dist: Partial<Record<FundingStage, number>> = {};
    STARTUPS.forEach((s) => {
      dist[s.fundingStage] = (dist[s.fundingStage] || 0) + 1;
    });
    return dist;
  }, []);

  // Update URL params
  const updateParams = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Space Startup Tracker"
          subtitle={`Tracking ${STARTUPS.length} innovative space startups across ${ALL_CATEGORIES.length} categories`}
          icon="🚀"
          accentColor="purple"
        />

        {/* Summary Stats */}
        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StaggerItem>
            <div className="card-elevated p-6 text-center">
              <div className="text-4xl font-bold font-display tracking-tight text-white">{STARTUPS.length}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Startups Tracked</div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card-elevated p-6 text-center">
              <div className="text-4xl font-bold font-display tracking-tight text-orange-400">{trendingCount}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Trending Now</div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card-elevated p-6 text-center">
              <div className="text-4xl font-bold font-display tracking-tight text-yellow-400">{onesToWatch.length}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Ones to Watch</div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card-elevated p-6 text-center">
              <div className="text-4xl font-bold font-display tracking-tight text-nebula-300">{Object.keys(categoryDistribution).length}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Categories</div>
            </div>
          </StaggerItem>
        </StaggerContainer>

        {/* Ones to Watch Section */}
        <ScrollReveal>
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-yellow-400">{'\u{2B50}'}</span>
              Ones to Watch
            </h2>
            <p className="text-slate-400 text-sm mb-5">
              Standout startups with breakthrough technology, strong momentum, and potential to reshape their sector.
            </p>
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {onesToWatch.map((startup) => (
                <StaggerItem key={startup.slug}>
                  <div className="card p-5 border-yellow-500/20 bg-yellow-500/5 hover:border-yellow-500/40 transition-all h-full flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <Link href={`/company-profiles/${startup.slug}`} className="font-semibold text-white hover:text-yellow-200 transition-colors">
                        {startup.name}
                      </Link>
                      <TrendingBadge />
                    </div>
                    <div className="text-xs text-slate-400 mb-2">
                      {startup.flag} {startup.headquarters} | {CATEGORY_ICONS[startup.category]} {startup.category}
                    </div>
                    <p className="text-sm text-yellow-200/70 mb-3 flex-1">{startup.oneToWatchReason}</p>
                    <div className="flex items-center justify-between text-xs">
                      <FundingBadge stage={startup.fundingStage} />
                      <span className="text-slate-400">{startup.totalFunding} raised</span>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </ScrollReveal>

        {/* Ad slot */}
        <div className="mb-8">
          <AdSlot position="in_feed" module="startup-tracker" />
        </div>

        {/* Filters & Search */}
        <div className="card p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <label className="block text-slate-400 text-sm mb-1">Search</label>
              <input
                type="text"
                placeholder="Search startups, investors, or locations..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  updateParams('q', e.target.value);
                }}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-slate-400 text-sm mb-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value as StartupCategory | '');
                  updateParams('category', e.target.value);
                }}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              >
                <option value="">All Categories</option>
                {ALL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_ICONS[cat]} {cat} ({categoryDistribution[cat] || 0})
                  </option>
                ))}
              </select>
            </div>

            {/* Funding Stage */}
            <div>
              <label className="block text-slate-400 text-sm mb-1">Funding Stage</label>
              <select
                value={selectedStage}
                onChange={(e) => {
                  setSelectedStage(e.target.value as FundingStage | '');
                  updateParams('stage', e.target.value);
                }}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              >
                <option value="">All Stages</option>
                {FUNDING_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage} ({stageDistribution[stage] || 0})
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-slate-400 text-sm mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as 'name' | 'founded' | 'funding');
                  updateParams('sort', e.target.value);
                }}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              >
                <option value="name">Name (A-Z)</option>
                <option value="founded">Newest First</option>
                <option value="funding">Most Funded</option>
              </select>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-slate-700/50">
            <button
              onClick={() => {
                setShowTrendingOnly(!showTrendingOnly);
                updateParams('trending', !showTrendingOnly ? 'true' : '');
              }}
              className={`px-3 py-1.5 min-h-[44px] rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                showTrendingOnly
                  ? 'bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/40'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
              </svg>
              Trending Only
            </button>

            {(selectedCategory || selectedStage || searchQuery || showTrendingOnly) && (
              <button
                onClick={() => {
                  setSelectedCategory('');
                  setSelectedStage('');
                  setSearchQuery('');
                  setShowTrendingOnly(false);
                  setSortBy('name');
                  router.replace(pathname, { scroll: false });
                }}
                className="text-sm text-nebula-300 hover:text-nebula-200 transition-colors min-h-[44px]"
              >
                Clear All Filters
              </button>
            )}

            <div className="ml-auto">
              <ExportButton
                data={filteredStartups.map((s) => ({
                  name: s.name,
                  category: s.category,
                  founded: s.founded,
                  headquarters: s.headquarters,
                  fundingStage: s.fundingStage,
                  totalFunding: s.totalFunding,
                  valuation: s.valuation || 'Undisclosed',
                  employees: s.employeeEstimate,
                  investors: s.keyInvestors.join('; '),
                  trending: s.isTrending ? 'Yes' : 'No',
                  website: s.website,
                }))}
                filename="space-startups"
                columns={[
                  { key: 'name', label: 'Name' },
                  { key: 'category', label: 'Category' },
                  { key: 'founded', label: 'Founded' },
                  { key: 'headquarters', label: 'HQ' },
                  { key: 'fundingStage', label: 'Stage' },
                  { key: 'totalFunding', label: 'Total Funding' },
                  { key: 'valuation', label: 'Valuation' },
                  { key: 'employees', label: 'Employees' },
                  { key: 'investors', label: 'Key Investors' },
                  { key: 'trending', label: 'Trending' },
                  { key: 'website', label: 'Website' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Funding Stage Distribution */}
        <div className="card p-4 mb-6">
          <h3 className="text-white font-semibold mb-3 text-sm">Funding Stage Distribution</h3>
          <div className="flex flex-wrap gap-2">
            {FUNDING_STAGES.filter((s) => stageDistribution[s]).map((stage) => {
              const count = stageDistribution[stage] || 0;
              const colors = FUNDING_STAGE_COLORS[stage];
              const pct = ((count / STARTUPS.length) * 100).toFixed(0);
              return (
                <button
                  key={stage}
                  onClick={() => {
                    setSelectedStage(selectedStage === stage ? '' : stage);
                    updateParams('stage', selectedStage === stage ? '' : stage);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedStage === stage ? `${colors.bg} ${colors.text} ring-1 ring-current/40` : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <span className="font-medium">{stage}</span>
                  <span className="text-xs opacity-70">{count} ({pct}%)</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-slate-400 text-sm">
            Showing <span className="text-white font-medium">{filteredStartups.length}</span> of {STARTUPS.length} startups
          </p>
        </div>

        {/* Startup Cards */}
        {filteredStartups.length === 0 ? (
          <div className="card p-12 text-center">
            <span className="text-5xl block mb-4">{'\u{1F50D}'}</span>
            <h3 className="text-xl font-semibold text-white mb-2">No Results</h3>
            <p className="text-slate-400">No startups match your current filters. Try adjusting your criteria.</p>
          </div>
        ) : (
          <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            {filteredStartups.map((startup) => (
              <StaggerItem key={startup.slug}>
                <StartupCard startup={startup} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}

        {/* Related Modules */}
        <RelatedModules modules={[
          { name: 'Market Intel', description: 'Public & private company tracking', href: '/market-intel', icon: '\u{1F4CA}' },
          { name: 'Company Profiles', description: '200+ detailed company pages', href: '/company-profiles', icon: '\u{1F3E2}' },
          { name: 'Funding Tracker', description: 'Recent funding rounds & deals', href: '/funding-tracker', icon: '\u{1F4B0}' },
          { name: 'Space Capital', description: 'VC & investor intelligence', href: '/space-capital', icon: '\u{1F4B8}' },
        ]} />

        {/* Footer Ad */}
        <div className="mt-8">
          <AdSlot position="footer" module="startup-tracker" />
        </div>

        {/* Disclaimer */}
        <ScrollReveal>
          <div className="card p-6 mt-8 border-dashed">
            <div className="text-center">
              <span className="text-4xl block mb-3">{'\u{1F4A1}'}</span>
              <h3 className="text-lg font-semibold text-white mb-2">About This Data</h3>
              <p className="text-slate-400 text-sm max-w-2xl mx-auto">
                Startup data is compiled from public sources including press releases, Crunchbase, PitchBook summaries,
                and SEC filings. Funding amounts and valuations are estimates based on last reported rounds and may not
                reflect current market conditions. Employee counts are approximate ranges. Always conduct your own
                due diligence before making investment decisions.
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Page Export
// ────────────────────────────────────────

export default function StartupTrackerPage() {
  return (
    <>
      <BreadcrumbSchema items={[
        { name: 'Home', href: '/' },
        { name: 'Market Intelligence', href: '/market-intel' },
        { name: 'Startup Tracker' },
      ]} />
      <FAQSchema items={[
        { question: 'How many space startups does SpaceNexus track?', answer: `SpaceNexus tracks ${STARTUPS.length}+ innovative space startups across ${ALL_CATEGORIES.length} categories including launch, satellites, Earth observation, in-space services, defense, communications, and more.` },
        { question: 'What makes a startup "One to Watch"?', answer: 'Our "Ones to Watch" selections are startups with breakthrough technology, strong funding momentum, experienced leadership, and the potential to significantly disrupt their sector within the next 2-3 years.' },
        { question: 'How is the "Hot/Trending" badge determined?', answer: 'Trending badges are assigned to startups that have had significant recent news -- major funding rounds, contract wins, successful launches or demos, or partnership announcements within the past few months.' },
        { question: 'Where does the startup funding data come from?', answer: 'Funding data is compiled from public sources including press releases, SEC filings, Crunchbase, PitchBook summaries, and verified industry reports. Amounts are estimates and may not include undisclosed rounds.' },
      ]} />
      <Suspense
        fallback={
          <div className="min-h-screen flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        }
      >
        <StartupTrackerContent />
      </Suspense>
    </>
  );
}
