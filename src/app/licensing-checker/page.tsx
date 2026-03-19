'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import SubscribeCTA from '@/components/marketing/SubscribeCTA';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LicenseResult {
  license: string;
  agency: string;
  agencyAbbr: string;
  estimatedTimeline: string;
  estimatedCost: string;
  keyRegulations: string[];
  description: string;
  spacenexusModule: { label: string; href: string };
  agencyColor: string;
}

interface ActivityOption {
  id: string;
  label: string;
  description: string;
  icon: string;
  licenses: LicenseResult[];
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const ACTIVITIES: ActivityOption[] = [
  {
    id: 'launch-vehicle',
    label: 'Launch Vehicle Operation',
    description: 'Operating a launch vehicle for orbital or suborbital flight',
    icon: '\u{1F680}',
    licenses: [
      {
        license: 'Launch Vehicle Operator License (Part 450)',
        agency: 'Federal Aviation Administration',
        agencyAbbr: 'FAA',
        estimatedTimeline: '6\u201318 months',
        estimatedCost: '$500K\u2013$2M+ (application & compliance)',
        keyRegulations: [
          '14 CFR Part 450 \u2014 Launch and Reentry License Requirements',
          'FAA Order 8800.1 \u2014 Commercial Space Transportation Licensing',
          'NIST SP 800-171 (if handling CUI)',
        ],
        description:
          'Required for any entity operating an expendable or reusable launch vehicle from U.S. territory or by a U.S. person anywhere. Covers vehicle design, flight safety, environmental review (NEPA), insurance requirements ($500M third-party liability), and mission-specific approval.',
        spacenexusModule: { label: 'Launch Vehicles', href: '/launch-vehicles' },
        agencyColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      },
      {
        license: 'Experimental Permit (if applicable)',
        agency: 'Federal Aviation Administration',
        agencyAbbr: 'FAA',
        estimatedTimeline: '3\u20136 months',
        estimatedCost: '$50K\u2013$200K',
        keyRegulations: [
          '14 CFR Part 437 \u2014 Experimental Permits',
          'FAA-AST Experimental Permit Guidelines',
        ],
        description:
          'For reusable suborbital launch vehicles during development and testing. Faster and less expensive than a full license but limited to non-revenue flights.',
        spacenexusModule: { label: 'Launch Economics', href: '/launch-economics' },
        agencyColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      },
    ],
  },
  {
    id: 'satellite-operation',
    label: 'Satellite Operation',
    description: 'Deploying and operating satellites in Earth orbit',
    icon: '\u{1F6F0}\uFE0F',
    licenses: [
      {
        license: 'Space Station Authorization (FCC Part 25)',
        agency: 'Federal Communications Commission',
        agencyAbbr: 'FCC',
        estimatedTimeline: '12\u201324 months',
        estimatedCost: '$100K\u2013$500K (filing + legal fees)',
        keyRegulations: [
          '47 CFR Part 25 \u2014 Satellite Communications',
          'FCC Orbital Debris Mitigation Rules (2024 update)',
          'ITU Radio Regulations (coordination)',
        ],
        description:
          'FCC space station authorization is required to operate any satellite using radio frequencies from U.S.-licensed spacecraft. Includes orbital debris mitigation plan, spectrum coordination with existing operators, and post-mission disposal requirements (5-year rule).',
        spacenexusModule: { label: 'Orbital Slots', href: '/orbital-slots' },
        agencyColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      },
      {
        license: 'Orbital Debris Mitigation Compliance',
        agency: 'Federal Communications Commission',
        agencyAbbr: 'FCC',
        estimatedTimeline: 'Concurrent with Part 25 filing',
        estimatedCost: 'Included in FCC filing (performance bond may apply)',
        keyRegulations: [
          'FCC 22-74 \u2014 Space Innovation; Orbital Debris Mitigation',
          '25-year (now 5-year) deorbit rule',
        ],
        description:
          'All FCC-licensed satellite operators must demonstrate a post-mission disposal plan. Since 2024, the FCC requires deorbiting within 5 years of end-of-mission for LEO satellites, a significant tightening from the previous 25-year guideline.',
        spacenexusModule: { label: 'Debris Tracker', href: '/debris-tracker' },
        agencyColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      },
    ],
  },
  {
    id: 'earth-observation',
    label: 'Earth Observation',
    description: 'Operating remote sensing satellites for Earth imagery',
    icon: '\u{1F30D}',
    licenses: [
      {
        license: 'Commercial Remote Sensing License',
        agency: 'National Oceanic and Atmospheric Administration',
        agencyAbbr: 'NOAA',
        estimatedTimeline: '6\u201312 months',
        estimatedCost: '$50K\u2013$150K (application + compliance)',
        keyRegulations: [
          '51 USC \u00A760101\u201360166 \u2014 Land Remote Sensing Policy Act',
          '15 CFR Part 960 \u2014 CRSRA Licensing (updated 2020)',
          'NOAA Commercial Remote Sensing Regulatory Affairs (CRSRA)',
        ],
        description:
          'Required for any U.S. person operating a commercial remote sensing satellite. Covers data collection restrictions, shutter control provisions (national security), resolution limits, and data distribution policies.',
        spacenexusModule: { label: 'Imagery Providers', href: '/imagery-providers' },
        agencyColor: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
      },
      {
        license: 'Space Station Authorization (FCC Part 25)',
        agency: 'Federal Communications Commission',
        agencyAbbr: 'FCC',
        estimatedTimeline: '12\u201324 months',
        estimatedCost: '$100K\u2013$500K',
        keyRegulations: [
          '47 CFR Part 25 \u2014 Satellite Communications',
          'FCC Orbital Debris Mitigation Rules',
        ],
        description:
          'Earth observation satellites using radio frequencies also need FCC authorization for their communications links (downlink/uplink). This is in addition to the NOAA license.',
        spacenexusModule: { label: 'Spectrum Management', href: '/spectrum' },
        agencyColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      },
    ],
  },
  {
    id: 'spectrum-use',
    label: 'Spectrum Use',
    description: 'Using radio frequencies for space communications',
    icon: '\u{1F4E1}',
    licenses: [
      {
        license: 'FCC Spectrum License / Earth Station Authorization',
        agency: 'Federal Communications Commission',
        agencyAbbr: 'FCC',
        estimatedTimeline: '6\u201318 months',
        estimatedCost: '$50K\u2013$300K (varies by band and complexity)',
        keyRegulations: [
          '47 CFR Part 25 \u2014 Satellite Communications',
          '47 CFR Part 2 \u2014 Frequency Allocations',
          'FCC Spectrum Auction Rules (if applicable)',
        ],
        description:
          'Any use of radio spectrum for space-to-ground or ground-to-space communications requires FCC authorization. This includes satellite uplinks, downlinks, TT&C, and inter-satellite links. Frequency coordination with existing users is mandatory.',
        spacenexusModule: { label: 'RF Spectrum', href: '/rf-spectrum' },
        agencyColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      },
      {
        license: 'ITU Frequency Filing / Coordination',
        agency: 'International Telecommunication Union',
        agencyAbbr: 'ITU',
        estimatedTimeline: '2\u20137 years (international coordination)',
        estimatedCost: '$200K\u2013$1M+ (filing + coordination)',
        keyRegulations: [
          'ITU Radio Regulations (Article 9 \u2014 Coordination)',
          'ITU Radio Regulations (Article 11 \u2014 Recording)',
          'ITU-R Recommendations',
        ],
        description:
          'For operations in internationally coordinated frequency bands, ITU filing through the national administration (FCC for U.S.) is required. The process involves advance publication (API), coordination with potentially affected administrations, and final recording in the Master International Frequency Register (MIFR).',
        spacenexusModule: { label: 'Frequency Database', href: '/frequency-database' },
        agencyColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      },
    ],
  },
  {
    id: 'export-hardware',
    label: 'Export of Space Hardware',
    description: 'Exporting space-related technology, components, or data',
    icon: '\u{1F4E6}',
    licenses: [
      {
        license: 'ITAR Export License (DSP-5 / TAA / MLA)',
        agency: 'Directorate of Defense Trade Controls',
        agencyAbbr: 'DDTC',
        estimatedTimeline: '2\u20136 months per application',
        estimatedCost: '$10K\u2013$100K+ per license (legal + compliance)',
        keyRegulations: [
          '22 CFR Parts 120\u2013130 \u2014 ITAR',
          'USML Category IV (Launch Vehicles)',
          'USML Category XV (Spacecraft)',
          'USML Category XI (Military Electronics)',
        ],
        description:
          'Items on the U.S. Munitions List (USML) require DDTC authorization before export. This includes many spacecraft, launch vehicles, and their components. Violations carry severe civil and criminal penalties. Registration as an exporter/manufacturer with DDTC is mandatory.',
        spacenexusModule: { label: 'Export Classifications', href: '/export-classifications' },
        agencyColor: 'bg-red-500/20 text-red-400 border-red-500/30',
      },
      {
        license: 'EAR Export License',
        agency: 'Bureau of Industry and Security',
        agencyAbbr: 'BIS',
        estimatedTimeline: '1\u20133 months',
        estimatedCost: '$5K\u2013$50K per license',
        keyRegulations: [
          '15 CFR Parts 730\u2013774 \u2014 EAR',
          'Commerce Control List (CCL) Category 9',
          'EAR 9A004, 9A515, 9E003',
        ],
        description:
          'Items classified under the Commerce Control List (particularly Category 9 \u2014 Aerospace and Propulsion) that are not on the USML require a BIS export license for certain destinations. Includes dual-use space technology, ground equipment, and certain satellite components.',
        spacenexusModule: { label: 'Export Classifications', href: '/export-classifications' },
        agencyColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      },
    ],
  },
  {
    id: 'space-tourism',
    label: 'Space Tourism',
    description: 'Carrying paying passengers on space flights',
    icon: '\u2708\uFE0F',
    licenses: [
      {
        license: 'Launch/Reentry License with Crew/Passengers (Part 460)',
        agency: 'Federal Aviation Administration',
        agencyAbbr: 'FAA',
        estimatedTimeline: '12\u201324 months',
        estimatedCost: '$1M\u2013$5M+ (full licensing & compliance)',
        keyRegulations: [
          '14 CFR Part 460 \u2014 Human Space Flight Requirements',
          '14 CFR Part 450 \u2014 Launch and Reentry License',
          'FAA-AST Crew and Spaceflight Participant Requirements',
          'Informed Consent Requirements',
        ],
        description:
          'Space tourism operators must hold a launch/reentry license and comply with Part 460 human spaceflight rules. This includes informed consent from spaceflight participants, crew qualifications, and vehicle safety requirements. Note: the FAA moratorium on further safety regulations (Learning Period) was extended to October 2025.',
        spacenexusModule: { label: 'Space Tourism', href: '/space-tourism' },
        agencyColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      },
      {
        license: 'Third-Party Liability Insurance',
        agency: 'Federal Aviation Administration',
        agencyAbbr: 'FAA',
        estimatedTimeline: 'Concurrent with license application',
        estimatedCost: '$1M\u2013$10M annual premiums (for $500M coverage)',
        keyRegulations: [
          '14 CFR Part 440 \u2014 Financial Responsibility',
          '51 USC \u00A750914 \u2014 Liability Insurance',
        ],
        description:
          'All licensed launch operators must obtain third-party liability insurance or demonstrate financial responsibility. The maximum probable loss (MPL) is calculated by the FAA for each mission, with a statutory cap of $500M for third-party claims and $100M for government property.',
        spacenexusModule: { label: 'Space Insurance', href: '/space-insurance' },
        agencyColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      },
    ],
  },
  {
    id: 'ground-station',
    label: 'Ground Station Operation',
    description: 'Operating an Earth station for satellite communications',
    icon: '\u{1F4E1}',
    licenses: [
      {
        license: 'Earth Station Authorization (FCC Part 25)',
        agency: 'Federal Communications Commission',
        agencyAbbr: 'FCC',
        estimatedTimeline: '3\u201312 months',
        estimatedCost: '$20K\u2013$100K (filing + equipment certification)',
        keyRegulations: [
          '47 CFR Part 25, Subpart C \u2014 Technical Standards for Earth Stations',
          '47 CFR Part 25.115 \u2014 Application Requirements',
          'FCC IBFS Filing Procedures',
        ],
        description:
          'Earth stations (ground stations) communicating with satellites require FCC authorization. This covers antenna specifications, power limits, frequency coordination, and interference mitigation. Blanket licensing is available for certain VSAT and ESV operations.',
        spacenexusModule: { label: 'Ground Station Directory', href: '/ground-station-directory' },
        agencyColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      },
      {
        license: 'NTIA Coordination (if near federal installations)',
        agency: 'National Telecommunications and Information Administration',
        agencyAbbr: 'NTIA',
        estimatedTimeline: '1\u20133 months (additional)',
        estimatedCost: 'Minimal direct cost',
        keyRegulations: [
          'NTIA Manual of Regulations and Procedures for Federal Radio Frequency Management',
          'FCC/NTIA frequency sharing frameworks',
        ],
        description:
          'Ground stations near military bases or federal installations may need NTIA coordination to avoid interference with government spectrum users. The FCC may condition an earth station license on successful NTIA coordination.',
        spacenexusModule: { label: 'Frequency Bands', href: '/frequency-bands' },
        agencyColor: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LicensingCheckerPage() {
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());

  const toggleActivity = (id: string) => {
    setSelectedActivities((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const results = useMemo(() => {
    if (selectedActivities.size === 0) return [];
    return ACTIVITIES.filter((a) => selectedActivities.has(a.id));
  }, [selectedActivities]);

  const totalLicenses = useMemo(() => {
    return results.reduce((sum, a) => sum + a.licenses.length, 0);
  }, [results]);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <AnimatedPageHeader
          title="Space Licensing Requirements Checker"
          subtitle="Find out exactly what licenses, permits, and authorizations you need for your space activity. Select one or more activities below to see the full regulatory picture."
        />

        {/* Stats bar */}
        <ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{ACTIVITIES.length}</div>
              <div className="text-xs text-slate-400 mt-1">Activity Types</div>
            </div>
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">7</div>
              <div className="text-xs text-slate-400 mt-1">Regulatory Agencies</div>
            </div>
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{selectedActivities.size}</div>
              <div className="text-xs text-slate-400 mt-1">Selected Activities</div>
            </div>
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{totalLicenses}</div>
              <div className="text-xs text-slate-400 mt-1">Required Licenses</div>
            </div>
          </div>
        </ScrollReveal>

        {/* Activity Selection */}
        <ScrollReveal>
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-1">What activity are you planning?</h2>
            <p className="text-sm text-slate-400 mb-4">Select all that apply to see combined licensing requirements.</p>
            <StaggerContainer>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {ACTIVITIES.map((activity) => {
                  const isSelected = selectedActivities.has(activity.id);
                  return (
                    <StaggerItem key={activity.id}>
                      <button
                        onClick={() => toggleActivity(activity.id)}
                        className={`w-full text-left p-4 rounded-xl border transition-all duration-200 group ${
                          isSelected
                            ? 'bg-white/[0.08] border-white/[0.2] ring-1 ring-white/[0.1]'
                            : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <div
                            className={`w-5 h-5 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-white border-white'
                                : 'border-white/[0.2] group-hover:border-white/[0.4]'
                            }`}
                          >
                            {isSelected && (
                              <svg className="w-3.5 h-3.5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{activity.icon}</span>
                              <span className="font-medium text-white text-sm">{activity.label}</span>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">{activity.description}</p>
                          </div>
                        </div>
                      </button>
                    </StaggerItem>
                  );
                })}
              </div>
            </StaggerContainer>
          </div>
        </ScrollReveal>

        {/* Results */}
        {results.length > 0 && (
          <ScrollReveal>
            <div className="space-y-8">
              <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
                <h2 className="text-xl font-bold text-white">Required Licenses &amp; Permits</h2>
                <span className="px-2.5 py-0.5 bg-white/[0.08] rounded-full text-xs text-slate-300 font-medium">
                  {totalLicenses} total
                </span>
              </div>

              {results.map((activity) => (
                <div key={activity.id} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{activity.icon}</span>
                    <h3 className="text-lg font-semibold text-white">{activity.label}</h3>
                  </div>

                  <StaggerContainer>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {activity.licenses.map((license, idx) => (
                        <StaggerItem key={idx}>
                          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 hover:bg-white/[0.05] transition-colors h-full flex flex-col">
                            {/* Agency Badge */}
                            <div className="flex items-center justify-between mb-3">
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${license.agencyColor}`}>
                                {license.agencyAbbr}
                              </span>
                              <Link
                                href={license.spacenexusModule.href}
                                className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                              >
                                {license.spacenexusModule.label}
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                </svg>
                              </Link>
                            </div>

                            {/* License name */}
                            <h4 className="text-sm font-semibold text-white mb-2">{license.license}</h4>

                            {/* Agency */}
                            <p className="text-xs text-slate-400 mb-3">{license.agency}</p>

                            {/* Description */}
                            <p className="text-xs text-slate-400 leading-relaxed mb-4 flex-1">{license.description}</p>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                              <div className="bg-white/[0.03] rounded-lg p-2.5">
                                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Timeline</div>
                                <div className="text-xs font-medium text-slate-300">{license.estimatedTimeline}</div>
                              </div>
                              <div className="bg-white/[0.03] rounded-lg p-2.5">
                                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Est. Cost</div>
                                <div className="text-xs font-medium text-slate-300">{license.estimatedCost}</div>
                              </div>
                            </div>

                            {/* Key Regulations */}
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Key Regulations</div>
                              <ul className="space-y-1">
                                {license.keyRegulations.map((reg, ri) => (
                                  <li key={ri} className="text-xs text-slate-400 flex items-start gap-1.5">
                                    <span className="text-white/30 mt-0.5 flex-shrink-0">&bull;</span>
                                    <span>{reg}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </StaggerItem>
                      ))}
                    </div>
                  </StaggerContainer>
                </div>
              ))}
            </div>
          </ScrollReveal>
        )}

        {/* Empty state */}
        {results.length === 0 && (
          <ScrollReveal>
            <div className="text-center py-16 bg-white/[0.02] border border-white/[0.06] rounded-xl">
              <div className="text-4xl mb-4">&#9878;&#65039;</div>
              <h3 className="text-lg font-semibold text-white mb-2">Select an Activity Above</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Choose one or more space activities to see the complete list of licenses, permits, and regulatory requirements you will need.
              </p>
            </div>
          </ScrollReveal>
        )}

        {/* Disclaimer */}
        <ScrollReveal>
          <div className="mt-10 p-4 bg-amber-500/[0.06] border border-amber-500/[0.15] rounded-xl">
            <div className="flex items-start gap-3">
              <span className="text-amber-400 text-lg flex-shrink-0">&#9888;&#65039;</span>
              <div>
                <h4 className="text-sm font-semibold text-amber-300 mb-1">Important Disclaimer</h4>
                <p className="text-xs text-amber-200/70 leading-relaxed">
                  This tool provides general guidance only and does not constitute legal advice. Regulatory requirements vary based on specific mission parameters, technology involved, destination countries, and other factors. Always consult with qualified regulatory counsel (such as an ITAR/EAR attorney or FAA-AST specialist) before making licensing decisions. Requirements may change; information here reflects regulations as of early 2026.
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        <SubscribeCTA />

        {/* Related Modules */}
        <div className="mt-10">
          <RelatedModules modules={PAGE_RELATIONS['licensing-checker'] || []} />
        </div>
      </div>
    </div>
  );
}
