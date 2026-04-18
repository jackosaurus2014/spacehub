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

  // Case studies state
  const [caseStudies, setCaseStudies] = useState<any[]>([]);
  const [caseStudyForm, setCaseStudyForm] = useState({ title: '', summary: '', content: '', clientName: '', sector: '', metrics: '' });
  const [caseStudySubmitting, setCaseStudySubmitting] = useState(false);

  // Meeting requests state
  const [meetingRequests, setMeetingRequests] = useState<any[]>([]);
  const [meetingStatusFilter, setMeetingStatusFilter] = useState('all');

  // Funding round announcements state
  const [fundingAnnouncements, setFundingAnnouncements] = useState<any[]>([]);
  const [fundingForm, setFundingForm] = useState({
    roundType: 'seed',
    amount: '',
    currency: 'USD',
    date: new Date().toISOString().split('T')[0],
    leadInvestor: '',
    otherInvestors: '',
    valuation: '',
    blurb: '',
    pressReleaseUrl: '',
    pitchDeckUrl: '',
  });
  const [fundingSubmitting, setFundingSubmitting] = useState(false);

  // Pitch Deck state
  const [pitchDecks, setPitchDecks] = useState<any[]>([]);
  const [pitchDeckForm, setPitchDeckForm] = useState({
    title: '',
    description: '',
    fileUrl: '',
    visibility: 'logged_in',
    roundType: '',
    amountRaising: '',
    currency: 'USD',
  });
  const [pitchDeckSubmitting, setPitchDeckSubmitting] = useState(false);

  // Data Room state
  const [dataRoomDocs, setDataRoomDocs] = useState<any[]>([]);
  const [dataRoomForm, setDataRoomForm] = useState({
    title: '',
    description: '',
    fileUrl: '',
    docType: 'other',
    visibility: 'invite_only',
  });
  const [dataRoomSubmitting, setDataRoomSubmitting] = useState(false);

  // Cap Table state
  const [capTable, setCapTable] = useState<any>(null);
  const [capTableShares, setCapTableShares] = useState<any[]>([]);
  const [capTableForm, setCapTableForm] = useState({
    currentValuation: '',
    currency: 'USD',
    sharesAuthorized: '',
    sharesOutstanding: '',
    asOfDate: '',
    visibility: 'invite_only',
    documentUrl: '',
    notes: '',
  });
  const [capTableSaving, setCapTableSaving] = useState(false);
  const [capTableEntryForm, setCapTableEntryForm] = useState({
    holderName: '',
    holderType: 'investor',
    shareClass: 'common',
    shareCount: '',
    percentage: '',
    investmentAmount: '',
    roundLabel: '',
    acquiredAt: '',
    notes: '',
  });
  const [capTableEntrySubmitting, setCapTableEntrySubmitting] = useState(false);
  const [capTableShareForm, setCapTableShareForm] = useState({
    grantedToEmail: '',
    expiresAt: '',
  });
  const [capTableShareSubmitting, setCapTableShareSubmitting] = useState(false);

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

            // Load analytics, events, verification, jobs, gigs, partnerships, case studies, meeting requests, funding, decks, data-room, cap-table in parallel
            const [verifyRes, analyticsRes, eventsRes, jobsRes, gigsRes, partnershipsRes, caseStudiesRes, meetingRes, fundingRes, pitchDecksRes, dataRoomRes, capTableRes, capTableSharesRes] = await Promise.all([
              fetch('/api/marketplace/verify').catch(() => null),
              fetch(`/api/company-profiles/${myCompany.slug}/analytics`).catch(() => null),
              fetch(`/api/company-profiles/${myCompany.slug}/events`).catch(() => null),
              fetch(`/api/company-profiles/${myCompany.slug}/jobs`).catch(() => null),
              fetch(`/api/company-profiles/${myCompany.slug}/gigs`).catch(() => null),
              fetch(`/api/company-profiles/${myCompany.slug}/partnerships`).catch(() => null),
              fetch(`/api/company-profiles/${myCompany.slug}/case-studies`).catch(() => null),
              fetch(`/api/company-profiles/${myCompany.slug}/meeting-requests`).catch(() => null),
              fetch('/api/funding-rounds/announce').catch(() => null),
              fetch(`/api/pitch-decks?companyId=${myCompany.id}`).catch(() => null),
              fetch(`/api/data-room?companyId=${myCompany.id}`).catch(() => null),
              fetch(`/api/cap-tables/${myCompany.id}`).catch(() => null),
              fetch(`/api/cap-tables/${myCompany.id}/share`).catch(() => null),
            ]);

            if (verifyRes?.ok) setVerification(await verifyRes.json());
            if (analyticsRes?.ok) setAnalytics(await analyticsRes.json());
            if (eventsRes?.ok) { const d = await eventsRes.json(); setEvents(d.events || []); }
            if (jobsRes?.ok) { const d = await jobsRes.json(); setJobs(d.jobs || []); }
            if (gigsRes?.ok) { const d = await gigsRes.json(); setGigs(d.gigs || []); }
            if (partnershipsRes?.ok) setPartnerships(await partnershipsRes.json());
            if (caseStudiesRes?.ok) { const d = await caseStudiesRes.json(); setCaseStudies(d.caseStudies || []); }
            if (meetingRes?.ok) { const d = await meetingRes.json(); setMeetingRequests(d.meetingRequests || []); }
            if (fundingRes?.ok) { const d = await fundingRes.json(); setFundingAnnouncements(d.announcements || []); }
            if (pitchDecksRes?.ok) { const d = await pitchDecksRes.json(); setPitchDecks(d.pitchDecks || []); }
            if (dataRoomRes?.ok) { const d = await dataRoomRes.json(); setDataRoomDocs(d.documents || []); }
            if (capTableRes?.ok) {
              const d = await capTableRes.json();
              if (d.capTable) {
                setCapTable(d.capTable);
                setCapTableForm({
                  currentValuation: d.capTable.currentValuation != null ? String(d.capTable.currentValuation) : '',
                  currency: d.capTable.currency || 'USD',
                  sharesAuthorized: d.capTable.sharesAuthorized || '',
                  sharesOutstanding: d.capTable.sharesOutstanding || '',
                  asOfDate: d.capTable.asOfDate ? String(d.capTable.asOfDate).slice(0, 10) : '',
                  visibility: d.capTable.visibility || 'invite_only',
                  documentUrl: d.capTable.documentUrl || '',
                  notes: d.capTable.notes || '',
                });
              }
            }
            if (capTableSharesRes?.ok) { const d = await capTableSharesRes.json(); setCapTableShares(d.shares || []); }
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

  const handleFundingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    const amountNum = parseFloat(fundingForm.amount);
    if (!fundingForm.amount || isNaN(amountNum) || amountNum <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    setFundingSubmitting(true);
    try {
      const otherInvestors = fundingForm.otherInvestors
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const valuationNum = fundingForm.valuation ? parseFloat(fundingForm.valuation) : undefined;

      const payload: Record<string, unknown> = {
        roundType: fundingForm.roundType,
        amount: amountNum,
        currency: fundingForm.currency || 'USD',
        date: fundingForm.date,
        otherInvestors,
      };
      if (fundingForm.leadInvestor.trim()) payload.leadInvestor = fundingForm.leadInvestor.trim();
      if (valuationNum && !isNaN(valuationNum)) payload.valuation = valuationNum;
      if (fundingForm.blurb.trim()) payload.blurb = fundingForm.blurb.trim();
      if (fundingForm.pressReleaseUrl.trim()) payload.pressReleaseUrl = fundingForm.pressReleaseUrl.trim();
      if (fundingForm.pitchDeckUrl.trim()) payload.pitchDeckUrl = fundingForm.pitchDeckUrl.trim();

      const res = await fetch('/api/funding-rounds/announce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.fundingRound) {
          setFundingAnnouncements(prev => [result.fundingRound, ...prev]);
        }
        if (result.companyEvent) {
          setEvents(prev => [result.companyEvent, ...prev]);
        }
        setFundingForm({
          roundType: 'seed',
          amount: '',
          currency: 'USD',
          date: new Date().toISOString().split('T')[0],
          leadInvestor: '',
          otherInvestors: '',
          valuation: '',
          blurb: '',
          pressReleaseUrl: '',
          pitchDeckUrl: '',
        });
        toast.success('Funding round announced!');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error?.message || err.error || 'Failed to announce funding round');
      }
    } catch (err) {
      clientLogger.error('Funding announcement error', { error: err instanceof Error ? err.message : String(err) });
      toast.error('Failed to announce funding round. Please try again.');
    } finally {
      setFundingSubmitting(false);
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

  // --- Pitch Deck Handlers ---
  const handlePitchDeckSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setPitchDeckSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        companyId: company.id,
        title: pitchDeckForm.title.trim(),
        fileUrl: pitchDeckForm.fileUrl.trim(),
        visibility: pitchDeckForm.visibility,
        currency: pitchDeckForm.currency || 'USD',
      };
      if (pitchDeckForm.description.trim()) payload.description = pitchDeckForm.description.trim();
      if (pitchDeckForm.roundType) payload.roundType = pitchDeckForm.roundType;
      if (pitchDeckForm.amountRaising) {
        const n = parseFloat(pitchDeckForm.amountRaising);
        if (!Number.isNaN(n)) payload.amountRaising = n;
      }

      const res = await fetch('/api/pitch-decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const result = await res.json();
        setPitchDecks(prev => [result.pitchDeck, ...prev]);
        setPitchDeckForm({ title: '', description: '', fileUrl: '', visibility: 'logged_in', roundType: '', amountRaising: '', currency: 'USD' });
        toast.success('Pitch deck uploaded!');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error?.message || err.error || 'Failed to upload pitch deck');
      }
    } catch {
      toast.error('Failed to upload pitch deck.');
    } finally {
      setPitchDeckSubmitting(false);
    }
  };

  const handlePitchDeckDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/pitch-decks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPitchDecks(prev => prev.filter(d => d.id !== id));
        toast.success('Pitch deck deleted.');
      } else toast.error('Failed to delete pitch deck.');
    } catch { toast.error('Failed to delete pitch deck.'); }
  };

  const handlePitchDeckVisibility = async (id: string, visibility: string) => {
    try {
      const res = await fetch(`/api/pitch-decks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility }),
      });
      if (res.ok) {
        const result = await res.json();
        setPitchDecks(prev => prev.map(d => d.id === id ? result.pitchDeck : d));
        toast.success('Visibility updated.');
      } else toast.error('Failed to update visibility.');
    } catch { toast.error('Failed to update visibility.'); }
  };

  // --- Data Room Handlers ---
  const handleDataRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setDataRoomSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        companyId: company.id,
        title: dataRoomForm.title.trim(),
        fileUrl: dataRoomForm.fileUrl.trim(),
        visibility: dataRoomForm.visibility,
        docType: dataRoomForm.docType || null,
      };
      if (dataRoomForm.description.trim()) payload.description = dataRoomForm.description.trim();

      const res = await fetch('/api/data-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const result = await res.json();
        setDataRoomDocs(prev => [result.document, ...prev]);
        setDataRoomForm({ title: '', description: '', fileUrl: '', docType: 'other', visibility: 'invite_only' });
        toast.success('Document uploaded!');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error?.message || err.error || 'Failed to upload document');
      }
    } catch {
      toast.error('Failed to upload document.');
    } finally {
      setDataRoomSubmitting(false);
    }
  };

  const handleDataRoomDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/data-room/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDataRoomDocs(prev => prev.filter(d => d.id !== id));
        toast.success('Document deleted.');
      } else toast.error('Failed to delete document.');
    } catch { toast.error('Failed to delete document.'); }
  };

  const handleDataRoomVisibility = async (id: string, visibility: string) => {
    try {
      const res = await fetch(`/api/data-room/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility }),
      });
      if (res.ok) {
        const result = await res.json();
        setDataRoomDocs(prev => prev.map(d => d.id === id ? result.document : d));
        toast.success('Visibility updated.');
      } else toast.error('Failed to update visibility.');
    } catch { toast.error('Failed to update visibility.'); }
  };

  // --- Cap Table Handlers ---
  const handleCapTableSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setCapTableSaving(true);
    try {
      const payload: Record<string, unknown> = {
        visibility: capTableForm.visibility,
        currency: capTableForm.currency || 'USD',
      };
      if (capTableForm.currentValuation) {
        const n = parseFloat(capTableForm.currentValuation);
        if (!Number.isNaN(n)) payload.currentValuation = n;
      }
      if (capTableForm.sharesAuthorized) payload.sharesAuthorized = capTableForm.sharesAuthorized.trim();
      if (capTableForm.sharesOutstanding) payload.sharesOutstanding = capTableForm.sharesOutstanding.trim();
      if (capTableForm.asOfDate) payload.asOfDate = capTableForm.asOfDate;
      if (capTableForm.documentUrl.trim()) payload.documentUrl = capTableForm.documentUrl.trim();
      if (capTableForm.notes.trim()) payload.notes = capTableForm.notes.trim();

      const res = await fetch(`/api/cap-tables/${company.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const result = await res.json();
        setCapTable(result.capTable);
        toast.success('Cap table saved.');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error?.message || err.error || 'Failed to save cap table');
      }
    } catch (err) {
      clientLogger.error('Cap table save error', { error: err instanceof Error ? err.message : String(err) });
      toast.error('Failed to save cap table.');
    } finally {
      setCapTableSaving(false);
    }
  };

  const handleCapTableEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    if (!capTable) {
      toast.error('Save the cap table first before adding entries.');
      return;
    }
    setCapTableEntrySubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        holderName: capTableEntryForm.holderName.trim(),
        holderType: capTableEntryForm.holderType,
        shareClass: capTableEntryForm.shareClass,
      };
      if (capTableEntryForm.shareCount) payload.shareCount = capTableEntryForm.shareCount.trim();
      if (capTableEntryForm.percentage) {
        const n = parseFloat(capTableEntryForm.percentage);
        if (!Number.isNaN(n)) payload.percentage = n;
      }
      if (capTableEntryForm.investmentAmount) {
        const n = parseFloat(capTableEntryForm.investmentAmount);
        if (!Number.isNaN(n)) payload.investmentAmount = n;
      }
      if (capTableEntryForm.roundLabel.trim()) payload.roundLabel = capTableEntryForm.roundLabel.trim();
      if (capTableEntryForm.acquiredAt) payload.acquiredAt = capTableEntryForm.acquiredAt;
      if (capTableEntryForm.notes.trim()) payload.notes = capTableEntryForm.notes.trim();

      const res = await fetch(`/api/cap-tables/${company.id}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const result = await res.json();
        setCapTable((prev: any) => prev ? { ...prev, entries: [...(prev.entries || []), result.entry] } : prev);
        setCapTableEntryForm({
          holderName: '', holderType: 'investor', shareClass: 'common',
          shareCount: '', percentage: '', investmentAmount: '',
          roundLabel: '', acquiredAt: '', notes: '',
        });
        toast.success('Entry added.');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error?.message || err.error || 'Failed to add entry');
      }
    } catch (err) {
      clientLogger.error('Cap table entry add error', { error: err instanceof Error ? err.message : String(err) });
      toast.error('Failed to add entry.');
    } finally {
      setCapTableEntrySubmitting(false);
    }
  };

  const handleCapTableEntryDelete = async (entryId: string) => {
    if (!company) return;
    try {
      const res = await fetch(`/api/cap-tables/${company.id}/entries/${entryId}`, { method: 'DELETE' });
      if (res.ok) {
        setCapTable((prev: any) => prev ? { ...prev, entries: (prev.entries || []).filter((e: any) => e.id !== entryId) } : prev);
        toast.success('Entry removed.');
      } else toast.error('Failed to remove entry.');
    } catch { toast.error('Failed to remove entry.'); }
  };

  const handleCapTableShareGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    if (!capTable) {
      toast.error('Save the cap table first before granting access.');
      return;
    }
    setCapTableShareSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        grantedToEmail: capTableShareForm.grantedToEmail.trim(),
      };
      if (capTableShareForm.expiresAt) payload.expiresAt = capTableShareForm.expiresAt;

      const res = await fetch(`/api/cap-tables/${company.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const result = await res.json();
        setCapTableShares(prev => {
          const existing = prev.find(s => s.id === result.share.id);
          return existing
            ? prev.map(s => s.id === result.share.id ? result.share : s)
            : [result.share, ...prev];
        });
        setCapTableShareForm({ grantedToEmail: '', expiresAt: '' });
        toast.success('Access granted.');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error?.message || err.error || 'Failed to grant access');
      }
    } catch (err) {
      clientLogger.error('Cap table share grant error', { error: err instanceof Error ? err.message : String(err) });
      toast.error('Failed to grant access.');
    } finally {
      setCapTableShareSubmitting(false);
    }
  };

  const handleCapTableShareRevoke = async (shareId: string) => {
    if (!company) return;
    try {
      const res = await fetch(`/api/cap-tables/${company.id}/share/${shareId}`, { method: 'DELETE' });
      if (res.ok) {
        setCapTableShares(prev => prev.filter(s => s.id !== shareId));
        toast.success('Access revoked.');
      } else toast.error('Failed to revoke access.');
    } catch { toast.error('Failed to revoke access.'); }
  };

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'listings', label: `Listings (${listings.length})` },
    { key: 'jobs', label: `Jobs (${jobs.length})` },
    { key: 'gigs', label: `Gigs (${gigs.length})` },
    { key: 'proposals', label: `Proposals (${proposals.length})` },
    { key: 'partnerships', label: `Partners (${partnerships.sent.length + partnerships.received.length})` },
    { key: 'reviews', label: `Reviews (${reviews.length})` },
    { key: 'case-studies', label: `Case Studies (${caseStudies.length})` },
    { key: 'meetings', label: `Meetings (${meetingRequests.length})` },
    { key: 'profile', label: 'Edit Profile' },
    { key: 'announcements', label: `News (${events.length})` },
    { key: 'funding', label: `Announce Round (${fundingAnnouncements.length})` },
    { key: 'pitch-deck', label: `Pitch Deck (${pitchDecks.length})` },
    { key: 'data-room', label: `Data Room (${dataRoomDocs.length})` },
    { key: 'cap-table', label: `Cap Table${capTable ? ` (${(capTable.entries || []).length})` : ''}` },
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

            <ScrollReveal delay={0.12}>
              {(company as any)?.sponsorTier ? (
                <div className="card p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-white">Sponsor Status</span>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-medium capitalize">{(company as any).sponsorTier}</span>
                    </div>
                    <Link href="/company-profiles/sponsor" className="text-xs px-3 py-1.5 bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-lg transition-colors">
                      Manage Subscription
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-xl p-[1px] bg-gradient-to-r from-emerald-500/40 via-white/10 to-emerald-500/40">
                  <div className="card rounded-xl p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-white mb-1">Boost Your Company&apos;s Visibility</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Upgrade to Verified or Premium sponsor to unlock: custom banner, lead capture, priority placement, detailed viewer analytics
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link href="/pricing" className="text-xs px-3 py-1.5 bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-lg transition-colors">
                          Learn More
                        </Link>
                        <Link href="/company-profiles/sponsor" className="text-xs px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg transition-colors">
                          Upgrade Now
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </ScrollReveal>

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

        {/* ── Announce Funding Round Tab ── */}
        {tab === 'funding' && (
          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-white mb-1">Announce a Funding Round</h3>
              <p className="text-xs text-slate-400 mb-4">
                Submissions appear as &quot;self-reported&quot; on your public profile and the funding tracker.
              </p>
              <form onSubmit={handleFundingSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Round Type *</label>
                    <select
                      required
                      value={fundingForm.roundType}
                      onChange={e => setFundingForm(prev => ({ ...prev, roundType: e.target.value }))}
                      className={inputClass}
                    >
                      <option value="pre_seed">Pre-Seed</option>
                      <option value="seed">Seed</option>
                      <option value="series_a">Series A</option>
                      <option value="series_b">Series B</option>
                      <option value="series_c">Series C</option>
                      <option value="growth">Growth</option>
                      <option value="bridge">Bridge</option>
                      <option value="debt">Debt</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Announcement Date *</label>
                    <input
                      type="date"
                      required
                      value={fundingForm.date}
                      onChange={e => setFundingForm(prev => ({ ...prev, date: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Amount Raised *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      value={fundingForm.amount}
                      onChange={e => setFundingForm(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="e.g., 5000000"
                      className={inputClass}
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Enter the full number, e.g. 5000000 for $5M.</p>
                  </div>
                  <div>
                    <label className={labelClass}>Currency *</label>
                    <input
                      type="text"
                      required
                      maxLength={3}
                      value={fundingForm.currency}
                      onChange={e => setFundingForm(prev => ({ ...prev, currency: e.target.value.toUpperCase() }))}
                      placeholder="USD"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Lead Investor</label>
                    <input
                      type="text"
                      maxLength={200}
                      value={fundingForm.leadInvestor}
                      onChange={e => setFundingForm(prev => ({ ...prev, leadInvestor: e.target.value }))}
                      placeholder="e.g., Andreessen Horowitz"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Valuation (optional)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={fundingForm.valuation}
                      onChange={e => setFundingForm(prev => ({ ...prev, valuation: e.target.value }))}
                      placeholder="Post-money valuation"
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Other Investors (comma-separated)</label>
                    <input
                      type="text"
                      value={fundingForm.otherInvestors}
                      onChange={e => setFundingForm(prev => ({ ...prev, otherInvestors: e.target.value }))}
                      placeholder="Sequoia, Founders Fund, ..."
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Pitch / Blurb ({fundingForm.blurb.length}/500)</label>
                    <textarea
                      rows={3}
                      maxLength={500}
                      value={fundingForm.blurb}
                      onChange={e => setFundingForm(prev => ({ ...prev, blurb: e.target.value }))}
                      placeholder="What will you do with this capital?"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Press Release URL (optional)</label>
                    <input
                      type="url"
                      value={fundingForm.pressReleaseUrl}
                      onChange={e => setFundingForm(prev => ({ ...prev, pressReleaseUrl: e.target.value }))}
                      placeholder="https://..."
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Pitch Deck Link (optional)</label>
                    <input
                      type="url"
                      value={fundingForm.pitchDeckUrl}
                      onChange={e => setFundingForm(prev => ({ ...prev, pitchDeckUrl: e.target.value }))}
                      placeholder="https://..."
                      className={inputClass}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={fundingSubmitting || !fundingForm.amount}
                  className="px-5 py-2 bg-white hover:bg-slate-100 disabled:bg-white/[0.08] disabled:text-slate-500 text-slate-900 rounded-lg text-sm font-semibold transition-colors"
                >
                  {fundingSubmitting ? 'Announcing...' : 'Announce Round'}
                </button>
              </form>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-3">
                Your Announcements ({fundingAnnouncements.length})
              </h3>
              {fundingAnnouncements.length > 0 ? (
                <div className="space-y-3">
                  {fundingAnnouncements.map((round: any) => {
                    const fmt = (n: number | null | undefined) => {
                      if (!n) return 'Undisclosed';
                      if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
                      if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
                      if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
                      return `$${n.toFixed(0)}`;
                    };
                    return (
                      <div key={round.id} className="card p-4">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-xs font-bold px-2 py-0.5 bg-white/[0.08] rounded text-slate-300">
                                {round.seriesLabel || round.roundType}
                              </span>
                              <span className="text-sm font-semibold text-emerald-400">
                                {fmt(round.amount)}
                              </span>
                              {round.currency && round.currency !== 'USD' && (
                                <span className="text-xs text-slate-400">{round.currency}</span>
                              )}
                              {round.source === 'self_reported' && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                  Self-reported
                                </span>
                              )}
                            </div>
                            {round.leadInvestor && (
                              <div className="text-xs text-slate-300">
                                Led by <span className="font-medium text-white">{round.leadInvestor}</span>
                              </div>
                            )}
                            {round.investors && round.investors.length > 0 && (
                              <div className="text-xs text-slate-500 mt-0.5">
                                {round.investors.filter((i: string) => i !== round.leadInvestor).join(', ')}
                              </div>
                            )}
                            {round.notes && <p className="text-xs text-slate-400 mt-1">{round.notes}</p>}
                          </div>
                          <div className="text-xs text-slate-500 whitespace-nowrap">
                            {new Date(round.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                        {round.postValuation && (
                          <div className="text-xs text-purple-400 mt-1">
                            Valuation: {fmt(round.postValuation)}
                          </div>
                        )}
                        {round.sourceUrl && (
                          <a
                            href={round.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:underline mt-2 inline-block"
                          >
                            Press release →
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">💰</div>
                  <p className="text-sm text-slate-400">No funding rounds announced yet. Share your latest round above.</p>
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
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Analytics Overview</h3>
                  <button
                    onClick={() => {
                      if (!analytics?.metrics) return;
                      const m = analytics.metrics;
                      const rows = [
                        ['Metric', 'Value'],
                        ['Profile Views', m.profileViews],
                        ['Listing Views', m.totalListingViews],
                        ['Total Inquiries', m.totalInquiries],
                        ['Active Listings', m.activeListings],
                        ['Total Reviews', m.totalReviews],
                        ['Avg Rating', m.avgRating ?? 'N/A'],
                        ['Total Proposals', m.totalProposals],
                        ['Company Events', m.totalEvents],
                      ];
                      const csv = rows.map(r => r.join(',')).join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `spacenexus-analytics-${company?.slug || 'export'}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success('Analytics exported!');
                    }}
                    className="text-xs px-3 py-1.5 bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-lg transition-colors"
                  >
                    Export Analytics
                  </button>
                </div>

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

        {/* ── Case Studies Tab ── */}
        {tab === 'case-studies' && (
          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-white mb-4">Create a Case Study</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!company) return;
                setCaseStudySubmitting(true);
                try {
                  let parsedMetrics = undefined;
                  if (caseStudyForm.metrics.trim()) {
                    try { parsedMetrics = JSON.parse(caseStudyForm.metrics); } catch { toast.error('Metrics must be valid JSON (e.g., {"roi": "3x", "duration": "6 months"})'); setCaseStudySubmitting(false); return; }
                  }
                  const res = await fetch(`/api/company-profiles/${company.slug}/case-studies`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      title: caseStudyForm.title,
                      summary: caseStudyForm.summary,
                      content: caseStudyForm.content,
                      clientName: caseStudyForm.clientName || null,
                      sector: caseStudyForm.sector || null,
                      metrics: parsedMetrics,
                      isPublished: false,
                    }),
                  });
                  if (res.ok) {
                    const result = await res.json();
                    setCaseStudies(prev => [result.caseStudy, ...prev]);
                    setCaseStudyForm({ title: '', summary: '', content: '', clientName: '', sector: '', metrics: '' });
                    toast.success('Case study created! Toggle publish when ready.');
                  } else { const err = await res.json(); toast.error(err.error?.message || err.error || 'Failed to create case study'); }
                } catch { toast.error('Failed to create case study.'); } finally { setCaseStudySubmitting(false); }
              }} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Title *</label>
                    <input required minLength={3} maxLength={300} value={caseStudyForm.title} onChange={e => setCaseStudyForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g., Satellite Integration for Orbital Sciences" className={inputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Summary * (min 20 chars)</label>
                    <textarea required minLength={20} rows={2} maxLength={2000} value={caseStudyForm.summary} onChange={e => setCaseStudyForm(p => ({ ...p, summary: e.target.value }))} placeholder="Brief overview of the project and outcomes..." className={inputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Content * (min 50 chars)</label>
                    <textarea required minLength={50} rows={6} maxLength={50000} value={caseStudyForm.content} onChange={e => setCaseStudyForm(p => ({ ...p, content: e.target.value }))} placeholder="Full case study content: challenge, approach, results..." className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Client Name</label>
                    <input maxLength={200} value={caseStudyForm.clientName} onChange={e => setCaseStudyForm(p => ({ ...p, clientName: e.target.value }))} placeholder="e.g., NASA, Intelsat" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Sector</label>
                    <select value={caseStudyForm.sector} onChange={e => setCaseStudyForm(p => ({ ...p, sector: e.target.value }))} className={inputClass}>
                      <option value="">Select sector...</option>
                      {SECTOR_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Metrics (JSON, optional)</label>
                    <input value={caseStudyForm.metrics} onChange={e => setCaseStudyForm(p => ({ ...p, metrics: e.target.value }))} placeholder='{"roi": "3x", "duration": "6 months", "budget": "$2M"}' className={inputClass} />
                    <p className="text-xs text-slate-500 mt-1">Key-value pairs as JSON for outcome metrics</p>
                  </div>
                </div>
                <button type="submit" disabled={caseStudySubmitting || !caseStudyForm.title || !caseStudyForm.summary || !caseStudyForm.content} className="px-5 py-2 bg-white hover:bg-slate-100 disabled:bg-white/[0.08] disabled:text-slate-500 text-slate-900 rounded-lg text-sm font-semibold transition-colors">
                  {caseStudySubmitting ? 'Creating...' : 'Create Case Study'}
                </button>
              </form>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Your Case Studies ({caseStudies.length})</h3>
              {caseStudies.length > 0 ? (
                <div className="space-y-3">
                  {caseStudies.map(cs => (
                    <div key={cs.id} className="card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-white">{cs.title}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${cs.isPublished ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                              {cs.isPublished ? 'Published' : 'Draft'}
                            </span>
                            {cs.sector && <span className="text-xs px-2 py-0.5 bg-white/[0.08] rounded text-slate-300">{cs.sector}</span>}
                          </div>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{cs.summary}</p>
                          {cs.clientName && <p className="text-xs text-slate-500 mt-1">Client: {cs.clientName}</p>}
                          {cs.metrics && Object.keys(cs.metrics).length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {Object.entries(cs.metrics).map(([k, v]) => (
                                <span key={k} className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded">{k}: {String(v)}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/company-profiles/${company.slug}/case-studies`, {
                                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ caseStudyId: cs.id, isPublished: !cs.isPublished }),
                              });
                              if (res.ok) {
                                setCaseStudies(prev => prev.map(c => c.id === cs.id ? { ...c, isPublished: !c.isPublished } : c));
                                toast.success(cs.isPublished ? 'Case study unpublished.' : 'Case study published!');
                              } else toast.error('Failed to update.');
                            } catch { toast.error('Failed to update.'); }
                          }}
                          className={`px-3 py-1.5 text-xs rounded-lg transition-colors shrink-0 ${cs.isPublished ? 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400' : 'bg-green-500/10 hover:bg-green-500/20 text-green-400'}`}
                        >
                          {cs.isPublished ? 'Unpublish' : 'Publish'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12"><div className="text-4xl mb-3">📄</div><p className="text-sm text-slate-400">No case studies yet. Showcase your work by creating one above.</p></div>
              )}
            </div>
          </div>
        )}

        {/* ── Meeting Requests Tab ── */}
        {tab === 'meetings' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Meeting Requests ({meetingRequests.length})</h3>
              <select
                value={meetingStatusFilter}
                onChange={async (e) => {
                  const newFilter = e.target.value;
                  setMeetingStatusFilter(newFilter);
                  try {
                    const res = await fetch(`/api/company-profiles/${company.slug}/meeting-requests${newFilter !== 'all' ? `?status=${newFilter}` : ''}`);
                    if (res.ok) { const d = await res.json(); setMeetingRequests(d.meetingRequests || []); }
                  } catch { /* keep existing */ }
                }}
                className={inputClass + ' w-auto'}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {meetingRequests.length > 0 ? (
              <div className="space-y-3">
                {meetingRequests.map(mr => (
                  <div key={mr.id} className="card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-white">{mr.visitorName}</span>
                          {mr.visitorCompany && <span className="text-xs text-slate-400">from {mr.visitorCompany}</span>}
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            mr.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                            mr.status === 'declined' ? 'bg-red-500/20 text-red-400' :
                            mr.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {mr.status}
                          </span>
                        </div>
                        <a href={`mailto:${mr.visitorEmail}`} className="text-xs text-blue-400 hover:underline mt-0.5 inline-block">{mr.visitorEmail}</a>
                        <p className="text-xs text-slate-400 mt-1">{mr.message}</p>
                        {mr.preferredDate && (
                          <p className="text-xs text-slate-500 mt-1">Preferred date: {new Date(mr.preferredDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}</p>
                        )}
                        <p className="text-xs text-slate-600 mt-1">Received: {new Date(mr.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}</p>
                      </div>
                      {mr.status === 'pending' && (
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/company-profiles/${company.slug}/meeting-requests`, {
                                  method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ requestId: mr.id, action: 'accepted' }),
                                });
                                if (res.ok) {
                                  setMeetingRequests(prev => prev.map(r => r.id === mr.id ? { ...r, status: 'accepted', respondedAt: new Date().toISOString() } : r));
                                  toast.success('Meeting request accepted!');
                                } else toast.error('Failed to respond.');
                              } catch { toast.error('Failed to respond.'); }
                            }}
                            className="px-3 py-1.5 text-xs bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors"
                          >Accept</button>
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/company-profiles/${company.slug}/meeting-requests`, {
                                  method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ requestId: mr.id, action: 'declined' }),
                                });
                                if (res.ok) {
                                  setMeetingRequests(prev => prev.map(r => r.id === mr.id ? { ...r, status: 'declined', respondedAt: new Date().toISOString() } : r));
                                  toast.success('Meeting request declined.');
                                } else toast.error('Failed to respond.');
                              } catch { toast.error('Failed to respond.'); }
                            }}
                            className="px-3 py-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                          >Decline</button>
                        </div>
                      )}
                      {mr.status === 'accepted' && (
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/company-profiles/${company.slug}/meeting-requests`, {
                                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ requestId: mr.id, action: 'completed' }),
                              });
                              if (res.ok) {
                                setMeetingRequests(prev => prev.map(r => r.id === mr.id ? { ...r, status: 'completed', respondedAt: new Date().toISOString() } : r));
                                toast.success('Meeting marked as completed.');
                              } else toast.error('Failed to update.');
                            } catch { toast.error('Failed to update.'); }
                          }}
                          className="px-3 py-1.5 text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors shrink-0"
                        >Mark Complete</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12"><div className="text-4xl mb-3">📅</div><p className="text-sm text-slate-400">No meeting requests yet. When visitors request meetings from your company profile, they will appear here.</p></div>
            )}
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

        {/* ── Pitch Deck Tab ── */}
        {tab === 'pitch-deck' && (
          <div className="space-y-6">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Upload Pitch Deck</h3>
              <form onSubmit={handlePitchDeckSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Title *</label>
                    <input
                      required maxLength={200}
                      value={pitchDeckForm.title}
                      onChange={e => setPitchDeckForm(p => ({ ...p, title: e.target.value }))}
                      placeholder="e.g., Seed Round Pitch — Q2 2026"
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Description</label>
                    <textarea
                      rows={3} maxLength={5000}
                      value={pitchDeckForm.description}
                      onChange={e => setPitchDeckForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Briefly describe this deck (teaser, one-liner, etc.)"
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Paste link to PDF (Google Drive, Dropbox, etc.) *</label>
                    <input
                      required type="url" maxLength={2000}
                      value={pitchDeckForm.fileUrl}
                      onChange={e => setPitchDeckForm(p => ({ ...p, fileUrl: e.target.value }))}
                      placeholder="https://drive.google.com/file/d/..."
                      className={inputClass}
                    />
                    <p className="text-xs text-slate-500 mt-1">Make sure the link is set to &ldquo;anyone with the link can view&rdquo;.</p>
                  </div>
                  <div>
                    <label className={labelClass}>Visibility</label>
                    <select
                      value={pitchDeckForm.visibility}
                      onChange={e => setPitchDeckForm(p => ({ ...p, visibility: e.target.value }))}
                      className={inputClass}
                    >
                      <option value="public">Public — anyone</option>
                      <option value="logged_in">Logged-in users only</option>
                      <option value="invite_only">Invite only (owner/admin)</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Round Type</label>
                    <select
                      value={pitchDeckForm.roundType}
                      onChange={e => setPitchDeckForm(p => ({ ...p, roundType: e.target.value }))}
                      className={inputClass}
                    >
                      <option value="">—</option>
                      <option value="pre_seed">Pre-seed</option>
                      <option value="seed">Seed</option>
                      <option value="series_a">Series A</option>
                      <option value="series_b">Series B</option>
                      <option value="series_c">Series C</option>
                      <option value="growth">Growth</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Amount Raising</label>
                    <input
                      type="number" min="0" step="1"
                      value={pitchDeckForm.amountRaising}
                      onChange={e => setPitchDeckForm(p => ({ ...p, amountRaising: e.target.value }))}
                      placeholder="e.g., 2000000"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Currency</label>
                    <input
                      maxLength={3}
                      value={pitchDeckForm.currency}
                      onChange={e => setPitchDeckForm(p => ({ ...p, currency: e.target.value.toUpperCase() }))}
                      placeholder="USD"
                      className={inputClass}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={pitchDeckSubmitting || !pitchDeckForm.title || !pitchDeckForm.fileUrl}
                  className="px-5 py-2 bg-white hover:bg-slate-100 disabled:bg-white/[0.08] disabled:text-slate-500 text-slate-900 rounded-lg text-sm font-semibold transition-colors"
                >
                  {pitchDeckSubmitting ? 'Uploading...' : 'Upload Deck'}
                </button>
              </form>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Your Pitch Decks ({pitchDecks.length})</h3>
              {pitchDecks.length > 0 ? (
                <div className="space-y-3">
                  {pitchDecks.map(deck => (
                    <div key={deck.id} className="card p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <a href={deck.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-white hover:underline truncate">
                              {deck.title}
                            </a>
                            {deck.roundType && (
                              <span className="text-xs px-2 py-0.5 bg-white/[0.08] rounded text-slate-300">{deck.roundType.replace(/_/g, ' ')}</span>
                            )}
                            <span className="text-xs text-slate-500">{deck.views || 0} view{deck.views === 1 ? '' : 's'}</span>
                          </div>
                          {deck.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{deck.description}</p>}
                          {deck.amountRaising && (
                            <p className="text-xs text-slate-500 mt-1">Raising: {deck.currency || 'USD'} {Number(deck.amountRaising).toLocaleString()}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={deck.visibility}
                            onChange={e => handlePitchDeckVisibility(deck.id, e.target.value)}
                            className="text-xs bg-white/[0.06] border border-white/[0.1] rounded px-2 py-1 text-white"
                          >
                            <option value="public">Public</option>
                            <option value="logged_in">Logged-in</option>
                            <option value="invite_only">Invite only</option>
                          </select>
                          <button
                            onClick={() => handlePitchDeckDelete(deck.id)}
                            className="px-3 py-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">📊</div>
                  <p className="text-sm text-slate-400">No pitch decks uploaded yet. Share your round with investors above.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Data Room Tab ── */}
        {tab === 'data-room' && (
          <div className="space-y-6">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Upload Data Room Document</h3>
              <form onSubmit={handleDataRoomSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Title *</label>
                    <input
                      required maxLength={200}
                      value={dataRoomForm.title}
                      onChange={e => setDataRoomForm(p => ({ ...p, title: e.target.value }))}
                      placeholder="e.g., Cap Table Q2 2026"
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Description</label>
                    <textarea
                      rows={3} maxLength={5000}
                      value={dataRoomForm.description}
                      onChange={e => setDataRoomForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Optional notes for reviewers"
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Paste link to PDF (Google Drive, Dropbox, etc.) *</label>
                    <input
                      required type="url" maxLength={2000}
                      value={dataRoomForm.fileUrl}
                      onChange={e => setDataRoomForm(p => ({ ...p, fileUrl: e.target.value }))}
                      placeholder="https://drive.google.com/file/d/..."
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Document Type</label>
                    <select
                      value={dataRoomForm.docType}
                      onChange={e => setDataRoomForm(p => ({ ...p, docType: e.target.value }))}
                      className={inputClass}
                    >
                      <option value="term_sheet">Term Sheet</option>
                      <option value="financials">Financials</option>
                      <option value="cap_table">Cap Table</option>
                      <option value="product_deck">Product Deck</option>
                      <option value="market_research">Market Research</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Visibility</label>
                    <select
                      value={dataRoomForm.visibility}
                      onChange={e => setDataRoomForm(p => ({ ...p, visibility: e.target.value }))}
                      className={inputClass}
                    >
                      <option value="public">Public — anyone</option>
                      <option value="logged_in">Logged-in users only</option>
                      <option value="invite_only">Invite only (owner/admin)</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={dataRoomSubmitting || !dataRoomForm.title || !dataRoomForm.fileUrl}
                  className="px-5 py-2 bg-white hover:bg-slate-100 disabled:bg-white/[0.08] disabled:text-slate-500 text-slate-900 rounded-lg text-sm font-semibold transition-colors"
                >
                  {dataRoomSubmitting ? 'Uploading...' : 'Upload Document'}
                </button>
              </form>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Your Documents ({dataRoomDocs.length})</h3>
              {dataRoomDocs.length > 0 ? (
                <div className="space-y-3">
                  {dataRoomDocs.map(doc => (
                    <div key={doc.id} className="card p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-white hover:underline truncate">
                              {doc.title}
                            </a>
                            {doc.docType && (
                              <span className="text-xs px-2 py-0.5 bg-white/[0.08] rounded text-slate-300">{doc.docType.replace(/_/g, ' ')}</span>
                            )}
                          </div>
                          {doc.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{doc.description}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={doc.visibility}
                            onChange={e => handleDataRoomVisibility(doc.id, e.target.value)}
                            className="text-xs bg-white/[0.06] border border-white/[0.1] rounded px-2 py-1 text-white"
                          >
                            <option value="public">Public</option>
                            <option value="logged_in">Logged-in</option>
                            <option value="invite_only">Invite only</option>
                          </select>
                          <button
                            onClick={() => handleDataRoomDelete(doc.id)}
                            className="px-3 py-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">🗂️</div>
                  <p className="text-sm text-slate-400">No documents uploaded yet. Share financials, term sheets, and more above.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Cap Table Tab ── */}
        {tab === 'cap-table' && (
          <div className="space-y-6">
            {/* Cap table summary form */}
            <div className="card p-5">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <h3 className="text-sm font-semibold text-white">Cap Table Summary</h3>
                {capTable && (
                  <Link
                    href={`/cap-tables/${company.slug}`}
                    target="_blank"
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    View public page →
                  </Link>
                )}
              </div>
              <form onSubmit={handleCapTableSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Current Valuation</label>
                    <input
                      type="number" min="0" step="any"
                      value={capTableForm.currentValuation}
                      onChange={e => setCapTableForm(p => ({ ...p, currentValuation: e.target.value }))}
                      placeholder="e.g., 25000000"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Currency</label>
                    <input
                      maxLength={3}
                      value={capTableForm.currency}
                      onChange={e => setCapTableForm(p => ({ ...p, currency: e.target.value.toUpperCase() }))}
                      placeholder="USD"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Shares Authorized</label>
                    <input
                      type="text" inputMode="numeric" pattern="\d*"
                      value={capTableForm.sharesAuthorized}
                      onChange={e => setCapTableForm(p => ({ ...p, sharesAuthorized: e.target.value.replace(/[^0-9]/g, '') }))}
                      placeholder="e.g., 10000000"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Shares Outstanding</label>
                    <input
                      type="text" inputMode="numeric" pattern="\d*"
                      value={capTableForm.sharesOutstanding}
                      onChange={e => setCapTableForm(p => ({ ...p, sharesOutstanding: e.target.value.replace(/[^0-9]/g, '') }))}
                      placeholder="e.g., 8500000"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>As of Date</label>
                    <input
                      type="date"
                      value={capTableForm.asOfDate}
                      onChange={e => setCapTableForm(p => ({ ...p, asOfDate: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Visibility</label>
                    <select
                      value={capTableForm.visibility}
                      onChange={e => setCapTableForm(p => ({ ...p, visibility: e.target.value }))}
                      className={inputClass}
                    >
                      <option value="public">Public — anyone</option>
                      <option value="logged_in">Logged-in users only</option>
                      <option value="invite_only">Invite only (granted investors)</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Carta / Source Document URL</label>
                    <input
                      type="url" maxLength={2000}
                      value={capTableForm.documentUrl}
                      onChange={e => setCapTableForm(p => ({ ...p, documentUrl: e.target.value }))}
                      placeholder="https://app.carta.com/... (optional)"
                      className={inputClass}
                    />
                    <p className="text-xs text-slate-500 mt-1">Paste a link to your Carta export or any source document.</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Notes</label>
                    <textarea
                      rows={3} maxLength={5000}
                      value={capTableForm.notes}
                      onChange={e => setCapTableForm(p => ({ ...p, notes: e.target.value }))}
                      placeholder="Optional context for viewers (assumptions, exclusions, etc.)"
                      className={inputClass}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={capTableSaving}
                  className="px-5 py-2 bg-white hover:bg-slate-100 disabled:bg-white/[0.08] disabled:text-slate-500 text-slate-900 rounded-lg text-sm font-semibold transition-colors"
                >
                  {capTableSaving ? 'Saving...' : capTable ? 'Update Cap Table' : 'Create Cap Table'}
                </button>
              </form>
            </div>

            {/* Add entry form */}
            {capTable && (
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Add Entry</h3>
                <form onSubmit={handleCapTableEntrySubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Holder Name *</label>
                      <input
                        required maxLength={200}
                        value={capTableEntryForm.holderName}
                        onChange={e => setCapTableEntryForm(p => ({ ...p, holderName: e.target.value }))}
                        placeholder="e.g., Jane Doe / Acme Ventures"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Holder Type</label>
                      <select
                        value={capTableEntryForm.holderType}
                        onChange={e => setCapTableEntryForm(p => ({ ...p, holderType: e.target.value }))}
                        className={inputClass}
                      >
                        <option value="founder">Founder</option>
                        <option value="employee">Employee</option>
                        <option value="investor">Investor</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Share Class</label>
                      <select
                        value={capTableEntryForm.shareClass}
                        onChange={e => setCapTableEntryForm(p => ({ ...p, shareClass: e.target.value }))}
                        className={inputClass}
                      >
                        <option value="common">Common</option>
                        <option value="preferred_a">Preferred A</option>
                        <option value="preferred_b">Preferred B</option>
                        <option value="preferred_c">Preferred C</option>
                        <option value="convertible">Convertible</option>
                        <option value="safe">SAFE</option>
                        <option value="option_pool">Option Pool</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Round Label</label>
                      <input
                        maxLength={100}
                        value={capTableEntryForm.roundLabel}
                        onChange={e => setCapTableEntryForm(p => ({ ...p, roundLabel: e.target.value }))}
                        placeholder="e.g., seed, series_a"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Share Count</label>
                      <input
                        type="text" inputMode="numeric" pattern="\d*"
                        value={capTableEntryForm.shareCount}
                        onChange={e => setCapTableEntryForm(p => ({ ...p, shareCount: e.target.value.replace(/[^0-9]/g, '') }))}
                        placeholder="e.g., 1000000"
                        className={inputClass}
                      />
                      <p className="text-xs text-slate-500 mt-1">Percentage auto-calculates if shares outstanding is set.</p>
                    </div>
                    <div>
                      <label className={labelClass}>Percentage (manual override)</label>
                      <input
                        type="number" min="0" max="100" step="0.0001"
                        value={capTableEntryForm.percentage}
                        onChange={e => setCapTableEntryForm(p => ({ ...p, percentage: e.target.value }))}
                        placeholder="e.g., 12.5"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Investment Amount</label>
                      <input
                        type="number" min="0" step="any"
                        value={capTableEntryForm.investmentAmount}
                        onChange={e => setCapTableEntryForm(p => ({ ...p, investmentAmount: e.target.value }))}
                        placeholder="e.g., 500000"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Acquired Date</label>
                      <input
                        type="date"
                        value={capTableEntryForm.acquiredAt}
                        onChange={e => setCapTableEntryForm(p => ({ ...p, acquiredAt: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Notes</label>
                      <input
                        maxLength={2000}
                        value={capTableEntryForm.notes}
                        onChange={e => setCapTableEntryForm(p => ({ ...p, notes: e.target.value }))}
                        placeholder="Optional notes about this entry"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={capTableEntrySubmitting || !capTableEntryForm.holderName.trim()}
                    className="px-5 py-2 bg-white hover:bg-slate-100 disabled:bg-white/[0.08] disabled:text-slate-500 text-slate-900 rounded-lg text-sm font-semibold transition-colors"
                  >
                    {capTableEntrySubmitting ? 'Adding...' : 'Add Entry'}
                  </button>
                </form>
              </div>
            )}

            {/* Entries table */}
            {capTable && (
              <div className="card p-0 overflow-hidden">
                <div className="px-5 py-3 border-b border-white/[0.08]">
                  <h3 className="text-sm font-semibold text-white">
                    Entries ({(capTable.entries || []).length})
                  </h3>
                </div>
                {(capTable.entries || []).length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-3">📋</div>
                    <p className="text-sm text-slate-400">No entries yet. Add founders, employees, and investors above.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-white/[0.04] text-left text-xs text-slate-400 uppercase">
                        <tr>
                          <th className="px-4 py-3">Holder</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Class</th>
                          <th className="px-4 py-3 text-right">Shares</th>
                          <th className="px-4 py-3 text-right">%</th>
                          <th className="px-4 py-3 text-right">$</th>
                          <th className="px-4 py-3">Round</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {(capTable.entries || []).map((e: any) => (
                          <tr key={e.id} className="hover:bg-white/[0.03]">
                            <td className="px-4 py-3 text-white">{e.holderName}</td>
                            <td className="px-4 py-3 text-slate-300 capitalize">{e.holderType}</td>
                            <td className="px-4 py-3 text-slate-300">{String(e.shareClass).replace(/_/g, ' ')}</td>
                            <td className="px-4 py-3 text-right font-mono text-slate-300">
                              {e.shareCount ? Number(e.shareCount).toLocaleString() : '—'}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-300">
                              {e.percentage != null ? `${Number(e.percentage).toFixed(2)}%` : '—'}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-300">
                              {e.investmentAmount != null
                                ? `${capTable.currency || 'USD'} ${Number(e.investmentAmount).toLocaleString()}`
                                : '—'}
                            </td>
                            <td className="px-4 py-3 text-slate-400">
                              {e.roundLabel ? e.roundLabel.replace(/_/g, ' ') : '—'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleCapTableEntryDelete(e.id)}
                                className="px-2 py-1 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Share access management */}
            {capTable && (
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-white mb-1">Investor Access</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Grant specific SpaceNexus users read access when the cap table is set to invite-only.
                </p>
                <form onSubmit={handleCapTableShareGrant} className="flex items-end gap-2 flex-wrap mb-5">
                  <div className="flex-1 min-w-[220px]">
                    <label className={labelClass}>Investor email</label>
                    <input
                      type="email" required maxLength={255}
                      value={capTableShareForm.grantedToEmail}
                      onChange={e => setCapTableShareForm(p => ({ ...p, grantedToEmail: e.target.value }))}
                      placeholder="investor@example.com"
                      className={inputClass}
                    />
                  </div>
                  <div className="w-44">
                    <label className={labelClass}>Expires (optional)</label>
                    <input
                      type="date"
                      value={capTableShareForm.expiresAt}
                      onChange={e => setCapTableShareForm(p => ({ ...p, expiresAt: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={capTableShareSubmitting || !capTableShareForm.grantedToEmail}
                    className="px-4 py-2 bg-white hover:bg-slate-100 disabled:bg-white/[0.08] disabled:text-slate-500 text-slate-900 rounded-lg text-sm font-semibold transition-colors"
                  >
                    {capTableShareSubmitting ? 'Granting...' : 'Grant Access'}
                  </button>
                </form>

                {capTableShares.length > 0 ? (
                  <div className="space-y-2">
                    {capTableShares.map((s: any) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-3 p-3 bg-white/[0.04] rounded-lg"
                      >
                        <div className="min-w-0">
                          <div className="text-sm text-white truncate">{s.grantedToEmail || s.grantedToUserId}</div>
                          <div className="text-xs text-slate-500">
                            {s.grantedToName ? `${s.grantedToName} · ` : ''}
                            Granted {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ''}
                            {s.expiresAt ? ` · Expires ${new Date(s.expiresAt).toLocaleDateString()}` : ''}
                          </div>
                        </div>
                        <button
                          onClick={() => handleCapTableShareRevoke(s.id)}
                          className="px-3 py-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors shrink-0"
                        >
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 text-center py-4">
                    No investors have been granted access yet.
                  </p>
                )}
              </div>
            )}
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
