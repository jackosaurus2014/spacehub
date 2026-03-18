'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import EmptyState from '@/components/ui/EmptyState';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClassificationEntry {
  id: string;
  category: string;
  subcategory?: string;
  description: string;
  regime: 'ITAR' | 'EAR';
  controlledItems: string[];
  examples: string[];
  licenseRequirements: string;
  notes: string;
  searchTerms: string[];
}

// ---------------------------------------------------------------------------
// Data -- ITAR USML & EAR ECCN classifications relevant to space
// ---------------------------------------------------------------------------

const CLASSIFICATIONS: ClassificationEntry[] = [
  // ── ITAR / USML ──────────────────────────────────────────────────────────
  {
    id: 'usml-iv',
    category: 'USML Category IV',
    subcategory: 'Launch Vehicles, Guided Missiles, Ballistic Missiles, Rockets, Torpedoes, Bombs, and Mines',
    description:
      'Covers launch vehicles and their major components, including sounding rockets, space launch vehicles (SLVs), and reusable launch vehicles. This is one of the most heavily controlled categories for the space industry.',
    regime: 'ITAR',
    controlledItems: [
      'Complete launch vehicles and space launch vehicles',
      'Rocket motors and engines (liquid and solid) specially designed for items in this category',
      'Re-entry vehicles and warheads',
      'Guidance sets, integrated flight control systems',
      'Rocket nozzles, thrust vector control systems',
      'Staging mechanisms and separation systems',
      'Propellant tanks and insulation specially designed for LVs',
      'Launch support equipment specifically designed for this category',
    ],
    examples: [
      'Falcon 9 first/second stages (prior to export)',
      'Solid rocket boosters (SRBs)',
      'Turbopump assemblies for rocket engines',
      'Inertial measurement units (IMUs) for launch vehicles',
      'Ablative nozzle materials and designs',
      'Payload fairings for launch vehicles',
    ],
    licenseRequirements:
      'DSP-5 (permanent export), DSP-73 (temporary export), or TAA (Technical Assistance Agreement) required. No license exceptions. Congressional notification required for exports exceeding $14M (major defense equipment) or $50M (defense articles/services). Mandatory DDTC registration.',
    notes:
      'Category IV items were moved back to USML from CCL in 2020, reversing an Obama-era reform. This is "Significant Military Equipment" (SME), triggering enhanced scrutiny and Congressional reporting.',
    searchTerms: ['launch vehicle', 'rocket', 'rocket motor', 'rocket engine', 'solid rocket', 'liquid rocket', 'sounding rocket', 'SLV', 'booster', 'propulsion', 'nozzle', 'turbopump', 'thrust vector', 'guidance', 'IMU', 'fairing'],
  },
  {
    id: 'usml-xi',
    category: 'USML Category XI',
    subcategory: 'Military Electronics',
    description:
      'Covers electronic equipment and systems specifically designed for military or intelligence applications. Relevant to space for classified satellite subsystems, secure communications, and military space electronics.',
    regime: 'ITAR',
    controlledItems: [
      'Electronic warfare systems and equipment',
      'Cryptographic devices and software',
      'Radiation-hardened electronics for military applications',
      'Secure communication systems for military satellites',
      'Signal intelligence (SIGINT) equipment',
      'Electronic countermeasures (ECM) and counter-countermeasures (ECCM)',
      'Military GPS receivers with selective availability anti-spoofing modules (SAASM)',
    ],
    examples: [
      'Rad-hard military-spec processors for defense satellites',
      'Anti-jam satellite communications terminals',
      'Military-grade encryption modules for spacecraft',
      'Electronic warfare payloads for military space systems',
      'SIGINT satellite receiver chains',
    ],
    licenseRequirements:
      'DSP-5 required for permanent export. TAA required for technical data sharing. Some items are designated Significant Military Equipment (SME). Enhanced end-use monitoring may apply.',
    notes:
      'Dual-use electronics (commercial rad-hard parts) are often on the EAR/CCL instead. Items become ITAR-controlled when specifically designed, developed, modified, or configured for a military or intelligence application.',
    searchTerms: ['military electronics', 'electronic warfare', 'EW', 'cryptographic', 'rad-hard', 'radiation hardened', 'SAASM', 'anti-jam', 'SIGINT', 'ECM', 'ECCM', 'encryption', 'military satellite', 'secure comms'],
  },
  {
    id: 'usml-xv',
    category: 'USML Category XV',
    subcategory: 'Spacecraft and Related Articles',
    description:
      'The primary USML category for spacecraft. Covers satellites, spacecraft buses, and components specifically designed for defense or intelligence missions. Note: commercial/civil spacecraft were largely moved to the EAR in the 2014 Export Control Reform, but many items remain on USML.',
    regime: 'ITAR',
    controlledItems: [
      'Spacecraft specifically designed for military or intelligence missions',
      'Spacecraft buses designed for USML payloads',
      'Space-qualified components specifically designed for defense/intel spacecraft',
      'Remote sensing spacecraft with classified capabilities',
      'Space-based interceptors and kinetic kill vehicles',
      'Attitude determination and control systems (ADCS) for USML spacecraft',
      'Command and data handling (C&DH) for USML spacecraft',
      'Thermal control systems specifically designed for USML items',
    ],
    examples: [
      'Defense meteorological satellites (DMSP)',
      'Military communications satellite buses',
      'Space-based infrared surveillance systems (SBIRS) components',
      'Classified imaging payloads',
      'Space situational awareness (SSA) sensor packages for military use',
    ],
    licenseRequirements:
      'DSP-5, DSP-73, or TAA required. Congressional notification thresholds apply. Many items require enhanced end-use monitoring. Launch in or by a foreign country may require additional authorization.',
    notes:
      'The 2014 Export Control Reform moved most commercial/civil spacecraft and components to EAR Category 9. Items remain on USML XV if they are: (a) specifically designed for military/intelligence missions, (b) incorporate classified technology, or (c) have capabilities exceeding certain parameters.',
    searchTerms: ['spacecraft', 'satellite', 'satellite bus', 'ADCS', 'command data handling', 'C&DH', 'SBIRS', 'military satellite', 'defense spacecraft', 'intel satellite', 'space weapon', 'kill vehicle', 'SSA', 'thermal control'],
  },

  // ── EAR / ECCN ───────────────────────────────────────────────────────────
  {
    id: 'ear-cat9',
    category: 'EAR Category 9',
    subcategory: 'Aerospace and Propulsion',
    description:
      'The primary EAR/CCL category for commercial space technology. Covers non-military spacecraft, commercial satellite components, commercial rocket propulsion, and related test equipment. This is where most commercial space hardware is classified following the 2014 Export Control Reform.',
    regime: 'EAR',
    controlledItems: [
      'Commercial spacecraft and spacecraft buses (non-USML)',
      'Spacecraft subsystems: power, thermal, propulsion, ADCS',
      'Space-qualified solar cells and solar arrays',
      'Satellite communication transponders and antennas',
      'Commercial remote sensing payloads and instruments',
      'Electric propulsion systems (ion, Hall-effect)',
      'Launch vehicle ground support equipment (non-USML)',
      'Space simulation and test equipment',
    ],
    examples: [
      'Commercial GEO communications satellites',
      'CubeSat buses and deployers',
      'Space-grade solar panels (non-military)',
      'Hall-effect thrusters for station-keeping',
      'Star trackers and sun sensors',
      'Reaction wheels and momentum wheels',
      'S-band and X-band transponders',
    ],
    licenseRequirements:
      'License requirements vary by destination country, end-use, and end-user. License Exception STA (Strategic Trade Authorization) available for Tier 1 countries (most NATO allies). De minimis rules apply for items with limited U.S.-origin content. EAR99 items generally do not require a license (unless for prohibited end-use/user).',
    notes:
      'Category 9 is divided into subcategories: 9A (Equipment), 9B (Test/Production Equipment), 9C (Materials), 9D (Software), and 9E (Technology). Items "600 series" (e.g., 9A515, 9B515) were moved from USML and receive heightened controls.',
    searchTerms: ['commercial spacecraft', 'satellite bus', 'solar panel', 'solar cell', 'solar array', 'transponder', 'antenna', 'reaction wheel', 'star tracker', 'sun sensor', 'Hall thruster', 'ion thruster', 'electric propulsion', 'CubeSat', 'cubesat', 'deployer', 'momentum wheel'],
  },
  {
    id: 'ear-9a004',
    category: 'ECCN 9A004',
    subcategory: 'Space Launch Vehicles and Spacecraft (non-USML)',
    description:
      'Specifically covers space launch vehicles and spacecraft that are not enumerated on the USML. These are commercial/civil items that were traditionally on the USML but moved to the CCL during export control reform.',
    regime: 'EAR',
    controlledItems: [
      'Space launch vehicles not on USML (commercial variants)',
      'Sounding rockets with civil/commercial applications',
      'Commercial spacecraft not specifically designed for military use',
      'Sub-orbital vehicles for commercial purposes',
    ],
    examples: [
      'Commercial suborbital launch vehicles',
      'University sounding rockets',
      'Civil weather satellite platforms',
      'Commercial LEO constellation spacecraft (non-defense)',
    ],
    licenseRequirements:
      'License required for most destinations (AT-controlled countries). License Exception STA may be available for exports to Tier 1/Tier 2 countries. No license exceptions for designated state sponsors of terrorism or arms-embargoed countries.',
    notes:
      'Items classified under 9A004 are subject to Missile Technology (MT) controls, meaning additional scrutiny and fewer license exceptions. U.S. government review considers proliferation risks.',
    searchTerms: ['9A004', 'commercial launch vehicle', 'sounding rocket', 'suborbital', 'civil spacecraft', 'weather satellite'],
  },
  {
    id: 'ear-9a515',
    category: 'ECCN 9A515',
    subcategory: 'Spacecraft and Related Commodities (600 Series)',
    description:
      'The "600 series" ECCN for spacecraft items that were moved from USML Category XV to the CCL. These items receive heightened controls relative to other EAR items but are less restricted than USML. This is where most commercial satellite components land.',
    regime: 'EAR',
    controlledItems: [
      'Commercial satellite structural components',
      'Satellite propulsion subsystems (non-USML)',
      'Reaction control systems for commercial spacecraft',
      'Satellite thermal control subsystems',
      'Satellite power subsystems and solar arrays',
      'Star trackers, sun sensors, magnetometers',
      'Space-qualified connectors and cabling',
      'Deployable structures (antennas, booms, solar arrays)',
    ],
    examples: [
      'Carbon fiber satellite structural panels',
      'Monopropellant thruster systems',
      'Deployable Ka-band reflector antennas',
      'Space-qualified lithium-ion battery packs',
      'Fluid loop thermal control systems',
      'Solar array drive assemblies (SADAs)',
    ],
    licenseRequirements:
      'License required for most destinations. Regional Stability (RS) column 1 reason for control. License Exception STA available for Tier 1 countries only (not Tier 2). Enhanced controls for items transferred to D:1 or D:5 countries.',
    notes:
      'The 600 series was created specifically for items transitioning from the USML to EAR. They have more restrictive controls than regular EAR items but less than USML. "Specially designed" definition (15 CFR 772.1) is the key determination factor.',
    searchTerms: ['9A515', '600 series', 'satellite component', 'solar array', 'reaction control', 'thruster', 'deployable antenna', 'star tracker', 'battery', 'structural panel', 'SADA', 'thermal control', 'connector', 'cabling'],
  },
  {
    id: 'ear-9e003',
    category: 'ECCN 9E003',
    subcategory: 'Technology for Aerospace and Propulsion',
    description:
      'Controls "technology" (technical data and know-how) for the development, production, or use of items in EAR Category 9. This is particularly significant because sharing technical information (including via email, presentations, or verbal discussions) with foreign persons can constitute a "deemed export."',
    regime: 'EAR',
    controlledItems: [
      'Design methodology and engineering data for spacecraft',
      'Manufacturing process technology for space-qualified components',
      'Test and evaluation methodologies for satellite subsystems',
      'Propulsion system design know-how',
      'Thermal vacuum test procedures and data',
      'Integration and assembly procedures for spacecraft',
      'Orbit determination and flight dynamics software algorithms',
    ],
    examples: [
      'Detailed design drawings for a satellite bus structure',
      'Manufacturing specifications for space-grade solar cells',
      'Thermal model validation data for a spacecraft',
      'Propellant formulation and processing know-how',
      'Vibration test procedures and qualification data',
      'Source code for satellite attitude control algorithms',
    ],
    licenseRequirements:
      'License required for export and deemed export to most destinations. Technology Controls (TE) are a separate reason for control in addition to NS, MT, or RS. Fundamental research exclusion (15 CFR 734.8) applies to basic research at accredited institutions. Published information exclusion may apply for publicly available data.',
    notes:
      'The "deemed export" rule means that sharing controlled technology with a foreign national inside the U.S. requires a license for that person\'s home country. This has major implications for space companies with multinational workforces. Universities may use the fundamental research exclusion for basic (not applied) research.',
    searchTerms: ['9E003', 'technology', 'technical data', 'deemed export', 'design data', 'manufacturing process', 'test data', 'know-how', 'fundamental research', 'source code', 'algorithm', 'engineering data', 'thermal model'],
  },
  {
    id: 'ear-9a010',
    category: 'ECCN 9A010',
    subcategory: 'Reusable Launch Vehicle Structures',
    description:
      'Covers specially designed structures and components for reusable space launch vehicles, including thermal protection systems, landing gear, and airframe structures designed to survive re-entry.',
    regime: 'EAR',
    controlledItems: [
      'Thermal protection systems (TPS) for reusable vehicles',
      'Reusable rocket landing structures and mechanisms',
      'Re-entry heat shields for reusable vehicles',
      'Aerodynamic control surfaces for re-entry',
      'Grid fins and other re-entry guidance structures',
    ],
    examples: [
      'PICA-X heat shield material',
      'Grid fins for booster landing',
      'Carbon-carbon leading edge components',
      'Titanium grid fin assemblies',
      'Deployable landing leg mechanisms',
    ],
    licenseRequirements:
      'License required for most destinations. MT (Missile Technology) controls apply. License Exception STA may be available for select destinations.',
    notes:
      'Growing importance as reusable launch vehicle technology proliferates globally. Items that enable accurate return-to-launch-site or autonomous landing are of particular interest to missile technology control regimes.',
    searchTerms: ['9A010', 'reusable', 'RLV', 'thermal protection', 'TPS', 'heat shield', 'landing', 'grid fin', 'PICA', 'carbon-carbon', 're-entry', 'reentry'],
  },
  {
    id: 'ear-9d515',
    category: 'ECCN 9D515',
    subcategory: 'Software for Spacecraft (600 Series)',
    description:
      'Controls software specially designed for the development, production, operation, or maintenance of items controlled under ECCN 9A515. Includes flight software, ground control software, and simulation tools.',
    regime: 'EAR',
    controlledItems: [
      'Flight software for commercial satellites',
      'Ground control and operations software for spacecraft',
      'Satellite constellation management software',
      'Mission planning and orbit analysis tools (specially designed)',
      'Spacecraft simulation and digital twin software',
      'Telemetry, tracking, and command (TT&C) software',
    ],
    examples: [
      'Satellite bus flight software packages',
      'Constellation orbit management platforms',
      'Spacecraft systems simulation environments',
      'Automated TT&C ground segment software',
      'Satellite payload tasking and scheduling software',
    ],
    licenseRequirements:
      'Same control regime as 9A515 hardware. License Exception STA available for Tier 1 countries. License Exception TSR (Technology and Software under Restriction) may apply for certain software releases.',
    notes:
      'Open-source and publicly available software tools (e.g., GMAT, STK Free) are generally not controlled. The classification depends on whether the software is "specially designed" for controlled items.',
    searchTerms: ['9D515', 'flight software', 'ground control software', 'TT&C', 'mission planning', 'orbit analysis', 'simulation', 'digital twin', 'constellation management', 'satellite software'],
  },
];

// ---------------------------------------------------------------------------
// Quick-search mapping: common item → relevant ECCNs/USML
// ---------------------------------------------------------------------------

const ITEM_SEARCH_MAP: { term: string; displayTerm: string; classificationIds: string[] }[] = [
  { term: 'solar panel', displayTerm: 'Solar Panels / Solar Arrays', classificationIds: ['ear-cat9', 'ear-9a515'] },
  { term: 'reaction wheel', displayTerm: 'Reaction Wheels', classificationIds: ['ear-cat9', 'ear-9a515'] },
  { term: 'star tracker', displayTerm: 'Star Trackers', classificationIds: ['ear-cat9', 'ear-9a515'] },
  { term: 'rocket engine', displayTerm: 'Rocket Engines', classificationIds: ['usml-iv', 'ear-cat9'] },
  { term: 'satellite bus', displayTerm: 'Satellite Bus', classificationIds: ['usml-xv', 'ear-cat9', 'ear-9a515'] },
  { term: 'transponder', displayTerm: 'Communications Transponders', classificationIds: ['ear-cat9', 'ear-9a515'] },
  { term: 'thruster', displayTerm: 'Thrusters (Electric / Chemical)', classificationIds: ['ear-cat9', 'ear-9a515', 'usml-iv'] },
  { term: 'heat shield', displayTerm: 'Heat Shields / TPS', classificationIds: ['ear-9a010', 'usml-iv'] },
  { term: 'cubesat', displayTerm: 'CubeSat Components', classificationIds: ['ear-cat9', 'ear-9a515'] },
  { term: 'encryption', displayTerm: 'Encryption / Crypto Modules', classificationIds: ['usml-xi'] },
  { term: 'guidance', displayTerm: 'Guidance Systems / IMUs', classificationIds: ['usml-iv', 'usml-xi'] },
  { term: 'antenna', displayTerm: 'Spacecraft Antennas', classificationIds: ['ear-cat9', 'ear-9a515'] },
  { term: 'flight software', displayTerm: 'Flight Software', classificationIds: ['ear-9d515'] },
  { term: 'ground control', displayTerm: 'Ground Control Software', classificationIds: ['ear-9d515'] },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type TabId = 'itar' | 'ear';

export default function ExportClassificationsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('itar');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClassifications = useMemo(() => {
    let filtered = CLASSIFICATIONS.filter((c) =>
      activeTab === 'itar' ? c.regime === 'ITAR' : c.regime === 'EAR'
    );

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (c) =>
          c.category.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          (c.subcategory && c.subcategory.toLowerCase().includes(q)) ||
          c.controlledItems.some((item) => item.toLowerCase().includes(q)) ||
          c.examples.some((ex) => ex.toLowerCase().includes(q)) ||
          c.searchTerms.some((t) => t.toLowerCase().includes(q))
      );
    }

    return filtered;
  }, [activeTab, searchQuery]);

  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return ITEM_SEARCH_MAP.filter(
      (item) =>
        item.term.includes(q) ||
        item.displayTerm.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [searchQuery]);

  const handleSuggestionClick = (classificationIds: string[]) => {
    // Find the tab that contains the first result
    const firstMatch = CLASSIFICATIONS.find((c) => classificationIds.includes(c.id));
    if (firstMatch) {
      setActiveTab(firstMatch.regime === 'ITAR' ? 'itar' : 'ear');
    }
    setSearchQuery('');
    // Scroll to first result after a brief delay for tab switch
    setTimeout(() => {
      const el = document.getElementById(classificationIds[0]);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const tabs: { id: TabId; label: string; description: string; count: number }[] = [
    {
      id: 'itar',
      label: 'ITAR / USML',
      description: 'International Traffic in Arms Regulations',
      count: CLASSIFICATIONS.filter((c) => c.regime === 'ITAR').length,
    },
    {
      id: 'ear',
      label: 'EAR / CCL',
      description: 'Export Administration Regulations',
      count: CLASSIFICATIONS.filter((c) => c.regime === 'EAR').length,
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <AnimatedPageHeader
          title="Space Industry Export Control Classifications"
          subtitle="Searchable reference of ITAR USML categories and EAR ECCN codes relevant to the space industry. Understand which export control regime applies to your technology."
        />

        {/* Stats */}
        <ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{CLASSIFICATIONS.length}</div>
              <div className="text-xs text-slate-400 mt-1">Classifications</div>
            </div>
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{CLASSIFICATIONS.filter((c) => c.regime === 'ITAR').length}</div>
              <div className="text-xs text-slate-400 mt-1">USML Categories</div>
            </div>
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{CLASSIFICATIONS.filter((c) => c.regime === 'EAR').length}</div>
              <div className="text-xs text-slate-400 mt-1">ECCN Codes</div>
            </div>
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">2</div>
              <div className="text-xs text-slate-400 mt-1">Control Regimes</div>
            </div>
          </div>
        </ScrollReveal>

        {/* Search Bar */}
        <ScrollReveal>
          <div className="mb-6 relative">
            <div className="relative">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Search by item type (e.g., "solar panels", "rocket engine", "star tracker")...'
                className="w-full pl-10 pr-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-white/[0.2] focus:ring-1 focus:ring-white/[0.1] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Search Suggestions */}
            {searchSuggestions.length > 0 && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-white/[0.1] rounded-xl shadow-xl z-20 overflow-hidden">
                {searchSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion.classificationIds)}
                    className="w-full text-left px-4 py-2.5 hover:bg-white/[0.06] transition-colors flex items-center justify-between"
                  >
                    <span className="text-sm text-white">{suggestion.displayTerm}</span>
                    <div className="flex gap-1.5">
                      {suggestion.classificationIds.map((id) => {
                        const cls = CLASSIFICATIONS.find((c) => c.id === id);
                        return cls ? (
                          <span
                            key={id}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              cls.regime === 'ITAR'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {cls.category.replace('USML ', '').replace('ECCN ', '').replace('EAR ', '')}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* Tabs */}
        <ScrollReveal>
          <div className="flex gap-1 mb-8 border-b border-white/[0.06] pb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors relative ${
                  activeTab === tab.id
                    ? 'text-white bg-white/[0.06]'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      tab.id === 'itar' ? 'bg-red-400' : 'bg-amber-400'
                    }`}
                  />
                  {tab.label}
                  <span className="text-xs text-slate-500">({tab.count})</span>
                </span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/40" />
                )}
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* Regime Description */}
        <ScrollReveal>
          <div className={`p-4 rounded-xl mb-8 border ${
            activeTab === 'itar'
              ? 'bg-red-500/[0.04] border-red-500/[0.15]'
              : 'bg-amber-500/[0.04] border-amber-500/[0.15]'
          }`}>
            <div className="flex items-start gap-3">
              <span className={`text-lg flex-shrink-0 ${activeTab === 'itar' ? 'text-red-400' : 'text-amber-400'}`}>
                {activeTab === 'itar' ? '\u{1F6E1}\uFE0F' : '\u{1F4E6}'}
              </span>
              <div>
                <h3 className={`text-sm font-semibold mb-1 ${activeTab === 'itar' ? 'text-red-300' : 'text-amber-300'}`}>
                  {activeTab === 'itar'
                    ? 'ITAR \u2014 International Traffic in Arms Regulations (22 CFR 120\u2013130)'
                    : 'EAR \u2014 Export Administration Regulations (15 CFR 730\u2013774)'}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {activeTab === 'itar'
                    ? 'Administered by the State Department\'s Directorate of Defense Trade Controls (DDTC). Controls defense articles on the U.S. Munitions List (USML). Registration with DDTC is mandatory for manufacturers and exporters. Violations carry penalties up to $1M per violation and 20 years imprisonment.'
                    : 'Administered by the Commerce Department\'s Bureau of Industry and Security (BIS). Controls dual-use and commercial items on the Commerce Control List (CCL). More flexible license exceptions available. "600 series" items (moved from USML) receive heightened controls.'}
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Results */}
        {filteredClassifications.length > 0 ? (
          <StaggerContainer>
            <div className="space-y-6">
              {filteredClassifications.map((cls) => (
                <StaggerItem key={cls.id}>
                  <div
                    id={cls.id}
                    className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden hover:bg-white/[0.04] transition-colors scroll-mt-24"
                  >
                    {/* Header */}
                    <div className={`px-5 py-3 border-b border-white/[0.06] flex items-center justify-between ${
                      cls.regime === 'ITAR' ? 'bg-red-500/[0.04]' : 'bg-amber-500/[0.04]'
                    }`}>
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                            cls.regime === 'ITAR'
                              ? 'bg-red-500/20 text-red-400 border-red-500/30'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {cls.regime}
                        </span>
                        <h3 className="text-sm font-bold text-white">{cls.category}</h3>
                      </div>
                      <Link
                        href="/compliance"
                        className="text-xs text-slate-400 hover:text-white transition-colors"
                      >
                        View in Compliance Hub &rarr;
                      </Link>
                    </div>

                    {/* Body */}
                    <div className="p-5 space-y-5">
                      {/* Subcategory */}
                      {cls.subcategory && (
                        <p className="text-sm font-medium text-slate-300">{cls.subcategory}</p>
                      )}

                      {/* Description */}
                      <p className="text-sm text-slate-400 leading-relaxed">{cls.description}</p>

                      {/* Two-column layout */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* Controlled Items */}
                        <div>
                          <h4 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
                            Controlled Items
                          </h4>
                          <ul className="space-y-1.5">
                            {cls.controlledItems.map((item, i) => (
                              <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                                <span className="text-white/30 mt-0.5 flex-shrink-0">&bull;</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Examples */}
                        <div>
                          <h4 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
                            Examples of Controlled Items
                          </h4>
                          <ul className="space-y-1.5">
                            {cls.examples.map((ex, i) => (
                              <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                                <span className={`mt-0.5 flex-shrink-0 ${
                                  cls.regime === 'ITAR' ? 'text-red-500/40' : 'text-amber-500/40'
                                }`}>&bull;</span>
                                <span>{ex}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* License Requirements */}
                      <div className="bg-white/[0.03] rounded-lg p-4">
                        <h4 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
                          License Requirements
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed">{cls.licenseRequirements}</p>
                      </div>

                      {/* Notes */}
                      <div className="flex items-start gap-2 text-xs text-slate-500">
                        <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="leading-relaxed">{cls.notes}</p>
                      </div>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </div>
          </StaggerContainer>
        ) : (
          <EmptyState
            title="No classifications found"
            description={`No ${activeTab === 'itar' ? 'ITAR/USML' : 'EAR/ECCN'} classifications match your search. Try a different search term or switch tabs.`}
            icon={
              <svg className="w-12 h-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
        )}

        {/* Disclaimer */}
        <ScrollReveal>
          <div className="mt-10 p-4 bg-amber-500/[0.06] border border-amber-500/[0.15] rounded-xl">
            <div className="flex items-start gap-3">
              <span className="text-amber-400 text-lg flex-shrink-0">&#9888;&#65039;</span>
              <div>
                <h4 className="text-sm font-semibold text-amber-300 mb-1">Important Disclaimer</h4>
                <p className="text-xs text-amber-200/70 leading-relaxed">
                  This reference is for informational purposes only and does not constitute legal or compliance advice. Export classification determinations must be made by qualified personnel or through official commodity jurisdiction (CJ) or commodity classification (CCATS) requests. Misclassification of export-controlled items carries severe civil and criminal penalties. Always consult with your Empowered Official (EO) or export compliance counsel before making classification decisions. Data reflects regulations as of early 2026.
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Cross-link */}
        <ScrollReveal>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link
              href="/licensing-checker"
              className="flex-1 p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:bg-white/[0.05] transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">&#9878;&#65039;</span>
                <div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-white/90">Licensing Requirements Checker</h4>
                  <p className="text-xs text-slate-400">Find out what licenses you need for your space activity</p>
                </div>
              </div>
            </Link>
            <Link
              href="/compliance"
              className="flex-1 p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:bg-white/[0.05] transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">&#9878;&#65039;</span>
                <div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-white/90">Regulatory Compliance Hub</h4>
                  <p className="text-xs text-slate-400">Full regulatory compliance tracker and space law reference</p>
                </div>
              </div>
            </Link>
          </div>
        </ScrollReveal>

        {/* Related Modules */}
        <div className="mt-10">
          <RelatedModules modules={PAGE_RELATIONS['export-classifications'] || []} />
        </div>
      </div>
    </div>
  );
}
