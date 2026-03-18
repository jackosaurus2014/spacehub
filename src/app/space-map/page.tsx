'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import ItemListSchema from '@/components/seo/ItemListSchema';
import SocialShare from '@/components/ui/SocialShare';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

interface Company {
  name: string;
  slug: string;
  description: string;
  hq?: string;
}

interface IndustrySector {
  id: string;
  label: string;
  description: string;
  marketSize: string;
  marketSizeNote: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconPath: string;
  companies: Company[];
}

// ────────────────────────────────────────────────────────────────
// Data
// ────────────────────────────────────────────────────────────────

const SECTORS: IndustrySector[] = [
  {
    id: 'launch-providers',
    label: 'Launch Providers',
    description: 'Companies that design, manufacture, and operate launch vehicles to deliver payloads to orbit. The launch segment is the critical gateway to all space activities.',
    marketSize: '$35B',
    marketSizeNote: 'Global launch services market (2025 est.)',
    color: '#f59e0b',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-400',
    iconPath: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8',
    companies: [
      { name: 'SpaceX', slug: 'spacex', description: 'Dominant global launch provider with Falcon 9, Falcon Heavy, and Starship. Over 60% market share by launches.', hq: 'Hawthorne, CA' },
      { name: 'Rocket Lab', slug: 'rocket-lab', description: 'Electron small-sat launcher and Neutron medium-lift vehicle. Also builds satellite buses via Photon platform.', hq: 'Long Beach, CA' },
      { name: 'ULA', slug: 'ula', description: 'United Launch Alliance operates Atlas V and Vulcan Centaur. Primary provider for US national security launches.', hq: 'Centennial, CO' },
      { name: 'Blue Origin', slug: 'blue-origin', description: 'New Shepard suborbital vehicle and New Glenn heavy-lift orbital launcher. Developing BE-4 engines.', hq: 'Kent, WA' },
      { name: 'Arianespace', slug: 'arianespace', description: 'European launch provider operating Ariane 6, Soyuz, and Vega rockets from French Guiana. ESA commercial arm.', hq: 'Courcouronnes, France' },
    ],
  },
  {
    id: 'satellite-operators',
    label: 'Satellite Operators',
    description: 'Companies that own and operate satellite fleets providing communications, broadcast, and connectivity services from GEO, MEO, and LEO orbits.',
    marketSize: '$130B',
    marketSizeNote: 'Satellite services revenue (2025 est.)',
    color: '#3b82f6',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-400',
    iconPath: 'M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0',
    companies: [
      { name: 'SES', slug: 'ses', description: 'Operates 70+ GEO and MEO (O3b mPOWER) satellites. Major broadcast and data services provider globally.', hq: 'Luxembourg' },
      { name: 'Intelsat', slug: 'intelsat', description: 'Large GEO fleet providing managed services, mobility connectivity, and government solutions worldwide.', hq: 'McLean, VA' },
      { name: 'Eutelsat', slug: 'eutelsat-oneweb', description: 'Combined GEO/LEO operator after OneWeb merger. Multi-orbit connectivity for enterprise and government.', hq: 'Paris, France' },
      { name: 'Viasat', slug: 'viasat', description: 'High-capacity Ka-band satellite broadband. ViaSat-3 constellation provides global coverage for aviation and maritime.', hq: 'Carlsbad, CA' },
    ],
  },
  {
    id: 'earth-observation',
    label: 'Earth Observation',
    description: 'Companies operating imaging satellites and providing geospatial analytics. Growing rapidly with defense, agriculture, insurance, and climate applications.',
    marketSize: '$8.5B',
    marketSizeNote: 'EO data and analytics market (2025 est.)',
    color: '#10b981',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-400',
    iconPath: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    companies: [
      { name: 'Planet Labs', slug: 'planet-labs', description: 'Operates 200+ Dove satellites imaging the entire Earth daily. Leading commercial EO data provider.', hq: 'San Francisco, CA' },
      { name: 'Maxar Technologies', slug: 'maxar-technologies', description: 'High-resolution optical imagery (30cm). WorldView Legion constellation and geospatial intelligence platform.', hq: 'Westminster, CO' },
      { name: 'BlackSky Technology', slug: 'blacksky-technology', description: 'Real-time geospatial intelligence platform combining frequent-revisit imagery with AI analytics.', hq: 'Herndon, VA' },
      { name: 'Spire Global', slug: 'spire-global', description: 'Multi-sensor satellite constellation for weather, maritime AIS, aviation ADS-B, and GNSS-RO data.', hq: 'Vienna, VA' },
    ],
  },
  {
    id: 'space-stations',
    label: 'Space Stations',
    description: 'Companies building the next generation of commercial orbital habitats to succeed the International Space Station. A nascent but strategically vital sector.',
    marketSize: '$3.2B',
    marketSizeNote: 'Commercial LEO destinations market (2025-2030 est.)',
    color: '#a855f7',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    textColor: 'text-purple-400',
    iconPath: 'M2 12h2m16 0h2M12 2v2m0 16v2m-7.07-2.93l1.41-1.41m11.32 0l1.41 1.41M4.93 4.93l1.41 1.41m11.32 0l1.41-1.41M12 8a4 4 0 100 8 4 4 0 000-8z',
    companies: [
      { name: 'Axiom Space', slug: 'axiom-space', description: 'Building first commercial space station modules. Currently manages commercial ISS missions via NASA.', hq: 'Houston, TX' },
      { name: 'Vast', slug: 'vast', description: 'Developing Haven-1 single-module commercial space station, targeting Falcon 9 launch for initial deployment.', hq: 'Long Beach, CA' },
      { name: 'Orbital Reef', slug: 'orbital-reef', description: 'Blue Origin and Sierra Space partnership to build a mixed-use commercial space station in LEO.', hq: 'Kent, WA' },
      { name: 'Starlab', slug: 'starlab', description: 'Voyager Space and Airbus partnership for a continuously crewed free-flying commercial space station.', hq: 'Houston, TX' },
    ],
  },
  {
    id: 'defense-security',
    label: 'Defense & National Security',
    description: 'Prime contractors and emerging companies serving military space, missile warning, space domain awareness, and national security satellite programs.',
    marketSize: '$52B',
    marketSizeNote: 'Global military space spending (2025 est.)',
    color: '#ef4444',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    textColor: 'text-red-400',
    iconPath: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    companies: [
      { name: 'L3Harris', slug: 'l3harris', description: 'Space sensors, ground systems, signal intelligence, and space domain awareness. Major DoD space contractor.', hq: 'Melbourne, FL' },
      { name: 'Northrop Grumman', slug: 'northrop-grumman', description: 'Missile warning satellites, Cygnus cargo, Next-Gen OPIR, and Space Development Agency transport layer.', hq: 'Falls Church, VA' },
      { name: 'Anduril', slug: 'anduril', description: 'Defense technology company building AI-powered space domain awareness and autonomous systems for DoD.', hq: 'Costa Mesa, CA' },
    ],
  },
  {
    id: 'navigation-pnt',
    label: 'Navigation & PNT',
    description: 'Companies providing positioning, navigation, and timing solutions using GNSS/GPS signals. Critical infrastructure for agriculture, construction, transportation, and autonomy.',
    marketSize: '$180B',
    marketSizeNote: 'Global GNSS downstream market (2025 est.)',
    color: '#06b6d4',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    textColor: 'text-cyan-400',
    iconPath: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
    companies: [
      { name: 'Trimble', slug: 'trimble', description: 'Advanced GPS/GNSS positioning solutions for construction, agriculture, geospatial, and transportation sectors.', hq: 'Sunnyvale, CA' },
      { name: 'u-blox', slug: 'u-blox', description: 'Swiss manufacturer of GNSS receiver chips and modules for automotive, industrial, and consumer applications.', hq: 'Thalwil, Switzerland' },
      { name: 'Hexagon', slug: 'hexagon', description: 'Sensor, software, and autonomous solutions. Leica Geosystems brand for surveying and geospatial positioning.', hq: 'Stockholm, Sweden' },
    ],
  },
  {
    id: 'ground-segment',
    label: 'Ground Segment',
    description: 'Companies providing ground station networks, satellite operations software, and ground-based infrastructure for satellite communications and data downlink.',
    marketSize: '$42B',
    marketSizeNote: 'Ground equipment and operations market (2025 est.)',
    color: '#f97316',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    textColor: 'text-orange-400',
    iconPath: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
    companies: [
      { name: 'Kratos Defense', slug: 'kratos-defense', description: 'Satellite ground systems, signal processing, and command/control software. Cloud-based ground station solutions.', hq: 'San Diego, CA' },
      { name: 'KSAT', slug: 'ksat', description: 'Global ground station network with 25+ stations worldwide. Polar coverage for LEO satellite data downlink.', hq: 'Tromso, Norway' },
      { name: 'AWS Ground Station', slug: 'aws-ground-station', description: 'Amazon cloud-based ground station as a service. On-demand satellite data downlink via AWS global infrastructure.', hq: 'Seattle, WA' },
    ],
  },
  {
    id: 'in-space-services',
    label: 'In-Space Services',
    description: 'Companies providing on-orbit services including debris removal, satellite servicing, refueling, and space logistics. An emerging sector critical for space sustainability.',
    marketSize: '$4.5B',
    marketSizeNote: 'In-space servicing & logistics market (2025-2030 est.)',
    color: '#ec4899',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
    textColor: 'text-pink-400',
    iconPath: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
    companies: [
      { name: 'Astroscale', slug: 'astroscale', description: 'Active debris removal and satellite life extension services. ELSA-d demo mission demonstrated capture technology.', hq: 'Tokyo, Japan' },
      { name: 'Orbit Fab', slug: 'orbit-fab', description: 'In-space refueling infrastructure. Developing fuel depots and satellite servicing interfaces for GEO and LEO.', hq: 'San Francisco, CA' },
      { name: 'Momentus', slug: 'momentus', description: 'Space transportation and infrastructure. Vigoride orbital transfer vehicle for last-mile satellite delivery.', hq: 'San Jose, CA' },
    ],
  },
];

// ────────────────────────────────────────────────────────────────
// Sector Card Component
// ────────────────────────────────────────────────────────────────

function SectorCard({ sector }: { sector: IndustrySector }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`${sector.bgColor} border ${sector.borderColor} rounded-2xl p-6 hover:border-opacity-60 transition-all duration-300`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${sector.color}20` }}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke={sector.color}
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d={sector.iconPath} />
            </svg>
          </div>
          <div>
            <h2 className={`text-lg font-bold ${sector.textColor}`}>{sector.label}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${sector.color}20`, color: sector.color }}
              >
                {sector.marketSize}
              </span>
              <span className="text-xs text-slate-500">{sector.marketSizeNote}</span>
            </div>
          </div>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full shrink-0"
          style={{ backgroundColor: `${sector.color}15`, color: sector.color }}
        >
          {sector.companies.length} companies
        </span>
      </div>

      <p className="text-slate-400 text-sm leading-relaxed mb-4">{sector.description}</p>

      {/* Companies */}
      <div className="space-y-2">
        {sector.companies.slice(0, expanded ? undefined : 3).map((company) => (
          <div
            key={company.slug}
            className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 hover:border-white/[0.12] transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <Link
                href={`/company-profiles/${company.slug}`}
                className="text-sm font-medium text-white hover:underline decoration-slate-400/40 underline-offset-2"
              >
                {company.name}
              </Link>
              {company.hq && (
                <span className="text-[10px] text-slate-500">{company.hq}</span>
              )}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{company.description}</p>
          </div>
        ))}
      </div>

      {sector.companies.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-xs font-medium transition-colors hover:text-white"
          style={{ color: sector.color }}
        >
          {expanded ? 'Show less' : `Show all ${sector.companies.length} companies`}
        </button>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────────────────

export default function SpaceIndustryMapPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  const filteredSectors = useMemo(() => {
    let sectors = SECTORS;

    if (selectedSector) {
      sectors = sectors.filter((s) => s.id === selectedSector);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      sectors = sectors
        .map((sector) => ({
          ...sector,
          companies: sector.companies.filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              c.description.toLowerCase().includes(q) ||
              (c.hq && c.hq.toLowerCase().includes(q))
          ),
        }))
        .filter((s) => s.companies.length > 0 || s.label.toLowerCase().includes(q));
    }

    return sectors;
  }, [searchQuery, selectedSector]);

  const totalCompanies = SECTORS.reduce((sum, s) => sum + s.companies.length, 0);

  return (
    <div className="min-h-screen bg-space-900 py-8">
      <ItemListSchema
        name="Space Industry Ecosystem Map"
        description="Interactive map of the space industry organized by sector with key companies, market sizes, and profiles"
        url="/space-map"
        items={SECTORS.map((s) => ({
          name: s.label,
          url: `/space-map#${s.id}`,
          description: s.description,
        }))}
      />

      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Space Industry Ecosystem Map"
          subtitle={`Explore ${SECTORS.length} sectors and ${totalCompanies}+ key players shaping the $546B space economy`}
          icon="M"
          accentColor="blue"
        />

        {/* Overview banner */}
        <ScrollReveal>
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-5 mb-8">
            <p className="text-white/70 text-sm leading-relaxed mb-3">
              The space industry spans{' '}
              <strong className="text-blue-400">8 interconnected sectors</strong> from launch vehicles to
              in-space servicing. This map provides a structured view of the key companies driving each
              segment. Click any company name to view their full intelligence profile, or use the filters below
              to focus on specific sectors.
            </p>
            <div className="flex items-center gap-2 pt-3 border-t border-blue-500/10">
              <SocialShare
                title="Space Industry Ecosystem Map - SpaceNexus"
                url="https://spacenexus.us/space-map"
                description="Interactive map of the space industry: 8 sectors, 30+ key companies, and market sizing across the $546B space economy."
              />
            </div>
          </div>
        </ScrollReveal>

        {/* Market size overview */}
        <ScrollReveal>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
            {SECTORS.map((sector) => (
              <button
                key={sector.id}
                onClick={() =>
                  setSelectedSector(selectedSector === sector.id ? null : sector.id)
                }
                className={`${sector.bgColor} border ${
                  selectedSector === sector.id
                    ? 'border-white/30 ring-1 ring-white/20'
                    : sector.borderColor
                } rounded-xl p-3 text-center transition-all hover:scale-[1.02]`}
              >
                <div className={`text-lg font-bold ${sector.textColor}`}>{sector.marketSize}</div>
                <div className="text-slate-400 text-[10px] mt-0.5 leading-tight">{sector.label}</div>
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* Search and filter controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="flex-1">
            <input
              type="search"
              aria-label="Search companies across all sectors"
              placeholder="Search companies by name, description, or headquarters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/[0.08] text-white rounded-lg px-4 py-2.5 h-11 text-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 outline-none"
            />
          </div>
          {(selectedSector || searchQuery) && (
            <button
              onClick={() => {
                setSelectedSector(null);
                setSearchQuery('');
              }}
              className="px-4 py-2.5 bg-white/[0.06] border border-white/[0.08] rounded-lg text-sm text-slate-400 hover:text-white transition-colors shrink-0"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Sector filter pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setSelectedSector(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              !selectedSector
                ? 'bg-white text-slate-900'
                : 'bg-white/[0.04] text-slate-400 hover:text-white'
            }`}
          >
            All Sectors ({SECTORS.length})
          </button>
          {SECTORS.map((sector) => (
            <button
              key={sector.id}
              onClick={() =>
                setSelectedSector(selectedSector === sector.id ? null : sector.id)
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedSector === sector.id
                  ? 'text-white'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white'
              }`}
              style={
                selectedSector === sector.id
                  ? { backgroundColor: sector.color }
                  : undefined
              }
            >
              {sector.label} ({sector.companies.length})
            </button>
          ))}
        </div>

        {/* Sector grid */}
        {filteredSectors.length > 0 ? (
          <StaggerContainer>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredSectors.map((sector) => (
                <StaggerItem key={sector.id}>
                  <div id={sector.id}>
                    <SectorCard sector={sector} />
                  </div>
                </StaggerItem>
              ))}
            </div>
          </StaggerContainer>
        ) : (
          <div className="text-center py-16">
            <p className="text-slate-400 text-sm">No sectors or companies match your search.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedSector(null);
              }}
              className="mt-3 text-sm text-blue-400 hover:text-blue-300"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Total market summary */}
        <ScrollReveal>
          <div className="mt-12 bg-gradient-to-r from-white/[0.06] to-white/[0.03] border border-white/[0.08] rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">Space Economy at a Glance (2025)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">$546B</div>
                <div className="text-slate-400 text-xs mt-1">Global Space Economy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400">7.1%</div>
                <div className="text-slate-400 text-xs mt-1">Annual Growth Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-400">12,000+</div>
                <div className="text-slate-400 text-xs mt-1">Active Satellites</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{totalCompanies}+</div>
                <div className="text-slate-400 text-xs mt-1">Key Companies Mapped</div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Why this map matters */}
        <ScrollReveal>
          <div className="mt-8 bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
            <h3 className="text-white font-semibold mb-3">Why the Space Industry Map?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white/[0.03] rounded-lg">
                <h4 className="text-blue-400 font-medium text-sm mb-2">For Investors</h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Identify which sectors are attracting capital, understand market sizes, and discover
                  companies across the value chain for portfolio diversification.
                </p>
              </div>
              <div className="p-4 bg-white/[0.03] rounded-lg">
                <h4 className="text-emerald-400 font-medium text-sm mb-2">For Analysts</h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Map competitive landscapes, understand sector dynamics, and track how companies
                  position across the space economy.
                </p>
              </div>
              <div className="p-4 bg-white/[0.03] rounded-lg">
                <h4 className="text-purple-400 font-medium text-sm mb-2">For Professionals</h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Navigate the complex space industry landscape, find potential partners and customers,
                  and understand where your organization fits in the ecosystem.
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Related resources */}
        <div className="mt-8 pt-8 border-t border-white/[0.06]">
          <RelatedModules modules={PAGE_RELATIONS['space-map']} />
        </div>

        {/* Related links fallback */}
        <div className="mt-6">
          <h3 className="text-slate-400 text-sm font-medium mb-4">Related Resources</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/ecosystem-map"
              className="px-4 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-sm text-white/70 hover:text-white hover:border-blue-500/50 transition-all"
            >
              Ecosystem Map
            </Link>
            <Link
              href="/company-profiles"
              className="px-4 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-sm text-white/70 hover:text-white hover:border-blue-500/50 transition-all"
            >
              Company Profiles
            </Link>
            <Link
              href="/startup-directory"
              className="px-4 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-sm text-white/70 hover:text-white hover:border-blue-500/50 transition-all"
            >
              Startup Directory
            </Link>
            <Link
              href="/market-intel"
              className="px-4 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-sm text-white/70 hover:text-white hover:border-blue-500/50 transition-all"
            >
              Market Intelligence
            </Link>
            <Link
              href="/market-map"
              className="px-4 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-sm text-white/70 hover:text-white hover:border-blue-500/50 transition-all"
            >
              Market Map
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
