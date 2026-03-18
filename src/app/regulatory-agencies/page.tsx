'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ─── Types ──────────────────────────────────────────────────────────────────

interface RegulatoryAgency {
  name: string;
  abbreviation: string;
  jurisdiction: 'US' | 'International' | 'UK' | 'France' | 'Germany' | 'Italy' | 'Japan' | 'India' | 'China' | 'South Korea' | 'EU';
  regulatoryArea: string[];
  description: string;
  website: string;
  keyOffice?: string;
  parentAgency?: string;
}

type JurisdictionFilter = 'all' | 'US' | 'International' | 'National';
type AreaFilter = 'all' | 'launch' | 'spectrum' | 'remote-sensing' | 'export-control' | 'space-operations' | 'defense' | 'consumer-protection' | 'policy';

// ─── Data ───────────────────────────────────────────────────────────────────

const AGENCIES: RegulatoryAgency[] = [
  // ── United States ──
  {
    name: 'Office of Commercial Space Transportation',
    abbreviation: 'FAA AST',
    jurisdiction: 'US',
    regulatoryArea: ['launch', 'space-operations'],
    description: 'Licenses and regulates commercial launch and reentry operations, launch sites, and reentry sites. Administers Part 450 streamlined licensing framework for all commercial space transportation activities.',
    website: 'https://www.faa.gov/space',
    keyOffice: 'Associate Administrator for Commercial Space Transportation',
    parentAgency: 'Federal Aviation Administration (FAA), Department of Transportation',
  },
  {
    name: 'Space Bureau',
    abbreviation: 'FCC Space Bureau',
    jurisdiction: 'US',
    regulatoryArea: ['spectrum', 'space-operations'],
    description: 'Licenses satellite systems, manages spectrum allocations for space services, enforces orbital debris mitigation rules (5-year deorbit), processes NGSO processing rounds, and grants market access for non-U.S. satellite systems. Created in 2023.',
    website: 'https://www.fcc.gov/space',
    keyOffice: 'Chief, Space Bureau',
    parentAgency: 'Federal Communications Commission (FCC)',
  },
  {
    name: 'Commercial Remote Sensing Regulatory Affairs',
    abbreviation: 'NOAA CRSRA',
    jurisdiction: 'US',
    regulatoryArea: ['remote-sensing'],
    description: 'Licenses commercial remote sensing satellite systems under the Land Remote Sensing Policy Act. Administers the three-tier licensing system, shutter control authority, and data distribution conditions for Earth observation satellites.',
    website: 'https://www.nesdis.noaa.gov/CRSRA',
    keyOffice: 'Director, Commercial Remote Sensing Regulatory Affairs',
    parentAgency: 'National Oceanic and Atmospheric Administration (NOAA), Department of Commerce',
  },
  {
    name: 'Bureau of Industry and Security',
    abbreviation: 'BIS',
    jurisdiction: 'US',
    regulatoryArea: ['export-control'],
    description: 'Administers Export Administration Regulations (EAR) controlling dual-use space technology on the Commerce Control List. Manages 600 series items (satellite components moved from USML), end-use controls, and denied party screening.',
    website: 'https://www.bis.gov',
    keyOffice: 'Under Secretary for Industry and Security',
    parentAgency: 'Department of Commerce',
  },
  {
    name: 'Directorate of Defense Trade Controls',
    abbreviation: 'DDTC',
    jurisdiction: 'US',
    regulatoryArea: ['export-control'],
    description: 'Administers International Traffic in Arms Regulations (ITAR) controlling defense articles on the United States Munitions List. Registers manufacturers/exporters, processes export licenses for launch vehicles, satellites, and defense-related space technology.',
    website: 'https://www.pmddtc.state.gov',
    keyOffice: 'Deputy Assistant Secretary for Defense Trade Controls',
    parentAgency: 'Bureau of Political-Military Affairs, Department of State',
  },
  {
    name: 'National Aeronautics and Space Administration',
    abbreviation: 'NASA',
    jurisdiction: 'US',
    regulatoryArea: ['space-operations', 'policy'],
    description: 'While primarily an operational agency, NASA sets standards for commercial crew and cargo programs, manages the Artemis Accords for international space cooperation, and administers planetary protection protocols. Issues launch service task orders and human spaceflight requirements.',
    website: 'https://www.nasa.gov',
    keyOffice: 'NASA Administrator',
  },
  {
    name: 'United States Space Force',
    abbreviation: 'USSF',
    jurisdiction: 'US',
    regulatoryArea: ['defense', 'space-operations'],
    description: 'Operates the Space Surveillance Network tracking 40,000+ orbital objects. Manages Eastern Range (Cape Canaveral/KSC) and Western Range (Vandenberg) used for commercial launches. Provides conjunction assessments and space domain awareness.',
    website: 'https://www.spaceforce.mil',
    keyOffice: 'Chief of Space Operations',
    parentAgency: 'Department of the Air Force, Department of Defense',
  },
  {
    name: 'National Reconnaissance Office',
    abbreviation: 'NRO',
    jurisdiction: 'US',
    regulatoryArea: ['defense', 'remote-sensing'],
    description: 'Designs, builds, launches, and operates reconnaissance satellites for the U.S. Intelligence Community. While classified, NRO policies influence commercial remote sensing licensing conditions and shutter control decisions through interagency review.',
    website: 'https://www.nro.gov',
    keyOffice: 'Director, NRO',
    parentAgency: 'Department of Defense / Intelligence Community',
  },
  {
    name: 'Federal Trade Commission',
    abbreviation: 'FTC',
    jurisdiction: 'US',
    regulatoryArea: ['consumer-protection'],
    description: 'Enforces consumer protection and antitrust laws applicable to space companies. Relevant for satellite broadband advertising claims, merger review of space industry consolidation, and data privacy for satellite-derived personal information.',
    website: 'https://www.ftc.gov',
    keyOffice: 'Chair, FTC',
  },

  // ── International Organizations ──
  {
    name: 'International Telecommunication Union',
    abbreviation: 'ITU',
    jurisdiction: 'International',
    regulatoryArea: ['spectrum'],
    description: 'UN specialized agency that manages global radio spectrum and satellite orbital resources. Maintains the Master International Frequency Register, processes satellite network filings (API, coordination, notification), and hosts the World Radiocommunication Conference (WRC) every 3-4 years.',
    website: 'https://www.itu.int',
    keyOffice: 'Director, Radiocommunication Bureau (BR)',
  },
  {
    name: 'Committee on the Peaceful Uses of Outer Space',
    abbreviation: 'COPUOS',
    jurisdiction: 'International',
    regulatoryArea: ['policy'],
    description: 'UN committee that develops the international legal framework for space activities. Administers the five UN space treaties (Outer Space Treaty, Liability Convention, Registration Convention, Moon Agreement, Rescue Agreement) and develops guidelines for long-term sustainability of space activities.',
    website: 'https://www.unoosa.org/oosa/en/ourwork/copuos/index.html',
    keyOffice: 'Chair, COPUOS',
    parentAgency: 'United Nations Office for Outer Space Affairs (UNOOSA)',
  },
  {
    name: 'United Nations Office for Outer Space Affairs',
    abbreviation: 'UNOOSA',
    jurisdiction: 'International',
    regulatoryArea: ['policy'],
    description: 'Serves as the secretariat for COPUOS and maintains the UN Register of Objects Launched into Outer Space. Provides capacity-building for developing countries in space law and policy, and promotes international cooperation in space science and technology.',
    website: 'https://www.unoosa.org',
    keyOffice: 'Director, UNOOSA',
    parentAgency: 'United Nations',
  },
  {
    name: 'European Space Agency',
    abbreviation: 'ESA',
    jurisdiction: 'International',
    regulatoryArea: ['space-operations', 'policy'],
    description: 'Intergovernmental organization with 22 member states. While primarily a programmatic agency, ESA sets technical standards for its missions, manages the European Space Operations Centre (ESOC), and develops space sustainability policies including the Zero Debris Charter.',
    website: 'https://www.esa.int',
    keyOffice: 'Director General, ESA',
  },
  {
    name: 'European Organisation for the Exploitation of Meteorological Satellites',
    abbreviation: 'EUMETSAT',
    jurisdiction: 'International',
    regulatoryArea: ['remote-sensing', 'space-operations'],
    description: 'Intergovernmental organization operating meteorological satellites for 30 European member states. Sets data policies for weather satellite imagery, manages the Meteosat (GEO) and MetOp/EPS (LEO) satellite programs, and coordinates with WMO on global observing systems.',
    website: 'https://www.eumetsat.int',
    keyOffice: 'Director-General, EUMETSAT',
  },

  // ── National Agencies ──
  {
    name: 'Civil Aviation Authority / UK Space Agency',
    abbreviation: 'UK CAA',
    jurisdiction: 'UK',
    regulatoryArea: ['launch', 'space-operations'],
    description: 'Regulates commercial space activities under the Space Industry Act 2018. Licenses launch operations (including SaxaVord Spaceport), satellite operations, and range control. The UK Space Agency sets policy while the CAA handles licensing and safety regulation.',
    website: 'https://www.caa.co.uk/space',
    keyOffice: 'Head of Space Regulation, CAA',
  },
  {
    name: 'Office of Communications',
    abbreviation: 'Ofcom',
    jurisdiction: 'UK',
    regulatoryArea: ['spectrum'],
    description: 'UK communications regulator responsible for spectrum allocation and satellite licensing. Manages UK satellite filings to the ITU, grants earth station licenses, and coordinates spectrum for commercial satellite operators including OneWeb.',
    website: 'https://www.ofcom.org.uk',
    keyOffice: 'Director of Spectrum Management',
  },
  {
    name: 'Centre National d\'Etudes Spatiales',
    abbreviation: 'CNES',
    jurisdiction: 'France',
    regulatoryArea: ['launch', 'space-operations', 'policy'],
    description: 'French space agency responsible for national space policy and regulation. Operates the Guiana Space Centre (CSG) in Kourou, licenses French satellite operations under the 2008 Space Operations Act, and conducts space surveillance. Also serves as the technical authority for Arianespace launches.',
    website: 'https://cnes.fr',
    keyOffice: 'President, CNES',
  },
  {
    name: 'German Aerospace Center',
    abbreviation: 'DLR',
    jurisdiction: 'Germany',
    regulatoryArea: ['space-operations', 'remote-sensing'],
    description: 'Germany\'s national space agency and aeronautics research center. Manages Germany\'s space program, operates the German Space Operations Center (GSOC), and oversees satellite operations licensing. Also operates the TerraSAR-X and TanDEM-X radar satellite missions.',
    website: 'https://www.dlr.de',
    keyOffice: 'Chairman of the Executive Board, DLR',
  },
  {
    name: 'Italian Space Agency',
    abbreviation: 'ASI',
    jurisdiction: 'Italy',
    regulatoryArea: ['space-operations', 'policy'],
    description: 'Italy\'s national space agency coordinating Italian space activities and participation in ESA programs. Manages the COSMO-SkyMed SAR constellation, operates the Broglio Space Centre (San Marco) in Kenya, and coordinates Italian space industry participation in international programs.',
    website: 'https://www.asi.it',
    keyOffice: 'President, ASI',
  },
  {
    name: 'Japan Aerospace Exploration Agency',
    abbreviation: 'JAXA',
    jurisdiction: 'Japan',
    regulatoryArea: ['launch', 'space-operations', 'policy'],
    description: 'Japan\'s national space agency responsible for space development and utilization. Operates the Tanegashima Space Center and Uchinoura Space Center. Manages Japan\'s H3 launch vehicle, the QZSS navigation constellation, and coordinates Japan\'s space activities under the 2008 Basic Space Law.',
    website: 'https://www.jaxa.jp',
    keyOffice: 'President, JAXA',
  },
  {
    name: 'Indian Space Research Organisation',
    abbreviation: 'ISRO',
    jurisdiction: 'India',
    regulatoryArea: ['launch', 'space-operations', 'policy'],
    description: 'India\'s national space agency and the primary body for space activities. Operates the Satish Dhawan Space Centre (SHAR) and manages India\'s launch vehicles (PSLV, GSLV, LVM3), communication satellites, and Earth observation programs. India\'s 2023 space policy opened the sector to private companies under IN-SPACe regulation.',
    website: 'https://www.isro.gov.in',
    keyOffice: 'Chairman, ISRO / Secretary, Department of Space',
  },
  {
    name: 'China National Space Administration',
    abbreviation: 'CNSA',
    jurisdiction: 'China',
    regulatoryArea: ['launch', 'space-operations', 'policy'],
    description: 'China\'s governmental space agency responsible for national space policy and international cooperation. Manages China\'s space program including the Long March launch vehicles, Tiangong space station, Chang\'e lunar missions, and BeiDou navigation system. China\'s rapidly growing commercial space sector operates under CNSA regulatory oversight.',
    website: 'https://www.cnsa.gov.cn',
    keyOffice: 'Administrator, CNSA',
  },
  {
    name: 'Korea Aerospace Research Institute',
    abbreviation: 'KARI',
    jurisdiction: 'South Korea',
    regulatoryArea: ['launch', 'space-operations'],
    description: 'South Korea\'s aerospace research institute responsible for space development. Developed the Nuri (KSLV-II) launch vehicle and operates the Naro Space Center. South Korea\'s space activities are governed by the Space Development Promotion Act (2005) and the emerging Korea AeroSpace Administration (KASA) established in 2024.',
    website: 'https://www.kari.re.kr',
    keyOffice: 'President, KARI',
  },
];

// ─── Filter Configurations ──────────────────────────────────────────────────

const JURISDICTION_OPTIONS: { value: JurisdictionFilter; label: string }[] = [
  { value: 'all', label: 'All Jurisdictions' },
  { value: 'US', label: 'United States' },
  { value: 'International', label: 'International' },
  { value: 'National', label: 'National Agencies' },
];

const AREA_OPTIONS: { value: AreaFilter; label: string }[] = [
  { value: 'all', label: 'All Areas' },
  { value: 'launch', label: 'Launch Licensing' },
  { value: 'spectrum', label: 'Spectrum & Frequency' },
  { value: 'remote-sensing', label: 'Remote Sensing' },
  { value: 'export-control', label: 'Export Controls' },
  { value: 'space-operations', label: 'Space Operations' },
  { value: 'defense', label: 'Defense & Security' },
  { value: 'consumer-protection', label: 'Consumer Protection' },
  { value: 'policy', label: 'Policy & Treaties' },
];

const AREA_COLORS: Record<string, string> = {
  'launch': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'spectrum': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'remote-sensing': 'bg-green-500/20 text-green-300 border-green-500/30',
  'export-control': 'bg-red-500/20 text-red-300 border-red-500/30',
  'space-operations': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'defense': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  'consumer-protection': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  'policy': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
};

const JURISDICTION_FLAGS: Record<string, string> = {
  'US': 'US',
  'International': 'INTL',
  'UK': 'UK',
  'France': 'FR',
  'Germany': 'DE',
  'Italy': 'IT',
  'Japan': 'JP',
  'India': 'IN',
  'China': 'CN',
  'South Korea': 'KR',
  'EU': 'EU',
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function RegulatoryAgenciesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [jurisdictionFilter, setJurisdictionFilter] = useState<JurisdictionFilter>('all');
  const [areaFilter, setAreaFilter] = useState<AreaFilter>('all');

  const filteredAgencies = useMemo(() => {
    return AGENCIES.filter((agency) => {
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          agency.name.toLowerCase().includes(q) ||
          agency.abbreviation.toLowerCase().includes(q) ||
          agency.description.toLowerCase().includes(q) ||
          agency.jurisdiction.toLowerCase().includes(q) ||
          (agency.parentAgency && agency.parentAgency.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      // Jurisdiction filter
      if (jurisdictionFilter !== 'all') {
        if (jurisdictionFilter === 'National') {
          if (agency.jurisdiction === 'US' || agency.jurisdiction === 'International') return false;
        } else {
          if (agency.jurisdiction !== jurisdictionFilter) return false;
        }
      }

      // Area filter
      if (areaFilter !== 'all') {
        if (!agency.regulatoryArea.includes(areaFilter)) return false;
      }

      return true;
    });
  }, [searchQuery, jurisdictionFilter, areaFilter]);

  // Group by jurisdiction for display
  const grouped = useMemo(() => {
    const groups: Record<string, RegulatoryAgency[]> = {};
    filteredAgencies.forEach((agency) => {
      const key = agency.jurisdiction === 'US' ? 'United States' :
                  agency.jurisdiction === 'International' ? 'International Organizations' :
                  'National Agencies';
      if (!groups[key]) groups[key] = [];
      groups[key].push(agency);
    });
    return groups;
  }, [filteredAgencies]);

  const relatedModules = PAGE_RELATIONS['regulatory-agencies'] || PAGE_RELATIONS['compliance'] || [];

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-white/[0.06]">
        <div className="container mx-auto px-4 py-10">
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <span className="text-white">Regulatory Agencies</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Space Regulatory Agencies: Complete Directory
          </h1>
          <p className="text-slate-400 text-lg max-w-3xl">
            Every government agency and international body that regulates space activities — from launch licensing and spectrum allocation to export controls and remote sensing. Searchable by jurisdiction and area of regulation.
          </p>
          <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
            <span>{AGENCIES.length} agencies</span>
            <span>|</span>
            <span>{filteredAgencies.length} shown</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search agencies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 text-sm transition-colors"
            />
          </div>

          {/* Jurisdiction filter */}
          <select
            value={jurisdictionFilter}
            onChange={(e) => setJurisdictionFilter(e.target.value as JurisdictionFilter)}
            className="px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none focus:border-white/20 cursor-pointer appearance-none min-w-[180px]"
          >
            {JURISDICTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                {opt.label}
              </option>
            ))}
          </select>

          {/* Area filter */}
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value as AreaFilter)}
            className="px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none focus:border-white/20 cursor-pointer appearance-none min-w-[180px]"
          >
            {AREA_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Results */}
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 text-lg mb-2">No agencies match your filters.</p>
            <button
              onClick={() => { setSearchQuery(''); setJurisdictionFilter('all'); setAreaFilter('all'); }}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(grouped).map(([groupName, agencies]) => (
              <div key={groupName}>
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-xs font-mono text-slate-400">
                    {agencies.length}
                  </span>
                  {groupName}
                </h2>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {agencies.map((agency) => (
                    <div
                      key={agency.abbreviation}
                      className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 hover:bg-white/[0.04] hover:border-white/[0.10] transition-all duration-200 group"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-400 border border-white/[0.06]">
                              {JURISDICTION_FLAGS[agency.jurisdiction] || agency.jurisdiction}
                            </span>
                            <h3 className="text-base font-semibold text-white truncate">
                              {agency.abbreviation}
                            </h3>
                          </div>
                          <p className="text-sm text-slate-400 leading-snug">
                            {agency.name}
                          </p>
                        </div>
                      </div>

                      {/* Regulatory areas */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {agency.regulatoryArea.map((area) => (
                          <span
                            key={area}
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${AREA_COLORS[area] || 'bg-white/10 text-slate-300 border-white/10'}`}
                          >
                            {AREA_OPTIONS.find((o) => o.value === area)?.label || area}
                          </span>
                        ))}
                      </div>

                      {/* Description */}
                      <p className="text-sm text-slate-400 leading-relaxed mb-3 line-clamp-3">
                        {agency.description}
                      </p>

                      {/* Meta */}
                      {agency.parentAgency && (
                        <p className="text-xs text-slate-500 mb-2">
                          <span className="text-slate-600">Parent:</span> {agency.parentAgency}
                        </p>
                      )}
                      {agency.keyOffice && (
                        <p className="text-xs text-slate-500 mb-3">
                          <span className="text-slate-600">Key contact:</span> {agency.keyOffice}
                        </p>
                      )}

                      {/* Link */}
                      <a
                        href={agency.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors group-hover:underline"
                      >
                        {agency.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Related modules */}
        {relatedModules.length > 0 && (
          <div className="mt-16 border-t border-white/[0.06] pt-8">
            <h2 className="text-lg font-semibold text-white mb-4">Related Modules</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {relatedModules.slice(0, 5).map((mod) => (
                <Link
                  key={mod.href}
                  href={mod.href}
                  className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 hover:bg-white/[0.04] hover:border-white/[0.10] transition-all text-center"
                >
                  <span className="text-2xl mb-1 block">{mod.icon}</span>
                  <span className="text-sm font-medium text-white block">{mod.name}</span>
                  <span className="text-xs text-slate-500">{mod.description}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-white/[0.08] rounded-xl p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Track Regulatory Changes in Real Time</h2>
          <p className="text-slate-400 mb-4 max-w-xl mx-auto">
            SpaceNexus monitors compliance deadlines, licensing requirements, and policy changes across all major space regulatory agencies.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/compliance"
              className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-sm font-medium transition-colors"
            >
              Explore Compliance Hub
            </Link>
            <Link
              href="/regulatory-calendar"
              className="px-5 py-2.5 bg-white/[0.06] hover:bg-white/[0.10] text-white rounded-lg text-sm font-medium transition-colors border border-white/[0.08]"
            >
              Regulatory Calendar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
