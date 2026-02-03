'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import InlineDisclaimer from '@/components/InlineDisclaimer';
import PremiumGate from '@/components/PremiumGate';
import {
  EXPORT_REGIMES,
  CLASSIFICATION_CATEGORIES,
  REGULATION_STATUSES,
  REGULATION_CATEGORIES,
} from '@/types';

interface ExportClassification {
  id: string;
  regime: string;
  classification: string;
  name: string;
  description: string;
  category: string;
  controlReason?: string;
}

interface ProposedRegulation {
  id: string;
  title: string;
  summary: string;
  agency: string;
  status: string;
  category: string;
  publishedDate: string;
  commentDeadline?: string;
  sourceUrl: string;
}

interface LegalSource {
  id: string;
  name: string;
  type: string;
  organization?: string;
  url: string;
  description?: string;
}

interface LegalUpdate {
  id: string;
  title: string;
  summary: string;
  publishedDate: string;
  sourceUrl: string;
  source?: LegalSource;
}

function ClassificationCard({ item }: { item: ExportClassification }) {
  const categoryInfo = CLASSIFICATION_CATEGORIES.find((c) => c.value === item.category);

  return (
    <div className="card p-5 hover:border-nebula-500/50 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded ${
              item.regime === 'ITAR'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}
          >
            {item.regime}
          </span>
          <span className="text-sm font-mono text-nebula-300">{item.classification}</span>
        </div>
        <span className="text-2xl">{categoryInfo?.icon || '📋'}</span>
      </div>
      <h4 className="font-semibold text-white mb-2">{item.name}</h4>
      <p className="text-star-300 text-sm mb-3 line-clamp-3">{item.description}</p>
      <div className="flex items-center justify-between text-xs">
        <span className="text-star-400">{categoryInfo?.label || item.category}</span>
        {item.controlReason && (
          <span className="text-nebula-400">Control: {item.controlReason}</span>
        )}
      </div>
    </div>
  );
}

function RegulationCard({ item }: { item: ProposedRegulation }) {
  const statusInfo = REGULATION_STATUSES.find((s) => s.value === item.status);
  const categoryInfo = REGULATION_CATEGORIES.find((c) => c.value === item.category);
  const deadline = item.commentDeadline ? new Date(item.commentDeadline) : null;
  const isUrgent = deadline && deadline > new Date() && deadline < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return (
    <div className="card p-5 hover:border-nebula-500/50 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-nebula-300 bg-space-700 px-2 py-1 rounded">
            {item.agency}
          </span>
          {categoryInfo && (
            <span className="text-xs text-star-400 bg-space-700/50 px-2 py-1 rounded">
              {categoryInfo.label}
            </span>
          )}
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded ${
            statusInfo?.color === 'green'
              ? 'bg-green-500/20 text-green-400'
              : statusInfo?.color === 'yellow'
              ? 'bg-yellow-500/20 text-yellow-400'
              : statusInfo?.color === 'orange'
              ? 'bg-orange-500/20 text-orange-400'
              : 'bg-space-600 text-star-300'
          }`}
        >
          {statusInfo?.label || item.status}
        </span>
      </div>
      <h4 className="font-semibold text-white mb-2">{item.title}</h4>
      <p className="text-star-300 text-sm mb-3 line-clamp-3">{item.summary}</p>
      <div className="flex items-center justify-between">
        <div className="text-xs text-star-400">
          Published: {new Date(item.publishedDate).toLocaleDateString()}
        </div>
        {deadline && (
          <span className={`text-xs ${isUrgent ? 'text-yellow-400 font-semibold' : 'text-star-400'}`}>
            {isUrgent && '⚠️ '}Comments: {deadline.toLocaleDateString()}
          </span>
        )}
      </div>
      <a
        href={item.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center text-sm text-nebula-400 hover:text-nebula-300"
      >
        View Full Regulation →
      </a>
    </div>
  );
}

function LegalSourceCard({ source }: { source: LegalSource }) {
  const typeLabels: Record<string, { label: string; icon: string }> = {
    law_firm: { label: 'Law Firm', icon: '⚖️' },
    government: { label: 'Government', icon: '🏛️' },
    industry_association: { label: 'Industry', icon: '🏢' },
    think_tank: { label: 'Think Tank', icon: '💡' },
  };
  const typeInfo = typeLabels[source.type] || { label: source.type, icon: '📋' };

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card p-4 hover:border-nebula-500/50 transition-all flex items-start gap-4"
    >
      <span className="text-3xl">{typeInfo.icon}</span>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-white mb-1">{source.name}</h4>
        {source.organization && (
          <p className="text-sm text-star-400 mb-1">{source.organization}</p>
        )}
        <span className="text-xs text-nebula-400">{typeInfo.label}</span>
        {source.description && (
          <p className="text-xs text-star-300 mt-2 line-clamp-2">{source.description}</p>
        )}
      </div>
      <span className="text-star-400">→</span>
    </a>
  );
}

function LegalUpdateCard({ update }: { update: LegalUpdate }) {
  return (
    <div className="card p-4 hover:border-nebula-500/50 transition-all">
      <div className="flex items-start justify-between mb-2">
        {update.source && (
          <span className="text-xs font-semibold text-nebula-300 bg-space-700 px-2 py-0.5 rounded">
            {update.source.name}
          </span>
        )}
        <span className="text-xs text-star-400">
          {new Date(update.publishedDate).toLocaleDateString()}
        </span>
      </div>
      <h4 className="font-semibold text-white text-sm mb-2">{update.title}</h4>
      <p className="text-star-300 text-xs line-clamp-2 mb-2">{update.summary}</p>
      <a
        href={update.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-nebula-400 hover:text-nebula-300"
      >
        Read More →
      </a>
    </div>
  );
}

function ComplianceContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'classifications';

  const [activeTab, setActiveTab] = useState<'classifications' | 'regulations' | 'sources' | 'updates'>(
    initialTab as any
  );
  const [classifications, setClassifications] = useState<ExportClassification[]>([]);
  const [regulations, setRegulations] = useState<ProposedRegulation[]>([]);
  const [sources, setSources] = useState<LegalSource[]>([]);
  const [updates, setUpdates] = useState<LegalUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [regimeFilter, setRegimeFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [agencyFilter, setAgencyFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>('');

  // Stats
  const [stats, setStats] = useState<{
    classifications: number;
    regulations: number;
    openRegulations: number;
    sources: number;
    regimeBreakdown?: { ITAR: number; EAR: number };
  } | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchTabData();
  }, [activeTab, regimeFilter, categoryFilter, agencyFilter, statusFilter, sourceTypeFilter]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/compliance');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchTabData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'classifications': {
          const params = new URLSearchParams();
          if (regimeFilter) params.set('regime', regimeFilter);
          if (categoryFilter) params.set('category', categoryFilter);
          const res = await fetch(`/api/compliance/classifications?${params}`);
          const data = await res.json();
          setClassifications(data.classifications || []);
          break;
        }
        case 'regulations': {
          const params = new URLSearchParams();
          if (agencyFilter) params.set('agency', agencyFilter);
          if (statusFilter) params.set('status', statusFilter);
          const res = await fetch(`/api/compliance/regulations?${params}`);
          const data = await res.json();
          setRegulations(data.regulations || []);
          break;
        }
        case 'sources': {
          const params = new URLSearchParams({ type: 'sources' });
          if (sourceTypeFilter) params.set('sourceType', sourceTypeFilter);
          const res = await fetch(`/api/compliance/legal?${params}`);
          const data = await res.json();
          setSources(data.sources || []);
          break;
        }
        case 'updates': {
          const res = await fetch('/api/compliance/legal?limit=50');
          const data = await res.json();
          setUpdates(data.updates || []);
          break;
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="card p-4 text-center">
            <div className="text-3xl font-bold text-white">{stats.classifications}</div>
            <div className="text-star-300 text-sm">Classifications</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-3xl font-bold text-red-400">{stats.regimeBreakdown?.ITAR || 0}</div>
            <div className="text-star-300 text-sm">ITAR Items</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-3xl font-bold text-blue-400">{stats.regimeBreakdown?.EAR || 0}</div>
            <div className="text-star-300 text-sm">EAR Items</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-3xl font-bold text-nebula-400">{stats.regulations}</div>
            <div className="text-star-300 text-sm">Regulations</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-3xl font-bold text-yellow-400">{stats.openRegulations}</div>
            <div className="text-star-300 text-sm">Open for Comment</div>
          </div>
        </div>
      )}

      <InlineDisclaimer />

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { id: 'classifications', label: 'Export Controls', icon: '📋' },
          { id: 'regulations', label: 'Proposed Rules', icon: '📜' },
          { id: 'sources', label: 'Legal Sources', icon: '⚖️' },
          { id: 'updates', label: 'Legal Updates', icon: '📰' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-nebula-500 text-white'
                : 'bg-space-700/50 text-star-300 hover:bg-space-600/50'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          {activeTab === 'classifications' && (
            <>
              <select
                value={regimeFilter}
                onChange={(e) => setRegimeFilter(e.target.value)}
                className="bg-space-700 border border-space-600 text-star-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All Regimes</option>
                {EXPORT_REGIMES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-space-700 border border-space-600 text-star-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All Categories</option>
                {CLASSIFICATION_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                ))}
              </select>
            </>
          )}
          {activeTab === 'regulations' && (
            <>
              <select
                value={agencyFilter}
                onChange={(e) => setAgencyFilter(e.target.value)}
                className="bg-space-700 border border-space-600 text-star-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All Agencies</option>
                <option value="FAA">FAA</option>
                <option value="FCC">FCC</option>
                <option value="BIS">BIS</option>
                <option value="DDTC">DDTC</option>
                <option value="NASA">NASA</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-space-700 border border-space-600 text-star-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All Statuses</option>
                {REGULATION_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </>
          )}
          {activeTab === 'sources' && (
            <select
              value={sourceTypeFilter}
              onChange={(e) => setSourceTypeFilter(e.target.value)}
              className="bg-space-700 border border-space-600 text-star-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Types</option>
              <option value="law_firm">Law Firms</option>
              <option value="government">Government</option>
              <option value="industry_association">Industry Associations</option>
              <option value="think_tank">Think Tanks</option>
            </select>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {activeTab === 'classifications' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {classifications.map((item) => (
                <ClassificationCard key={item.id} item={item} />
              ))}
              {classifications.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <span className="text-5xl block mb-4">📋</span>
                  <p className="text-star-300">No export classifications found.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'regulations' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {regulations.map((item) => (
                <RegulationCard key={item.id} item={item} />
              ))}
              {regulations.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <span className="text-5xl block mb-4">📜</span>
                  <p className="text-star-300">No proposed regulations found.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'sources' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {sources.map((source) => (
                <LegalSourceCard key={source.id} source={source} />
              ))}
              {sources.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <span className="text-5xl block mb-4">⚖️</span>
                  <p className="text-star-300">No legal sources found.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'updates' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {updates.map((update) => (
                <LegalUpdateCard key={update.id} update={update} />
              ))}
              {updates.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <span className="text-5xl block mb-4">📰</span>
                  <p className="text-star-300">No legal updates available yet.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}

export default function CompliancePage() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <span className="text-4xl">⚖️</span>
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-white">
                Space Compliance
              </h1>
              <p className="text-star-300">
                Export controls, regulations, and legal updates for the space industry
              </p>
            </div>
          </div>
          <Link href="/" className="btn-secondary text-sm py-2 px-4">
            ← Back to Dashboard
          </Link>
        </div>

        <PremiumGate requiredTier="pro">
          {/* Content wrapped in Suspense for useSearchParams */}
          <Suspense
            fallback={
              <div className="flex justify-center py-20">
                <LoadingSpinner size="lg" />
              </div>
            }
          >
            <ComplianceContent />
          </Suspense>
        </PremiumGate>
      </div>
    </div>
  );
}
