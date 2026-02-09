'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import { toast } from '@/lib/toast';

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  budget: number;
  spent: number;
  cpmRate: number;
  startDate: string;
  endDate: string;
  targetModules: string[];
  createdAt: string;
  placements: {
    id: string;
    position: string;
    format: string;
    isActive: boolean;
  }[];
  _count: {
    impressions: number;
  };
}

interface AdvertiserProfile {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  website: string | null;
  logoUrl: string | null;
  status: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  pending_review: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  active: 'bg-green-500/20 text-green-300 border-green-500/30',
  paused: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  completed: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
  pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  approved: 'bg-green-500/20 text-green-300 border-green-500/30',
  suspended: 'bg-red-500/20 text-red-300 border-red-500/30',
};

function StatusBadge({ status }: { status: string }) {
  const colorClass = STATUS_COLORS[status] || STATUS_COLORS.draft;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AdvertiserDashboard() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<AdvertiserProfile | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, campaignsRes] = await Promise.all([
        fetch('/api/ads/register'),
        fetch(`/api/ads/campaigns${statusFilter ? `?status=${statusFilter}` : ''}`),
      ]);

      const profileData = await profileRes.json();
      const campaignsData = await campaignsRes.json();

      if (profileData.success) {
        setProfile(profileData.data);
      }

      if (campaignsData.success) {
        setCampaigns(campaignsData.data?.campaigns || []);
      }
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (sessionStatus === 'authenticated') {
      fetchData();
    }
  }, [sessionStatus, fetchData, router]);

  const handleStatusChange = async (campaignId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/ads/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`Campaign ${newStatus.replace(/_/g, ' ')}`);
        fetchData();
      } else {
        toast.error(data.error?.message || 'Failed to update campaign');
      }
    } catch {
      toast.error('Failed to update campaign');
    }
  };

  // Compute summary stats
  const activeCampaigns = campaigns.filter((c) => c.status === 'active');
  const totalSpent = campaigns.reduce((sum, c) => sum + c.spent, 0);
  const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0);
  const totalImpressions = campaigns.reduce((sum, c) => sum + c._count.impressions, 0);

  if (loading) {
    return (
      <main className="container mx-auto px-4 pb-20">
        <PageHeader title="Advertiser Dashboard" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-1/3 mb-2" />
              <div className="h-3 bg-slate-700/50 rounded w-1/2" />
            </div>
          ))}
        </div>
      </main>
    );
  }

  // No advertiser profile -- redirect to registration
  if (!profile) {
    return (
      <main className="container mx-auto px-4 pb-20">
        <PageHeader
          title="Advertiser Dashboard"
          backLink="/advertise"
          backLabel="Back to Advertise"
        />
        <div className="card p-8 text-center max-w-lg mx-auto">
          <h2 className="text-xl font-semibold text-white mb-2">Not Registered</h2>
          <p className="text-star-300 mb-4">
            You need to register as an advertiser before accessing the dashboard.
          </p>
          <Link href="/advertise#register" className="btn-primary inline-flex px-6 py-2">
            Register Now
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 pb-20">
      <PageHeader
        title="Advertiser Dashboard"
        subtitle={profile.companyName}
        backLink="/advertise"
        backLabel="Back to Advertise"
      >
        <StatusBadge status={profile.status} />
      </PageHeader>

      {/* Profile Status Warning */}
      {profile.status === 'pending' && (
        <div className="card p-4 mb-6 border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-yellow-300 font-medium">Account Pending Review</p>
              <p className="text-star-300 text-sm mt-1">
                Your advertiser account is being reviewed. You can prepare campaigns, but they cannot go live until your account is approved.
              </p>
            </div>
          </div>
        </div>
      )}

      {profile.status === 'suspended' && (
        <div className="card p-4 mb-6 border-red-500/30 bg-red-500/5">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <div>
              <p className="text-red-300 font-medium">Account Suspended</p>
              <p className="text-star-300 text-sm mt-1">
                Your advertiser account has been suspended. Please contact support for more information.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card p-4">
          <p className="text-star-300 text-xs uppercase tracking-wider mb-1">Active Campaigns</p>
          <p className="text-2xl font-bold text-white">{activeCampaigns.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-star-300 text-xs uppercase tracking-wider mb-1">Total Impressions</p>
          <p className="text-2xl font-bold text-white">
            {totalImpressions.toLocaleString()}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-star-300 text-xs uppercase tracking-wider mb-1">Total Spent</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalSpent)}</p>
        </div>
        <div className="card p-4">
          <p className="text-star-300 text-xs uppercase tracking-wider mb-1">Total Budget</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalBudget)}</p>
        </div>
      </div>

      {/* Campaign Controls */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-star-300 text-sm">Filter:</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input text-sm py-1 px-3"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending_review">Pending Review</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {profile.status === 'approved' && (
          <Link
            href="/advertise/dashboard"
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
            title="Create a new campaign via API -- see documentation"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Campaign
          </Link>
        )}
      </div>

      {/* Campaign List */}
      {campaigns.length === 0 ? (
        <div className="card p-8 text-center">
          <svg className="w-12 h-12 text-star-300/50 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-lg font-semibold text-white mb-2">No Campaigns Yet</h3>
          <p className="text-star-300 text-sm mb-4">
            Create your first campaign to start reaching space industry professionals.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-semibold text-white">{campaign.name}</h3>
                    <StatusBadge status={campaign.status} />
                  </div>
                  <p className="text-star-300 text-sm">
                    {campaign.type.replace(/_/g, ' ')} &middot;{' '}
                    {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {campaign.status === 'draft' && (
                    <button
                      onClick={() => handleStatusChange(campaign.id, 'pending_review')}
                      className="text-xs px-3 py-1.5 rounded bg-nebula-500/20 text-nebula-300 hover:bg-nebula-500/30 transition-colors"
                    >
                      Submit for Review
                    </button>
                  )}
                  {campaign.status === 'active' && (
                    <button
                      onClick={() => handleStatusChange(campaign.id, 'paused')}
                      className="text-xs px-3 py-1.5 rounded bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 transition-colors"
                    >
                      Pause
                    </button>
                  )}
                  {campaign.status === 'paused' && (
                    <button
                      onClick={() => handleStatusChange(campaign.id, 'active')}
                      className="text-xs px-3 py-1.5 rounded bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors"
                    >
                      Resume
                    </button>
                  )}
                </div>
              </div>

              {/* Campaign Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <p className="text-star-300 text-xs mb-1">Budget</p>
                  <p className="text-white font-medium">{formatCurrency(campaign.budget)}</p>
                </div>
                <div>
                  <p className="text-star-300 text-xs mb-1">Spent</p>
                  <p className="text-white font-medium">{formatCurrency(campaign.spent)}</p>
                </div>
                <div>
                  <p className="text-star-300 text-xs mb-1">CPM Rate</p>
                  <p className="text-white font-medium">{formatCurrency(campaign.cpmRate)}</p>
                </div>
                <div>
                  <p className="text-star-300 text-xs mb-1">Impressions</p>
                  <p className="text-white font-medium">{campaign._count.impressions.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-star-300 text-xs mb-1">Budget Used</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-nebula-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (campaign.spent / campaign.budget) * 100)}%` }}
                      />
                    </div>
                    <span className="text-white font-medium text-sm">
                      {Math.round((campaign.spent / campaign.budget) * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Target Modules */}
              {campaign.targetModules.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <p className="text-star-300 text-xs mb-2">Target Modules:</p>
                  <div className="flex flex-wrap gap-2">
                    {campaign.targetModules.map((mod) => (
                      <span
                        key={mod}
                        className="px-2 py-0.5 rounded bg-slate-800/50 text-slate-300 text-xs"
                      >
                        {mod}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
