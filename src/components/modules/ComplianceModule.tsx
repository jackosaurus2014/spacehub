'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  EXPORT_REGIMES,
  CLASSIFICATION_CATEGORIES,
  REGULATION_STATUSES,
  ExportRegime,
  ClassificationCategory,
} from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import InlineDisclaimer from '@/components/InlineDisclaimer';

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
}

function ClassificationCard({ item }: { item: ExportClassification }) {
  const regimeInfo = EXPORT_REGIMES.find((r) => r.value === item.regime);
  const categoryInfo = CLASSIFICATION_CATEGORIES.find((c) => c.value === item.category);

  return (
    <div className="card p-4 hover:border-nebula-500/50 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded ${
              item.regime === 'ITAR'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}
          >
            {item.regime}
          </span>
          <span className="text-xs font-mono text-nebula-300">{item.classification}</span>
        </div>
        <span className="text-lg">{categoryInfo?.icon || '📋'}</span>
      </div>
      <h4 className="font-semibold text-white text-sm mb-1 line-clamp-1">{item.name}</h4>
      <p className="text-star-300 text-xs line-clamp-2 mb-2">{item.description}</p>
      {item.controlReason && (
        <span className="text-xs text-star-400">Control: {item.controlReason}</span>
      )}
    </div>
  );
}

function RegulationCard({ item }: { item: ProposedRegulation }) {
  const statusInfo = REGULATION_STATUSES.find((s) => s.value === item.status);
  const deadline = item.commentDeadline ? new Date(item.commentDeadline) : null;
  const isUrgent = deadline && deadline > new Date() && deadline < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return (
    <div className="card p-4 hover:border-nebula-500/50 transition-all">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-semibold text-nebula-300 bg-space-700 px-2 py-0.5 rounded">
          {item.agency}
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded ${
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
      <h4 className="font-semibold text-white text-sm mb-1 line-clamp-2">{item.title}</h4>
      <p className="text-star-300 text-xs line-clamp-2 mb-2">{item.summary}</p>
      <div className="flex items-center justify-between">
        {deadline && (
          <span className={`text-xs ${isUrgent ? 'text-yellow-400' : 'text-star-400'}`}>
            {isUrgent && '⚠️ '}Comments due: {deadline.toLocaleDateString()}
          </span>
        )}
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-nebula-400 hover:text-nebula-300"
        >
          View →
        </a>
      </div>
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
      className="card p-3 hover:border-nebula-500/50 transition-all flex items-center gap-3"
    >
      <span className="text-xl">{typeInfo.icon}</span>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-white text-sm truncate">{source.name}</h4>
        <span className="text-xs text-star-400">{typeInfo.label}</span>
      </div>
      <span className="text-star-400">→</span>
    </a>
  );
}

export default function ComplianceModule() {
  const [classifications, setClassifications] = useState<ExportClassification[]>([]);
  const [regulations, setRegulations] = useState<ProposedRegulation[]>([]);
  const [legalSources, setLegalSources] = useState<LegalSource[]>([]);
  const [stats, setStats] = useState<{
    classifications: number;
    regulations: number;
    openRegulations: number;
    sources: number;
    regimeBreakdown?: { ITAR: number; EAR: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [activeTab, setActiveTab] = useState<'classifications' | 'regulations' | 'legal'>('classifications');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, classRes, regRes, sourcesRes] = await Promise.all([
        fetch('/api/compliance'),
        fetch('/api/compliance/classifications?limit=6'),
        fetch('/api/compliance/regulations?limit=4'),
        fetch('/api/compliance/legal?type=sources'),
      ]);

      const [statsData, classData, regData, sourcesData] = await Promise.all([
        statsRes.json(),
        classRes.json(),
        regRes.json(),
        sourcesRes.json(),
      ]);

      if (statsData.classifications !== undefined) setStats(statsData);
      if (classData.classifications) setClassifications(classData.classifications);
      if (regData.regulations) setRegulations(regData.regulations);
      if (sourcesData.sources) setLegalSources(sourcesData.sources);
    } catch (error) {
      console.error('Failed to fetch compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      await fetch('/api/compliance/init', { method: 'POST' });
      await fetchData();
    } catch (error) {
      console.error('Failed to initialize compliance data:', error);
    } finally {
      setInitializing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!stats || stats.classifications === 0) {
    return (
      <div className="card p-8 text-center">
        <span className="text-5xl block mb-4">⚖️</span>
        <h3 className="text-xl font-semibold text-white mb-2">Compliance</h3>
        <p className="text-star-300 mb-4">
          Export controls, regulations, and legal updates for the space industry.
        </p>
        <button
          onClick={handleInitialize}
          disabled={initializing}
          className="btn-primary"
        >
          {initializing ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner size="sm" />
              Loading Data...
            </span>
          ) : (
            'Load Compliance Data'
          )}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">⚖️</span>
          <div>
            <h2 className="text-2xl font-display font-bold text-white">Compliance</h2>
            <p className="text-star-300 text-sm">Export controls, regulations & legal updates</p>
          </div>
        </div>
        <Link href="/compliance" className="btn-secondary text-sm py-1.5 px-4">
          View All →
        </Link>
      </div>

      <InlineDisclaimer />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-3 text-center">
          <div className="text-2xl font-bold text-white">{stats.classifications}</div>
          <div className="text-star-300 text-xs">Classifications</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-2xl font-bold text-red-400">{stats.regimeBreakdown?.ITAR || 0}</div>
          <div className="text-star-300 text-xs">ITAR Items</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-2xl font-bold text-blue-400">{stats.regimeBreakdown?.EAR || 0}</div>
          <div className="text-star-300 text-xs">EAR Items</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-2xl font-bold text-yellow-400">{stats.openRegulations}</div>
          <div className="text-star-300 text-xs">Open for Comment</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {[
          { id: 'classifications', label: 'Export Controls', icon: '📋' },
          { id: 'regulations', label: 'Proposed Rules', icon: '📜' },
          { id: 'legal', label: 'Legal Resources', icon: '⚖️' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
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

      {/* Tab Content */}
      {activeTab === 'classifications' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classifications.slice(0, 6).map((item) => (
            <ClassificationCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {activeTab === 'regulations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {regulations.slice(0, 4).map((item) => (
            <RegulationCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {activeTab === 'legal' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {legalSources.slice(0, 6).map((source) => (
            <LegalSourceCard key={source.id} source={source} />
          ))}
        </div>
      )}
    </div>
  );
}
