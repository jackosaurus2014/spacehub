'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import ItemListSchema from '@/components/seo/ItemListSchema';

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

type SegmentId = 'upstream' | 'midstream' | 'downstream' | 'cross-cutting';

interface EcosystemCompany {
  name: string;
  slug: string;
  subsegment: string;
  description: string;
  hq?: string;
  tags?: string[];
}

interface EcosystemSegment {
  id: SegmentId;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconPath: string;
  subsegments: string[];
  companies: EcosystemCompany[];
}

// ────────────────────────────────────────────────────────────────
// Data
// ────────────────────────────────────────────────────────────────

const ECOSYSTEM_SEGMENTS: EcosystemSegment[] = [
  {
    id: 'upstream',
    label: 'Upstream',
    description: 'Raw materials, component manufacturing, and subsystem integration that feed into spacecraft and launch vehicle production.',
    color: '#f59e0b',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-400',
    iconPath: 'M13 10V3L4 14h7v7l9-11h-7z',
    subsegments: ['Raw Materials & Electronics', 'Component Manufacturing', 'Subsystem Integration', 'Propulsion Components'],
    companies: [
      { name: 'Moog Inc.', slug: 'moog', subsegment: 'Component Manufacturing', description: 'Precision motion control components, actuators, and thrusters for satellites and spacecraft.', hq: 'East Aurora, NY', tags: ['actuators', 'thrusters'] },
      { name: 'Curtiss-Wright', slug: 'curtiss-wright', subsegment: 'Component Manufacturing', description: 'Defense electronics, nuclear technology, and sensor systems for space applications.', hq: 'Davidson, NC', tags: ['sensors', 'electronics'] },
      { name: 'Materion', slug: 'materion', subsegment: 'Raw Materials & Electronics', description: 'Advanced materials including beryllium alloys and precision optics for space instruments.', hq: 'Mayfield Heights, OH', tags: ['beryllium', 'optics'] },
      { name: 'Heico', slug: 'heico', subsegment: 'Component Manufacturing', description: 'Flight-critical components, electronic assemblies, and replacement parts for aerospace.', hq: 'Hollywood, FL', tags: ['components', 'electronics'] },
      { name: 'Teledyne Technologies', slug: 'teledyne-technologies', subsegment: 'Subsystem Integration', description: 'Digital imaging, instrumentation, and aerospace electronics. Detectors for space telescopes.', hq: 'Thousand Oaks, CA', tags: ['imaging', 'detectors'] },
      { name: 'Honeywell Aerospace', slug: 'honeywell-aerospace', subsegment: 'Subsystem Integration', description: 'Avionics, sensors, navigation systems, and reaction wheels for satellites.', hq: 'Phoenix, AZ', tags: ['avionics', 'sensors'] },
      { name: 'Aerojet Rocketdyne', slug: 'aerojet-rocketdyne', subsegment: 'Propulsion Components', description: 'Rocket engines, thrusters, and propulsion systems for launch vehicles and satellites.', hq: 'El Segundo, CA', tags: ['engines', 'propulsion'] },
      { name: 'Velo3D', slug: 'velo3d', subsegment: 'Component Manufacturing', description: 'Metal 3D printing systems enabling complex rocket engine and spacecraft components.', hq: 'Campbell, CA', tags: ['3D printing', 'manufacturing'] },
      { name: 'BWX Technologies', slug: 'bwx-technologies', subsegment: 'Propulsion Components', description: 'Nuclear technology for space propulsion and power systems. Developing nuclear thermal propulsion.', hq: 'Lynchburg, VA', tags: ['nuclear', 'propulsion'] },
      { name: 'II-VI / Coherent', slug: 'coherent', subsegment: 'Raw Materials & Electronics', description: 'Compound semiconductors, laser optics, and photonic components for space communications.', hq: 'Saxonburg, PA', tags: ['semiconductors', 'photonics'] },
    ],
  },
  {
    id: 'midstream',
    label: 'Midstream',
    description: 'Launch providers, satellite manufacturers, and ground equipment companies that build and deliver space infrastructure.',
    color: '#22d3ee',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    textColor: 'text-cyan-400',
    iconPath: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8',
    subsegments: ['Launch Providers', 'Satellite Manufacturers', 'Ground Equipment', 'Space Station Builders'],
    companies: [
      { name: 'SpaceX', slug: 'spacex', subsegment: 'Launch Providers', description: 'Falcon 9, Falcon Heavy, and Starship launch vehicles. Dominant global launch market share.', hq: 'Hawthorne, CA', tags: ['launch', 'Falcon 9', 'Starship'] },
      { name: 'Rocket Lab', slug: 'rocket-lab', subsegment: 'Launch Providers', description: 'Electron small-sat launcher and Neutron medium-lift vehicle. Also builds spacecraft (Photon).', hq: 'Long Beach, CA', tags: ['small-sat', 'Electron'] },
      { name: 'Blue Origin', slug: 'blue-origin', subsegment: 'Launch Providers', description: 'New Shepard suborbital vehicle and New Glenn heavy-lift orbital launcher.', hq: 'Kent, WA', tags: ['New Glenn', 'heavy-lift'] },
      { name: 'ULA', slug: 'ula', subsegment: 'Launch Providers', description: 'Atlas V and Vulcan Centaur launch vehicles. Primary provider for national security missions.', hq: 'Centennial, CO', tags: ['Vulcan', 'national security'] },
      { name: 'Relativity Space', slug: 'relativity-space', subsegment: 'Launch Providers', description: '3D-printed rockets. Developing Terran R medium-lift vehicle with reusable first stage.', hq: 'Long Beach, CA', tags: ['3D printing', 'Terran R'] },
      { name: 'Firefly Aerospace', slug: 'firefly-aerospace', subsegment: 'Launch Providers', description: 'Alpha small-sat launcher and lunar lander programs. Growing launch provider.', hq: 'Cedar Park, TX', tags: ['Alpha', 'lunar'] },
      { name: 'Northrop Grumman', slug: 'northrop-grumman', subsegment: 'Satellite Manufacturers', description: 'Major satellite manufacturer and defense prime. Builds GEO comm sats, missile warning, and Cygnus cargo.', hq: 'Falls Church, VA', tags: ['defense', 'satellites'] },
      { name: 'Lockheed Martin', slug: 'lockheed-martin', subsegment: 'Satellite Manufacturers', description: 'GPS satellites, missile warning systems, Orion crew vehicle, and classified space systems.', hq: 'Bethesda, MD', tags: ['GPS', 'Orion', 'defense'] },
      { name: 'Ball Aerospace', slug: 'ball-aerospace', subsegment: 'Satellite Manufacturers', description: 'Scientific instruments and spacecraft. Built JWST optics, Kepler, and multiple weather satellites.', hq: 'Boulder, CO', tags: ['instruments', 'JWST'] },
      { name: 'Maxar Technologies', slug: 'maxar-technologies', subsegment: 'Satellite Manufacturers', description: 'Earth observation satellites, robotic arms (Canadarm), and geospatial intelligence.', hq: 'Westminster, CO', tags: ['Earth observation', 'robotics'] },
      { name: 'Airbus Defence & Space', slug: 'airbus-defence-and-space', subsegment: 'Satellite Manufacturers', description: 'European satellite manufacturer. Builds OneWeb, Eurostar, and scientific spacecraft.', hq: 'Leiden, Netherlands', tags: ['Eurostar', 'OneWeb'] },
      { name: 'L3Harris', slug: 'l3harris', subsegment: 'Ground Equipment', description: 'Ground systems, signal intelligence, and space domain awareness sensors.', hq: 'Melbourne, FL', tags: ['ground systems', 'sensors'] },
      { name: 'KSAT', slug: 'ksat', subsegment: 'Ground Equipment', description: 'Global ground station network for satellite data downlink. 25+ stations worldwide.', hq: 'Tromso, Norway', tags: ['ground stations', 'data downlink'] },
      { name: 'Axiom Space', slug: 'axiom-space', subsegment: 'Space Station Builders', description: 'Building first commercial space station modules. Manages commercial ISS missions.', hq: 'Houston, TX', tags: ['space station', 'commercial'] },
      { name: 'Vast', slug: 'vast', subsegment: 'Space Station Builders', description: 'Developing Haven-1, a commercial single-module space station, launching on Falcon 9.', hq: 'Long Beach, CA', tags: ['Haven-1', 'station'] },
      { name: 'Sierra Space', slug: 'sierra-space', subsegment: 'Space Station Builders', description: 'Dream Chaser spaceplane and Orbital Reef commercial space station (with Blue Origin).', hq: 'Louisville, CO', tags: ['Dream Chaser', 'Orbital Reef'] },
    ],
  },
  {
    id: 'downstream',
    label: 'Downstream',
    description: 'Satellite operators, data processors, and end-user applications that deliver value from space infrastructure to customers on Earth.',
    color: '#a855f7',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    textColor: 'text-purple-400',
    iconPath: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    subsegments: ['Satellite Operators', 'Earth Observation & Analytics', 'Satellite Communications', 'Navigation & Positioning', 'Space Data Platforms'],
    companies: [
      { name: 'SES', slug: 'ses', subsegment: 'Satellite Operators', description: 'Operates 70+ GEO and MEO satellites. Major provider of broadcast and data services globally.', hq: 'Luxembourg', tags: ['GEO', 'MEO', 'broadcast'] },
      { name: 'Intelsat', slug: 'intelsat', subsegment: 'Satellite Operators', description: 'Large GEO fleet providing managed services, mobility, and government solutions.', hq: 'McLean, VA', tags: ['GEO', 'managed services'] },
      { name: 'Eutelsat / OneWeb', slug: 'eutelsat-oneweb', subsegment: 'Satellite Operators', description: 'Combined GEO and LEO satellite operator after merger. Multi-orbit connectivity.', hq: 'Paris, France', tags: ['LEO', 'GEO', 'connectivity'] },
      { name: 'Planet Labs', slug: 'planet-labs', subsegment: 'Earth Observation & Analytics', description: 'Operates 200+ Dove satellites imaging the entire Earth daily. Leading EO data provider.', hq: 'San Francisco, CA', tags: ['daily imaging', 'EO'] },
      { name: 'Capella Space', slug: 'capella-space', subsegment: 'Earth Observation & Analytics', description: 'SAR (synthetic aperture radar) satellite constellation providing all-weather imaging.', hq: 'San Francisco, CA', tags: ['SAR', 'radar'] },
      { name: 'BlackSky Technology', slug: 'blacksky-technology', subsegment: 'Earth Observation & Analytics', description: 'Real-time geospatial intelligence platform combining satellite imagery and analytics.', hq: 'Herndon, VA', tags: ['intelligence', 'real-time'] },
      { name: 'ICEYE', slug: 'iceye', subsegment: 'Earth Observation & Analytics', description: 'SAR microsatellite constellation for persistent monitoring. Insurance and defense applications.', hq: 'Espoo, Finland', tags: ['SAR', 'insurance'] },
      { name: 'Spire Global', slug: 'spire-global', subsegment: 'Earth Observation & Analytics', description: 'Multi-sensor satellite constellation for weather, maritime, and aviation data.', hq: 'Vienna, VA', tags: ['weather', 'AIS', 'ADS-B'] },
      { name: 'Viasat', slug: 'viasat', subsegment: 'Satellite Communications', description: 'High-capacity satellite broadband. ViaSat-3 constellation for global coverage.', hq: 'Carlsbad, CA', tags: ['broadband', 'Ka-band'] },
      { name: 'AST SpaceMobile', slug: 'ast-spacemobile', subsegment: 'Satellite Communications', description: 'Building first space-based cellular broadband network for unmodified mobile phones.', hq: 'Midland, TX', tags: ['direct-to-cell', 'mobile'] },
      { name: 'Iridium', slug: 'iridium', subsegment: 'Satellite Communications', description: '66-satellite LEO constellation providing voice, data, and IoT services globally.', hq: 'McLean, VA', tags: ['LEO', 'IoT', 'voice'] },
      { name: 'Trimble', slug: 'trimble', subsegment: 'Navigation & Positioning', description: 'Advanced positioning solutions using GPS/GNSS for construction, agriculture, and transportation.', hq: 'Sunnyvale, CA', tags: ['GNSS', 'positioning'] },
      { name: 'Hexagon AB', slug: 'hexagon', subsegment: 'Navigation & Positioning', description: 'Sensor, software, and autonomous solutions. Geospatial and positioning technologies.', hq: 'Stockholm, Sweden', tags: ['sensors', 'autonomy'] },
      { name: 'Orbital Insight', slug: 'orbital-insight', subsegment: 'Space Data Platforms', description: 'Geospatial analytics platform using satellite imagery and AI for business intelligence.', hq: 'Palo Alto, CA', tags: ['analytics', 'AI'] },
      { name: 'Ursa Space', slug: 'ursa-space', subsegment: 'Space Data Platforms', description: 'SAR analytics platform for oil storage monitoring, maritime tracking, and infrastructure analysis.', hq: 'Ithaca, NY', tags: ['SAR analytics', 'oil storage'] },
    ],
  },
  {
    id: 'cross-cutting',
    label: 'Cross-Cutting Services',
    description: 'Regulatory, insurance, finance, legal, and consulting services that support the entire space industry value chain.',
    color: '#10b981',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-400',
    iconPath: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
    subsegments: ['Regulatory & Licensing', 'Space Insurance', 'Space Finance & Investment', 'Consulting & Advisory', 'Space Situational Awareness', 'Legal'],
    companies: [
      { name: 'Aerospace Corporation', slug: 'aerospace-corporation', subsegment: 'Consulting & Advisory', description: 'Federally funded R&D center providing technical guidance on space programs for the US government.', hq: 'El Segundo, CA', tags: ['FFRDC', 'technical advisory'] },
      { name: 'Bryce Tech', slug: 'bryce-tech', subsegment: 'Consulting & Advisory', description: 'Space industry analytics and consulting. Publishes influential space economy reports.', hq: 'Alexandria, VA', tags: ['analytics', 'reports'] },
      { name: 'NSR / Euroconsult', slug: 'euroconsult', subsegment: 'Consulting & Advisory', description: 'Leading space market research and consulting firm. Industry benchmarks and forecasts.', hq: 'Paris, France', tags: ['market research', 'forecasts'] },
      { name: 'Quilty Space', slug: 'quilty-space', subsegment: 'Space Finance & Investment', description: 'Space-focused equity research and advisory. Covers public space companies.', hq: 'Tampa, FL', tags: ['equity research', 'advisory'] },
      { name: 'Space Capital', slug: 'space-capital', subsegment: 'Space Finance & Investment', description: 'VC firm investing in space-enabled technologies. Tracks space investment trends.', hq: 'New York, NY', tags: ['venture capital', 'investment'] },
      { name: 'Seraphim Space', slug: 'seraphim-space', subsegment: 'Space Finance & Investment', description: 'Space technology fund and investment manager. Publicly listed space investment trust.', hq: 'London, UK', tags: ['investment', 'fund'] },
      { name: 'Marsh McLennan', slug: 'marsh-mclennan', subsegment: 'Space Insurance', description: 'Major space insurance broker. Underwrites launch insurance and in-orbit coverage.', hq: 'New York, NY', tags: ['insurance', 'risk'] },
      { name: 'Gallagher', slug: 'gallagher', subsegment: 'Space Insurance', description: 'Space insurance broker providing launch, in-orbit, and third-party liability coverage.', hq: 'Rolling Meadows, IL', tags: ['insurance', 'launch'] },
      { name: 'LeoLabs', slug: 'leolabs', subsegment: 'Space Situational Awareness', description: 'Commercial space tracking using ground-based radar. Collision avoidance services.', hq: 'Menlo Park, CA', tags: ['tracking', 'SSA'] },
      { name: 'ExoAnalytic Solutions', slug: 'exoanalytic', subsegment: 'Space Situational Awareness', description: 'Optical space surveillance network for tracking satellites and debris.', hq: 'Foothill Ranch, CA', tags: ['optical tracking', 'SDA'] },
      { name: 'Slingshot Aerospace', slug: 'slingshot-aerospace', subsegment: 'Space Situational Awareness', description: 'Space domain awareness and simulation platform for satellite operators and defense.', hq: 'Austin, TX', tags: ['simulation', 'SDA'] },
      { name: 'Hogan Lovells', slug: 'hogan-lovells', subsegment: 'Legal', description: 'International law firm with dedicated space law practice. FCC, FAA, and ITU matters.', hq: 'Washington, DC', tags: ['space law', 'FCC'] },
      { name: 'DLA Piper', slug: 'dla-piper', subsegment: 'Legal', description: 'Global law firm with aerospace and defense practice covering space transactions and regulatory.', hq: 'New York, NY', tags: ['aerospace law', 'transactions'] },
      { name: 'FCC', slug: 'fcc', subsegment: 'Regulatory & Licensing', description: 'US Federal Communications Commission. Licenses spectrum for satellite operators.', hq: 'Washington, DC', tags: ['spectrum', 'licensing'] },
      { name: 'FAA / AST', slug: 'faa-ast', subsegment: 'Regulatory & Licensing', description: 'FAA Office of Commercial Space Transportation. Licenses commercial launches and reentries.', hq: 'Washington, DC', tags: ['launch licensing', 'reentry'] },
    ],
  },
];

// ────────────────────────────────────────────────────────────────
// Company Card
// ────────────────────────────────────────────────────────────────

function EcoCompanyCard({
  company,
  segmentColor,
}: {
  company: EcosystemCompany;
  segmentColor: string;
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      className="relative bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600/70 transition-all cursor-pointer group"
      onMouseEnter={() => setShowDetails(true)}
      onMouseLeave={() => setShowDetails(false)}
      onClick={() => setShowDetails(!showDetails)}
    >
      <Link
        href={`/company-profiles/${company.slug}`}
        className="font-medium text-white text-sm hover:underline decoration-cyan-400/50 underline-offset-2"
        onClick={(e) => e.stopPropagation()}
      >
        {company.name}
      </Link>
      <div className="text-xs text-slate-500 mt-0.5">{company.subsegment}</div>

      {company.tags && (
        <div className="flex flex-wrap gap-1 mt-2">
          {company.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[9px] px-1.5 py-0.5 rounded"
              style={{ backgroundColor: `${segmentColor}15`, color: segmentColor }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Hover tooltip */}
      {showDetails && (
        <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-slate-900/95 border border-slate-600/50 rounded-lg p-3 shadow-xl backdrop-blur-sm">
          <p className="text-slate-300 text-xs leading-relaxed mb-2">{company.description}</p>
          {company.hq && (
            <div className="text-[10px] text-slate-500">HQ: {company.hq}</div>
          )}
          <Link
            href={`/company-profiles/${company.slug}`}
            className="text-[10px] text-cyan-400 hover:text-cyan-300 mt-1 inline-block"
          >
            View full profile
          </Link>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Connector Arrow
// ────────────────────────────────────────────────────────────────

function FlowArrow({ fromColor, toColor }: { fromColor: string; toColor: string }) {
  return (
    <div className="flex justify-center py-3">
      <div className="relative">
        <svg width="40" height="48" viewBox="0 0 40 48" fill="none">
          <defs>
            <linearGradient id={`grad-${fromColor}-${toColor}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fromColor} stopOpacity="0.6" />
              <stop offset="100%" stopColor={toColor} stopOpacity="0.6" />
            </linearGradient>
          </defs>
          <line
            x1="20" y1="0" x2="20" y2="36"
            stroke={`url(#grad-${fromColor}-${toColor})`}
            strokeWidth="2"
            strokeDasharray="4 3"
          />
          <polygon
            points="12,36 20,48 28,36"
            fill={toColor}
            opacity="0.6"
          />
        </svg>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Segment Section
// ────────────────────────────────────────────────────────────────

function SegmentSection({
  segment,
  activeSubsegment,
  onSubsegmentChange,
}: {
  segment: EcosystemSegment;
  activeSubsegment: string;
  onSubsegmentChange: (sub: string) => void;
}) {
  const filteredCompanies = activeSubsegment === 'all'
    ? segment.companies
    : segment.companies.filter((c) => c.subsegment === activeSubsegment);

  return (
    <div className={`${segment.bgColor} border ${segment.borderColor} rounded-2xl p-6 relative`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${segment.color}20` }}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke={segment.color}
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d={segment.iconPath} />
          </svg>
        </div>
        <div>
          <h2 className={`text-xl font-bold ${segment.textColor}`}>{segment.label}</h2>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full ml-auto"
          style={{ backgroundColor: `${segment.color}15`, color: segment.color }}
        >
          {segment.companies.length} companies
        </span>
      </div>
      <p className="text-slate-400 text-sm mb-4 max-w-3xl">{segment.description}</p>

      {/* Subsegment filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => onSubsegmentChange('all')}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
            activeSubsegment === 'all'
              ? `text-white`
              : 'bg-slate-700/50 text-slate-400 hover:text-white'
          }`}
          style={activeSubsegment === 'all' ? { backgroundColor: segment.color } : undefined}
        >
          All
        </button>
        {segment.subsegments.map((sub) => {
          const count = segment.companies.filter((c) => c.subsegment === sub).length;
          return (
            <button
              key={sub}
              onClick={() => onSubsegmentChange(sub)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeSubsegment === sub
                  ? 'text-white'
                  : 'bg-slate-700/50 text-slate-400 hover:text-white'
              }`}
              style={activeSubsegment === sub ? { backgroundColor: segment.color } : undefined}
            >
              {sub} ({count})
            </button>
          );
        })}
      </div>

      {/* Company grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {filteredCompanies.map((company) => (
          <EcoCompanyCard
            key={company.slug}
            company={company}
            segmentColor={segment.color}
          />
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────────────────

export default function EcosystemMapPage() {
  const [subsegmentFilters, setSubsegmentFilters] = useState<Record<SegmentId, string>>({
    upstream: 'all',
    midstream: 'all',
    downstream: 'all',
    'cross-cutting': 'all',
  });
  const [searchQuery, setSearchQuery] = useState('');

  const allCompanies = useMemo(() => {
    return ECOSYSTEM_SEGMENTS.flatMap((s) => s.companies);
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery) return null;
    const q = searchQuery.toLowerCase();
    return allCompanies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.subsegment.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }, [searchQuery, allCompanies]);

  const totalCompanies = allCompanies.length;

  return (
    <div className="min-h-screen bg-space-900 py-8">
      <BreadcrumbSchema
        items={[
          { name: 'Home', href: '/' },
          { name: 'Ecosystem Map' },
        ]}
      />
      <ItemListSchema
        name="Space Industry Ecosystem Map"
        description="Visual map of the space industry value chain showing upstream, midstream, downstream, and cross-cutting segments"
        url="/ecosystem-map"
        items={ECOSYSTEM_SEGMENTS.map((s) => ({
          name: s.label,
          url: `/ecosystem-map#${s.id}`,
          description: s.description,
        }))}
      />
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Space Industry Ecosystem Map"
          subtitle={`How ${totalCompanies}+ companies connect across the space economy value chain`}
          icon="M"
          accentColor="purple"
        />

        {/* Overview */}
        <ScrollReveal>
          <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20 rounded-xl p-5 mb-8">
            <p className="text-slate-300 text-sm leading-relaxed">
              The space industry operates as a <strong className="text-purple-400">multi-layered value chain</strong>.{' '}
              <strong className="text-amber-400">Upstream</strong> companies provide raw materials and components that flow to{' '}
              <strong className="text-cyan-400">midstream</strong> manufacturers and launch providers. These enable{' '}
              <strong className="text-purple-400">downstream</strong> operators and data companies to deliver services to
              end users. <strong className="text-emerald-400">Cross-cutting</strong> services like insurance, regulatory,
              and finance support the entire chain. Click any company to view their full profile.
            </p>
          </div>
        </ScrollReveal>

        {/* Segment stats */}
        <ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {ECOSYSTEM_SEGMENTS.map((seg) => (
              <div
                key={seg.id}
                className={`${seg.bgColor} border ${seg.borderColor} rounded-xl p-4 text-center`}
              >
                <div className={`text-2xl font-bold ${seg.textColor}`}>{seg.companies.length}</div>
                <div className="text-slate-400 text-xs mt-1">{seg.label}</div>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Search */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-8">
          <input
            type="text"
            aria-label="Search companies across the ecosystem"
            placeholder="Search companies by name, segment, or capability..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Search results */}
        {searchResults && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium text-sm">
                {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} for &quot;{searchQuery}&quot;
              </h3>
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                Clear search
              </button>
            </div>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {searchResults.map((company) => {
                  const segment = ECOSYSTEM_SEGMENTS.find((s) =>
                    s.companies.some((c) => c.slug === company.slug)
                  );
                  return (
                    <EcoCompanyCard
                      key={company.slug}
                      company={company}
                      segmentColor={segment?.color || '#94a3b8'}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-400 text-sm text-center py-8">
                No companies found matching your search.
              </p>
            )}
          </div>
        )}

        {/* Value Chain Flow — only show when not searching */}
        {!searchResults && (
          <div className="space-y-0">
            {ECOSYSTEM_SEGMENTS.map((segment, index) => (
              <React.Fragment key={segment.id}>
                <ScrollReveal>
                  <div id={segment.id}>
                    <SegmentSection
                      segment={segment}
                      activeSubsegment={subsegmentFilters[segment.id]}
                      onSubsegmentChange={(sub) =>
                        setSubsegmentFilters((prev) => ({ ...prev, [segment.id]: sub }))
                      }
                    />
                  </div>
                </ScrollReveal>

                {/* Flow arrow between segments */}
                {index < ECOSYSTEM_SEGMENTS.length - 1 && (
                  <FlowArrow
                    fromColor={segment.color}
                    toColor={ECOSYSTEM_SEGMENTS[index + 1].color}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* ──── HOW THE VALUE CHAIN WORKS ──── */}
        <div className="mt-12 pt-8 border-t border-slate-700/50">
          <h2 className="text-xl font-bold text-white mb-6">How the Space Value Chain Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
              <h3 className="text-amber-400 font-semibold mb-2">Upstream to Midstream</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Component manufacturers like Moog and Aerojet Rocketdyne supply reaction wheels, thrusters,
                and propulsion systems to satellite builders (Northrop Grumman, Lockheed Martin) and launch
                vehicle manufacturers (SpaceX, Rocket Lab). Raw materials companies provide specialty alloys,
                semiconductors, and composite materials.
              </p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
              <h3 className="text-cyan-400 font-semibold mb-2">Midstream to Downstream</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Launch providers deliver satellites to orbit for operators like SES and Planet Labs. Ground
                equipment manufacturers (L3Harris, KSAT) provide the infrastructure to communicate with and
                control these assets. Satellite data then flows to analytics platforms serving end users.
              </p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
              <h3 className="text-purple-400 font-semibold mb-2">Downstream Value Creation</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Downstream companies transform raw satellite data into actionable intelligence. Planet Labs
                imagery powers agriculture monitoring, Capella Space SAR enables defense analytics, and
                Spire Global data feeds weather forecasting. This is where most commercial revenue is generated.
              </p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
              <h3 className="text-emerald-400 font-semibold mb-2">Cross-Cutting Enablers</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                The ecosystem depends on cross-cutting services: insurance underwriters assess and cover launch
                risk, regulatory bodies (FCC, FAA) license operations, space domain awareness companies track
                objects to prevent collisions, and specialized investors fund the entire value chain.
              </p>
            </div>
          </div>
        </div>

        {/* ──── MARKET SIZE ──── */}
        <ScrollReveal>
          <div className="mt-8 bg-gradient-to-r from-slate-800/80 to-slate-700/80 border border-slate-600/50 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-3">Space Economy by the Numbers (2025)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-400">$546B</div>
                <div className="text-slate-400 text-xs mt-1">Global Space Economy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">73%</div>
                <div className="text-slate-400 text-xs mt-1">Downstream Revenue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-400">$14.5B</div>
                <div className="text-slate-400 text-xs mt-1">VC Investment (2024)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">12,000+</div>
                <div className="text-slate-400 text-xs mt-1">Active Satellites</div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* ──── RELATED RESOURCES ──── */}
        <div className="mt-8 pt-8 border-t border-slate-700/50">
          <h3 className="text-slate-400 text-sm font-medium mb-4">Related Resources</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/company-profiles"
              className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 hover:text-white hover:border-purple-500/50 transition-all"
            >
              Company Profiles
            </Link>
            <Link
              href="/salary-benchmarks"
              className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 hover:text-white hover:border-purple-500/50 transition-all"
            >
              Salary Benchmarks
            </Link>
            <Link
              href="/market-intel"
              className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 hover:text-white hover:border-purple-500/50 transition-all"
            >
              Market Intelligence
            </Link>
            <Link
              href="/marketplace"
              className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 hover:text-white hover:border-purple-500/50 transition-all"
            >
              Marketplace
            </Link>
            <Link
              href="/business-opportunities"
              className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 hover:text-white hover:border-purple-500/50 transition-all"
            >
              Business Opportunities
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
