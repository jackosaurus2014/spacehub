'use client';

import { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';

// ── Types ──

interface MiningCompany {
  name: string;
  focus: string;
  description: string;
  founded: string;
  status: 'active' | 'acquired' | 'stealth' | 'pre-revenue';
  website: string;
  keyTech: string[];
  fundingStage: string;
  targetBodies: string[];
}

interface MiningTechnology {
  name: string;
  category: 'extraction' | 'processing' | 'transport' | 'prospecting';
  trl: number;
  description: string;
  advantages: string[];
  challenges: string[];
  developers: string[];
  applicableBodies: string[];
}

interface ResourceEstimate {
  resource: string;
  category: 'volatile' | 'precious_metal' | 'rare_earth' | 'fuel' | 'structural';
  earthPrice: string;
  inSpaceValue: string;
  primarySources: string[];
  applications: string[];
  demandOutlook: 'very_high' | 'high' | 'medium' | 'emerging';
  notes: string;
}

// ── Style constants ──

const COMPANY_STATUS_STYLES: Record<MiningCompany['status'], { label: string; color: string; bg: string }> = {
  active: { label: 'Active', color: 'text-green-400', bg: 'bg-green-900/30' },
  acquired: { label: 'Acquired', color: 'text-blue-400', bg: 'bg-blue-900/30' },
  stealth: { label: 'Stealth', color: 'text-purple-400', bg: 'bg-purple-900/30' },
  'pre-revenue': { label: 'Pre-Revenue', color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
};

const TECH_CATEGORY_STYLES: Record<MiningTechnology['category'], { label: string; color: string; bg: string }> = {
  extraction: { label: 'Extraction', color: 'text-orange-400', bg: 'bg-orange-900/30' },
  processing: { label: 'Processing', color: 'text-blue-400', bg: 'bg-blue-900/30' },
  transport: { label: 'Transport', color: 'text-green-400', bg: 'bg-green-900/30' },
  prospecting: { label: 'Prospecting', color: 'text-purple-400', bg: 'bg-purple-900/30' },
};

const RESOURCE_CATEGORY_STYLES: Record<ResourceEstimate['category'], { label: string; color: string; bg: string; icon: string }> = {
  volatile: { label: 'Volatile', color: 'text-blue-400', bg: 'bg-blue-900/30', icon: '\u{1F4A7}' },
  precious_metal: { label: 'Precious Metal', color: 'text-yellow-400', bg: 'bg-yellow-900/30', icon: '\u{1F4B0}' },
  rare_earth: { label: 'Rare Earth', color: 'text-purple-400', bg: 'bg-purple-900/30', icon: '\u{269B}' },
  fuel: { label: 'Fuel', color: 'text-red-400', bg: 'bg-red-900/30', icon: '\u{1F525}' },
  structural: { label: 'Structural', color: 'text-slate-300', bg: 'bg-white/[0.06]', icon: '\u{1F3D7}' },
};

const DEMAND_STYLES: Record<ResourceEstimate['demandOutlook'], { label: string; color: string }> = {
  very_high: { label: 'Very High', color: 'text-green-400' },
  high: { label: 'High', color: 'text-emerald-400' },
  medium: { label: 'Medium', color: 'text-yellow-400' },
  emerging: { label: 'Emerging', color: 'text-slate-300' },
};

// ── Card components ──

function CompanyCard({ company }: { company: MiningCompany }) {
  const statusStyle = COMPANY_STATUS_STYLES[company.status];
  return (
    <div className="bg-white/[0.04] rounded-xl p-5 border border-white/[0.06] hover:border-white/10 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div><h3 className="text-white font-semibold text-lg">{company.name}</h3><p className="text-slate-300 text-sm font-medium">{company.focus}</p></div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded ${statusStyle.bg} ${statusStyle.color}`}>{statusStyle.label}</span>
      </div>
      <p className="text-slate-400 text-sm mb-4 leading-relaxed">{company.description}</p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-black/50 rounded-lg p-2.5 border border-white/[0.06]"><div className="text-slate-400 text-xs uppercase tracking-widest mb-1">Founded</div><div className="text-white font-bold text-sm">{company.founded}</div></div>
        <div className="bg-black/50 rounded-lg p-2.5 border border-white/[0.06]"><div className="text-slate-400 text-xs uppercase tracking-widest mb-1">Funding</div><div className="text-white font-bold text-sm">{company.fundingStage}</div></div>
      </div>
      <div className="mb-3"><div className="text-slate-400 text-xs uppercase tracking-widest mb-1.5">Key Technologies</div><div className="flex flex-wrap gap-1.5">{company.keyTech.map((tech) => (<span key={tech} className="px-2 py-0.5 bg-white/5 text-slate-300 rounded text-xs font-medium">{tech}</span>))}</div></div>
      <div className="mb-3"><div className="text-slate-400 text-xs uppercase tracking-widest mb-1.5">Target Bodies</div><div className="flex flex-wrap gap-1.5">{company.targetBodies.map((target) => (<span key={target} className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded text-xs font-medium">{target}</span>))}</div></div>
      <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-white text-sm font-medium inline-flex items-center gap-1 mt-1">
        Visit Website <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
      </a>
    </div>
  );
}

function TechnologyCard({ tech }: { tech: MiningTechnology }) {
  const catStyle = TECH_CATEGORY_STYLES[tech.category];
  const trlColor = tech.trl >= 7 ? 'text-green-400' : tech.trl >= 5 ? 'text-yellow-400' : tech.trl >= 3 ? 'text-orange-400' : 'text-red-400';
  const trlBarWidth = `${(tech.trl / 9) * 100}%`;
  const trlBarColor = tech.trl >= 7 ? 'bg-green-500' : tech.trl >= 5 ? 'bg-yellow-500' : tech.trl >= 3 ? 'bg-orange-500' : 'bg-red-500';

  return (
    <div className="bg-white/[0.04] rounded-xl p-5 border border-white/[0.06] hover:border-orange-500/30 transition-all">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-white font-semibold text-lg pr-2">{tech.name}</h3>
        <span className={`text-xs font-bold px-2.5 py-1 rounded whitespace-nowrap ${catStyle.bg} ${catStyle.color}`}>{catStyle.label}</span>
      </div>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1"><span className="text-slate-400 text-xs uppercase tracking-widest">Technology Readiness</span><span className={`text-sm font-bold ${trlColor}`}>TRL {tech.trl}/9</span></div>
        <div className="w-full bg-white/[0.08] rounded-full h-2"><div className={`h-2 rounded-full ${trlBarColor} transition-all`} style={{ width: trlBarWidth }} /></div>
      </div>
      <p className="text-slate-400 text-sm mb-4 leading-relaxed">{tech.description}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div><div className="text-green-400 text-xs uppercase tracking-widest mb-1.5 font-semibold">Advantages</div><ul className="space-y-1">{tech.advantages.slice(0, 4).map((adv) => (<li key={adv} className="text-slate-300 text-xs flex items-start gap-1.5"><span className="text-green-400 mt-0.5 shrink-0">+</span> {adv}</li>))}</ul></div>
        <div><div className="text-red-400 text-xs uppercase tracking-widest mb-1.5 font-semibold">Challenges</div><ul className="space-y-1">{tech.challenges.slice(0, 4).map((ch) => (<li key={ch} className="text-slate-300 text-xs flex items-start gap-1.5"><span className="text-red-400 mt-0.5 shrink-0">-</span> {ch}</li>))}</ul></div>
      </div>
      <div className="flex flex-wrap gap-4 text-xs border-t border-white/[0.06] pt-3"><div><span className="text-slate-500">Developers: </span><span className="text-slate-300">{tech.developers.join(', ')}</span></div></div>
      <div className="flex flex-wrap gap-1.5 mt-2">{tech.applicableBodies.map((body) => (<span key={body} className="px-2 py-0.5 bg-white/[0.08] text-slate-300 rounded text-xs">{body}</span>))}</div>
    </div>
  );
}

function ResourceEstimateCard({ resource }: { resource: ResourceEstimate }) {
  const catStyle = RESOURCE_CATEGORY_STYLES[resource.category];
  const demandStyle = DEMAND_STYLES[resource.demandOutlook];
  return (
    <div className="bg-white/[0.04] rounded-xl p-5 border border-white/[0.06] hover:border-purple-500/30 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2"><span className="text-2xl">{catStyle.icon}</span><h3 className="text-white font-semibold text-lg">{resource.resource}</h3></div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded ${catStyle.bg} ${catStyle.color}`}>{catStyle.label}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-black/50 rounded-lg p-3 border border-white/[0.06]"><div className="text-slate-400 text-xs uppercase tracking-widest mb-1">Earth Price</div><div className="text-white font-bold text-sm">{resource.earthPrice}</div></div>
        <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20"><div className="text-amber-400 text-xs uppercase tracking-widest mb-1">In-Space Value</div><div className="text-amber-300 font-bold text-sm">{resource.inSpaceValue}</div></div>
      </div>
      <div className="flex items-center gap-2 mb-3"><span className="text-slate-400 text-xs">Demand Outlook:</span><span className={`text-xs font-bold ${demandStyle.color}`}>{demandStyle.label}</span></div>
      <p className="text-slate-400 text-sm mb-4 leading-relaxed">{resource.notes}</p>
      <div className="mb-3"><div className="text-slate-400 text-xs uppercase tracking-widest mb-1.5">Primary Sources</div><div className="flex flex-wrap gap-1.5">{resource.primarySources.map((src) => (<span key={src} className="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded text-xs font-medium">{src}</span>))}</div></div>
      <div><div className="text-slate-400 text-xs uppercase tracking-widest mb-1.5">Applications</div><div className="flex flex-wrap gap-1.5">{resource.applications.map((app) => (<span key={app} className="px-2 py-0.5 bg-white/[0.08] text-slate-300 rounded text-xs">{app}</span>))}</div></div>
    </div>
  );
}

// ── Exported grid components ──

export function CompaniesGrid({ companies }: { companies: MiningCompany[] }) {
  if (companies.length === 0) {
    return <div className="text-center py-12 text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"><p className="text-4xl mb-4">{'\u{1F3E2}'}</p><p>No companies found matching your filters.</p></div>;
  }
  return (
    <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {companies.map((company) => (<StaggerItem key={company.name}><CompanyCard company={company} /></StaggerItem>))}
    </StaggerContainer>
  );
}

export function TechnologiesGrid({ technologies }: { technologies: MiningTechnology[] }) {
  if (technologies.length === 0) {
    return <div className="text-center py-12 text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"><p className="text-4xl mb-4">{'\u{1F52C}'}</p><p>No technologies found matching your filters.</p></div>;
  }
  return (
    <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {technologies.map((tech) => (<StaggerItem key={tech.name}><TechnologyCard tech={tech} /></StaggerItem>))}
    </StaggerContainer>
  );
}

export function ResourcesGrid({ resources }: { resources: ResourceEstimate[] }) {
  if (resources.length === 0) {
    return <div className="text-center py-12 text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"><p className="text-4xl mb-4">{'\u{1F48E}'}</p><p>No resources found matching your filters.</p></div>;
  }
  return (
    <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {resources.map((resource) => (<StaggerItem key={resource.resource}><ResourceEstimateCard resource={resource} /></StaggerItem>))}
    </StaggerContainer>
  );
}
