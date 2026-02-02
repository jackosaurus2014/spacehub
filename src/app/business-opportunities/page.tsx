'use client';

import { useState, useEffect } from 'react';
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
              className={`text-xs ${typeInfo?.color || 'bg-gray-500'} text-white px-2 py-0.5 rounded`}
            >
              {typeInfo?.label}
            </span>
            <span className="text-xs bg-space-700 text-star-200 px-2 py-0.5 rounded flex items-center gap-1">
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

          <h3 className="font-semibold text-white text-lg mb-2">
            {opportunity.title}
          </h3>

          <p className="text-star-300 text-sm mb-3">
            {opportunity.description}
          </p>

          <div className="flex flex-wrap items-center gap-3 text-sm mb-3">
            {opportunity.estimatedValue && (
              <div className="flex items-center gap-1">
                <span className="text-star-400">Value:</span>
                <span className="text-green-400 font-semibold">
                  {opportunity.estimatedValue}
                </span>
              </div>
            )}
            {timeframeInfo && (
              <div className="flex items-center gap-1">
                <span className="text-star-400">Timeframe:</span>
                <span className={`${timeframeInfo.color} text-white px-2 py-0.5 rounded text-xs`}>
                  {timeframeInfo.label}
                </span>
              </div>
            )}
            {difficultyInfo && (
              <div className="flex items-center gap-1">
                <span className="text-star-400">Difficulty:</span>
                <span className={`${difficultyInfo.color} text-white px-2 py-0.5 rounded text-xs`}>
                  {difficultyInfo.label}
                </span>
              </div>
            )}
            {opportunity.aiConfidence && (
              <div className="flex items-center gap-1">
                <span className="text-star-400">Confidence:</span>
                <span className="text-nebula-300">
                  {Math.round(opportunity.aiConfidence * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Target Audience */}
          {opportunity.targetAudience && opportunity.targetAudience.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-star-400 text-sm">For:</span>
              <div className="flex gap-1">
                {(opportunity.targetAudience as TargetAudience[]).map((audience) => {
                  const info = TARGET_AUDIENCE_INFO[audience];
                  return (
                    <span
                      key={audience}
                      className="text-xs bg-space-700/50 text-star-200 px-2 py-1 rounded flex items-center gap-1"
                    >
                      {info?.icon} {info?.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Expandable Analysis */}
          {(opportunity.fullAnalysis || opportunity.aiReasoning) && (
            <div>
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-nebula-400 hover:text-nebula-300 text-sm flex items-center gap-1"
              >
                {expanded ? '▼ Hide Analysis' : '▶ Show Full Analysis'}
              </button>
              {expanded && (
                <div className="mt-3 p-4 bg-space-800/50 rounded-lg">
                  {opportunity.fullAnalysis && (
                    <div className="mb-3">
                      <h4 className="text-white font-medium mb-2">Full Analysis</h4>
                      <p className="text-star-300 text-sm whitespace-pre-wrap">
                        {opportunity.fullAnalysis}
                      </p>
                    </div>
                  )}
                  {opportunity.aiReasoning && (
                    <div>
                      <h4 className="text-white font-medium mb-2">🤖 AI Reasoning</h4>
                      <p className="text-star-300 text-sm">{opportunity.aiReasoning}</p>
                    </div>
                  )}
                  {opportunity.relatedTrends && opportunity.relatedTrends.length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-white font-medium mb-2">Related Trends</h4>
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

export default function BusinessOpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<BusinessOpportunity[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    featured: number;
    recentCount: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    success: boolean;
    opportunitiesFound: number;
    insights: string[];
    error?: string;
  } | null>(null);
  const [selectedType, setSelectedType] = useState<OpportunityType | ''>('');
  const [selectedCategory, setSelectedCategory] = useState<OpportunityCategory | ''>('');
  const [selectedAudience, setSelectedAudience] = useState<TargetAudience | ''>('');

  useEffect(() => {
    fetchData();
  }, [selectedType, selectedCategory, selectedAudience]);

  const fetchData = async () => {
    setLoading(true);
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

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const res = await fetch('/api/opportunities/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const result = await res.json();
      setAnalysisResult(result);
      if (result.success) {
        await fetchData();
      }
    } catch (error) {
      console.error('Failed to run analysis:', error);
      setAnalysisResult({
        success: false,
        opportunitiesFound: 0,
        insights: [],
        error: 'Failed to connect to analysis service',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-star-300 text-sm mb-2">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-white">Business Opportunities</span>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <span className="text-4xl">💼</span>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white">
                  Business Opportunities
                </h1>
              </div>
              <p className="text-star-300">
                AI-powered discovery of space industry opportunities for entrepreneurs, investors, and students
              </p>
            </div>
            <button
              onClick={handleRunAnalysis}
              disabled={analyzing}
              className="btn-primary flex items-center gap-2"
            >
              {analyzing ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Running AI Analysis...</span>
                </>
              ) : (
                <>
                  <span>🤖</span>
                  <span>Run AI Deep Dive</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* AI Analysis Result */}
        {analysisResult && (
          <div
            className={`card p-4 mb-6 ${
              analysisResult.success
                ? 'border-green-500/50 bg-green-500/10'
                : 'border-red-500/50 bg-red-500/10'
            }`}
          >
            {analysisResult.success ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-400">✓</span>
                  <span className="text-white font-semibold">
                    AI Analysis Complete
                  </span>
                </div>
                <p className="text-star-300 text-sm">
                  Found {analysisResult.opportunitiesFound} new opportunities.
                </p>
                {analysisResult.insights.length > 0 && (
                  <ul className="mt-2 text-sm text-star-300">
                    {analysisResult.insights.slice(0, 3).map((insight, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="text-nebula-400">•</span>
                        {insight}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-red-400">✗</span>
                <span className="text-white">
                  {analysisResult.error || 'Analysis failed'}
                </span>
              </div>
            )}
          </div>
        )}

        {stats && stats.total > 0 && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="card p-4 text-center">
                <div className="text-3xl font-bold text-white">{stats.total}</div>
                <div className="text-star-300 text-sm">Total Opportunities</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-3xl font-bold text-yellow-400">{stats.featured}</div>
                <div className="text-star-300 text-sm">Featured</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-3xl font-bold text-green-400">{stats.recentCount}</div>
                <div className="text-star-300 text-sm">Added This Week</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-3xl font-bold text-blue-400">
                  {stats.byType?.government_contract || 0}
                </div>
                <div className="text-star-300 text-sm">Gov Contracts</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-3xl font-bold text-nebula-300">
                  {stats.byType?.ai_insight || 0}
                </div>
                <div className="text-star-300 text-sm">AI Insights</div>
              </div>
            </div>

            {/* Filters */}
            <div className="card p-4 mb-6">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <label className="block text-star-300 text-sm mb-1">Type</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as OpportunityType | '')}
                    className="bg-space-700 border border-space-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"
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
                  <label className="block text-star-300 text-sm mb-1">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) =>
                      setSelectedCategory(e.target.value as OpportunityCategory | '')
                    }
                    className="bg-space-700 border border-space-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"
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
                  <label className="block text-star-300 text-sm mb-1">For</label>
                  <select
                    value={selectedAudience}
                    onChange={(e) =>
                      setSelectedAudience(e.target.value as TargetAudience | '')
                    }
                    className="bg-space-700 border border-space-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"
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
                      className="text-sm text-nebula-400 hover:text-nebula-300 py-2"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
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
            <h2 className="text-2xl font-semibold text-white mb-2">
              No Opportunities Yet
            </h2>
            <p className="text-star-300 mb-6">
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
            <h2 className="text-2xl font-semibold text-white mb-2">No Results</h2>
            <p className="text-star-300">
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
        <div className="card p-6 mt-8 border-dashed">
          <div className="text-center">
            <span className="text-4xl block mb-3">🤖</span>
            <h3 className="text-lg font-semibold text-white mb-2">
              About AI-Powered Opportunities
            </h3>
            <p className="text-star-300 text-sm max-w-3xl mx-auto">
              Our AI system analyzes news sources, government solicitations, company reports,
              and market trends to identify business opportunities in the space industry.
              The &quot;AI Deep Dive&quot; feature uses advanced analysis to discover emerging
              opportunities that may not be immediately obvious. Confidence scores indicate
              how strongly the AI believes in the opportunity based on available data.
              Always conduct your own due diligence before pursuing any opportunity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
