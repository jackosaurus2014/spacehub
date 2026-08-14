'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import { toast } from '@/lib/toast';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import {
  SELF_SERVE_MIN_BUDGET_USD,
  SELF_SERVE_MAX_BUDGET_USD,
  SPONSORSHIP_CAMPAIGN_TYPE,
} from '@/lib/ads/ad-billing';

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

const CAMPAIGN_TYPES = [
  { value: 'banner', label: 'Banner' },
  { value: 'native', label: 'Native' },
  { value: 'sponsored_content', label: 'Sponsored Content' },
  { value: 'job_listing', label: 'Job Listing' },
];

const PLACEMENT_POSITIONS = [
  { value: 'sidebar', label: 'Sidebar' },
  { value: 'top_banner', label: 'Top Banner' },
  { value: 'in_feed', label: 'In Feed' },
  { value: 'footer', label: 'Footer' },
];

const PLACEMENT_FORMATS = [
  { value: 'native_card', label: 'Native Card' },
  { value: 'banner_728x90', label: 'Banner 728x90' },
  { value: 'banner_300x250', label: 'Banner 300x250' },
  { value: 'sponsored_article', label: 'Sponsored Article' },
];

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
    timeZone: 'UTC',
  });
}

const EMPTY_FORM = {
  name: '',
  type: 'banner',
  budget: '500',
  startDate: '',
  endDate: '',
  targetModules: '',
  position: 'sidebar',
  format: 'native_card',
  title: '',
  description: '',
  linkUrl: '',
  ctaText: 'Learn More',
};

export default function AdvertiserDashboard() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<AdvertiserProfile | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [buyingSponsorship, setBuyingSponsorship] = useState<string | null>(null);

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
      router.push('/login');
      return;
    }

    if (sessionStatus === 'authenticated') {
      fetchData();
    }
  }, [sessionStatus, fetchData, router]);

  // Show the checkout result once after returning from Stripe.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    if (!checkout) return;
    if (checkout === 'success') {
      toast.success(
        'Payment received. Your campaign is now in review — we review within 2 business days.'
      );
    } else if (checkout === 'cancelled') {
      toast.info('Checkout cancelled — your campaign is saved as a draft.');
    }
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

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

  const handlePayAndSubmit = async (campaignId: string) => {
    setPayingId(campaignId);
    try {
      const res = await fetch('/api/ads/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        window.location.href = data.data.url;
        return;
      }
      toast.error(data.error?.message || 'Failed to start checkout');
    } catch {
      toast.error('Failed to start checkout');
    } finally {
      setPayingId(null);
    }
  };

  const handleBuySponsorship = async (option: 'single' | 'block4') => {
    setBuyingSponsorship(option);
    try {
      const res = await fetch('/api/ads/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sponsorship: option }),
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        window.location.href = data.data.url;
        return;
      }
      toast.error(data.error?.message || 'Failed to start checkout');
    } catch {
      toast.error('Failed to start checkout');
    } finally {
      setBuyingSponsorship(null);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    const budget = parseFloat(form.budget);
    if (!Number.isFinite(budget) || budget <= 0) {
      toast.error('Enter a valid budget');
      return;
    }
    if (!form.startDate || !form.endDate) {
      toast.error('Start and end dates are required');
      return;
    }
    const modules = form.targetModules
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
    if (modules.length === 0) {
      toast.error('Enter at least one target module (e.g. news, jobs, startups)');
      return;
    }
    if (!form.linkUrl) {
      toast.error('A destination link URL is required');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/ads/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          budget,
          startDate: new Date(`${form.startDate}T00:00:00Z`).toISOString(),
          endDate: new Date(`${form.endDate}T23:59:59Z`).toISOString(),
          targetModules: modules,
          placements: [
            {
              position: form.position,
              format: form.format,
              title: form.title || undefined,
              description: form.description || undefined,
              linkUrl: form.linkUrl,
              ctaText: form.ctaText || 'Learn More',
            },
          ],
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Draft campaign created — pay to submit it for review');
        setShowCreateForm(false);
        setForm(EMPTY_FORM);
        fetchData();
      } else {
        toast.error(data.error?.message || 'Failed to create campaign');
      }
    } catch {
      toast.error('Failed to create campaign');
    } finally {
      setCreating(false);
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
        <AnimatedPageHeader title="Advertiser Dashboard" icon="📊" accentColor="amber" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-white/[0.08] rounded w-1/3 mb-2" />
              <div className="h-3 bg-white/[0.06] rounded w-1/2" />
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
        <AnimatedPageHeader
          title="Advertiser Dashboard"
          icon="📊"
          accentColor="amber"
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

  const isApproved = profile.status === 'approved';

  return (
    <main className="container mx-auto px-4 pb-20">
      <AnimatedPageHeader
        title="Advertiser Dashboard"
        subtitle={profile.companyName}
        icon="📊"
        accentColor="amber"
      >
        <StatusBadge status={profile.status} />
      </AnimatedPageHeader>

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
      <ScrollReveal delay={0.1}>
        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StaggerItem>
            <div className="card p-4">
              <p className="text-star-300 text-xs uppercase tracking-wider mb-1">Active Campaigns</p>
              <p className="text-2xl font-bold text-white">{activeCampaigns.length}</p>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card p-4">
              <p className="text-star-300 text-xs uppercase tracking-wider mb-1">Total Impressions</p>
              <p className="text-2xl font-bold text-white">
                {totalImpressions.toLocaleString()}
              </p>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card p-4">
              <p className="text-star-300 text-xs uppercase tracking-wider mb-1">Total Spent</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalSpent)}</p>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card p-4">
              <p className="text-star-300 text-xs uppercase tracking-wider mb-1">Total Budget</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalBudget)}</p>
            </div>
          </StaggerItem>
        </StaggerContainer>
      </ScrollReveal>

      {/* Weekly Brief Sponsorships */}
      <ScrollReveal delay={0.15}>
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">Weekly Brief Sponsorship</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="card p-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-white font-medium">Single issue</p>
                <p className="text-star-300 text-sm mt-1">
                  Your logo, one-line message, and link in one issue of the SpaceNexus weekly brief.
                </p>
                <p className="text-2xl font-bold text-white mt-2">$150</p>
              </div>
              <button
                onClick={() => handleBuySponsorship('single')}
                disabled={!isApproved || buyingSponsorship !== null}
                className="btn-primary px-4 py-2 text-sm whitespace-nowrap disabled:opacity-50"
              >
                {buyingSponsorship === 'single' ? 'Redirecting…' : 'Sponsor an issue'}
              </button>
            </div>
            <div className="card p-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-white font-medium">4-issue block</p>
                <p className="text-star-300 text-sm mt-1">
                  Four consecutive issues — a month of presence in front of space industry readers.
                </p>
                <p className="text-2xl font-bold text-white mt-2">
                  $500 <span className="text-sm font-normal text-star-300">($125/issue)</span>
                </p>
              </div>
              <button
                onClick={() => handleBuySponsorship('block4')}
                disabled={!isApproved || buyingSponsorship !== null}
                className="btn-primary px-4 py-2 text-sm whitespace-nowrap disabled:opacity-50"
              >
                {buyingSponsorship === 'block4' ? 'Redirecting…' : 'Sponsor 4 issues'}
              </button>
            </div>
          </div>
          {!isApproved && (
            <p className="text-star-300 text-xs mt-2">
              Sponsorship purchase unlocks once your advertiser account is approved.
            </p>
          )}
        </div>
      </ScrollReveal>

      {/* Campaign Controls */}
      <ScrollReveal delay={0.2}>
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
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <button
          onClick={() => setShowCreateForm((v) => !v)}
          className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
        >
          {showCreateForm ? 'Close' : '+ New Campaign'}
        </button>
      </div>
      </ScrollReveal>

      {/* Create Campaign Form */}
      {showCreateForm && (
        <form onSubmit={handleCreateCampaign} className="card p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">New Campaign (free draft)</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="c-name" className="block text-star-300 text-xs mb-1">Campaign name</label>
              <input id="c-name" required maxLength={200} className="input w-full" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label htmlFor="c-type" className="block text-star-300 text-xs mb-1">Type</label>
              <select id="c-type" className="input w-full" value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {CAMPAIGN_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="c-budget" className="block text-star-300 text-xs mb-1">
                Budget (USD, ${SELF_SERVE_MIN_BUDGET_USD}–${SELF_SERVE_MAX_BUDGET_USD.toLocaleString()} self-serve)
              </label>
              <input id="c-budget" type="number" min={1} step={1} required className="input w-full" value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })} />
            </div>
            <div>
              <label htmlFor="c-modules" className="block text-star-300 text-xs mb-1">Target modules (comma-separated)</label>
              <input id="c-modules" required placeholder="news, jobs, startups" className="input w-full" value={form.targetModules}
                onChange={(e) => setForm({ ...form, targetModules: e.target.value })} />
            </div>
            <div>
              <label htmlFor="c-start" className="block text-star-300 text-xs mb-1">Start date</label>
              <input id="c-start" type="date" required className="input w-full" value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <label htmlFor="c-end" className="block text-star-300 text-xs mb-1">End date</label>
              <input id="c-end" type="date" required className="input w-full" value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <div>
              <label htmlFor="c-position" className="block text-star-300 text-xs mb-1">Placement position</label>
              <select id="c-position" className="input w-full" value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}>
                {PLACEMENT_POSITIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="c-format" className="block text-star-300 text-xs mb-1">Format</label>
              <select id="c-format" className="input w-full" value={form.format}
                onChange={(e) => setForm({ ...form, format: e.target.value })}>
                {PLACEMENT_FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="c-title" className="block text-star-300 text-xs mb-1">Ad title</label>
              <input id="c-title" maxLength={200} className="input w-full" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label htmlFor="c-link" className="block text-star-300 text-xs mb-1">Destination link URL</label>
              <input id="c-link" type="url" required placeholder="https://…" className="input w-full" value={form.linkUrl}
                onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="c-desc" className="block text-star-300 text-xs mb-1">Ad description</label>
              <textarea id="c-desc" maxLength={2000} rows={2} className="input w-full" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button type="submit" disabled={creating} className="btn-primary px-6 py-2 text-sm disabled:opacity-50">
              {creating ? 'Creating…' : 'Create draft'}
            </button>
            <p className="text-star-300 text-xs">
              Drafts are free. You pay the budget when you submit for review.
            </p>
          </div>
        </form>
      )}

      {/* Campaign List */}
      {campaigns.length === 0 ? (
        <div className="card p-8 text-center">
          <svg className="w-12 h-12 text-star-300/50 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-lg font-semibold text-white mb-2">No Campaigns Yet</h3>
          <p className="text-star-300 text-sm mb-4">
            Create a free draft campaign above, or{' '}
            <Link href="/contact" className="underline hover:text-white">contact us</Link>{' '}
            for larger campaigns and custom packages.
          </p>
        </div>
      ) : (
        <StaggerContainer className="space-y-4">
          {campaigns.map((campaign) => {
            const withinSelfServe =
              campaign.budget >= SELF_SERVE_MIN_BUDGET_USD &&
              campaign.budget <= SELF_SERVE_MAX_BUDGET_USD;
            return (
            <StaggerItem key={campaign.id}>
            <div className="card p-6">
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
                    withinSelfServe || campaign.type === SPONSORSHIP_CAMPAIGN_TYPE ? (
                      <button
                        onClick={() => handlePayAndSubmit(campaign.id)}
                        disabled={payingId !== null}
                        className="text-xs px-3 py-1.5 rounded bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors disabled:opacity-50"
                      >
                        {payingId === campaign.id
                          ? 'Redirecting…'
                          : `Pay ${formatCurrency(campaign.budget)} & submit for review`}
                      </button>
                    ) : (
                      <Link
                        href="/contact"
                        className="text-xs px-3 py-1.5 rounded bg-white/10 text-white/90 hover:bg-white/15 transition-colors"
                        title={`Self-serve budgets are $${SELF_SERVE_MIN_BUDGET_USD}–$${SELF_SERVE_MAX_BUDGET_USD.toLocaleString()}. Contact us for this budget.`}
                      >
                        Contact us to run this budget
                      </Link>
                    )
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
                    <div className="flex-1 h-2 bg-white/[0.08] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full transition-all"
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
                <div className="mt-4 pt-4 border-t border-white/[0.06]">
                  <p className="text-star-300 text-xs mb-2">Target Modules:</p>
                  <div className="flex flex-wrap gap-2">
                    {campaign.targetModules.map((mod) => (
                      <span
                        key={mod}
                        className="px-2 py-0.5 rounded bg-white/[0.04] text-white/70 text-xs"
                      >
                        {mod}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            </StaggerItem>
            );
          })}
        </StaggerContainer>
      )}

      {/* Billing terms — honest, no guarantees */}
      <div className="card p-5 mt-8">
        <h3 className="text-white font-semibold mb-2">Billing &amp; review terms</h3>
        <ul className="text-star-300 text-sm space-y-1 list-disc list-inside">
          <li>Creating a draft campaign is free. You pay your declared budget up front when you submit for review.</li>
          <li>Every campaign is reviewed by our team within 2 business days before it goes live.</li>
          <li>If your campaign is declined, you are refunded in full, automatically.</li>
          <li>
            Self-serve budgets run ${SELF_SERVE_MIN_BUDGET_USD}–${SELF_SERVE_MAX_BUDGET_USD.toLocaleString()}. For larger
            campaigns, <Link href="/contact" className="underline hover:text-white">contact us</Link>.
          </li>
          <li>We do not guarantee impression or click volumes. Delivery depends on real traffic to the modules you target; unspent budget questions are handled case-by-case via <Link href="/contact" className="underline hover:text-white">contact</Link>.</li>
        </ul>
      </div>
    </main>
  );
}
