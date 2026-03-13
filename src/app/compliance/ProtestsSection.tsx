'use client';

import { useState, useMemo } from 'react';

// ############################################################################
// BID PROTESTS & CLAIMS - Types, Status Configs
// ############################################################################

type ProtestOutcome = 'denied' | 'sustained' | 'dismissed' | 'withdrawn' | 'corrective_action' | 'settled';
type ProtestForum = 'gao' | 'cofc' | 'dc_circuit' | 'district_court';
type ProtestProgram = 'launch' | 'satellite' | 'crewed' | 'science' | 'defense' | 'iss';

export interface BidProtest {
  id: string;
  title: string;
  shortTitle: string;
  caseNumber: string;
  forum: ProtestForum;
  outcome: ProtestOutcome;
  program: ProtestProgram;
  protester: string;
  awardee: string;
  agency: string;
  contractValue: string;
  yearFiled: number;
  yearDecided: number;
  decisionDate: string;
  judge?: string;
  description: string;
  significance: string;
  keyFindings: string[];
}

const DEFAULT_PROTEST_STYLE = { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Unknown' };

const PROTEST_OUTCOME_STYLES: Record<ProtestOutcome, { bg: string; text: string; label: string }> = {
  denied: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Denied' },
  sustained: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Sustained' },
  dismissed: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Dismissed' },
  withdrawn: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Withdrawn' },
  corrective_action: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Corrective Action' },
  settled: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Settled' },
};

const PROTEST_FORUM_STYLES: Record<ProtestForum, { bg: string; text: string; label: string }> = {
  gao: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'GAO' },
  cofc: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'COFC' },
  dc_circuit: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'D.C. Circuit' },
  district_court: { bg: 'bg-white/10', text: 'text-slate-300', label: 'District Court' },
};

const PROTEST_PROGRAM_LABELS: Record<ProtestProgram, string> = {
  launch: 'Launch Services',
  satellite: 'Satellite Systems',
  crewed: 'Crewed Spaceflight',
  science: 'Science Missions',
  defense: 'National Security Space',
  iss: 'ISS Operations',
};

// ############################################################################
// PROTESTS TAB COMPONENTS
// ############################################################################

function ProtestsOverviewTab({ protests }: { protests: BidProtest[] }) {
  const [search, setSearch] = useState('');
  const [forumFilter, setForumFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [agencyFilter, setAgencyFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return protests
      .filter((p) => {
        if (forumFilter && p.forum !== forumFilter) return false;
        if (outcomeFilter && p.outcome !== outcomeFilter) return false;
        if (programFilter && p.program !== programFilter) return false;
        if (agencyFilter && p.agency !== agencyFilter) return false;
        if (search) {
          const s = search.toLowerCase();
          return p.title.toLowerCase().includes(s) || p.shortTitle.toLowerCase().includes(s) || p.caseNumber.toLowerCase().includes(s) || p.protester.toLowerCase().includes(s) || p.awardee.toLowerCase().includes(s) || p.description.toLowerCase().includes(s);
        }
        return true;
      })
      .sort((a, b) => b.yearDecided - a.yearDecided || b.yearFiled - a.yearFiled);
  }, [protests, search, forumFilter, outcomeFilter, programFilter, agencyFilter]);

  const uniqueForums = Array.from(new Set(protests.map((p) => p.forum)));
  const uniqueOutcomes = Array.from(new Set(protests.map((p) => p.outcome)));
  const uniquePrograms = Array.from(new Set(protests.map((p) => p.program)));
  const uniqueAgencies = Array.from(new Set(protests.map((p) => p.agency)));

  const deniedCount = protests.filter((p) => p.outcome === 'denied').length;
  const sustainedCount = protests.filter((p) => p.outcome === 'sustained').length;
  const correctiveCount = protests.filter((p) => p.outcome === 'corrective_action').length;
  const gaoCount = protests.filter((p) => p.forum === 'gao').length;
  const cofcCount = protests.filter((p) => p.forum === 'cofc').length;

  return (
    <div>
      <div className="card p-5 mb-6 border border-amber-500/20 bg-amber-500/5">
        <h3 className="text-white font-semibold mb-2">Space Industry Bid Protests & Claims Database</h3>
        <p className="text-star-300 text-sm leading-relaxed">Tracking major bid protests and procurement challenges in the U.S. space industry. Includes GAO protests, Court of Federal Claims (COFC) litigation, and appellate decisions affecting NASA, DoD, and other agency space procurements.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-white">{protests.length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Total Protests</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-red-400">{deniedCount}</div><div className="text-star-300 text-xs uppercase tracking-widest">Denied</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-green-400">{sustainedCount}</div><div className="text-star-300 text-xs uppercase tracking-widest">Sustained</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-blue-400">{correctiveCount}</div><div className="text-star-300 text-xs uppercase tracking-widest">Corrective Action</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-purple-400">{gaoCount} / {cofcCount}</div><div className="text-star-300 text-xs uppercase tracking-widest">GAO / COFC</div></div>
      </div>

      <div className="card p-4 mb-6"><div className="flex flex-wrap items-center gap-3">
        <input type="search" placeholder="Search case, protester, awardee..." aria-label="Search bid protests" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px] bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm placeholder-slate-400 focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none" />
        <select value={forumFilter} onChange={(e) => setForumFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"><option value="">All Forums</option>{uniqueForums.map((f) => (<option key={f} value={f}>{(PROTEST_FORUM_STYLES[f] || DEFAULT_PROTEST_STYLE).label}</option>))}</select>
        <select value={outcomeFilter} onChange={(e) => setOutcomeFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"><option value="">All Outcomes</option>{uniqueOutcomes.map((o) => (<option key={o} value={o}>{(PROTEST_OUTCOME_STYLES[o] || DEFAULT_PROTEST_STYLE).label}</option>))}</select>
        <select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"><option value="">All Programs</option>{uniquePrograms.map((p) => (<option key={p} value={p}>{PROTEST_PROGRAM_LABELS[p]}</option>))}</select>
        <select value={agencyFilter} onChange={(e) => setAgencyFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"><option value="">All Agencies</option>{uniqueAgencies.map((a) => (<option key={a} value={a}>{a}</option>))}</select>
        <span className="text-xs text-star-300 ml-auto">{filtered.length} cases</span>
      </div></div>

      <div className="space-y-4">{filtered.map((protest) => {
        const outcomeStyle = PROTEST_OUTCOME_STYLES[protest.outcome] || DEFAULT_PROTEST_STYLE;
        const forumStyle = PROTEST_FORUM_STYLES[protest.forum] || DEFAULT_PROTEST_STYLE;
        const isExpanded = expandedId === protest.id;
        return (
          <div key={protest.id} className="card p-5 hover:border-nebula-500/50 transition-all">
            <div className="flex items-start justify-between mb-3 gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-white text-base">{protest.shortTitle}</h4>
                <span className="text-star-300 text-xs font-mono">{protest.caseNumber}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-medium px-2 py-1 rounded ${forumStyle.bg} ${forumStyle.text}`}>{forumStyle.label}</span>
                <span className={`text-xs font-medium px-2 py-1 rounded ${outcomeStyle.bg} ${outcomeStyle.text}`}>{outcomeStyle.label}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div><span className="text-star-300 text-xs block">Protester</span><span className="text-white text-sm font-medium">{protest.protester}</span></div>
              <div><span className="text-star-300 text-xs block">Awardee</span><span className="text-nebula-300 text-sm">{protest.awardee}</span></div>
              <div><span className="text-star-300 text-xs block">Agency</span><span className="text-white text-sm">{protest.agency}</span></div>
              <div><span className="text-star-300 text-xs block">Contract Value</span><span className="text-white text-sm font-bold">{protest.contractValue}</span></div>
            </div>
            <p className="text-star-300 text-sm leading-relaxed mb-3">{protest.description}</p>
            <button onClick={() => setExpandedId(isExpanded ? null : protest.id)} className="text-sm text-nebula-300 hover:text-nebula-200 transition-colors mb-2">{isExpanded ? 'Show Less' : 'View Key Findings & Significance'}</button>
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                <div><h5 className="text-xs font-semibold text-star-300 mb-2 uppercase tracking-wider">Key Findings</h5><ul className="space-y-1.5">{protest.keyFindings.map((finding, i) => (<li key={i} className="flex items-start gap-2 text-xs text-star-300"><svg className="w-3 h-3 text-slate-300 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>{finding}</li>))}</ul></div>
                <div><h5 className="text-xs font-semibold text-star-300 mb-1 uppercase tracking-wider">Significance</h5><p className="text-xs text-star-300">{protest.significance}</p></div>
                <div className="text-xs text-star-300">
                  <span className="font-medium text-white">{protest.title}</span>
                  <span className="mx-2 text-slate-600">|</span>
                  <span>Program: <span className="text-nebula-300">{PROTEST_PROGRAM_LABELS[protest.program]}</span></span>
                  {protest.judge && (<><span className="mx-2 text-slate-600">|</span><span>{protest.judge}</span></>)}
                </div>
              </div>
            )}
            <div className="flex items-center gap-4 text-xs text-star-300 pt-3 border-t border-white/10 mt-3">
              <span>Filed: <span className="text-white font-medium">{protest.yearFiled}</span></span>
              <span className="text-slate-600">|</span>
              <span>Decided: <span className="text-white font-medium">{protest.decisionDate}</span></span>
              <span className="text-slate-600">|</span>
              <span className="text-nebula-300">{PROTEST_PROGRAM_LABELS[protest.program]}</span>
            </div>
          </div>
        );
      })}</div>

      {filtered.length === 0 && (<div className="text-center py-20"><h3 className="text-xl font-semibold text-white mb-2">No protests match your search</h3><button onClick={() => { setSearch(''); setForumFilter(''); setOutcomeFilter(''); setProgramFilter(''); setAgencyFilter(''); }} className="text-nebula-300 hover:text-white text-sm transition-colors">Clear All Filters</button></div>)}
    </div>
  );
}

function ProtestsTimelineTab({ protests }: { protests: BidProtest[] }) {
  const years = useMemo(() => {
    const allYears = Array.from(new Set(protests.map((p) => p.yearDecided))).sort((a, b) => b - a);
    return allYears;
  }, [protests]);

  const protestsByYear = useMemo(() => {
    const grouped: Record<number, BidProtest[]> = {};
    for (const protest of protests) {
      if (!grouped[protest.yearDecided]) grouped[protest.yearDecided] = [];
      grouped[protest.yearDecided].push(protest);
    }
    return grouped;
  }, [protests]);

  const outcomeColors: Record<ProtestOutcome, string> = {
    denied: 'bg-red-400',
    sustained: 'bg-green-400',
    dismissed: 'bg-slate-400',
    withdrawn: 'bg-yellow-400',
    corrective_action: 'bg-blue-400',
    settled: 'bg-purple-400',
  };

  return (
    <div>
      <div className="card p-5 mb-6 border border-white/10 bg-white/5">
        <h3 className="text-white font-semibold mb-2">Protest Timeline</h3>
        <p className="text-star-300 text-sm leading-relaxed">Chronological view of space industry bid protests grouped by decision year, with color-coded outcome indicators.</p>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        {Object.entries(PROTEST_OUTCOME_STYLES).map(([key, style]) => (
          <div key={key} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${outcomeColors[key as ProtestOutcome]}`} />
            <span className="text-xs text-star-300">{style.label}</span>
          </div>
        ))}
      </div>

      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-white/10" />
        {years.map((year) => (
          <div key={year} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-nebula-500 flex items-center justify-center text-white text-xs font-bold relative z-10">{protestsByYear[year].length}</div>
              <h3 className="text-xl font-bold font-display text-white">{year}</h3>
              <div className="h-px flex-1 bg-white/10" />
            </div>
            <div className="ml-12 space-y-3">
              {protestsByYear[year].sort((a, b) => {
                const monthA = new Date(a.decisionDate).getTime();
                const monthB = new Date(b.decisionDate).getTime();
                return (isNaN(monthB) ? 0 : monthB) - (isNaN(monthA) ? 0 : monthA);
              }).map((protest) => {
                const outcomeStyle = PROTEST_OUTCOME_STYLES[protest.outcome] || DEFAULT_PROTEST_STYLE;
                const forumStyle = PROTEST_FORUM_STYLES[protest.forum] || DEFAULT_PROTEST_STYLE;
                return (
                  <div key={protest.id} className="card p-4 hover:border-nebula-500/50 transition-all relative">
                    <div className={`absolute left-[-28px] top-4 w-3 h-3 rounded-full ${outcomeColors[protest.outcome]} border-2 border-slate-900`} />
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white text-sm">{protest.shortTitle}</h4>
                        <p className="text-star-300 text-xs mt-1">{protest.protester} vs. {protest.awardee}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${forumStyle.bg} ${forumStyle.text}`}>{forumStyle.label}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${outcomeStyle.bg} ${outcomeStyle.text}`}>{outcomeStyle.label}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-star-300">
                      <span>{protest.caseNumber}</span>
                      <span className="text-slate-600">|</span>
                      <span>{protest.agency}</span>
                      <span className="text-slate-600">|</span>
                      <span className="text-white font-medium">{protest.contractValue}</span>
                      <span className="text-slate-600">|</span>
                      <span>{protest.decisionDate}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProtestsAnalysisTab({ protests }: { protests: BidProtest[] }) {
  const totalProtests = protests.length;
  const gaoCases = protests.filter((p) => p.forum === 'gao');
  const cofcCases = protests.filter((p) => p.forum === 'cofc');

  const gaoSuccessRate = gaoCases.length > 0
    ? Math.round((gaoCases.filter((p) => p.outcome === 'sustained' || p.outcome === 'corrective_action').length / gaoCases.length) * 100)
    : 0;
  const cofcSuccessRate = cofcCases.length > 0
    ? Math.round((cofcCases.filter((p) => p.outcome === 'sustained' || p.outcome === 'corrective_action').length / cofcCases.length) * 100)
    : 0;

  const byProgram = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of protests) {
      counts[p.program] = (counts[p.program] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [protests]);

  const byAgency = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of protests) {
      counts[p.agency] = (counts[p.agency] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [protests]);

  const byOutcome = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of protests) {
      counts[p.outcome] = (counts[p.outcome] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [protests]);

  const yearRange = useMemo(() => {
    const years = Array.from(new Set(protests.map((p) => p.yearDecided))).sort();
    return years;
  }, [protests]);

  const volumeByYear = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const year of yearRange) counts[year] = 0;
    for (const p of protests) counts[p.yearDecided] = (counts[p.yearDecided] || 0) + 1;
    return counts;
  }, [protests, yearRange]);

  const maxVolume = Math.max(...Object.values(volumeByYear), 1);

  return (
    <div>
      <div className="card p-5 mb-6 border border-purple-500/20 bg-purple-500/5">
        <h3 className="text-white font-semibold mb-2">Analysis & Trends</h3>
        <p className="text-star-300 text-sm leading-relaxed">Statistical analysis of space industry bid protests, including success rates by forum, protest volume trends, and common grounds for challenge.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="card-elevated p-5">
          <h4 className="text-sm font-semibold text-star-300 uppercase tracking-wider mb-4">GAO Success Rate</h4>
          <div className="text-center mb-3">
            <div className="text-4xl font-bold font-display text-blue-400">{gaoSuccessRate}%</div>
            <p className="text-xs text-star-300 mt-1">Sustained or Corrective Action</p>
          </div>
          <div className="text-xs text-star-300 text-center">{gaoCases.length} cases filed at GAO</div>
          <div className="h-2 bg-white/5 rounded-full mt-3 overflow-hidden"><div className="h-full bg-blue-400 rounded-full" style={{ width: `${gaoSuccessRate}%` }} /></div>
        </div>

        <div className="card-elevated p-5">
          <h4 className="text-sm font-semibold text-star-300 uppercase tracking-wider mb-4">COFC Success Rate</h4>
          <div className="text-center mb-3">
            <div className="text-4xl font-bold font-display text-purple-400">{cofcSuccessRate}%</div>
            <p className="text-xs text-star-300 mt-1">Sustained or Corrective Action</p>
          </div>
          <div className="text-xs text-star-300 text-center">{cofcCases.length} cases filed at COFC</div>
          <div className="h-2 bg-white/5 rounded-full mt-3 overflow-hidden"><div className="h-full bg-purple-400 rounded-full" style={{ width: `${cofcSuccessRate}%` }} /></div>
        </div>

        <div className="card-elevated p-5">
          <h4 className="text-sm font-semibold text-star-300 uppercase tracking-wider mb-4">Overall Protest Effectiveness</h4>
          <div className="text-center mb-3">
            <div className="text-4xl font-bold font-display text-white">
              {totalProtests > 0 ? Math.round((protests.filter((p) => p.outcome === 'sustained' || p.outcome === 'corrective_action').length / totalProtests) * 100) : 0}%
            </div>
            <p className="text-xs text-star-300 mt-1">Result in Protester-Favorable Outcome</p>
          </div>
          <div className="text-xs text-star-300 text-center">{totalProtests} total protests tracked</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="card-elevated p-5">
          <h4 className="text-sm font-semibold text-star-300 uppercase tracking-wider mb-4">Protest Volume by Year</h4>
          <div className="space-y-2">
            {yearRange.map((year) => (
              <div key={year} className="flex items-center gap-3">
                <span className="text-xs text-star-300 w-10 text-right font-mono">{year}</span>
                <div className="flex-1 h-6 bg-white/5 rounded overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-nebula-500 to-slate-400 rounded flex items-center justify-end pr-2" style={{ width: `${(volumeByYear[year] / maxVolume) * 100}%` }}>
                    <span className="text-xs text-white font-bold">{volumeByYear[year]}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-elevated p-5">
          <h4 className="text-sm font-semibold text-star-300 uppercase tracking-wider mb-4">Outcomes Breakdown</h4>
          <div className="space-y-3">
            {byOutcome.map(([outcome, count]) => {
              const style = PROTEST_OUTCOME_STYLES[outcome as ProtestOutcome] || DEFAULT_PROTEST_STYLE;
              const pct = totalProtests > 0 ? Math.round((count / totalProtests) * 100) : 0;
              return (
                <div key={outcome}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${style.text}`}>{style.label}</span>
                    <span className="text-xs text-star-300">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${style.bg.replace('/20', '/60')}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="card-elevated p-5">
          <h4 className="text-sm font-semibold text-star-300 uppercase tracking-wider mb-4">By Program Area</h4>
          <div className="space-y-2">
            {byProgram.map(([program, count]) => (
              <div key={program} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-sm text-white">{PROTEST_PROGRAM_LABELS[program as ProtestProgram]}</span>
                <span className="text-sm font-bold text-nebula-300">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-elevated p-5">
          <h4 className="text-sm font-semibold text-star-300 uppercase tracking-wider mb-4">By Agency</h4>
          <div className="space-y-2">
            {byAgency.map(([agency, count]) => (
              <div key={agency} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-sm text-white">{agency}</span>
                <span className="text-sm font-bold text-nebula-300">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card-elevated p-5">
        <h4 className="text-sm font-semibold text-star-300 uppercase tracking-wider mb-4">All Cases Summary</h4>
        {/* Desktop Table */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 px-3 text-star-300 text-xs uppercase tracking-wider font-medium">Case</th>
                <th className="text-left py-2 px-3 text-star-300 text-xs uppercase tracking-wider font-medium">Forum</th>
                <th className="text-left py-2 px-3 text-star-300 text-xs uppercase tracking-wider font-medium">Outcome</th>
                <th className="text-left py-2 px-3 text-star-300 text-xs uppercase tracking-wider font-medium">Protester</th>
                <th className="text-left py-2 px-3 text-star-300 text-xs uppercase tracking-wider font-medium">Agency</th>
                <th className="text-left py-2 px-3 text-star-300 text-xs uppercase tracking-wider font-medium">Value</th>
                <th className="text-left py-2 px-3 text-star-300 text-xs uppercase tracking-wider font-medium">Year</th>
              </tr>
            </thead>
            <tbody>
              {[...protests].sort((a, b) => b.yearDecided - a.yearDecided).map((protest) => {
                const outcomeStyle = PROTEST_OUTCOME_STYLES[protest.outcome] || DEFAULT_PROTEST_STYLE;
                const forumStyle = PROTEST_FORUM_STYLES[protest.forum] || DEFAULT_PROTEST_STYLE;
                return (
                  <tr key={protest.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-2.5 px-3"><span className="text-white font-medium">{protest.shortTitle}</span><br /><span className="text-star-300 text-xs font-mono">{protest.caseNumber}</span></td>
                    <td className="py-2.5 px-3"><span className={`text-xs font-medium px-2 py-0.5 rounded ${forumStyle.bg} ${forumStyle.text}`}>{forumStyle.label}</span></td>
                    <td className="py-2.5 px-3"><span className={`text-xs font-medium px-2 py-0.5 rounded ${outcomeStyle.bg} ${outcomeStyle.text}`}>{outcomeStyle.label}</span></td>
                    <td className="py-2.5 px-3 text-star-300">{protest.protester}</td>
                    <td className="py-2.5 px-3 text-star-300">{protest.agency}</td>
                    <td className="py-2.5 px-3 text-white font-medium">{protest.contractValue}</td>
                    <td className="py-2.5 px-3 text-star-300">{protest.yearDecided}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {[...protests].sort((a, b) => b.yearDecided - a.yearDecided).map((protest) => {
            const outcomeStyle = PROTEST_OUTCOME_STYLES[protest.outcome] || DEFAULT_PROTEST_STYLE;
            const forumStyle = PROTEST_FORUM_STYLES[protest.forum] || DEFAULT_PROTEST_STYLE;
            return (
              <div key={protest.id} className="bg-white/5 border border-white/10 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-white font-medium text-sm truncate">{protest.shortTitle}</div>
                    <div className="text-star-300 text-xs font-mono">{protest.caseNumber}</div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded flex-shrink-0 ${outcomeStyle.bg} ${outcomeStyle.text}`}>{outcomeStyle.label}</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-star-300/70">Forum</span>
                    <span className={`font-medium px-2 py-0.5 rounded ${forumStyle.bg} ${forumStyle.text}`}>{forumStyle.label}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-star-300/70">Protester</span>
                    <span className="text-star-300 truncate ml-2">{protest.protester}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-star-300/70">Agency</span>
                    <span className="text-star-300">{protest.agency}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-star-300/70">Value</span>
                    <span className="text-white font-medium">{protest.contractValue}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-star-300/70">Year</span>
                    <span className="text-star-300">{protest.yearDecided}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ############################################################################
// MAIN EXPORTS - Section wrapper that handles sub-tab routing
// ############################################################################

export interface ProtestsSectionProps {
  activeSubTab: string;
  protests: BidProtest[];
}

export default function ProtestsSection({ activeSubTab, protests }: ProtestsSectionProps) {
  return (
    <>
      {activeSubTab === 'protests-overview' && <ProtestsOverviewTab protests={protests} />}
      {activeSubTab === 'protests-timeline' && <ProtestsTimelineTab protests={protests} />}
      {activeSubTab === 'protests-analysis' && <ProtestsAnalysisTab protests={protests} />}
    </>
  );
}
