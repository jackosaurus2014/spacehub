'use client';

import { useState } from 'react';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';

// ── Types ──

interface ContractAward {
  id: string;
  title: string;
  contractor: string;
  value: string;
  awardDate: string;
  agency: string;
  category: string;
  description: string;
  period?: string;
}

interface LiveProcurement {
  id: string;
  title: string;
  contractor: string;
  value: string;
  awardDate: string;
  agency: string;
  category: string;
  description: string;
  period?: string;
  samUrl?: string;
  naicsCode?: string;
  naicsDescription?: string;
  type?: string;
}

// ── SpendingTrends ──

function SpendingTrends() {
  const budgetData = [
    { year: 'FY2020', ussf: 15.4, nro: 16.0 },
    { year: 'FY2021', ussf: 17.4, nro: 16.5 },
    { year: 'FY2022', ussf: 24.5, nro: 17.2 },
    { year: 'FY2023', ussf: 26.3, nro: 17.8 },
    { year: 'FY2024', ussf: 30.3, nro: 18.3 },
    { year: 'FY2025', ussf: 33.3, nro: 18.9 },
  ];
  const maxVal = 35;

  return (
    <div className="card p-6 mb-8">
      <h3 className="text-white font-bold mb-4">U.S. Defense Space Budget Trends ($B)</h3>
      <div className="space-y-3">
        {budgetData.map((row) => (
          <div key={row.year} className="flex items-center gap-3">
            <span className="text-star-400 text-sm font-mono w-16 flex-shrink-0">{row.year}</span>
            <div className="flex-1 flex gap-1">
              <div className="h-6 rounded-l bg-white/60 flex items-center pl-2" style={{ width: `${(row.ussf / maxVal) * 100}%` }}>
                <span className="text-white text-xs font-medium whitespace-nowrap">${row.ussf}B</span>
              </div>
              <div className="h-6 rounded-r bg-purple-500/60 flex items-center pl-2" style={{ width: `${(row.nro / maxVal) * 100}%` }}>
                <span className="text-white text-xs font-medium whitespace-nowrap">${row.nro}B</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-6 mt-4 text-xs text-star-400">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-white/60" /><span>USSF Budget</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-purple-500/60" /><span>NRO Budget</span></div>
      </div>
      <p className="text-star-500 text-xs mt-3">
        Note: FY2025 figures are budget requests. USSF budget includes Space Force-specific funding within the DAF budget.
        NRO budget was first publicly disclosed in 2024. All figures from public/unclassified sources.
      </p>
    </div>
  );
}

// ── ContractCard ──

function ContractCard({ contract }: { contract: ContractAward }) {
  return (
    <div className="card p-5 hover:border-white/15 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-white font-semibold">{contract.title}</h3>
        <span className="text-green-400 text-sm font-bold flex-shrink-0">{contract.value}</span>
      </div>
      <div className="space-y-1.5 mb-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-star-400 min-w-[80px]">Contractor:</span>
          <span className="text-white">{contract.contractor}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-star-400 min-w-[80px]">Agency:</span>
          <span className="text-star-200">{contract.agency}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-star-400 min-w-[80px]">Awarded:</span>
          <span className="text-star-300">{contract.awardDate}</span>
        </div>
        {contract.period && (
          <div className="flex items-center gap-2">
            <span className="text-star-400 min-w-[80px]">Period:</span>
            <span className="text-star-300">{contract.period}</span>
          </div>
        )}
      </div>
      <p className="text-star-400 text-sm leading-relaxed">{contract.description}</p>
    </div>
  );
}

// ── Props ──

interface ProcurementTabProps {
  recentContracts: ContractAward[];
  liveProcurement: LiveProcurement[];
}

export default function ProcurementTab({ recentContracts, liveProcurement }: ProcurementTabProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Recent Contract Awards & Procurement</h2>
        <p className="text-star-300 text-sm mb-6">
          Major defense space contract awards from FY2023-FY2025. Defense space procurement has
          seen a significant increase reflecting the urgency to modernize and expand military space
          capabilities in response to peer competitor developments.
        </p>

        <SpendingTrends />

        <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {recentContracts.map((contract) => (
            <StaggerItem key={contract.id}>
              <ContractCard contract={contract} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>

      {/* Active USSF Procurement Priorities */}
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Active USSF/DoD Procurement Priorities</h2>
        <p className="text-star-300 text-sm mb-6">
          Key Space Force and DoD procurement programs currently seeking industry proposals,
          based on public RFIs, BAAs, and official acquisition announcements from FY2025-FY2026.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[
            { title: 'Tactically Responsive Space (TacRS) Launch', agency: 'USSF / Space Systems Command', status: 'Active', statusColor: 'text-green-400', statusBg: 'bg-green-900/20', value: '~$200M (program)', description: 'Rapid-response launch capability to deploy replacement or augmentation satellites within 24-48 hours of a tasking order. SSC seeking responsive launch providers with rapid integration, containerized payload processing, and launch-on-demand capability from multiple sites.', vehicle: 'BAA / IDIQ', focus: ['Rapid launch integration', 'Mobile launch capability', 'Containerized payload processing'] },
            { title: 'Commercial SATCOM (COMSATCOM) Services', agency: 'USSF / Space Systems Command', status: 'Active', statusColor: 'text-green-400', statusBg: 'bg-green-900/20', value: '$900M+ (IDIQ ceiling)', description: 'Multi-award IDIQ contract for commercial satellite communications bandwidth to supplement military SATCOM capacity. Includes GEO and LEO commercial providers.', vehicle: 'IDIQ / Task Order', focus: ['LEO and GEO commercial bandwidth', 'CONUS and OCONUS coverage', 'Anti-jam augmentation'] },
            { title: 'Space Domain Awareness Sensors (Ground & Space)', agency: 'USSF / Space Operations Command', status: 'Solicitation', statusColor: 'text-blue-400', statusBg: 'bg-blue-900/20', value: '$300-500M (estimated)', description: 'Expansion of the Space Surveillance Network through commercial sensor contributions and new government-owned sensors.', vehicle: 'CSO / BAA', focus: ['Deep-space optical sensors', 'LEO/MEO radar systems', 'Space-based SDA payloads'] },
            { title: 'PWSA Tranche 3 (Transport & Tracking)', agency: 'Space Development Agency', status: 'Pre-Solicitation', statusColor: 'text-yellow-400', statusBg: 'bg-yellow-900/20', value: '$5B+ (estimated full tranche)', description: 'Next spiral of the Proliferated Warfighter Space Architecture. Tranche 3 will add ~250 Transport Layer and ~60 Tracking Layer satellites.', vehicle: 'RFI / forthcoming RFP', focus: ['Next-gen optical inter-satellite links', 'Enhanced OPIR tracking sensors', 'Resilient mesh architecture'] },
            { title: 'SpaceWERX Orbital Prime (On-Orbit Servicing)', agency: 'USSF / SpaceWERX (AFWERX)', status: 'Active', statusColor: 'text-green-400', statusBg: 'bg-green-900/20', value: '$125M (program)', description: 'SpaceWERX Orbital Prime SBIR/STTR program for on-orbit servicing, assembly, and manufacturing (OSAM).', vehicle: 'SBIR/STTR (Phase I/II/III)', focus: ['Satellite life extension', 'Active debris removal', 'In-space manufacturing'] },
            { title: 'Resilient GPS Backup / Alt-PNT', agency: 'USSF / Space Systems Command / DoD PNT Oversight Council', status: 'Sources Sought', statusColor: 'text-purple-400', statusBg: 'bg-purple-900/20', value: '$150-250M (estimated)', description: 'Alternative positioning, navigation, and timing solutions to supplement or back up GPS in contested/denied environments.', vehicle: 'Sources Sought / BAA', focus: ['LEO PNT constellations', 'Terrestrial eLoran modernization', 'Quantum-inertial navigation'] },
          ].map((opp) => (
            <div key={opp.title} className="card p-5 hover:border-white/15">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-white font-semibold text-sm">{opp.title}</h3>
                <span className={`text-xs font-medium px-2 py-0.5 rounded whitespace-nowrap ${opp.statusBg} ${opp.statusColor}`}>{opp.status}</span>
              </div>
              <div className="space-y-1.5 mb-3 text-xs">
                <div className="flex items-center gap-2"><span className="text-star-400 min-w-[70px]">Agency:</span><span className="text-star-200">{opp.agency}</span></div>
                <div className="flex items-center gap-2"><span className="text-star-400 min-w-[70px]">Est. Value:</span><span className="text-green-400 font-medium">{opp.value}</span></div>
                <div className="flex items-center gap-2"><span className="text-star-400 min-w-[70px]">Vehicle:</span><span className="text-star-200">{opp.vehicle}</span></div>
              </div>
              <p className="text-star-300 text-xs leading-relaxed mb-3">{opp.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {opp.focus.map((f) => (<span key={f} className="px-2 py-0.5 bg-white/10 text-slate-300 rounded text-xs">{f}</span>))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-star-500 text-xs mt-4">
          Note: Procurement status and values are based on public RFIs, BAAs, and official acquisition announcements.
          Visit SAM.gov for current solicitation details and response deadlines. For comprehensive procurement
          intelligence including SBIR/STTR topics, see the{' '}
          <a href="/business-opportunities?tab=procurement" className="text-slate-300 hover:text-white transition-colors underline">Procurement Intelligence module</a>.
        </p>
      </div>

      {/* Live SAM.gov Solicitations */}
      {liveProcurement.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Live SAM.gov Defense Space Solicitations</h2>
          <p className="text-star-300 text-sm mb-6">Live defense space opportunities pulled directly from SAM.gov, updated daily at 6:00 AM UTC.</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {liveProcurement.map((opp) => {
              const typeStyles: Record<string, { label: string; color: string; bg: string }> = {
                solicitation: { label: 'Solicitation', color: 'text-blue-400', bg: 'bg-blue-900/20' },
                presolicitation: { label: 'Pre-Solicitation', color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
                award: { label: 'Award', color: 'text-green-400', bg: 'bg-green-900/20' },
                sources_sought: { label: 'Sources Sought', color: 'text-purple-400', bg: 'bg-purple-900/20' },
                special_notice: { label: 'Special Notice', color: 'text-slate-300', bg: 'bg-white/[0.04]' },
              };
              const typeStyle = typeStyles[opp.type || 'solicitation'] || typeStyles.solicitation;
              return (
                <div key={opp.id} className="card p-4 hover:border-white/15">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-white font-semibold text-sm line-clamp-2">{opp.title}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded whitespace-nowrap ${typeStyle.bg} ${typeStyle.color}`}>{typeStyle.label}</span>
                  </div>
                  <div className="space-y-1 mb-2 text-xs">
                    <div className="flex items-center gap-2"><span className="text-star-400 min-w-[60px]">Agency:</span><span className="text-star-200 truncate">{opp.agency}</span></div>
                    <div className="flex items-center gap-2"><span className="text-star-400 min-w-[60px]">Value:</span><span className="text-green-400 font-medium">{opp.value}</span></div>
                    {opp.period && <div className="flex items-center gap-2"><span className="text-star-400 min-w-[60px]">Deadline:</span><span className="text-yellow-400">{opp.period}</span></div>}
                    {opp.naicsDescription && <div className="flex items-center gap-2"><span className="text-star-400 min-w-[60px]">NAICS:</span><span className="text-star-300">{opp.naicsDescription}</span></div>}
                  </div>
                  {opp.description && <p className="text-star-400 text-xs line-clamp-2 mb-2">{opp.description}</p>}
                  {opp.samUrl && (
                    <a href={opp.samUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-1">
                      View on SAM.gov
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Related News Cross-Link */}
      <div className="card p-5 border border-white/15 bg-white/5 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold mb-1">Defense & National Security News</h3>
            <p className="text-star-400 text-sm">Latest news articles on Space Force procurement, defense contracts, and national security developments.</p>
          </div>
          <a href="/news?category=space-defense" className="flex-shrink-0 ml-4 px-4 py-2 bg-white/10 hover:bg-white/15 text-white/90 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            View Defense News
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </a>
        </div>
      </div>

      {/* SBIR/STTR Note */}
      <div className="card p-6">
        <h3 className="text-white font-bold mb-3">SBIR/STTR Opportunities in Space Defense</h3>
        <p className="text-star-300 text-sm mb-3">The Space Force and SDA actively use SBIR and STTR programs to fund innovative space technologies from small businesses.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {['Resilient satellite bus technologies', 'Optical inter-satellite link components', 'On-orbit servicing capabilities', 'Space domain awareness sensors', 'Anti-jam communication waveforms', 'Radiation-hardened electronics', 'Autonomous satellite operations (AI/ML)', 'Additive manufacturing for space', 'Cybersecurity for space systems'].map((topic) => (
            <div key={topic} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-white mt-1.5 flex-shrink-0" />
              <span className="text-star-300 text-sm">{topic}</span>
            </div>
          ))}
        </div>
        <p className="text-star-500 text-xs mt-4">Visit SAM.gov and the SBIR.gov portal for current solicitations.</p>
      </div>
    </div>
  );
}
