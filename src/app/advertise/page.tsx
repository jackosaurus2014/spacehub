import Link from 'next/link';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { SITE_STATS } from '@/lib/site-stats';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import AdvertiseInquiryForm from './AdvertiseInquiryForm';

export const dynamic = 'force-dynamic';

async function getLiveCounts() {
  try {
    const [activeJobs, companies] = await Promise.all([
      prisma.spaceJobPosting.count({ where: { isActive: true } }),
      prisma.companyProfile.count(),
    ]);
    return { activeJobs, companies };
  } catch (error) {
    logger.error('Failed to load /advertise live counts', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { activeJobs: null, companies: null };
  }
}

const sponsorshipOptions = [
  {
    name: 'State of the Space Economy',
    description: 'A weekly, data-driven brief published every Monday, built directly from our own market and news data — not AI-generated. Sponsor a placement in the brief.',
    cta: 'Live every Monday',
    color: 'cyan',
  },
  {
    name: "Who's Hiring in Space",
    description: "A weekly article generated entirely from live SpaceJobPosting data synced from company ATS boards. Sponsor a placement alongside the week's hiring roundup.",
    cta: 'Live weekly',
    color: 'purple',
  },
  {
    name: 'Jobs Widget & Feed Attribution',
    description: 'Our embeddable live jobs widget is used by third-party sites. Sponsor branded attribution on the widget and job feed.',
    cta: 'See the widget',
    href: '/widgets/jobs',
    color: 'emerald',
  },
  {
    name: 'Site Display',
    description: 'Logo and banner placement across relevant SpaceNexus pages — market intelligence, jobs, and news sections.',
    cta: 'Sponsorships open',
    color: 'amber',
  },
];

const audienceDemographics = [
  {
    icon: (
      <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1m0 0L11.42 4.97m-5.1 5.1h14.25M4.5 19.5h15" />
      </svg>
    ),
    title: 'Space Engineers',
    description: 'Systems, propulsion, thermal, and communications engineers building spacecraft and space systems.',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
      </svg>
    ),
    title: 'Executives & Decision-Makers',
    description: 'C-suite leaders, VPs, and directors from aerospace companies making procurement and strategy decisions.',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18v-.008zm-12 0h.008v.008H6v-.008z" />
      </svg>
    ),
    title: 'Investors & Analysts',
    description: 'Venture capitalists, private equity analysts, and financial professionals focused on the space economy.',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
      </svg>
    ),
    title: 'Government Professionals',
    description: 'Program managers, contracting officers, and policy staff from NASA, DoD, Space Force, and allied agencies.',
  },
];

const CARD_ACCENTS: Record<string, string> = {
  cyan: 'from-cyan-400 to-blue-500',
  purple: 'from-purple-400 to-fuchsia-500',
  emerald: 'from-emerald-400 to-teal-500',
  amber: 'from-amber-400 to-orange-500',
};

export default async function AdvertisePage() {
  const { activeJobs, companies } = await getLiveCounts();

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0a0a0a] to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero */}
        <AnimatedPageHeader
          title="Advertise on SpaceNexus"
          subtitle="A media kit for sponsoring space industry intelligence"
          accentColor="emerald"
        />

        <ScrollReveal className="mt-4 mb-16">
          <p className="text-center text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Space engineers, executives, investors, analysts, and government professionals rely on SpaceNexus
            for industry intelligence. Below is what&apos;s available to sponsor — no traffic or subscriber
            numbers are published here; those are shared directly on request.
          </p>
        </ScrollReveal>

        {/* Live audience stats — SITE_STATS + live DB counts only */}
        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-4" staggerDelay={0.1}>
          <StaggerItem>
            <div className="card p-6 text-center">
              <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-300 to-blue-500 bg-clip-text text-transparent">
                {companies != null ? companies.toLocaleString() : SITE_STATS.companies}
              </p>
              <p className="text-sm text-slate-400 mt-2 font-medium">Company Profiles</p>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card p-6 text-center">
              <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-300 to-blue-500 bg-clip-text text-transparent">
                {activeJobs != null ? activeJobs.toLocaleString() : SITE_STATS.jobListings}
              </p>
              <p className="text-sm text-slate-400 mt-2 font-medium">Live Job Listings</p>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card p-6 text-center">
              <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-300 to-blue-500 bg-clip-text text-transparent">
                {SITE_STATS.newsFeeds}
              </p>
              <p className="text-sm text-slate-400 mt-2 font-medium">News Feeds Ingested</p>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card p-6 text-center">
              <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-300 to-blue-500 bg-clip-text text-transparent">
                {SITE_STATS.dataSources}
              </p>
              <p className="text-sm text-slate-400 mt-2 font-medium">Named Data Sources</p>
            </div>
          </StaggerItem>
        </StaggerContainer>

        <ScrollReveal className="mb-16">
          <p className="text-center text-sm text-slate-500 max-w-2xl mx-auto">
            Traffic, session, and subscriber metrics are shared directly with sponsors on request.
          </p>
        </ScrollReveal>

        {/* What's available to sponsor */}
        <ScrollReveal className="mb-4">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-2 text-center">
            What&apos;s Available to Sponsor
          </h2>
          <p className="text-slate-400 text-center mb-8 max-w-2xl mx-auto">
            Sponsorships are open. Pricing is still in research — inquire below and our team will follow up
            with options and a tailored proposal.
          </p>
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16" staggerDelay={0.12}>
          {sponsorshipOptions.map((option) => (
            <StaggerItem key={option.name}>
              <div className="card p-8 h-full flex flex-col">
                <h3 className="text-xl font-bold text-white mb-2">{option.name}</h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-6 flex-1">{option.description}</p>
                {option.href ? (
                  <Link
                    href={option.href}
                    className={`inline-flex items-center gap-2 text-sm font-semibold bg-gradient-to-r ${CARD_ACCENTS[option.color]} bg-clip-text text-transparent`}
                  >
                    {option.cta} →
                  </Link>
                ) : (
                  <a
                    href="#contact"
                    className={`inline-flex items-center gap-2 text-sm font-semibold bg-gradient-to-r ${CARD_ACCENTS[option.color]} bg-clip-text text-transparent`}
                  >
                    {option.cta} →
                  </a>
                )}
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Why Advertise With Us */}
        <ScrollReveal className="mb-4">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-2 text-center">
            Who You&apos;ll Reach
          </h2>
          <p className="text-slate-400 text-center mb-8 max-w-2xl mx-auto">
            SpaceNexus is built for the full space industry value chain — from engineers to investors.
          </p>
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16" staggerDelay={0.12}>
          {audienceDemographics.map((demo) => (
            <StaggerItem key={demo.title}>
              <div className="card p-6 h-full">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center">
                    {demo.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{demo.title}</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">{demo.description}</p>
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Contact Form */}
        <ScrollReveal className="mb-16">
          <div className="max-w-2xl mx-auto" id="contact">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-2 text-center">
              Sponsorships Open — Inquire
            </h2>
            <p className="text-slate-400 text-center mb-8">
              Tell us about your sponsorship goals and our team will reach out with options. Pricing is still
              in research, so proposals are tailored per conversation.
            </p>
            <AdvertiseInquiryForm />
          </div>
        </ScrollReveal>

        <RelatedModules modules={PAGE_RELATIONS['advertise']} />
      </div>
    </div>
  );
}
