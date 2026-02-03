'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BusinessOpportunity,
  OPPORTUNITY_TYPES,
  TIMEFRAME_INFO,
  TARGET_AUDIENCE_INFO,
  OpportunityType,
  OpportunityTimeframe,
  TargetAudience,
} from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface MoonshotIdea {
  id: string;
  title: string;
  description: string;
  riskLevel: 'extreme' | 'very_high';
  potentialReturn: string;
  timeHorizon: string;
  whyUnlikely: string;
  keyInsight: string;
  targetAudience: string[];
  requiredCapital: string;
  generatedAt: string;
}

function OpportunityCard({ opportunity }: { opportunity: BusinessOpportunity }) {
  const typeInfo = OPPORTUNITY_TYPES.find((t) => t.value === opportunity.type);
  const timeframeInfo = opportunity.timeframe
    ? TIMEFRAME_INFO[opportunity.timeframe as OpportunityTimeframe]
    : null;

  return (
    <div className="card p-4 hover:border-nebula-500/50 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs ${typeInfo?.color || 'bg-gray-500'} text-white px-2 py-0.5 rounded flex items-center gap-1`}
          >
            <span>{typeInfo?.icon}</span>
            <span>{typeInfo?.label}</span>
          </span>
          {opportunity.featured && (
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
              Featured
            </span>
          )}
        </div>
        {opportunity.aiConfidence && (
          <span className="text-xs text-star-400">
            {Math.round(opportunity.aiConfidence * 100)}% confidence
          </span>
        )}
      </div>

      <h3 className="font-semibold text-white text-sm mb-2 line-clamp-2">
        {opportunity.title}
      </h3>

      <p className="text-star-300 text-xs mb-3 line-clamp-2">
        {opportunity.description}
      </p>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {opportunity.estimatedValue && (
          <span className="text-green-400 font-medium">
            {opportunity.estimatedValue}
          </span>
        )}
        {timeframeInfo && (
          <span className={`${timeframeInfo.color} text-white px-2 py-0.5 rounded`}>
            {timeframeInfo.label}
          </span>
        )}
      </div>

      {opportunity.targetAudience && (
        <div className="flex gap-1 mt-2">
          {(opportunity.targetAudience as TargetAudience[]).slice(0, 3).map((audience) => {
            const info = TARGET_AUDIENCE_INFO[audience];
            return (
              <span
                key={audience}
                className="text-xs bg-space-700/50 text-star-200 px-2 py-0.5 rounded"
                title={info?.label}
              >
                {info?.icon}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function BusinessOpportunitiesModule() {
  const [opportunities, setOpportunities] = useState<BusinessOpportunity[]>([]);
  const [moonshots, setMoonshots] = useState<MoonshotIdea[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    featured: number;
    recentCount: number;
    byType: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showMoonshots, setShowMoonshots] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [oppsRes, statsRes, moonshotsRes] = await Promise.all([
        fetch('/api/opportunities?limit=6&featured=true'),
        fetch('/api/opportunities/stats'),
        fetch('/api/opportunities/moonshots'),
      ]);

      const oppsData = await oppsRes.json();
      const statsData = await statsRes.json();
      const moonshotsData = await moonshotsRes.json();

      if (oppsData.opportunities) {
        setOpportunities(oppsData.opportunities);
      }
      if (statsData.total !== undefined) {
        setStats(statsData);
      }
      if (moonshotsData.moonshots) {
        setMoonshots(moonshotsData.moonshots);
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
    try {
      const res = await fetch('/api/opportunities/analyze', { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        await fetchData();
      }
    } catch (error) {
      console.error('Failed to run analysis:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <div className="card p-8 text-center">
        <span className="text-5xl block mb-4">💼</span>
        <h3 className="text-xl font-semibold text-white mb-2">Business Opportunities</h3>
        <p className="text-star-300 mb-4">
          Discover AI-powered business opportunities in the space industry.
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
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">💼</span>
          <div>
            <h2 className="text-2xl font-display font-bold text-white">
              Business Opportunities
            </h2>
            <p className="text-star-300 text-sm">
              AI-powered insights for entrepreneurs & investors
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunAnalysis}
            disabled={analyzing}
            className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1"
            title="Run AI analysis for new opportunities"
          >
            {analyzing ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <span>🤖</span>
                <span>AI Scan</span>
              </>
            )}
          </button>
          <Link
            href="/business-opportunities"
            className="btn-secondary text-sm py-1.5 px-4"
          >
            View All →
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card p-3 text-center">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-star-300 text-xs">Opportunities</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-2xl font-bold text-yellow-400">{stats.featured}</div>
            <div className="text-star-300 text-xs">Featured</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-2xl font-bold text-green-400">{stats.recentCount}</div>
            <div className="text-star-300 text-xs">This Week</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-2xl font-bold text-nebula-300">
              {stats.byType?.ai_insight || 0}
            </div>
            <div className="text-star-300 text-xs">AI Insights</div>
          </div>
        </div>
      )}

      {/* Opportunities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {opportunities.map((opp) => (
          <OpportunityCard key={opp.id} opportunity={opp} />
        ))}
      </div>

      {/* Moonshots Section */}
      {moonshots.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🚀</span>
              <h3 className="text-xl font-display font-bold text-white">Moonshots</h3>
              <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded ml-2">
                High Risk / High Reward
              </span>
            </div>
            <button
              onClick={() => setShowMoonshots(!showMoonshots)}
              className="text-nebula-300 hover:text-nebula-200 text-sm"
            >
              {showMoonshots ? 'Hide' : 'Show'} Moonshots
            </button>
          </div>

          {showMoonshots ? (
            <div className="space-y-4">
              <p className="text-star-400 text-sm italic mb-4">
                Unconventional, high-risk opportunities that others might overlook. For educational purposes only.
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {moonshots.map((moonshot) => (
                  <div
                    key={moonshot.id}
                    className="card p-5 border-2 border-purple-500/30 bg-gradient-to-br from-purple-900/10 to-space-800"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-medium">
                        {moonshot.riskLevel === 'extreme' ? 'EXTREME RISK' : 'VERY HIGH RISK'}
                      </span>
                      <span className="text-green-400 font-semibold text-sm">
                        {moonshot.potentialReturn}
                      </span>
                    </div>

                    <h4 className="text-white font-semibold mb-2">{moonshot.title}</h4>
                    <p className="text-star-300 text-sm mb-4">{moonshot.description}</p>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-star-400">Time Horizon:</span>
                        <span className="text-star-200">{moonshot.timeHorizon}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-star-400">Capital Required:</span>
                        <span className="text-star-200">{moonshot.requiredCapital}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-space-600">
                      <div className="mb-2">
                        <span className="text-orange-400 text-xs font-medium">Why Most Would Dismiss:</span>
                        <p className="text-star-400 text-xs mt-1">{moonshot.whyUnlikely}</p>
                      </div>
                      <div>
                        <span className="text-green-400 text-xs font-medium">Key Insight:</span>
                        <p className="text-star-300 text-xs mt-1">{moonshot.keyInsight}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-star-500 text-xs text-center mt-4">
                These are speculative ideas for educational discussion. Not investment advice.
              </p>
            </div>
          ) : (
            <div
              className="card p-4 border border-purple-500/30 cursor-pointer hover:border-purple-500/50 transition-all"
              onClick={() => setShowMoonshots(true)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🎯</span>
                  <div>
                    <p className="text-white font-medium">{moonshots.length} Moonshot Ideas Available</p>
                    <p className="text-star-400 text-sm">
                      Unconventional opportunities with extreme risk and reward potential
                    </p>
                  </div>
                </div>
                <span className="text-nebula-300 text-sm">Click to explore →</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
