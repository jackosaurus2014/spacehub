'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  BusinessOpportunity,
  OPPORTUNITY_TYPES,
  OPPORTUNITY_CATEGORIES,
  TIMEFRAME_INFO,
  DIFFICULTY_INFO,
  TARGET_AUDIENCE_INFO,
  OpportunityType,
  OpportunityCategory,
  OpportunityTimeframe,
  OpportunityDifficulty,
  TargetAudience,
} from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import ExportButton from '@/components/ui/ExportButton';
import { ContractTicker, ContractsList } from '@/components/contracts';

function ExpressInterestButton({ opportunityId }: { opportunityId: string }) {
  const [interested, setInterested] = useState(false);
  const [count, setCount] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/marketplace/interest?opportunityId=${opportunityId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setCount(data.totalInterested || 0);
          setInterested(data.hasExpressedInterest || false);
        }
      })
      .catch(() => {});
  }, [opportunityId]);

  const handleSubmit = async () => {
    if (!email) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/marketplace/interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId, contactEmail: email }),
      });
      if (res.ok) {
        setInterested(true);
        setCount(c => c + 1);
        setShowForm(false);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to express interest');
      }
    } catch {
      alert('Please sign in to express interest');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-2 mb-3">
      {interested ? (
        <span className="text-xs px-2.5 py-1 bg-green-500/20 text-green-400 rounded font-medium">
          ✓ Interest Expressed
        </span>
      ) : showForm ? (
        <div className="flex items-center gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Contact email"
            placeholder="Contact email"
            className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white w-44"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !email}
            className="text-xs px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white rounded font-medium transition-colors"
          >
            {submitting ? '...' : 'Confirm'}
          </button>
          <button onClick={() => setShowForm(false)} className="text-xs text-slate-400 hover:text-white">Cancel</button>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="text-xs px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium transition-colors"
        >
          Express Interest
        </button>
      )}
      {count > 0 && (
        <span className="text-[10px] text-slate-500">{count} interested</span>
      )}
    </div>
  );
}

function OpportunityRow({ opportunity }: { opportunity: BusinessOpportunity }) {
  const [expanded, setExpanded] = useState(false);
  const typeInfo = OPPORTUNITY_TYPES.find((t) => t.value === opportunity.type);
  const categoryInfo = OPPORTUNITY_CATEGORIES.find((c) => c.value === opportunity.category);
  const timeframeInfo = opportunity.timeframe
    ? TIMEFRAME_INFO[opportunity.timeframe as OpportunityTimeframe]
    : null;
  const difficultyInfo = opportunity.difficulty
    ? DIFFICULTY_INFO[opportunity.difficulty as OpportunityDifficulty]
    : null;

  return (
    <div className="card p-4 mb-4">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <span className="text-3xl">{typeInfo?.icon || '📋'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className={`text-xs ${typeInfo?.color || 'bg-gray-500'} text-slate-900 px-2 py-0.5 rounded`}
            >
              {typeInfo?.label}
            </span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded flex items-center gap-1">
              {categoryInfo?.icon} {categoryInfo?.label}
            </span>
            {opportunity.featured && (
              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                ⭐ Featured
              </span>
            )}
            {opportunity.agency && (
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                {opportunity.agency}
              </span>
            )}
          </div>

          <h3 className="font-semibold text-slate-900 text-lg mb-2">
            {opportunity.title}
          </h3>

          <p className="text-slate-400 text-sm mb-3">
            {opportunity.description}
          </p>

          <div className="flex flex-wrap items-center gap-3 text-sm mb-3">
            {opportunity.estimatedValue && (
              <div className="flex items-center gap-1">
                <span className="text-slate-400">Value:</span>
                <span className="text-green-400 font-semibold">
                  {opportunity.estimatedValue}
                </span>
              </div>
            )}
            {timeframeInfo && (
              <div className="flex items-center gap-1">
                <span className="text-slate-400">Timeframe:</span>
                <span className={`${timeframeInfo.color} text-slate-900 px-2 py-0.5 rounded text-xs`}>
                  {timeframeInfo.label}
                </span>
              </div>
            )}
            {difficultyInfo && (
              <div className="flex items-center gap-1">
                <span className="text-slate-400">Difficulty:</span>
                <span className={`${difficultyInfo.color} text-slate-900 px-2 py-0.5 rounded text-xs`}>
                  {difficultyInfo.label}
                </span>
              </div>
            )}
            {opportunity.aiConfidence && (
              <div className="flex items-center gap-1">
                <span className="text-slate-400">Confidence:</span>
                <span className="text-nebula-300">
                  {Math.round(opportunity.aiConfidence * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Target Audience */}
          {opportunity.targetAudience && opportunity.targetAudience.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-slate-400 text-sm">For:</span>
              <div className="flex gap-1">
                {(opportunity.targetAudience as TargetAudience[]).map((audience) => {
                  const info = TARGET_AUDIENCE_INFO[audience];
                  return (
                    <span
                      key={audience}
                      className="text-xs bg-slate-100/50 text-slate-600 px-2 py-1 rounded flex items-center gap-1"
                    >
                      {info?.icon} {info?.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cross-module Links */}
          <div className="flex flex-wrap gap-2 mb-3">
            <Link
              href="/market-intel"
              className="text-xs text-nebula-300 hover:text-nebula-200 bg-nebula-500/10 px-2 py-1 rounded transition-colors"
            >
              View related companies →
            </Link>
            {(opportunity.category === 'launch_services' || opportunity.category === 'satellites') && (
              <Link
                href="/compliance?tab=regulations"
                className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 px-2 py-1 rounded transition-colors"
              >
                Compliance requirements →
              </Link>
            )}
            <Link
              href={`/marketplace/search?category=${opportunity.category === 'launch_services' ? 'launch' : opportunity.category === 'satellites' ? 'satellite' : ''}`}
              className="text-xs text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 px-2 py-1 rounded transition-colors"
            >
              Find providers on Marketplace →
            </Link>
          </div>

          {/* Express Interest */}
          <ExpressInterestButton opportunityId={opportunity.id} />

          {/* Expandable Analysis */}
          {(opportunity.fullAnalysis || opportunity.aiReasoning) && (
            <div>
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-nebula-300 hover:text-nebula-200 text-sm flex items-center gap-1"
              >
                {expanded ? '▼ Hide Analysis' : '▶ Show Full Analysis'}
              </button>
              {expanded && (
                <div className="mt-3 p-4 bg-slate-50 rounded-lg">
                  {opportunity.fullAnalysis && (
                    <div className="mb-3">
                      <h4 className="text-slate-900 font-medium mb-2">Full Analysis</h4>
                      <p className="text-slate-400 text-sm whitespace-pre-wrap">
                        {opportunity.fullAnalysis}
                      </p>
                    </div>
                  )}
                  {opportunity.aiReasoning && (
                    <div>
                      <h4 className="text-slate-900 font-medium mb-2">🤖 AI Reasoning</h4>
                      <p className="text-slate-400 text-sm">{opportunity.aiReasoning}</p>
                    </div>
                  )}
                  {opportunity.relatedTrends && opportunity.relatedTrends.length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-slate-900 font-medium mb-2">Related Trends</h4>
                      <div className="flex flex-wrap gap-1">
                        {(opportunity.relatedTrends as string[]).map((trend) => (
                          <span
                            key={trend}
                            className="text-xs bg-nebula-500/20 text-nebula-300 px-2 py-1 rounded"
                          >
                            #{trend.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type TabType = 'opportunities' | 'contracts';

function BusinessOpportunitiesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [activeTab, setActiveTab] = useState<TabType>(
    (searchParams.get('tab') as TabType) || 'opportunities'
  );
  const [opportunities, setOpportunities] = useState<BusinessOpportunity[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    featured: number;
    recentCount: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [selectedType, setSelectedType] = useState<OpportunityType | ''>(
    (searchParams.get('type') as OpportunityType | '') || ''
  );
  const [selectedCategory, setSelectedCategory] = useState<OpportunityCategory | ''>(
    (searchParams.get('category') as OpportunityCategory | '') || ''
  );
  const [selectedAudience, setSelectedAudience] = useState<TargetAudience | ''>(
    (searchParams.get('audience') as TargetAudience | '') || ''
  );

  // Sync filters and tab to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab !== 'opportunities') params.set('tab', activeTab);
    if (selectedType) params.set('type', selectedType);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedAudience) params.set('audience', selectedAudience);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [activeTab, selectedType, selectedCategory, selectedAudience, router, pathname]);

  useEffect(() => {
    fetchData();
  }, [selectedType, selectedCategory, selectedAudience]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedType) params.set('type', selectedType);
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedAudience) params.set('targetAudience', selectedAudience);
      params.set('limit', '50');

      const [oppsRes, statsRes] = await Promise.all([
        fetch(`/api/opportunities?${params}`),
        fetch('/api/opportunities/stats'),
      ]);

      const oppsData = await oppsRes.json();
      const statsData = await statsRes.json();

      if (oppsData.opportunities) {
        setOpportunities(oppsData.opportunities);
      }
      if (statsData.total !== undefined) {
        setStats(statsData);
      }
    } catch (error) {
      console.error('Failed to fetch opportunities:', error);
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      await fetch('/api/opportunities/init', { method: 'POST' });
      await fetchData();
    } catch (error) {
      console.error('Failed to initialize opportunities:', error);
    } finally {
      setInitializing(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Business Opportunities"
          subtitle="AI-powered discovery of space industry opportunities for entrepreneurs, investors, and students"
          icon="💼"
          accentColor="amber"
        />

        {/* Government Contracts Ticker */}
        <div className="mb-8">
          <ContractTicker />
        </div>

        {error && (
          <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
            <div className="text-red-400 text-sm font-medium">{error}</div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-slate-800/50 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('opportunities')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'opportunities'
                ? 'bg-nebula-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            AI Opportunities
          </button>
          <button
            onClick={() => setActiveTab('contracts')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'contracts'
                ? 'bg-nebula-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            Government Contracts
          </button>
        </div>

        {/* Government Contracts Tab Content */}
        {activeTab === 'contracts' && (
          <ContractsList />
        )}

        {/* AI Opportunities Tab Content */}
        {activeTab === 'opportunities' && (
          <>
        {stats && stats.total > 0 && (
          <>
            {/* Stats */}
            <StaggerContainer className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <StaggerItem>
                <div className="card-elevated p-6 text-center">
                  <div className="text-4xl font-bold font-display tracking-tight text-slate-900">{stats.total}</div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Total Opportunities</div>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="card-elevated p-6 text-center">
                  <div className="text-4xl font-bold font-display tracking-tight text-yellow-400">{stats.featured}</div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Featured</div>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="card-elevated p-6 text-center">
                  <div className="text-4xl font-bold font-display tracking-tight text-green-400">{stats.recentCount}</div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Added This Week</div>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="card-elevated p-6 text-center">
                  <div className="text-4xl font-bold font-display tracking-tight text-blue-400">
                    {stats.byType?.government_contract || 0}
                  </div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Gov Contracts</div>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="card-elevated p-6 text-center">
                  <div className="text-4xl font-bold font-display tracking-tight text-nebula-300">
                    {stats.byType?.ai_insight || 0}
                  </div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">AI Insights</div>
                </div>
              </StaggerItem>
            </StaggerContainer>

            {/* Filters */}
            <div className="card p-4 mb-6">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <label htmlFor="opp-type-filter" className="block text-slate-400 text-sm mb-1">Type</label>
                  <select
                    id="opp-type-filter"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as OpportunityType | '')}
                    className="bg-slate-100 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"
                  >
                    <option value="">All Types</option>
                    {OPPORTUNITY_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="opp-category-filter" className="block text-slate-400 text-sm mb-1">Category</label>
                  <select
                    id="opp-category-filter"
                    value={selectedCategory}
                    onChange={(e) =>
                      setSelectedCategory(e.target.value as OpportunityCategory | '')
                    }
                    className="bg-slate-100 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"
                  >
                    <option value="">All Categories</option>
                    {OPPORTUNITY_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="opp-audience-filter" className="block text-slate-400 text-sm mb-1">For</label>
                  <select
                    id="opp-audience-filter"
                    value={selectedAudience}
                    onChange={(e) =>
                      setSelectedAudience(e.target.value as TargetAudience | '')
                    }
                    className="bg-slate-100 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"
                  >
                    <option value="">All Audiences</option>
                    <option value="entrepreneurs">💡 Entrepreneurs</option>
                    <option value="investors">💰 Investors</option>
                    <option value="students">🎓 Students</option>
                    <option value="corporations">🏢 Corporations</option>
                  </select>
                </div>

                {(selectedType || selectedCategory || selectedAudience) && (
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setSelectedType('');
                        setSelectedCategory('');
                        setSelectedAudience('');
                      }}
                      className="text-sm text-nebula-300 hover:text-nebula-200 py-2"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}

                <div className="flex items-end ml-auto">
                  <ExportButton
                    data={opportunities}
                    filename="business-opportunities"
                    columns={[
                      { key: 'title', label: 'Title' },
                      { key: 'type', label: 'Type' },
                      { key: 'category', label: 'Category' },
                      { key: 'targetAudience', label: 'Target Audience' },
                      { key: 'description', label: 'Description' },
                      { key: 'estimatedValue', label: 'Estimated Value' },
                      { key: 'timeframe', label: 'Timeframe' },
                    ]}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Opportunities List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : opportunities.length === 0 && !stats?.total ? (
          <div className="card p-12 text-center">
            <span className="text-6xl block mb-4">💼</span>
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">
              No Opportunities Yet
            </h2>
            <p className="text-slate-400 mb-6">
              Initialize the database with curated space industry opportunities.
            </p>
            <button
              onClick={handleInitialize}
              disabled={initializing}
              className="btn-primary"
            >
              {initializing ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Initializing...
                </span>
              ) : (
                'Load Opportunities'
              )}
            </button>
          </div>
        ) : opportunities.length === 0 ? (
          <div className="card p-12 text-center">
            <span className="text-6xl block mb-4">🔍</span>
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">No Results</h2>
            <p className="text-slate-400">
              No opportunities match your filters. Try adjusting your criteria.
            </p>
          </div>
        ) : (
          <div>
            {opportunities.map((opp) => (
              <OpportunityRow key={opp.id} opportunity={opp} />
            ))}
          </div>
        )}

            {/* Info Note */}
            <ScrollReveal>
              <div className="card p-6 mt-8 border-dashed">
                <div className="text-center">
                  <span className="text-4xl block mb-3">🤖</span>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    About AI-Powered Opportunities
                  </h3>
                  <p className="text-slate-400 text-sm max-w-3xl mx-auto">
                    Every week, our AI system automatically analyzes news sources, government solicitations,
                    company reports, and market trends to discover new business opportunities in the
                    space industry. Fresh opportunities are added each week. Confidence scores indicate
                    how strongly the AI believes in the opportunity based on available data.
                    Always conduct your own due diligence before pursuing any opportunity.
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </>
        )}
      </div>
    </div>
  );
}

export default function BusinessOpportunitiesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <BusinessOpportunitiesContent />
    </Suspense>
  );
}
