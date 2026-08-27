import type { Metadata } from 'next';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';

// Community hub — Phase 2 of the 2026-08 consolidation.
//
// The forums, professional directory, direct messaging, mentorship, study
// groups, AMAs and speaking board are built but had zero usage ever, so they
// are mothballed (see src/lib/mothballed-routes.ts) until the audience
// exists. This page is the honest front door: it says what's staged, and
// points at the places where the community actually gathers today. It used
// to fetch member/thread/post counts — those are all zero, so no stats bar.

export const metadata: Metadata = {
  title: 'Community Hub | SpaceNexus',
  description:
    'Where the SpaceNexus community gathers today — Space Tycoon corporations, the M/Th Digest, and the feedback line — and what is staged for launch as the community grows.',
};

const LIVE_NOW = [
  {
    title: 'Space Tycoon',
    description:
      'The living multiplayer economy. Found a corporation, climb the leaderboard, and compete on the same map as every other player in Epoch 2.',
    href: '/space-tycoon',
    cta: 'Enter the command center',
    accent: 'from-cyan-500/20 to-purple-500/20',
    border: 'hover:border-cyan-500/30',
  },
  {
    title: 'Corporate Leaderboard',
    description:
      'Public standings for every player corporation — net worth, growth, and rank. The rivalry board of the game.',
    href: '/space-tycoon/leaderboard',
    cta: 'See the standings',
    accent: 'from-amber-500/20 to-orange-500/20',
    border: 'hover:border-amber-500/30',
  },
  {
    title: 'M/Th Digest',
    description:
      'The twice-weekly briefing that most of the community reads. Launches, deals, policy, and the week’s delta — Mondays and Thursdays.',
    href: '/newsletter',
    cta: 'Subscribe',
    accent: 'from-emerald-500/20 to-teal-500/20',
    border: 'hover:border-emerald-500/30',
  },
  {
    title: 'Feedback Line',
    description:
      'Every message is read by a person and answered. Feature requests, corrections, and ideas shape the roadmap directly.',
    href: '/feedback',
    cta: 'Send feedback',
    accent: 'from-white/5 to-blue-500/20',
    border: 'hover:border-white/10',
  },
];

const STAGED = [
  'Discussion forums by topic',
  'Professional directory and profiles',
  'Direct messaging',
  'Mentorship matching',
  'Study groups',
  'Live AMAs and office hours',
  'Speaking-opportunity board',
];

export default function CommunityPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatedPageHeader
          title="Community Hub"
          subtitle="Where the space community gathers on SpaceNexus today — and what's staged for launch as it grows."
          icon={<span>{'\u{1F465}'}</span>}
        />

        {/* Live now */}
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Live now</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {LIVE_NOW.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className={`card p-6 group relative overflow-hidden transition-transform hover:-translate-y-1 ${item.border}`}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className={`absolute inset-0 bg-gradient-to-br ${item.accent}`} />
              </div>
              <div className="relative z-10">
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{item.description}</p>
                <div className="mt-4 flex items-center text-sm text-white/70 font-medium">
                  {item.cta}
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Staged */}
        <div className="card p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-white mb-2">Staged for launch</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                These community features are built and waiting. We&apos;re holding them until there are
                enough of you here for a forum thread to get a reply and a mentor request to get a match —
                an empty forum is worse than no forum. When they open, they open for everyone at once, free.
              </p>
              <p className="text-sm text-slate-400 leading-relaxed mt-3">
                Want one of these sooner? Say so on the{' '}
                <Link href="/feedback" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                  feedback line
                </Link>
                — demand is exactly what moves an item off this list.
              </p>
            </div>
            <ul className="md:w-72 grid grid-cols-1 gap-2 text-sm text-slate-300">
              {STAGED.map((s) => (
                <li key={s} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 flex-shrink-0" aria-hidden="true" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Community standards apply everywhere on SpaceNexus, including the game.{' '}
          <Link href="/community/guidelines" className="text-slate-400 hover:text-white underline underline-offset-2">
            Read the guidelines
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
