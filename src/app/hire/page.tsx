import Link from 'next/link';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { SITE_STATS } from '@/lib/site-stats';
import { ATS_BOARDS } from '@/lib/fetchers/ats-jobs-fetcher';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import HireInterestForm from './HireInterestForm';
import PostJobForm from '@/components/jobs/PostJobForm';
import { JOB_POSTING_PLANS } from '@/lib/job-posting-plans';

export const dynamic = 'force-dynamic';

async function getLiveCounts() {
  try {
    const [activeJobs, companies] = await Promise.all([
      prisma.spaceJobPosting.count({ where: { isActive: true } }),
      prisma.companyProfile.count(),
    ]);
    return { activeJobs, companies };
  } catch (error) {
    logger.error('Failed to load /hire live counts', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { activeJobs: null, companies: null };
  }
}

const SYNCED_COMPANIES = ATS_BOARDS.map((b) => b.company).sort((a, b) => a.localeCompare(b));

const FAQ_ITEMS = [
  {
    q: 'Is listing on SpaceNexus free?',
    a: `Yes. If your careers page runs on Greenhouse, Lever, or Ashby, we likely already sync your open roles automatically at no cost — no setup required. If we haven't picked up your board yet, tell us via the form below and we'll add it to our sync list.`,
  },
  {
    q: 'How does company profile verification work?',
    a: 'Sign in and claim your company profile from its page. If your account email domain matches your company website, verification is instant. Otherwise, our team manually reviews claims — usually within 48 hours.',
  },
  {
    q: 'Can I list contract or gig work instead of a full-time role?',
    a: 'Contract and freelance roles sync the same way as full-time ones — if they are on your ATS board, we pick them up. A dedicated gig board is staged for when the freelance audience is here.',
  },
  {
    q: "What if my company isn't on Greenhouse, Lever, or Ashby?",
    a: 'Use the form below and select "Help us get our jobs synced" — we\'re expanding ATS coverage and prioritize requests from real employers.',
  },
];

export default async function HirePage() {
  const { activeJobs, companies } = await getLiveCounts();

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0a0a0a] to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <AnimatedPageHeader
          title="Hire from the space industry's talent pool"
          subtitle="Space-company recruiters and founders: your roles may already be listed. Claim your profile, get discovered by enthusiasts and professionals who track this industry every day."
          accentColor="cyan"
        />

        {/* Live stats */}
        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16" staggerDelay={0.1}>
          <StaggerItem>
            <div className="card p-6 text-center">
              <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                {activeJobs != null ? activeJobs.toLocaleString() : SITE_STATS.jobListings}
              </p>
              <p className="text-sm text-slate-400 mt-2 font-medium">Live job listings</p>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card p-6 text-center">
              <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                {companies != null ? companies.toLocaleString() : SITE_STATS.companies}
              </p>
              <p className="text-sm text-slate-400 mt-2 font-medium">Company profiles</p>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card p-6 text-center">
              <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                {ATS_BOARDS.length}
              </p>
              <p className="text-sm text-slate-400 mt-2 font-medium">Employers synced daily</p>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card p-6 text-center">
              <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                {SITE_STATS.dataSources}
              </p>
              <p className="text-sm text-slate-400 mt-2 font-medium">Live data sources</p>
            </div>
          </StaggerItem>
        </StaggerContainer>

        {/* How it works */}
        {/* Employer product (2026-09-10): priced placement on the board. */}
        <section aria-labelledby="hire-plans-heading" className="mb-12">
          <h2 id="hire-plans-heading" className="text-2xl md:text-3xl font-display font-bold text-white mb-2 text-center">Post a job on the board</h2>
          <p className="text-slate-400 text-center max-w-2xl mx-auto mb-6">Your role next to 8,600+ synced listings, with a salary band, your company profile, job alerts and the RSS feed. Pay once; no subscription.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto mb-8">
            {JOB_POSTING_PLANS.map((plan) => (
              <div key={plan.id} className={`card p-6 ${plan.featured ? 'border-cyan-500/40' : ''}`}>
                <div className="flex items-baseline justify-between mb-1">
                  <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                  <span className="text-2xl font-bold text-white">${plan.priceUsd}</span>
                </div>
                <p className="text-sm text-slate-400 mb-4">{plan.days} days · {plan.blurb}</p>
                <ul className="space-y-1.5 text-sm text-slate-300">
                  {plan.includes.map((line) => <li key={line} className="flex gap-2"><span className="text-cyan-400" aria-hidden="true">✓</span><span>{line}</span></li>)}
                </ul>
                <a href="#post-a-job" className={`mt-5 inline-flex items-center justify-center w-full min-h-[44px] rounded-lg text-sm font-semibold ${plan.featured ? 'btn-primary' : 'border border-white/15 text-white hover:border-white/30'}`}>Post a {plan.name.toLowerCase()}</a>
              </div>
            ))}
          </div>
          <div className="max-w-4xl mx-auto"><PostJobForm /></div>
          <p className="text-sm text-slate-400 text-center mt-4">Your account is your employer portal: <Link href="/register?callbackUrl=%2Fhire%23post-a-job" className="text-cyan-300 hover:underline">create a free account</Link> to post, then <Link href="/hire/dashboard" className="text-cyan-300 hover:underline">edit, pause, renew or remove</Link> your listings and see views and apply clicks any time.</p>
        </section>

        <ScrollReveal className="mb-4">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-2 text-center">
            How it works
          </h2>
          <p className="text-slate-400 text-center mb-8 max-w-2xl mx-auto">
            Three ways to get your open roles in front of space-industry job seekers.
          </p>
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16" staggerDelay={0.12}>
          <StaggerItem>
            <div className="card p-8 h-full flex flex-col">
              <div className="w-10 h-10 rounded-lg bg-cyan-400/10 flex items-center justify-center mb-4 text-cyan-400 font-bold">1</div>
              <h3 className="text-xl font-bold text-white mb-2">Already synced?</h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-4 flex-1">
                If your careers page runs on Greenhouse, Lever, or Ashby, there&apos;s a good chance we already
                list your open roles free — synced daily, no setup on your end.
              </p>
              <p className="text-slate-500 text-xs mb-2 uppercase tracking-wide font-medium">Currently syncing from</p>
              <div className="flex flex-wrap gap-1.5">
                {SYNCED_COMPANIES.map((name) => (
                  <span key={name} className="text-xs px-2 py-1 rounded bg-white/[0.06] text-slate-300 border border-white/[0.08]">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </StaggerItem>

          <StaggerItem>
            <div className="card p-8 h-full flex flex-col">
              <div className="w-10 h-10 rounded-lg bg-cyan-400/10 flex items-center justify-center mb-4 text-cyan-400 font-bold">2</div>
              <h3 className="text-xl font-bold text-white mb-2">Claim your company profile</h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-4 flex-1">
                Claiming is free. Sign in and claim your profile with a company email address — matching
                your official domain verifies you instantly. Otherwise our team reviews claims within 48 hours.
              </p>
              <Link
                href="/company-profiles"
                className="mt-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-white/[0.12] text-white rounded-lg hover:bg-white/[0.06] transition-all duration-200 text-sm font-semibold"
              >
                Browse Company Profiles
              </Link>
            </div>
          </StaggerItem>

          <StaggerItem>
            <div className="card p-8 h-full flex flex-col relative">
              <span className="absolute top-6 right-6 text-xs font-semibold px-2 py-1 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
                Coming soon
              </span>
              <div className="w-10 h-10 rounded-lg bg-cyan-400/10 flex items-center justify-center mb-4 text-cyan-400 font-bold">3</div>
              <h3 className="text-xl font-bold text-white mb-2">Stand out</h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-4 flex-1">
                Featured placement and employer branding for companies who want extra visibility beyond
                the standard sync. Pricing is still in research — join the waitlist below to be first in line.
              </p>
              <a
                href="#interest-form"
                className="mt-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-white/[0.12] text-white rounded-lg hover:bg-white/[0.06] transition-all duration-200 text-sm font-semibold"
              >
                Join the waitlist
              </a>
            </div>
          </StaggerItem>
        </StaggerContainer>

        {/* Interest form */}
        <ScrollReveal className="mb-16">
          <div className="max-w-2xl mx-auto" id="interest-form">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-2 text-center">
              Get in Touch
            </h2>
            <p className="text-slate-400 text-center mb-8">
              Tell us what you need — feature your listings, get synced, or ask about employer branding —
              and our team will follow up.
            </p>
            <HireInterestForm />
          </div>
        </ScrollReveal>

        {/* FAQ */}
        <ScrollReveal className="mb-4">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-2 text-center">
            Frequently Asked Questions
          </h2>
        </ScrollReveal>

        <StaggerContainer className="max-w-3xl mx-auto space-y-4 mb-16" staggerDelay={0.08}>
          {FAQ_ITEMS.map((item) => (
            <StaggerItem key={item.q}>
              <div className="card p-6">
                <h3 className="text-white font-semibold mb-2">{item.q}</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{item.a}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Footer CTA for job seekers */}
        <ScrollReveal className="mb-8">
          <div className="card p-8 text-center max-w-3xl mx-auto">
            <h3 className="text-xl font-bold text-white mb-2">Looking for a job instead?</h3>
            <p className="text-slate-400 mb-6">
              Browse {SITE_STATS.jobListings} live space-industry job listings on Space Talent.
            </p>
            <Link href="/space-talent" className="btn-primary inline-flex items-center gap-2">
              Browse Space Talent
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
