'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

type FundingStage = 'Pre-Seed' | 'Seed' | 'Series A-C' | 'Growth' | 'Public';

interface MarketCompany {
  name: string;
  slug: string;
  stage: FundingStage;
  valuation?: string;
  keyProduct: string;
  founded?: number;
  hq?: string;
}

interface MarketSector {
  id: string;
  label: string;
  description: string;
  accent: string;       // tailwind color name: cyan, purple, etc.
  bgClass: string;
  borderClass: string;
  textClass: string;
  badgeClass: string;
  companies: MarketCompany[];
}

// ────────────────────────────────────────────────────────────────
// Market Map Data
// ────────────────────────────────────────────────────────────────

const SECTORS: MarketSector[] = [
  {
    id: 'launch',
    label: 'Launch Services',
    description: 'Orbital and suborbital launch providers delivering payloads to space',
    accent: 'cyan',
    bgClass: 'bg-cyan-500/8',
    borderClass: 'border-cyan-500/30',
    textClass: 'text-cyan-400',
    badgeClass: 'bg-cyan-500/20 text-cyan-300',
    companies: [
      { name: 'SpaceX', slug: 'spacex', stage: 'Growth', valuation: '$350B', keyProduct: 'Falcon 9 / Starship', founded: 2002, hq: 'Hawthorne, CA' },
      { name: 'Rocket Lab', slug: 'rocket-lab', stage: 'Public', valuation: '$11B', keyProduct: 'Electron / Neutron', founded: 2006, hq: 'Long Beach, CA' },
      { name: 'ULA', slug: 'ula', stage: 'Growth', valuation: '$4B', keyProduct: 'Vulcan Centaur', founded: 2006, hq: 'Centennial, CO' },
      { name: 'Blue Origin', slug: 'blue-origin', stage: 'Growth', valuation: '$30B', keyProduct: 'New Glenn', founded: 2000, hq: 'Kent, WA' },
      { name: 'Arianespace', slug: 'arianespace', stage: 'Growth', valuation: '$3B', keyProduct: 'Ariane 6 / Vega-C', founded: 1980, hq: 'Courcouronnes, France' },
      { name: 'Relativity Space', slug: 'relativity-space', stage: 'Series A-C', valuation: '$4.2B', keyProduct: 'Terran R (3D-printed)', founded: 2015, hq: 'Long Beach, CA' },
      { name: 'Firefly Aerospace', slug: 'firefly-aerospace', stage: 'Series A-C', valuation: '$2.5B', keyProduct: 'Alpha / MLV', founded: 2014, hq: 'Cedar Park, TX' },
      { name: 'ABL Space', slug: 'abl-space', stage: 'Series A-C', valuation: '$2.4B', keyProduct: 'RS1 Launch Vehicle', founded: 2017, hq: 'El Segundo, CA' },
      { name: 'Astra', slug: 'astra', stage: 'Public', valuation: '$200M', keyProduct: 'Rocket 4 / Spacecraft Engines', founded: 2016, hq: 'Alameda, CA' },
    ],
  },
  {
    id: 'sat-mfg',
    label: 'Satellite Manufacturing',
    description: 'Design and production of satellite buses, payloads, and constellations',
    accent: 'purple',
    bgClass: 'bg-purple-500/8',
    borderClass: 'border-purple-500/30',
    textClass: 'text-purple-400',
    badgeClass: 'bg-purple-500/20 text-purple-300',
    companies: [
      { name: 'Airbus Defence & Space', slug: 'airbus-defence-space', stage: 'Public', valuation: '$150B+', keyProduct: 'OneSat / Eurostar', founded: 2000, hq: 'Leiden, Netherlands' },
      { name: 'Maxar', slug: 'maxar', stage: 'Growth', valuation: '$6.4B', keyProduct: 'WorldView Legion', founded: 1969, hq: 'Westminster, CO' },
      { name: 'Ball Aerospace', slug: 'ball-aerospace', stage: 'Growth', valuation: '$5.6B', keyProduct: 'BCP-100 / STP Bus', founded: 1956, hq: 'Broomfield, CO' },
      { name: 'York Space Systems', slug: 'york-space-systems', stage: 'Series A-C', valuation: '$500M', keyProduct: 'S-CLASS Platform', founded: 2012, hq: 'Denver, CO' },
      { name: 'Terran Orbital', slug: 'terran-orbital', stage: 'Public', valuation: '$300M', keyProduct: 'TRESTLES SmallSat', founded: 2013, hq: 'Irvine, CA' },
      { name: 'Loft Orbital', slug: 'loft-orbital', stage: 'Series A-C', valuation: '$240M', keyProduct: 'Space Infrastructure-as-a-Service', founded: 2017, hq: 'San Francisco, CA' },
    ],
  },
  {
    id: 'earth-obs',
    label: 'Earth Observation',
    description: 'Optical, SAR, and RF satellite imagery and geospatial intelligence',
    accent: 'emerald',
    bgClass: 'bg-emerald-500/8',
    borderClass: 'border-emerald-500/30',
    textClass: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/20 text-emerald-300',
    companies: [
      { name: 'Planet Labs', slug: 'planet-labs', stage: 'Public', valuation: '$2.8B', keyProduct: 'PlanetScope Daily Imaging', founded: 2010, hq: 'San Francisco, CA' },
      { name: 'Maxar', slug: 'maxar-eo', stage: 'Growth', valuation: '$6.4B', keyProduct: 'WorldView Legion 30cm', founded: 1969, hq: 'Westminster, CO' },
      { name: 'BlackSky', slug: 'blacksky', stage: 'Public', valuation: '$500M', keyProduct: 'Real-Time EO Analytics', founded: 2014, hq: 'Herndon, VA' },
      { name: 'Spire Global', slug: 'spire-global', stage: 'Public', valuation: '$600M', keyProduct: 'LEMUR RF Sensing', founded: 2012, hq: 'Vienna, VA' },
      { name: 'HawkEye 360', slug: 'hawkeye-360', stage: 'Series A-C', valuation: '$800M', keyProduct: 'RF Geolocation Analytics', founded: 2015, hq: 'Herndon, VA' },
      { name: 'Satellogic', slug: 'satellogic', stage: 'Public', valuation: '$200M', keyProduct: 'Sub-meter Multispectral', founded: 2010, hq: 'Buenos Aires, Argentina' },
      { name: 'Capella Space', slug: 'capella-space', stage: 'Series A-C', valuation: '$800M', keyProduct: 'SAR Constellation', founded: 2016, hq: 'San Francisco, CA' },
    ],
  },
  {
    id: 'comms',
    label: 'Communications',
    description: 'Broadband, IoT, and direct-to-device satellite connectivity networks',
    accent: 'amber',
    bgClass: 'bg-amber-500/8',
    borderClass: 'border-amber-500/30',
    textClass: 'text-amber-400',
    badgeClass: 'bg-amber-500/20 text-amber-300',
    companies: [
      { name: 'SES', slug: 'ses', stage: 'Public', valuation: '$7B', keyProduct: 'O3b mPOWER / GEO Fleet', founded: 1985, hq: 'Luxembourg' },
      { name: 'Intelsat', slug: 'intelsat', stage: 'Growth', valuation: '$5B', keyProduct: 'Epic / Software-Defined Sats', founded: 1964, hq: 'McLean, VA' },
      { name: 'Viasat', slug: 'viasat', stage: 'Public', valuation: '$5B', keyProduct: 'ViaSat-3 Global Broadband', founded: 1986, hq: 'Carlsbad, CA' },
      { name: 'Telesat', slug: 'telesat', stage: 'Public', valuation: '$3B', keyProduct: 'Lightspeed LEO Network', founded: 1969, hq: 'Ottawa, Canada' },
      { name: 'Eutelsat / OneWeb', slug: 'eutelsat-oneweb', stage: 'Public', valuation: '$4B', keyProduct: 'LEO + GEO Hybrid Network', founded: 1977, hq: 'Paris, France' },
      { name: 'AST SpaceMobile', slug: 'ast-spacemobile', stage: 'Public', valuation: '$7.5B', keyProduct: 'Direct-to-Cell Broadband', founded: 2017, hq: 'Midland, TX' },
      { name: 'Lynk Global', slug: 'lynk-global', stage: 'Series A-C', valuation: '$500M', keyProduct: 'Direct-to-Phone LEO', founded: 2017, hq: 'Falls Church, VA' },
    ],
  },
  {
    id: 'infrastructure',
    label: 'Space Infrastructure',
    description: 'In-orbit servicing, space stations, debris removal, and orbital logistics',
    accent: 'pink',
    bgClass: 'bg-pink-500/8',
    borderClass: 'border-pink-500/30',
    textClass: 'text-pink-400',
    badgeClass: 'bg-pink-500/20 text-pink-300',
    companies: [
      { name: 'Axiom Space', slug: 'axiom-space', stage: 'Series A-C', valuation: '$3.3B', keyProduct: 'Commercial Space Station', founded: 2016, hq: 'Houston, TX' },
      { name: 'Voyager Space', slug: 'voyager-space', stage: 'Growth', valuation: '$1.5B', keyProduct: 'Starlab Station', founded: 2019, hq: 'Denver, CO' },
      { name: 'Sierra Space', slug: 'sierra-space', stage: 'Series A-C', valuation: '$5.3B', keyProduct: 'Dream Chaser / LIFE Habitat', founded: 2021, hq: 'Louisville, CO' },
      { name: 'Astroscale', slug: 'astroscale', stage: 'Series A-C', valuation: '$2B', keyProduct: 'ELSA-d Debris Removal', founded: 2013, hq: 'Tokyo, Japan' },
      { name: 'ClearSpace', slug: 'clearspace', stage: 'Series A-C', valuation: '$130M', keyProduct: 'ClearSpace-1 ADR Mission', founded: 2018, hq: 'Ecublens, Switzerland' },
      { name: 'Orbit Fab', slug: 'orbit-fab', stage: 'Seed', valuation: '$50M', keyProduct: 'In-Orbit Refueling Depots', founded: 2018, hq: 'San Francisco, CA' },
    ],
  },
  {
    id: 'ground',
    label: 'Ground Segment',
    description: 'Ground stations, cloud integration, and satellite operations platforms',
    accent: 'blue',
    bgClass: 'bg-blue-500/8',
    borderClass: 'border-blue-500/30',
    textClass: 'text-blue-400',
    badgeClass: 'bg-blue-500/20 text-blue-300',
    companies: [
      { name: 'AWS Ground Station', slug: 'aws-ground-station', stage: 'Public', valuation: 'Part of Amazon', keyProduct: 'Cloud-Based Ground Station', founded: 2018, hq: 'Seattle, WA' },
      { name: 'Microsoft Azure Orbital', slug: 'azure-orbital', stage: 'Public', valuation: 'Part of Microsoft', keyProduct: 'Orbital Ground Station', founded: 2020, hq: 'Redmond, WA' },
      { name: 'Kongsberg', slug: 'kongsberg', stage: 'Public', valuation: '$12B', keyProduct: 'KSATlite Global Network', founded: 1814, hq: 'Kongsberg, Norway' },
      { name: 'KSAT', slug: 'ksat', stage: 'Growth', valuation: '$1.5B', keyProduct: '250+ Antenna Global Network', founded: 2002, hq: 'Tromso, Norway' },
      { name: 'Leaf Space', slug: 'leaf-space', stage: 'Series A-C', valuation: '$50M', keyProduct: 'Leaf Line GSaaS', founded: 2014, hq: 'Lomazzo, Italy' },
      { name: 'Atlas Space Operations', slug: 'atlas-space-operations', stage: 'Series A-C', valuation: '$80M', keyProduct: 'Freedom Platform', founded: 2015, hq: 'Traverse City, MI' },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics & Data',
    description: 'Satellite data processing, geospatial AI, and space-derived intelligence',
    accent: 'orange',
    bgClass: 'bg-orange-500/8',
    borderClass: 'border-orange-500/30',
    textClass: 'text-orange-400',
    badgeClass: 'bg-orange-500/20 text-orange-300',
    companies: [
      { name: 'Spire Global', slug: 'spire-global-data', stage: 'Public', valuation: '$600M', keyProduct: 'Space-Based Data Analytics', founded: 2012, hq: 'Vienna, VA' },
      { name: 'Orbital Insight', slug: 'orbital-insight', stage: 'Series A-C', valuation: '$300M', keyProduct: 'Geospatial AI Platform', founded: 2013, hq: 'Palo Alto, CA' },
      { name: 'Ursa Major', slug: 'ursa-major', stage: 'Series A-C', valuation: '$1.4B', keyProduct: 'Hadley / Arroway Engines', founded: 2015, hq: 'Berthoud, CO' },
      { name: 'Muon Space', slug: 'muon-space', stage: 'Series A-C', valuation: '$200M', keyProduct: 'Climate Monitoring Sats', founded: 2021, hq: 'Mountain View, CA' },
      { name: 'Umbra Lab', slug: 'umbra-lab', stage: 'Series A-C', valuation: '$300M', keyProduct: 'SAR-as-a-Service', founded: 2015, hq: 'Santa Barbara, CA' },
      { name: 'Tomorrow.io', slug: 'tomorrow-io', stage: 'Series A-C', valuation: '$450M', keyProduct: 'Weather Intelligence Radar Sats', founded: 2016, hq: 'Boston, MA' },
    ],
  },
  {
    id: 'defense',
    label: 'Defense & National Security',
    description: 'Space domain awareness, military satellites, and missile defense systems',
    accent: 'red',
    bgClass: 'bg-red-500/8',
    borderClass: 'border-red-500/30',
    textClass: 'text-red-400',
    badgeClass: 'bg-red-500/20 text-red-300',
    companies: [
      { name: 'L3Harris', slug: 'l3harris', stage: 'Public', valuation: '$46B', keyProduct: 'Space & Airborne Systems', founded: 2019, hq: 'Melbourne, FL' },
      { name: 'Northrop Grumman', slug: 'northrop-grumman', stage: 'Public', valuation: '$72B', keyProduct: 'Payload / MEV / SDA Sats', founded: 1939, hq: 'Falls Church, VA' },
      { name: 'Lockheed Martin', slug: 'lockheed-martin', stage: 'Public', valuation: '$120B', keyProduct: 'LM 400 / OPIR / GPS III', founded: 1926, hq: 'Bethesda, MD' },
      { name: 'Raytheon', slug: 'raytheon', stage: 'Public', valuation: '$150B+', keyProduct: 'Missile Warning & Tracking', founded: 1922, hq: 'Arlington, VA' },
      { name: 'BAE Systems', slug: 'bae-systems', stage: 'Public', valuation: '$50B', keyProduct: 'SIGINT / Electronic Warfare', founded: 1999, hq: 'London, UK' },
      { name: 'Anduril', slug: 'anduril', stage: 'Growth', valuation: '$14B', keyProduct: 'Lattice / Autonomous Defense', founded: 2017, hq: 'Costa Mesa, CA' },
    ],
  },
];

const ALL_STAGES: FundingStage[] = ['Pre-Seed', 'Seed', 'Series A-C', 'Growth', 'Public'];

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function getAvatarColor(accent: string): string {
  const colors: Record<string, string> = {
    cyan: 'bg-cyan-600 text-cyan-100',
    purple: 'bg-purple-600 text-purple-100',
    emerald: 'bg-emerald-600 text-emerald-100',
    amber: 'bg-amber-600 text-amber-100',
    pink: 'bg-pink-600 text-pink-100',
    blue: 'bg-blue-600 text-blue-100',
    orange: 'bg-orange-600 text-orange-100',
    red: 'bg-red-600 text-red-100',
  };
  return colors[accent] || 'bg-slate-600 text-slate-100';
}

function getStageBadgeClass(stage: FundingStage): string {
  switch (stage) {
    case 'Pre-Seed': return 'bg-slate-700 text-slate-300 border-slate-600';
    case 'Seed': return 'bg-lime-900/50 text-lime-300 border-lime-700/40';
    case 'Series A-C': return 'bg-blue-900/50 text-blue-300 border-blue-700/40';
    case 'Growth': return 'bg-purple-900/50 text-purple-300 border-purple-700/40';
    case 'Public': return 'bg-amber-900/50 text-amber-300 border-amber-700/40';
  }
}

// ────────────────────────────────────────────────────────────────
// Components
// ────────────────────────────────────────────────────────────────

function StatsBar({ totalCompanies, totalSectors, totalMarketCap }: {
  totalCompanies: number;
  totalSectors: number;
  totalMarketCap: string;
}) {
  const stats = [
    { label: 'Companies Mapped', value: totalCompanies.toString(), icon: (
      <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    )},
    { label: 'Sectors Covered', value: totalSectors.toString(), icon: (
      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    )},
    { label: 'Est. Total Market Cap', value: totalMarketCap, icon: (
      <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
  ];

  return (
    <ScrollReveal>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-slate-700/50">{stat.icon}</div>
            <div>
              <p className="text-2xl font-bold text-slate-100">{stat.value}</p>
              <p className="text-xs text-slate-400 uppercase tracking-wide">{stat.label}</p>

        <RelatedModules modules={PAGE_RELATIONS['market-map']} />
            </div>
          </div>
        ))}
      </div>
    </ScrollReveal>
  );
}

function CompanyCard({ company, accent, sectorId }: {
  company: MarketCompany;
  accent: string;
  sectorId: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="relative">
      <Link
        href={`/company-profiles/${company.slug}`}
        className="group block"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
      >
        <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-800/60 border border-slate-700/40 hover:border-slate-600 hover:bg-slate-800 transition-all duration-200 group-focus-visible:ring-2 group-focus-visible:ring-cyan-500 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-slate-900">
          {/* First-letter avatar */}
          <div className={`w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold shrink-0 ${getAvatarColor(accent)}`}>
            {company.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors">
              {company.name}
            </p>
            <p className="text-[11px] text-slate-500 truncate">{company.keyProduct}</p>
          </div>
        </div>
      </Link>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-slate-800 border border-slate-600 rounded-xl p-3.5 shadow-2xl shadow-black/40 pointer-events-none"
          >
            <p className="text-sm font-semibold text-white mb-1.5">{company.name}</p>
            <div className="space-y-1">
              {company.valuation && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Valuation</span>
                  <span className="text-emerald-400 font-medium">{company.valuation}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Stage</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${getStageBadgeClass(company.stage)}`}>
                  {company.stage}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Key Product</span>
                <span className="text-slate-300 text-right ml-2 max-w-[140px] truncate">{company.keyProduct}</span>
              </div>
              {company.founded && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Founded</span>
                  <span className="text-slate-300">{company.founded}</span>
                </div>
              )}
              {company.hq && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">HQ</span>
                  <span className="text-slate-300 text-right ml-2 max-w-[140px] truncate">{company.hq}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SectorBox({ sector, filteredCompanies }: {
  sector: MarketSector;
  filteredCompanies: MarketCompany[];
}) {
  if (filteredCompanies.length === 0) return null;

  return (
    <ScrollReveal>
      <div className={`rounded-2xl border ${sector.borderClass} ${sector.bgClass} p-5 h-full`}>
        {/* Sector header */}
        <div className="flex items-center gap-3 mb-1.5">
          <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: `var(--tw-${sector.accent}-500, currentColor)` }}>
            <div className={`w-3 h-3 rounded-full ${sector.textClass.replace('text-', 'bg-')}`} />
          </div>
          <h3 className={`text-lg font-bold ${sector.textClass}`}>{sector.label}</h3>
          <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${sector.badgeClass}`}>
            {filteredCompanies.length}
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-4 leading-relaxed">{sector.description}</p>

        {/* Company cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filteredCompanies.map((company) => (
            <CompanyCard
              key={`${sector.id}-${company.slug}`}
              company={company}
              accent={sector.accent}
              sectorId={sector.id}
            />
          ))}
        </div>
      </div>
    </ScrollReveal>
  );
}

// ────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────

export default function MarketMapPage() {
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<FundingStage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Compute filtered data
  const filteredSectors = useMemo(() => {
    return SECTORS
      .filter((sector) => !selectedSector || sector.id === selectedSector)
      .map((sector) => ({
        ...sector,
        filteredCompanies: sector.companies.filter((c) => {
          if (selectedStage && c.stage !== selectedStage) return false;
          if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (
              c.name.toLowerCase().includes(q) ||
              c.keyProduct.toLowerCase().includes(q) ||
              (c.hq && c.hq.toLowerCase().includes(q))
            );
          }
          return true;
        }),
      }));
  }, [selectedSector, selectedStage, searchQuery]);

  const totalDisplayed = filteredSectors.reduce((sum, s) => sum + s.filteredCompanies.length, 0);
  const allCompaniesCount = SECTORS.reduce((sum, s) => sum + s.companies.length, 0);

  // Active filter check
  const hasFilters = selectedSector !== null || selectedStage !== null || searchQuery !== '';

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <AnimatedPageHeader
          title="Space Industry Market Map"
          subtitle="Visual landscape of the global space economy organized by sector -- inspired by CB Insights market maps. Hover over companies for details, or filter by funding stage and sector."
          icon={
            <svg className="w-9 h-9 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          breadcrumb="Market Intelligence"
          accentColor="cyan"
        />

        {/* Stats bar */}
        <StatsBar
          totalCompanies={allCompaniesCount}
          totalSectors={SECTORS.length}
          totalMarketCap="$900B+"
        />

        {/* Filters */}
        <ScrollReveal delay={0.1}>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 sm:p-5 mb-8 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Search */}
              <div className="relative flex-1 w-full sm:max-w-sm">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search companies, products, locations..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                />
              </div>

              {/* Clear filters */}
              {hasFilters && (
                <button
                  onClick={() => { setSelectedSector(null); setSelectedStage(null); setSearchQuery(''); }}
                  className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg px-3 py-2 transition-colors whitespace-nowrap"
                >
                  Clear all filters
                </button>
              )}
            </div>

            {/* Sector filters */}
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">Filter by Sector</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedSector(null)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    selectedSector === null
                      ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                      : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                  }`}
                >
                  All Sectors
                </button>
                {SECTORS.map((sector) => (
                  <button
                    key={sector.id}
                    onClick={() => setSelectedSector(selectedSector === sector.id ? null : sector.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      selectedSector === sector.id
                        ? `${sector.badgeClass} ${sector.borderClass}`
                        : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    {sector.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stage filters */}
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">Filter by Funding Stage</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedStage(null)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    selectedStage === null
                      ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                      : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                  }`}
                >
                  All Stages
                </button>
                {ALL_STAGES.map((stage) => (
                  <button
                    key={stage}
                    onClick={() => setSelectedStage(selectedStage === stage ? null : stage)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      selectedStage === stage
                        ? getStageBadgeClass(stage)
                        : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    {stage}
                  </button>
                ))}
              </div>
            </div>

            {/* Results summary */}
            {hasFilters && (
              <p className="text-xs text-slate-500">
                Showing <span className="text-slate-300 font-medium">{totalDisplayed}</span> of{' '}
                <span className="text-slate-300 font-medium">{allCompaniesCount}</span> companies
              </p>
            )}
          </div>
        </ScrollReveal>

        {/* Market map grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSectors.map((sector) => (
            <SectorBox
              key={sector.id}
              sector={sector}
              filteredCompanies={sector.filteredCompanies}
            />
          ))}
        </div>

        {/* Empty state */}
        {totalDisplayed === 0 && (
          <ScrollReveal>
            <div className="text-center py-20">
              <svg className="w-16 h-16 text-slate-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="text-xl font-semibold text-slate-300 mb-2">No companies match your filters</h3>
              <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
                Try adjusting your search query, sector, or funding stage filters to see more results.
              </p>
              <button
                onClick={() => { setSelectedSector(null); setSelectedStage(null); setSearchQuery(''); }}
                className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Reset all filters
              </button>
            </div>
          </ScrollReveal>
        )}

        {/* Legend / methodology note */}
        <ScrollReveal delay={0.2}>
          <div className="mt-12 bg-slate-800/30 border border-slate-700/40 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Funding Stage Legend</h3>
            <div className="flex flex-wrap gap-3 mb-5">
              {ALL_STAGES.map((stage) => (
                <span
                  key={stage}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border ${getStageBadgeClass(stage)}`}
                >
                  {stage}
                </span>
              ))}
            </div>

            <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Sector Color Key</h3>
            <div className="flex flex-wrap gap-3 mb-5">
              {SECTORS.map((sector) => (
                <div key={sector.id} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${sector.textClass.replace('text-', 'bg-')}`} />
                  <span className="text-xs text-slate-400">{sector.label}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-700/40 pt-4 mt-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                <strong className="text-slate-400">Methodology:</strong> Companies are categorized by their primary business segment.
                Valuations reflect publicly available estimates and may include market cap for public companies or last-known
                private valuations. Some companies appear in multiple sectors based on their diversified operations.
                Data compiled from public filings, Crunchbase, PitchBook, and industry reports.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-5">
              <Link
                href="/ecosystem-map"
                className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                View full Ecosystem Map (Value Chain)
              </Link>
              <Link
                href="/company-profiles"
                className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Browse Company Profiles Directory
              </Link>
              <Link
                href="/funding-tracker"
                className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Explore Funding Tracker
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </main>
  );
}
