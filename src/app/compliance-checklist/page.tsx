'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AutoBreadcrumb from '@/components/ui/AutoBreadcrumb';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ─── Checklist Data ──────────────────────────────────────────────────────────

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  agency: string;
  frequency: string;
}

interface ChecklistCategory {
  id: string;
  title: string;
  icon: string;
  items: ChecklistItem[];
}

const CHECKLIST_DATA: ChecklistCategory[] = [
  {
    id: 'launch-operations',
    title: 'Launch Operations',
    icon: '\uD83D\uDE80',
    items: [
      {
        id: 'launch-faa-license',
        title: 'FAA Launch / Reentry License',
        description: 'Obtain a launch or reentry license (or experimental permit) from the FAA Office of Commercial Space Transportation (AST) under 14 CFR Part 450. Required for any launch or reentry of a launch vehicle or reentry vehicle from U.S. territory or by U.S. citizens.',
        agency: 'FAA / AST',
        frequency: 'Per mission or multi-year operator license',
      },
      {
        id: 'launch-range-safety',
        title: 'Range Safety Approval',
        description: 'Complete range safety analysis and obtain approval from the launch range (e.g., Space Launch Delta 45 at Cape Canaveral, Space Launch Delta 30 at Vandenberg, or commercial spaceport). Includes flight safety analysis, trajectory data, and debris footprint analysis.',
        agency: 'U.S. Space Force / Range Operator',
        frequency: 'Per mission',
      },
      {
        id: 'launch-insurance',
        title: 'Third-Party Liability Insurance',
        description: 'Obtain third-party liability insurance at the Maximum Probable Loss (MPL) level determined by the FAA. Typically $100M-$500M depending on vehicle, trajectory, and launch site. Must also cover U.S. government property.',
        agency: 'FAA / AST',
        frequency: 'Per mission or policy period',
      },
      {
        id: 'launch-environmental',
        title: 'Environmental Review (NEPA)',
        description: 'Complete National Environmental Policy Act (NEPA) review. The FAA prepares an Environmental Assessment (EA) or Environmental Impact Statement (EIS) for launch site operations. Covers noise, emissions, wildlife impact, and water quality.',
        agency: 'FAA / EPA',
        frequency: 'Per launch site; updates for significant changes',
      },
      {
        id: 'launch-flight-termination',
        title: 'Flight Termination System Certification',
        description: 'Design, test, and certify the flight termination system (FTS) or autonomous flight safety system (AFSS). Required to ensure the vehicle can be destroyed or flight terminated if it deviates from the planned trajectory.',
        agency: 'FAA / AST',
        frequency: 'Per vehicle type; recertification as needed',
      },
    ],
  },
  {
    id: 'satellite-operations',
    title: 'Satellite Operations',
    icon: '\uD83D\uDEF0\uFE0F',
    items: [
      {
        id: 'sat-fcc-authorization',
        title: 'FCC Space Station Authorization',
        description: 'File an application with the FCC for space station authorization (or market access for non-U.S. licensed satellites). Covers frequency assignments, orbital parameters, interference analysis, and technical specifications under 47 CFR Part 25.',
        agency: 'FCC International Bureau',
        frequency: 'Per satellite system; modifications as needed',
      },
      {
        id: 'sat-itu-coordination',
        title: 'ITU Frequency Coordination',
        description: 'Coordinate frequency assignments through the International Telecommunication Union (ITU). File Advanced Publication Information (API), coordinate with potentially affected administrations, and file notification for recording in the Master International Frequency Register (MIFR).',
        agency: 'ITU / NTIA (for U.S. filings)',
        frequency: 'Per satellite network filing',
      },
      {
        id: 'sat-debris-plan',
        title: 'Orbital Debris Mitigation Plan',
        description: 'Submit an orbital debris mitigation plan per FCC rules. Must include post-mission disposal plan (deorbit within 5 years for LEO), casualty risk assessment, collision avoidance capability, trackability, and passivation procedures.',
        agency: 'FCC',
        frequency: 'Per authorization; updates for changes',
      },
      {
        id: 'sat-spectrum-fees',
        title: 'Spectrum License Fees',
        description: 'Pay applicable FCC regulatory fees and any spectrum auction costs. Annual regulatory fees vary by satellite type and service classification. ITU cost recovery charges also apply for frequency coordination filings.',
        agency: 'FCC / ITU',
        frequency: 'Annual (FCC fees); per filing (ITU)',
      },
      {
        id: 'sat-end-of-life',
        title: 'End-of-Life Disposal Plan',
        description: 'Document and implement the satellite end-of-life plan. For LEO: deorbit within 5 years (FCC rule). For GEO: boost to graveyard orbit 300+ km above GEO belt. Must reserve sufficient propellant for disposal maneuver and passivate all energy sources.',
        agency: 'FCC / Operator',
        frequency: 'End of mission; plan submitted at authorization',
      },
    ],
  },
  {
    id: 'export-controls',
    title: 'Export Controls',
    icon: '\uD83D\uDCE6',
    items: [
      {
        id: 'export-ddtc-registration',
        title: 'DDTC Registration',
        description: 'Register with the Directorate of Defense Trade Controls (DDTC) at the U.S. Department of State. Required for any person or entity that manufactures, exports, or temporarily imports defense articles, including most spacecraft, launch vehicles, and related components on the U.S. Munitions List (USML).',
        agency: 'Dept. of State / DDTC',
        frequency: 'Annual renewal',
      },
      {
        id: 'export-classification',
        title: 'Product Classification (USML / CCL)',
        description: 'Classify all products, technology, and technical data under ITAR (USML categories) or EAR (Commerce Control List / ECCN). Spacecraft are primarily USML Category XV; some components may fall under EAR ECCN 9A515. Self-classification or request a Commodity Jurisdiction (CJ) determination from DDTC.',
        agency: 'DDTC (ITAR) / BIS (EAR)',
        frequency: 'Per product; review when designs change',
      },
      {
        id: 'export-taa-mla',
        title: 'Technical Assistance Agreements / Manufacturing License Agreements',
        description: 'Obtain TAAs or MLAs from DDTC before sharing ITAR-controlled technical data with foreign persons or entities. Required for international collaborations, foreign subcontractors, and joint ventures involving defense articles or services.',
        agency: 'Dept. of State / DDTC',
        frequency: 'Per agreement; typically multi-year with renewals',
      },
      {
        id: 'export-deemed-export',
        title: 'Deemed Export Controls',
        description: 'Implement controls for "deemed exports" \u2014 disclosure of controlled technical data or technology to foreign nationals within the United States. Requires export licenses or exemptions even when the information never leaves U.S. soil. Implement Technology Control Plans (TCPs) for facilities with foreign national access.',
        agency: 'DDTC (ITAR) / BIS (EAR)',
        frequency: 'Ongoing; review with personnel changes',
      },
      {
        id: 'export-record-keeping',
        title: 'Export Record Keeping',
        description: 'Maintain comprehensive records of all export transactions, licenses, agreements, and related correspondence. ITAR requires records be kept for 5 years after expiration of the license or agreement. EAR requires 5 years from date of export. Records must be available for inspection by DDTC or BIS.',
        agency: 'DDTC / BIS',
        frequency: 'Ongoing; 5-year retention minimum',
      },
    ],
  },
  {
    id: 'remote-sensing',
    title: 'Remote Sensing',
    icon: '\uD83D\uDCF7',
    items: [
      {
        id: 'rs-noaa-license',
        title: 'NOAA Remote Sensing License',
        description: 'Obtain a license from NOAA\'s Commercial Remote Sensing Regulatory Affairs (CRSRA) office for any private remote sensing space system operated by a U.S. person. Covers optical, SAR, RF sensing, and other Earth observation modalities. Application includes system description, data management plan, and operational procedures.',
        agency: 'NOAA / CRSRA',
        frequency: 'Per system; modifications as needed',
      },
      {
        id: 'rs-data-restrictions',
        title: 'Data Distribution Restrictions',
        description: 'Comply with any data restriction conditions in the NOAA license. May include shutter control provisions (limiting imaging of certain areas during certain periods), resolution limitations, or data sharing restrictions for national security purposes. Post-2020 rules use a tiered system based on capability.',
        agency: 'NOAA / DoD',
        frequency: 'Ongoing; per license conditions',
      },
      {
        id: 'rs-reporting',
        title: 'Operational Reporting Requirements',
        description: 'Submit required operational reports to NOAA including annual reports on system status, data sales/distribution summaries, and notification of anomalies or changes to system capabilities. Must maintain data archive accessible to the U.S. government.',
        agency: 'NOAA / CRSRA',
        frequency: 'Annual; event-driven notifications',
      },
    ],
  },
  {
    id: 'workforce',
    title: 'Workforce',
    icon: '\uD83D\uDC65',
    items: [
      {
        id: 'wf-personnel-security',
        title: 'Personnel Security Clearances',
        description: 'Obtain and maintain facility security clearances (FCL) and personnel security clearances for employees requiring access to classified information. Required for companies performing classified government contracts. Managed through the Defense Counterintelligence and Security Agency (DCSA) and the National Industrial Security Program (NISP).',
        agency: 'DCSA / DoD',
        frequency: 'Ongoing; reinvestigation every 5-6 years (Secret) or 5 years (Top Secret)',
      },
      {
        id: 'wf-foreign-person-access',
        title: 'Foreign Person Access Controls',
        description: 'Implement access controls for foreign person employees and visitors. ITAR requires that foreign nationals not have unescorted access to ITAR-controlled technical data or defense articles without proper authorization (TAA or export license). Implement visitor logs, escort procedures, and physical access restrictions.',
        agency: 'DDTC / Company Security',
        frequency: 'Ongoing; review with personnel/facility changes',
      },
      {
        id: 'wf-training',
        title: 'Compliance Training Programs',
        description: 'Conduct regular compliance training for all employees, covering export controls (ITAR/EAR), classified information handling, insider threat awareness, cybersecurity, and company-specific security procedures. Engineers and business development staff are the highest-risk groups for inadvertent violations.',
        agency: 'Company / DCSA / DDTC',
        frequency: 'Annual minimum; onboarding for new hires',
      },
    ],
  },
];

const STORAGE_KEY = 'spacenexus-compliance-checklist';

// ─── Component ───────────────────────────────────────────────────────────────

export default function ComplianceChecklistPage() {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    CHECKLIST_DATA.forEach((cat) => {
      initial[cat.id] = true;
    });
    return initial;
  });

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCheckedItems(JSON.parse(stored));
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save to localStorage
  const saveChecked = useCallback((items: Record<string, boolean>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const toggleItem = (itemId: string) => {
    setCheckedItems((prev) => {
      const next = { ...prev, [itemId]: !prev[itemId] };
      saveChecked(next);
      return next;
    });
  };

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // Calculate progress
  const totalItems = CHECKLIST_DATA.reduce((sum, cat) => sum + cat.items.length, 0);
  const completedItems = Object.values(checkedItems).filter(Boolean).length;
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const getCategoryProgress = (cat: ChecklistCategory) => {
    const completed = cat.items.filter((item) => checkedItems[item.id]).length;
    return { completed, total: cat.items.length };
  };

  const resetAll = () => {
    setCheckedItems({});
    saveChecked({});
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <AutoBreadcrumb />

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Space Industry Compliance Checklist
          </h1>
          <p className="text-slate-400 text-sm max-w-2xl">
            Track regulatory compliance requirements across launch operations, satellite authorizations,
            export controls, remote sensing, and workforce security. Check items as you complete them
            &mdash; progress is saved locally.
          </p>
        </div>

        {/* Overall Progress */}
        <div className="mb-8 p-5 bg-white/[0.04] border border-white/[0.06] rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-white">Overall Compliance</span>
              <span className="text-xs text-slate-500">
                {completedItems} of {totalItems} items
              </span>
            </div>
            <span
              className={`text-sm font-bold ${
                progressPercent === 100
                  ? 'text-emerald-400'
                  : progressPercent >= 50
                  ? 'text-amber-400'
                  : 'text-slate-400'
              }`}
            >
              {progressPercent}%
            </span>
          </div>
          <div className="h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                progressPercent === 100
                  ? 'bg-emerald-500'
                  : progressPercent >= 50
                  ? 'bg-amber-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {progressPercent === 100 && (
            <p className="text-emerald-400 text-xs mt-2 font-medium">
              All compliance items completed. Review regularly to maintain compliance.
            </p>
          )}
          <div className="flex justify-end mt-3">
            <button
              onClick={resetAll}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Reset all
            </button>
          </div>
        </div>

        {/* Category Sections */}
        <div className="space-y-4">
          {CHECKLIST_DATA.map((category) => {
            const { completed, total } = getCategoryProgress(category);
            const isExpanded = expandedCategories[category.id];
            const catComplete = completed === total;

            return (
              <div
                key={category.id}
                className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden"
              >
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{category.icon}</span>
                    <h2 className="text-base font-semibold text-white">{category.title}</h2>
                    {catComplete && (
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                        Complete
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      {completed}/{total}
                    </span>
                    <div className="w-16 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          catComplete ? 'bg-emerald-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
                      />
                    </div>
                    <svg
                      className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Items */}
                {isExpanded && (
                  <div className="border-t border-white/[0.04]">
                    {category.items.map((item, idx) => {
                      const isChecked = !!checkedItems[item.id];
                      return (
                        <div
                          key={item.id}
                          className={`flex gap-4 p-4 ${
                            idx < category.items.length - 1 ? 'border-b border-white/[0.03]' : ''
                          } ${isChecked ? 'bg-emerald-500/[0.03]' : ''} hover:bg-white/[0.02] transition-colors`}
                        >
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleItem(item.id)}
                            className={`shrink-0 w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                              isChecked
                                ? 'bg-emerald-500 border-emerald-500'
                                : 'border-white/20 hover:border-white/40'
                            }`}
                            aria-label={isChecked ? `Uncheck ${item.title}` : `Check ${item.title}`}
                          >
                            {isChecked && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <h3
                              className={`text-sm font-medium mb-1 transition-colors ${
                                isChecked ? 'text-emerald-400 line-through decoration-emerald-500/40' : 'text-white'
                              }`}
                            >
                              {item.title}
                            </h3>
                            <p className="text-xs text-slate-400 leading-relaxed mb-2">
                              {item.description}
                            </p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              <span className="text-[11px] text-slate-500">
                                <span className="text-slate-600">Agency:</span>{' '}
                                <span className="text-slate-400">{item.agency}</span>
                              </span>
                              <span className="text-[11px] text-slate-500">
                                <span className="text-slate-600">Frequency:</span>{' '}
                                <span className="text-slate-400">{item.frequency}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Disclaimer */}
        <div className="mt-8 p-4 bg-amber-500/[0.06] border border-amber-500/20 rounded-xl">
          <p className="text-xs text-amber-400/80 leading-relaxed">
            <strong className="text-amber-400">Disclaimer:</strong> This checklist is for informational purposes only and
            does not constitute legal advice. Regulatory requirements vary by jurisdiction, mission type, and specific
            circumstances. Always consult qualified legal counsel and the relevant regulatory agencies for your specific
            compliance obligations.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-6 p-5 bg-white/[0.04] border border-white/[0.06] rounded-xl text-center">
          <h2 className="text-base font-semibold text-white mb-2">
            Need help navigating space regulations?
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Explore our comprehensive regulatory tools for real-time compliance tracking, licensing requirements,
            and export control reference.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/compliance"
              className="px-4 py-2 text-sm font-medium text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors"
            >
              Compliance Hub
            </Link>
            <Link
              href="/licensing-checker"
              className="px-4 py-2 text-sm font-medium text-white bg-white/[0.08] hover:bg-white/[0.12] rounded-lg transition-colors"
            >
              Licensing Checker
            </Link>
            <Link
              href="/export-classifications"
              className="px-4 py-2 text-sm font-medium text-white bg-white/[0.08] hover:bg-white/[0.12] rounded-lg transition-colors"
            >
              Export Classifications
            </Link>
          </div>
        </div>

        {/* Related Modules */}
        <div className="mt-8">
          <RelatedModules modules={PAGE_RELATIONS['compliance-checklist'] || []} />
        </div>
      </div>
    </div>
  );
}
