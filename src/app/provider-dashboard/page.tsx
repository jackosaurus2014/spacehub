'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import MarketplaceCard from '@/components/marketplace/MarketplaceCard';
import ProposalCard from '@/components/marketplace/ProposalCard';
import { clientLogger } from '@/lib/client-logger';
import ReviewCard from '@/components/marketplace/ReviewCard';
import VerificationBadge from '@/components/marketplace/VerificationBadge';
import ComingSoonBadge from '@/components/marketplace/ComingSoonBadge';
import { toast } from '@/lib/toast';

const EVENT_TYPE_OPTIONS = [
  { value: 'milestone', label: 'Milestone' },
  { value: 'product_launch', label: 'Product Launch' },
  { value: 'contract_win', label: 'Contract Win' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'funding', label: 'Funding' },
  { value: 'acquisition', label: 'Acquisition' },
  { value: 'regulatory', label: 'Regulatory' },
  { value: 'first_launch', label: 'First Launch' },
  { value: 'ipo', label: 'IPO' },
];

const SECTOR_OPTIONS = [
  'launch', 'satellite', 'ground-segment', 'in-space-services', 'manufacturing',
  'earth-observation', 'communications', 'defense', 'propulsion', 'software',
  'consulting', 'human-spaceflight', 'space-tourism', 'research',
];

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState(searchParams.get('tab') || 'overview');
  const [company, setCompany] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [verification, setVerification] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notAuthed, setNotAuthed] = useState(false);

  // Edit profile state
  const [profileForm, setProfileForm] = useState<Record<string, any>>({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);

  // New event form state
  const [eventForm, setEventForm] = useState({ title: '', description: '', type: 'milestone', date: new Date().toISOString().split('T')[0], sourceUrl: '', importance: 5 });
  const [eventSubmitting, setEventSubmitting] = useState(false);

  // Listing archive state
  const [archiving, setArchiving] = useState<string | null>(null);

  // Jobs state
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobForm, setJobForm] = useState({ title: '', location: '', remoteOk: false, category: 'engineering', seniorityLevel: 'mid', employmentType: 'full_time', description: '', salaryMin: '', salaryMax: '', clearanceRequired: false });
  const [jobSubmitting, setJobSubmitting] = useState(false);

  // Gigs state
  const [gigs, setGigs] = useState<any[]>([]);
  const [gigForm, setGigForm] = useState({ title: '', description: '', category: 'engineering', skills: '', workType: 'contract', duration: '', budgetMin: '', budgetMax: '', budgetType: 'hourly', remoteOk: true, clearanceRequired: false });
  const [gigSubmitting, setGigSubmitting] = useState(false);

  // Partnerships state
  const [partnerships, setPartnerships] = useState<{ sent: any[]; received: any[] }>({ sent: [], received: [] });
  const [partnerForm, setPartnerForm] = useState({ receiverCompanySlug: '', type: 'strategic_alliance', message: '' });
  const [partnerSubmitting, setPartnerSubmitting] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const profileRes = await fetch('/api/auth/session');
        if (!profileRes.ok) { setNotAuthed(true); return; }
        const session = await profileRes.json();
        if (!session?.user) { setNotAuthed(true); return; }

        const companyRes = await fetch('/api/company-profiles?claimedByMe=true');
        if (companyRes.ok) {
          const data = await companyRes.json();
          const myCompany = data.companies?.[0];
          if (myCompany) {
            setCompany(myCompany);
            setProfileForm({
              description: myCompany.description || '',
              longDescription: myCompany.longDescription || '',
              website: myCompany.website || '',
              linkedinUrl: myCompany.linkedinUrl || '',
              twitterUrl: myCompany.twitterUrl || '',
              contactEmail: myCompany.contactEmail || '',
              headquarters: myCompany.headquarters || '',
              ceo: myCompany.ceo || '',
              cto: myCompany.cto || '',
              sector: myCompany.sector || '',
              tags: (myCompany.tags || []).join(', '),
              logoUrl: myCompany.logoUrl || '',
              employeeRange: myCompany.employeeRange || '',
            });

            const [listRes, reviewRes, proposalRes] = await Promise.all([
              fetch(`/api/marketplace/listings?companyId=${myCompany.id}`),
              fetch(`/api/marketplace/reviews?companyId=${myCompany.id}`),
              fetch(`/api/marketplace/proposals?companyId=${myCompany.id}`),
            ]);

            if (listRes.ok) { const d = await listRes.json(); setListings(d.listings || []); }
            if (reviewRes.ok) { const d = await reviewRes.json(); setReviews(d.reviews || []); }
            if (proposalRes.ok) { const d = await proposalRes.json(); setProposals(d.proposals || []); }

            // Load analytics, events, verification, jobs, gigs, partnerships in parallel
            const [verifyRes, analyticsRes, eventsRes, jobsRes, gigsRes, partnershipsRes] = await Promise.all([
              fetch('/api/marketplace/verify').catch(() => null),
              fetch(`/api/company-profiles/${myCompany.slug}/analytics`).catch(() => null),
              fetch(`/api/company-profiles/${myCompany.slug}/events`).catch(() => null),
              fetch(`/api/company-profiles/${myCompany.slug}/jobs`).catch(() => null),
              fetch(`/api/company-profiles/${myCompany.slug}/gigs`).catch(() => null),
              fetch(`/api/company-profiles/${myCompany.slug}/partnerships`).catch(() => null),
            ]);

            if (verifyRes?.ok) setVerification(await verifyRes.json());
            if (analyticsRes?.ok) setAnalytics(await analyticsRes.json());
            if (eventsRes?.ok) { const d = await eventsRes.json(); setEvents(d.events || []); }
            if (jobsRes?.ok) { const d = await jobsRes.json(); setJobs(d.jobs || []); }
            if (gigsRes?.ok) { const d = await gigsRes.json(); setGigs(d.gigs || []); }
            if (partnershipsRes?.ok) setPartnerships(await partnershipsRes.json());
          }
        }
      } catch (err) {
        clientLogger.error('Dashboard load error', { error: err instanceof Error ? err.message : String(err) });
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  // --- Handlers ---

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setProfileForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setProfileDirty(true);
  };

  const handleProfileSave = async () => {
    if (!company) return;
    setProfileSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(profileForm)) {
        if (key === 'tags') {
          payload.tags = (value as string).split(',').map((t: string) => t.trim()).filter(Boolean);
        } else if (['website', 'linkedinUrl', 'twitterUrl', 'logoUrl', 'ceo', 'cto'].includes(key)) {
          payload[key] = (value as string).trim() || null;
        } else {
          payload[key] = (value as string).trim();
        }
      }

      const res = await fetch(`/api/company-profiles/${company.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const result = await res.json();
        setCompany({ ...company, ...result.company });
        setProfileDirty(false);
        toast.success('Company profile updated successfully!');
      } else {
        const err = await res.json();
        toast.error(err.error?.message || err.error || 'Failed to update profile');
      }
    } catch {
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setEventSubmitting(true);
    try {
      const res = await fetch(`/api/company-profiles/${company.slug}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...eventForm,
          importance: Number(eventForm.importance),
          sourceUrl: eventForm.sourceUrl || undefined,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setEvents(prev => [result.event, ...prev]);
        setEventForm({ title: '', description: '', type: 'milestone', date: new Date().toISOString().split('T')[0], sourceUrl: '', importance: 5 });
        toast.success('Announcement posted!');
      } else {
        const err = await res.json();
        toast.error(err.error?.message || err.error || 'Failed to post announcement');
      }
    } catch {
      toast.error('Failed to post announcement. Please try again.');
    } finally {
      setEventSubmitting(false);
    }
  };

  const handleArchiveListing = async (slug: string) => {
    setArchiving(slug);
    try {
      const res = await fetch(`/api/marketplace/listings/${slug}`, { method: 'DELETE' });
      if (res.ok) {
        setListings(prev => prev.filter(l => l.slug !== slug));
        toast.success('Listing archived.');
      } else {
        toast.error('Failed to archive listing.');
      }
    } catch {
      toast.error('Failed to archive listing.');
    } finally {
      setArchiving(null);
    }
  };

  // --- Render states ---

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;

  if (notAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl">🔒</div>
          <h2 className="text-lg font-semibold text-white">Sign in Required</h2>
          <p className="text-sm text-slate-400">Please sign in to access the provider dashboard.</p>
          <Link href="/login?returnTo=/provider-dashboard" className="text-white/70 hover:text-white text-sm font-medium">Sign In →</Link>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
          <div className="text-5xl">🏢</div>
          <h2 className="text-xl font-bold text-white">Claim Your Company Profile</h2>
          <p className="text-sm text-slate-400 leading-relaxed">To use the provider dashboard, you need to claim a company profile first.</p>
          <Link href="/company-profiles">
            <button className="px-6 py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-lg font-semibold transition-colors">Browse Company Profiles</button>
          </Link>
        </div>
      </div>
    );
  }

  const inputClass = 'w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50';
  const labelClass = 'block text-xs font-medium text-slate-400 mb-1';

  // --- Job Handlers ---
  const handleJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setJobSubmitting(true);
    try {
      const payload: Record<string, unknown> = { ...jobForm };
      if (jobForm.salaryMin) payload.salaryMin = parseFloat(jobForm.salaryMin);
      else delete payload.salaryMin;
      if (jobForm.salaryMax) payload.salaryMax = parseFloat(jobForm.salaryMax);
      else delete payload.salaryMax;
      const res = await fetch(`/api/company-profiles/${company.slug}/jobs`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (res.ok) {
        const result = await res.json();
        setJobs(prev => [result.job, ...prev]);
        setJobForm({ title: '', location: '', remoteOk: false, category: 'engineering', seniorityLevel: 'mid', employmentType: 'full_time', description: '', salaryMin: '', salaryMax: '', clearanceRequired: false });
        toast.success('Job posted!');
      } else { const err = await res.json(); toast.error(err.error?.message || err.error || 'Failed to post job'); }
    } catch { toast.error('Failed to post job.'); } finally { setJobSubmitting(false); }
  };

  const handleArchiveJob = async (jobId: string) => {
    if (!company) return;
    try {
      const res = await fetch(`/api/company-profiles/${company.slug}/jobs?jobId=${jobId}`, { method: 'DELETE' });
      if (res.ok) { setJobs(prev => prev.filter(j => j.id !== jobId)); toast.success('Job archived.'); }
      else toast.error('Failed to archive job.');
    } catch { toast.error('Failed to archive job.'); }
  };

  // --- Gig Handlers ---
  const handleGigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setGigSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        ...gigForm,
        skills: gigForm.skills.split(',').map(s => s.trim()).filter(Boolean),
      };
      if (gigForm.budgetMin) payload.budgetMin = parseInt(gigForm.budgetMin);
      else delete payload.budgetMin;
      if (gigForm.budgetMax) payload.budgetMax = parseInt(gigForm.budgetMax);
      else delete payload.budgetMax;
      if (!gigForm.duration) delete payload.duration;
      const res = await fetch(`/api/company-profiles/${company.slug}/gigs`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (res.ok) {
        const result = await res.json();
        setGigs(prev => [result.gig, ...prev]);
        setGigForm({ title: '', description: '', category: 'engineering', skills: '', workType: 'contract', duration: '', budgetMin: '', budgetMax: '', budgetType: 'hourly', remoteOk: true, clearanceRequired: false });
        toast.success('Gig posted!');
      } else { const err = await res.json(); toast.error(err.error?.message || err.error || 'Failed to post gig'); }
    } catch { toast.error('Failed to post gig.'); } finally { setGigSubmitting(false); }
  };

  // --- Partnership Handlers ---
  const handlePartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setPartnerSubmitting(true);
    try {
      const res = await fetch(`/api/company-profiles/${company.slug}/partnerships`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partnerForm),
      });
      if (res.ok) {
        const result = await res.json();
        setPartnerships(prev => ({ ...prev, sent: [result.request, ...prev.sent] }));
        setPartnerForm({ receiverCompanySlug: '', type: 'strategic_alliance', message: '' });
        toast.success('Partnership request sent!');
      } else { const err = await res.json(); toast.error(err.error?.message || err.error || 'Failed to send request'); }
    } catch { toast.error('Failed to send request.'); } finally { setPartnerSubmitting(false); }
  };

  const handlePartnerRespond = async (requestId: string, action: 'accept' | 'reject') => {
    if (!company) return;
    try {
      const res = await fetch(`/api/company-profiles/${company.slug}/partnerships`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      });
      if (res.ok) {
        setPartnerships(prev => ({
          ...prev,
          received: prev.received.map(r => r.id === requestId ? { ...r, status: action === 'accept' ? 'accepted' : 'rejected' } : r),
        }));
        toast.success(action === 'accept' ? 'Partnership accepted!' : 'Partnership declined.');
      } else toast.error('Failed to respond.');
    } catch { toast.error('Failed to respond.'); }
  };

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'listings', label: `Listings (${listings.length})` },
    { key: 'jobs', label: `Jobs (${jobs.length})` },
    { key: 'gigs', label: `Gigs (${gigs.length})` },
    { key: 'proposals', label: `Proposals (${proposals.length})` },
    { key: 'partnerships', label: `Partners (${partnerships.sent.length + partnerships.received.length})` },
    { key: 'reviews', label: `Reviews (${reviews.length})` },
    { key: 'profile', label: 'Edit Profile' },
    { key: 'announcements', label: `News (${events.length})` },
    { key: 'analytics', label: 'Analytics' },
  ];

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <AnimatedPageHeader title="Provider Dashboard" subtitle={`Managing ${company.name}`} />
          <div className="flex items-center gap-2">
            <Link href="/provider-dashboard/new-listing">
              <button className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 text-sm rounded-lg font-semibold transition-colors">+ New Listing</button>
            </Link>
            <Link href={`/company-profiles/${company.slug}`}>
              <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors">View Public Profile</button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Listings', value: listings.filter(l => l.status === 'active').length, color: 'text-white/70' },
            { label: 'Total Views', value: listings.reduce((s, l) => s + (l.viewCount || 0), 0), color: 'text-emerald-400' },
            { label: 'Avg Rating', value: reviews.length > 0 ? (reviews.reduce((s, r) => s + r.overallRating, 0) / reviews.length).toFixed(1) : 'N/A', color: 'text-yellow-400' },
            { label: 'Proposals', value: proposals.length, color: 'text-purple-400' },
          ].map((stat, i) => (
            <StaggerItem key={stat.label}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="card p-4 text-center">
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white/[0.06] rounded-lg p-1 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-3 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap ${tab === t.key ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <ScrollReveal>
              <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StaggerItem>
                  <Link href="/marketplace/search" className="card p-5 hover:ring-1 hover:ring-white/15 transition-all block">
                    <div className="text-2xl mb-2">🏪</div>
                    <div className="text-sm font-semibold text-white">Browse Marketplace</div>
                    <div className="text-xs text-slate-400 mt-1">Explore services and find opportunities</div>
                  </Link>
                </StaggerItem>
                <StaggerItem>
                  <Link href="/marketplace/search?tab=rfqs" className="card p-5 hover:ring-1 hover:ring-white/15 transition-all block">
                    <div className="text-2xl mb-2">📋</div>
                    <div className="text-sm font-semibold text-white">Browse Open RFQs</div>
                    <div className="text-xs text-slate-400 mt-1">Find and respond to buyer requests</div>
                  </Link>
                </StaggerItem>
                <StaggerItem>
                  <Link href="/provider-dashboard/new-listing" className="card p-5 hover:ring-1 hover:ring-white/15 transition-all block">
                    <div className="text-2xl mb-2">➕</div>
                    <div className="text-sm font-semibold text-white">Create New Listing</div>
                    <div className="text-xs text-slate-400 mt-1">List your services and reach qualified buyers</div>
                  </Link>
                </StaggerItem>
              </StaggerContainer>
            </ScrollReveal>

            {verification && (
              <ScrollReveal delay={0.1}>
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white">Verification Status</h3>
                    <VerificationBadge level={verification.currentLevel} size="md" />
                  </div>
                  {verification.criteria && (
                    <div className="space-y-2">
                      {[
                        { key: 'claimed', label: 'Company profile claimed', level: 'Identity' },
                        { key: 'hasThreeListingsWithCerts', label: '3+ certified service listings', level: 'Capability' },
                        { key: 'hasSamRegistration', label: 'SAM.gov / CAGE code registered', level: 'Capability' },
                        { key: 'hasGovContract', label: 'Government contract on record', level: 'Capability' },
                        { key: 'fivePlusReviews', label: '5+ published reviews', level: 'Performance' },
                        { key: 'avgRatingAboveFour', label: 'Average rating >= 4.0', level: 'Performance' },
                        { key: 'hasAwardedRfq', label: 'At least 1 awarded RFQ', level: 'Performance' },
                      ].map(item => (
                        <div key={item.key} className="flex items-center gap-2 text-xs">
                          <span className={verification.criteria[item.key] ? 'text-green-400' : 'text-slate-600'}>{verification.criteria[item.key] ? '✓' : '○'}</span>
                          <span className={verification.criteria[item.key] ? 'text-white/70' : 'text-slate-500'}>{item.label}</span>
                          <span className="text-xs text-slate-600 ml-auto">{item.level}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {verification.canUpgrade && (
                    <div className="mt-3 text-xs text-white/70 bg-white/5 rounded p-2 text-center">You qualify for a verification upgrade! It will be applied automatically.</div>
                  )}
                </div>
              </ScrollReveal>
            )}

            {listings.length > 0 && (
              <ScrollReveal delay={0.15}>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3">Your Listings</h3>
                  <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {listings.slice(0, 3).map((listing, i) => (
                      <StaggerItem key={listing.id}><MarketplaceCard listing={listing} index={i} /></StaggerItem>
                    ))}
                  </StaggerContainer>
                </div>
              </ScrollReveal>
            )}

            {reviews.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Recent Reviews</h3>
                <div className="space-y-3">{reviews.slice(0, 3).map(review => <ReviewCard key={review.id} review={review} />)}</div>
              </div>
            )}

            <ScrollReveal delay={0.2}>
              <div>
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">Coming Soon <ComingSoonBadge /></h3>
                <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { icon: '💰', title: 'Revenue Tracking', desc: 'Track platform-facilitated transactions, invoices, and payouts' },
                    { icon: '📊', title: 'Proposal Analytics', desc: 'Win/loss rates, competitive benchmarking, and market demand trends' },
                    { icon: '📄', title: 'Contract Manager', desc: 'Milestone tracking, change orders, and SLA monitoring' },
                  ].map(feature => (
                    <StaggerItem key={feature.title}>
                      <div className="card p-4 opacity-60 border-dashed border-white/[0.08]">
                        <div className="text-xl mb-2">{feature.icon}</div>
                        <div className="text-xs font-semibold text-white/70">{feature.title}</div>
                        <div className="text-xs text-slate-500 mt-1">{feature.desc}</div>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
            </ScrollReveal>
          </div>
        )}

        {/* ── Listings Tab (with edit/archive) ── */}
        {tab === 'listings' && (
          <div>
            {listings.length > 0 ? (
              <div className="space-y-4">
                {listings.map(listing => (
                  <div key={listing.id} className="card p-4 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <Link href={`/marketplace/listings/${listing.slug}`} className="text-sm font-semibold text-white hover:underline">{listing.name}</Link>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <span className={listing.status === 'active' ? 'text-green-400' : 'text-slate-500'}>{listing.status}</span>
                        <span>{listing.category}</span>
                        <span>{listing.viewCount || 0} views</span>
                        {listing.inquiryCount > 0 && <span>{listing.inquiryCount} inquiries</span>}
                      </div>
                      {listing.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{listing.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => router.push(`/provider-dashboard/edit-listing/${listing.slug}`)}
                        className="px-3 py-1.5 text-xs bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                      {listing.status === 'active' && (
                        <button
                          onClick={() => handleArchiveListing(listing.slug)}
                          disabled={archiving === listing.slug}
                          className="px-3 py-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {archiving === listing.slug ? 'Archiving...' : 'Archive'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <div className="pt-2">
                  <Link href="/provider-dashboard/new-listing">
                    <button className="px-5 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-sm font-semibold transition-colors">+ Add New Listing</button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-white/5 to-emerald-500/20 border border-white/10 flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No listings yet</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">List your space products and services to reach qualified buyers.</p>
                <Link href="/provider-dashboard/new-listing">
                  <button className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-sm font-semibold transition-colors">Create Your First Listing</button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── Proposals Tab ── */}
        {tab === 'proposals' && (
          <div>
            {proposals.length > 0 ? (
              <div className="space-y-3">{proposals.map(proposal => <ProposalCard key={proposal.id} proposal={proposal} />)}</div>
            ) : (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">📬</div>
                <p className="text-sm text-slate-400 mb-4">No proposals yet. Browse open RFQs to submit your first proposal.</p>
                <Link href="/marketplace/search?tab=rfqs">
                  <button className="px-5 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-sm font-medium transition-colors">Browse Open RFQs</button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── Reviews Tab ── */}
        {tab === 'reviews' && (
          <div>
            {reviews.length > 0 ? (
              <div className="space-y-3">{reviews.map(review => <ReviewCard key={review.id} review={review} />)}</div>
            ) : (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">⭐</div>
                <p className="text-sm text-slate-400">No reviews yet. Get reviews from your clients to build your reputation.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Edit Profile Tab ── */}
        {tab === 'profile' && (
          <div className="max-w-3xl space-y-6">
            <div className="card p-6 space-y-4">
              <h3 className="text-sm font-semibold text-white">Company Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Description</label>
                  <textarea name="description" rows={3} value={profileForm.description || ''} onChange={handleProfileChange} placeholder="Brief company description..." className={inputClass} maxLength={2000} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Detailed Description</label>
                  <textarea name="longDescription" rows={5} value={profileForm.longDescription || ''} onChange={handleProfileChange} placeholder="Detailed company overview, mission, capabilities..." className={inputClass} maxLength={10000} />
                </div>
                <div>
                  <label className={labelClass}>Headquarters</label>
                  <input name="headquarters" value={profileForm.headquarters || ''} onChange={handleProfileChange} placeholder="City, State" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Employee Range</label>
                  <input name="employeeRange" value={profileForm.employeeRange || ''} onChange={handleProfileChange} placeholder="e.g., 100-500" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>CEO</label>
                  <input name="ceo" value={profileForm.ceo || ''} onChange={handleProfileChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>CTO</label>
                  <input name="cto" value={profileForm.cto || ''} onChange={handleProfileChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Sector</label>
                  <select name="sector" value={profileForm.sector || ''} onChange={handleProfileChange} className={inputClass}>
                    <option value="">Select sector</option>
                    {SECTOR_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Tags (comma-separated)</label>
                  <input name="tags" value={profileForm.tags || ''} onChange={handleProfileChange} placeholder="launch, smallsat, rideshare" className={inputClass} />
                </div>
              </div>
            </div>

            <div className="card p-6 space-y-4">
              <h3 className="text-sm font-semibold text-white">Online Presence</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Website</label>
                  <input name="website" type="url" value={profileForm.website || ''} onChange={handleProfileChange} placeholder="https://..." className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Contact Email</label>
                  <input name="contactEmail" type="email" value={profileForm.contactEmail || ''} onChange={handleProfileChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>LinkedIn URL</label>
                  <input name="linkedinUrl" type="url" value={profileForm.linkedinUrl || ''} onChange={handleProfileChange} placeholder="https://linkedin.com/company/..." className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Twitter/X URL</label>
                  <input name="twitterUrl" type="url" value={profileForm.twitterUrl || ''} onChange={handleProfileChange} placeholder="https://x.com/..." className={inputClass} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Logo URL</label>
                  <input name="logoUrl" type="url" value={profileForm.logoUrl || ''} onChange={handleProfileChange} placeholder="https://..." className={inputClass} />
                  {profileForm.logoUrl && (
                    <div className="mt-2 w-16 h-16 rounded-lg bg-white/[0.06] flex items-center justify-center overflow-hidden">
                      <img src={profileForm.logoUrl} alt="Logo preview" className="max-w-full max-h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleProfileSave}
                disabled={profileSaving || !profileDirty}
                className="px-6 py-2.5 bg-white hover:bg-slate-100 disabled:bg-white/[0.08] disabled:text-slate-500 text-slate-900 rounded-lg font-semibold text-sm transition-colors"
              >
                {profileSaving ? 'Saving...' : 'Save Changes'}
              </button>
              {profileDirty && <span className="text-xs text-slate-400">Unsaved changes</span>}
            </div>
          </div>
        )}

        {/* ── Announcements / News Tab ── */}
        {tab === 'announcements' && (
          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-white mb-4">Post an Announcement</h3>
              <form onSubmit={handleEventSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Title *</label>
                    <input required minLength={3} maxLength={300} value={eventForm.title} onChange={e => setEventForm(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g., Won $50M NASA contract for..." className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Type *</label>
                    <select required value={eventForm.type} onChange={e => setEventForm(prev => ({ ...prev, type: e.target.value }))} className={inputClass}>
                      {EVENT_TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Date *</label>
                    <input type="date" required value={eventForm.date} onChange={e => setEventForm(prev => ({ ...prev, date: e.target.value }))} className={inputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Description</label>
                    <textarea rows={3} maxLength={5000} value={eventForm.description} onChange={e => setEventForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Details about this announcement..." className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Source URL</label>
                    <input type="url" value={eventForm.sourceUrl} onChange={e => setEventForm(prev => ({ ...prev, sourceUrl: e.target.value }))} placeholder="https://..." className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Importance (1-10)</label>
                    <input type="number" min={1} max={10} value={eventForm.importance} onChange={e => setEventForm(prev => ({ ...prev, importance: parseInt(e.target.value) || 5 }))} className={inputClass} />
                  </div>
                </div>
                <button type="submit" disabled={eventSubmitting || !eventForm.title} className="px-5 py-2 bg-white hover:bg-slate-100 disabled:bg-white/[0.08] disabled:text-slate-500 text-slate-900 rounded-lg text-sm font-semibold transition-colors">
                  {eventSubmitting ? 'Posting...' : 'Post Announcement'}
                </button>
              </form>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Company Timeline ({events.length} events)</h3>
              {events.length > 0 ? (
                <div className="space-y-3">
                  {events.map(event => (
                    <div key={event.id} className="card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold px-2 py-0.5 bg-white/[0.08] rounded text-slate-300">{event.type.replace(/_/g, ' ')}</span>
                            {event.source === 'owner' && <span className="text-xs text-blue-400">by you</span>}
                          </div>
                          <div className="text-sm font-medium text-white">{event.title}</div>
                          {event.description && <p className="text-xs text-slate-400 mt-1">{event.description}</p>}
                        </div>
                        <div className="text-xs text-slate-500 whitespace-nowrap">
                          {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                      {event.sourceUrl && (
                        <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline mt-2 block">Source →</a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">📰</div>
                  <p className="text-sm text-slate-400">No events yet. Post your first announcement above.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Analytics Tab ── */}
        {tab === 'analytics' && (
          <div className="space-y-6">
            {analytics?.metrics ? (
              <>
                <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Profile Views', value: analytics.metrics.profileViews, color: 'text-blue-400' },
                    { label: 'Listing Views', value: analytics.metrics.totalListingViews, color: 'text-emerald-400' },
                    { label: 'Total Inquiries', value: analytics.metrics.totalInquiries, color: 'text-orange-400' },
                    { label: 'Active Listings', value: analytics.metrics.activeListings, color: 'text-white/70' },
                    { label: 'Total Reviews', value: analytics.metrics.totalReviews, color: 'text-yellow-400' },
                    { label: 'Avg Rating', value: analytics.metrics.avgRating ?? 'N/A', color: 'text-yellow-400' },
                    { label: 'Total Proposals', value: analytics.metrics.totalProposals, color: 'text-purple-400' },
                    { label: 'Company Events', value: analytics.metrics.totalEvents, color: 'text-cyan-400' },
                  ].map((stat, i) => (
                    <StaggerItem key={stat.label}>
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card p-4 text-center">
                        <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                        <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
                      </motion.div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>

                {analytics.sponsorTier && (
                  <div className="card p-5">
                    <h3 className="text-sm font-semibold text-white mb-3">Sponsor Metrics</h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-xl font-bold text-emerald-400">{analytics.sponsorAnalytics?.views || 0}</div>
                        <div className="text-xs text-slate-500">Sponsor Views</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-blue-400">{analytics.sponsorAnalytics?.clicks || 0}</div>
                        <div className="text-xs text-slate-500">Clicks</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-orange-400">{analytics.sponsorAnalytics?.leads || 0}</div>
                        <div className="text-xs text-slate-500">Leads</div>
                      </div>
                    </div>
                  </div>
                )}

                {listings.length > 0 && (
                  <div className="card p-5">
                    <h3 className="text-sm font-semibold text-white mb-3">Listing Performance</h3>
                    <div className="space-y-2">
                      {listings.map(listing => (
                        <div key={listing.id} className="flex items-center justify-between text-xs py-2 border-b border-white/[0.04] last:border-0">
                          <Link href={`/marketplace/listings/${listing.slug}`} className="text-white hover:underline truncate max-w-[60%]">{listing.name}</Link>
                          <div className="flex items-center gap-4 text-slate-400">
                            <span>{listing.viewCount || 0} views</span>
                            <span>{listing.inquiryCount || 0} inquiries</span>
                            <span className={listing.status === 'active' ? 'text-green-400' : 'text-slate-500'}>{listing.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">📈</div>
                <p className="text-sm text-slate-400">Analytics data is loading or not yet available. Create listings and build your presence to see metrics.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Jobs Tab ── */}
        {tab === 'jobs' && (
          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-white mb-4">Post a Job Opening</h3>
              <form onSubmit={handleJobSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Job Title *</label>
                    <input required minLength={3} maxLength={200} value={jobForm.title} onChange={e => setJobForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g., Senior Propulsion Engineer" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Location *</label>
                    <input required value={jobForm.location} onChange={e => setJobForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g., Houston, TX" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Employment Type</label>
                    <select value={jobForm.employmentType} onChange={e => setJobForm(p => ({ ...p, employmentType: e.target.value }))} className={inputClass}>
                      <option value="full_time">Full Time</option><option value="part_time">Part Time</option><option value="contract">Contract</option><option value="internship">Internship</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Category</label>
                    <select value={jobForm.category} onChange={e => setJobForm(p => ({ ...p, category: e.target.value }))} className={inputClass}>
                      {['engineering', 'operations', 'business', 'research', 'legal', 'manufacturing'].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Seniority Level</label>
                    <select value={jobForm.seniorityLevel} onChange={e => setJobForm(p => ({ ...p, seniorityLevel: e.target.value }))} className={inputClass}>
                      {['entry', 'mid', 'senior', 'lead', 'director', 'vp', 'c_suite'].map(l => <option key={l} value={l}>{l.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Salary Min (USD/yr)</label>
                    <input type="number" min="0" value={jobForm.salaryMin} onChange={e => setJobForm(p => ({ ...p, salaryMin: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Salary Max (USD/yr)</label>
                    <input type="number" min="0" value={jobForm.salaryMax} onChange={e => setJobForm(p => ({ ...p, salaryMax: e.target.value }))} className={inputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Description</label>
                    <textarea rows={4} maxLength={10000} value={jobForm.description} onChange={e => setJobForm(p => ({ ...p, description: e.target.value }))} placeholder="Job responsibilities, qualifications, benefits..." className={inputClass} />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={jobForm.remoteOk} onChange={e => setJobForm(p => ({ ...p, remoteOk: e.target.checked }))} className="rounded" /> Remote OK
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={jobForm.clearanceRequired} onChange={e => setJobForm(p => ({ ...p, clearanceRequired: e.target.checked }))} className="rounded" /> Clearance Required
                    </label>
                  </div>
                </div>
                <button type="submit" disabled={jobSubmitting || !jobForm.title || !jobForm.location} className="px-5 py-2 bg-white hover:bg-slate-100 disabled:bg-white/[0.08] disabled:text-slate-500 text-slate-900 rounded-lg text-sm font-semibold transition-colors">
                  {jobSubmitting ? 'Posting...' : 'Post Job'}
                </button>
              </form>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Your Job Postings ({jobs.length})</h3>
              {jobs.length > 0 ? (
                <div className="space-y-3">
                  {jobs.map(job => (
                    <div key={job.id} className="card p-4 flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-white">{job.title}</div>
                        <div className="text-xs text-slate-400 mt-1 flex gap-3">
                          <span>{job.location}</span><span>{job.category}</span><span>{job.seniorityLevel}</span>
                          {job.remoteOk && <span className="text-green-400">Remote OK</span>}
                          {job.salaryMin && <span>${(job.salaryMin / 1000).toFixed(0)}K{job.salaryMax ? ` - $${(job.salaryMax / 1000).toFixed(0)}K` : '+'}</span>}
                        </div>
                      </div>
                      <button onClick={() => handleArchiveJob(job.id)} className="px-3 py-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors">Archive</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12"><div className="text-4xl mb-3">💼</div><p className="text-sm text-slate-400">No job postings yet. Post your first opening above.</p></div>
              )}
            </div>
          </div>
        )}

        {/* ── Gigs Tab ── */}
        {tab === 'gigs' && (
          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-white mb-4">Post a Gig / Contract Opportunity</h3>
              <form onSubmit={handleGigSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Title *</label>
                    <input required minLength={3} maxLength={200} value={gigForm.title} onChange={e => setGigForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g., RF Systems Consultant — 3 Month Contract" className={inputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Description *</label>
                    <textarea required minLength={20} rows={4} maxLength={10000} value={gigForm.description} onChange={e => setGigForm(p => ({ ...p, description: e.target.value }))} placeholder="Project scope, deliverables, timeline..." className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Work Type</label>
                    <select value={gigForm.workType} onChange={e => setGigForm(p => ({ ...p, workType: e.target.value }))} className={inputClass}>
                      {[['freelance', 'Freelance'], ['contract', 'Contract'], ['part_time', 'Part Time'], ['consulting', 'Consulting'], ['side_project', 'Side Project']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Category</label>
                    <select value={gigForm.category} onChange={e => setGigForm(p => ({ ...p, category: e.target.value }))} className={inputClass}>
                      {['engineering', 'operations', 'business', 'research', 'legal', 'manufacturing'].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Required Skills (comma-separated) *</label>
                    <input required value={gigForm.skills} onChange={e => setGigForm(p => ({ ...p, skills: e.target.value }))} placeholder="e.g., RF design, HFSS, antenna, Python" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Duration</label>
                    <input value={gigForm.duration} onChange={e => setGigForm(p => ({ ...p, duration: e.target.value }))} placeholder="e.g., 3 months, ongoing" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Budget Type</label>
                    <select value={gigForm.budgetType} onChange={e => setGigForm(p => ({ ...p, budgetType: e.target.value }))} className={inputClass}>
                      <option value="hourly">Hourly</option><option value="fixed">Fixed</option><option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Budget Min (USD)</label>
                    <input type="number" min="0" value={gigForm.budgetMin} onChange={e => setGigForm(p => ({ ...p, budgetMin: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Budget Max (USD)</label>
                    <input type="number" min="0" value={gigForm.budgetMax} onChange={e => setGigForm(p => ({ ...p, budgetMax: e.target.value }))} className={inputClass} />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={gigForm.remoteOk} onChange={e => setGigForm(p => ({ ...p, remoteOk: e.target.checked }))} className="rounded" /> Remote OK
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={gigForm.clearanceRequired} onChange={e => setGigForm(p => ({ ...p, clearanceRequired: e.target.checked }))} className="rounded" /> Clearance Required
                    </label>
                  </div>
                </div>
                <button type="submit" disabled={gigSubmitting || !gigForm.title || !gigForm.description || !gigForm.skills} className="px-5 py-2 bg-white hover:bg-slate-100 disabled:bg-white/[0.08] disabled:text-slate-500 text-slate-900 rounded-lg text-sm font-semibold transition-colors">
                  {gigSubmitting ? 'Posting...' : 'Post Gig'}
                </button>
              </form>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Your Gig Opportunities ({gigs.length})</h3>
              {gigs.length > 0 ? (
                <div className="space-y-3">
                  {gigs.map(gig => (
                    <div key={gig.id} className="card p-4">
                      <div className="text-sm font-medium text-white">{gig.title}</div>
                      <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-3">
                        <span className="text-blue-400">{gig.workType}</span><span>{gig.category}</span>
                        {gig.duration && <span>{gig.duration}</span>}
                        {gig.budgetMin && <span>${gig.budgetMin}{gig.budgetMax ? ` - $${gig.budgetMax}` : '+'}/{gig.budgetType}</span>}
                        {gig.remoteOk && <span className="text-green-400">Remote</span>}
                      </div>
                      {gig.skills?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">{gig.skills.map((s: string) => <span key={s} className="text-xs px-2 py-0.5 bg-white/[0.06] rounded text-slate-300">{s}</span>)}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12"><div className="text-4xl mb-3">🔧</div><p className="text-sm text-slate-400">No gig opportunities yet. Post your first contract or freelance opportunity above.</p></div>
              )}
            </div>
          </div>
        )}

        {/* ── Partnerships Tab ── */}
        {tab === 'partnerships' && (
          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-white mb-4">Send a Partnership Request</h3>
              <form onSubmit={handlePartnerSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Company Slug *</label>
                    <input required value={partnerForm.receiverCompanySlug} onChange={e => setPartnerForm(p => ({ ...p, receiverCompanySlug: e.target.value }))} placeholder="e.g., spacex, blue-origin" className={inputClass} />
                    <p className="text-xs text-slate-500 mt-1">Enter the URL slug of the company (from their profile page)</p>
                  </div>
                  <div>
                    <label className={labelClass}>Partnership Type</label>
                    <select value={partnerForm.type} onChange={e => setPartnerForm(p => ({ ...p, type: e.target.value }))} className={inputClass}>
                      {[['strategic_alliance', 'Strategic Alliance'], ['joint_venture', 'Joint Venture'], ['supply_agreement', 'Supply Agreement'], ['licensing', 'Licensing'], ['research', 'Research Collaboration'], ['teaming', 'Government Teaming']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Message</label>
                    <textarea rows={3} maxLength={5000} value={partnerForm.message} onChange={e => setPartnerForm(p => ({ ...p, message: e.target.value }))} placeholder="Describe the partnership opportunity..." className={inputClass} />
                  </div>
                </div>
                <button type="submit" disabled={partnerSubmitting || !partnerForm.receiverCompanySlug} className="px-5 py-2 bg-white hover:bg-slate-100 disabled:bg-white/[0.08] disabled:text-slate-500 text-slate-900 rounded-lg text-sm font-semibold transition-colors">
                  {partnerSubmitting ? 'Sending...' : 'Send Request'}
                </button>
              </form>
            </div>

            {/* Incoming Requests */}
            {partnerships.received.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Incoming Requests ({partnerships.received.length})</h3>
                <div className="space-y-3">
                  {partnerships.received.map(req => (
                    <div key={req.id} className="card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Link href={`/company-profiles/${req.senderCompany.slug}`} className="text-sm font-medium text-white hover:underline">{req.senderCompany.name}</Link>
                            <span className="text-xs px-2 py-0.5 bg-white/[0.08] rounded text-slate-300">{req.type.replace(/_/g, ' ')}</span>
                            <span className={`text-xs font-bold ${req.status === 'accepted' ? 'text-green-400' : req.status === 'rejected' ? 'text-red-400' : 'text-yellow-400'}`}>{req.status}</span>
                          </div>
                          {req.message && <p className="text-xs text-slate-400 mt-1">{req.message}</p>}
                        </div>
                        {req.status === 'pending' && (
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => handlePartnerRespond(req.id, 'accept')} className="px-3 py-1.5 text-xs bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors">Accept</button>
                            <button onClick={() => handlePartnerRespond(req.id, 'reject')} className="px-3 py-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors">Decline</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sent Requests */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Sent Requests ({partnerships.sent.length})</h3>
              {partnerships.sent.length > 0 ? (
                <div className="space-y-3">
                  {partnerships.sent.map(req => (
                    <div key={req.id} className="card p-4">
                      <div className="flex items-center gap-2">
                        <Link href={`/company-profiles/${req.receiverCompany.slug}`} className="text-sm font-medium text-white hover:underline">{req.receiverCompany.name}</Link>
                        <span className="text-xs px-2 py-0.5 bg-white/[0.08] rounded text-slate-300">{req.type.replace(/_/g, ' ')}</span>
                        <span className={`text-xs font-bold ${req.status === 'accepted' ? 'text-green-400' : req.status === 'rejected' ? 'text-red-400' : 'text-yellow-400'}`}>{req.status}</span>
                      </div>
                      {req.message && <p className="text-xs text-slate-400 mt-1">{req.message}</p>}
                      {req.responseMessage && <p className="text-xs text-blue-400 mt-1">Response: {req.responseMessage}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12"><div className="text-4xl mb-3">🤝</div><p className="text-sm text-slate-400">No partnership requests sent yet. Connect with other companies above.</p></div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProviderDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
