import { Metadata } from 'next';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';

export const metadata: Metadata = {
  title: 'Space for Beginners',
  description: 'New to space? Start here. Learn the basics of satellites, rockets, orbits, and the space industry — with links to deeper content on SpaceNexus.',
  alternates: { canonical: 'https://spacenexus.us/beginners' },
};

export const revalidate = 86400;

const topics = [
  {
    title: 'Watch a Rocket Launch',
    description: 'See upcoming launches with real-time countdowns. Get notified before liftoff.',
    href: '/mission-control',
    icon: '🚀',
    articles: [
      { label: 'Beginner\'s Guide to Watching Launches', href: '/blog/beginner-guide-watching-rocket-launches' },
      { label: 'SpaceX Starship Explained', href: '/blog/spacex-starship-complete-guide-2026' },
    ],
  },
  {
    title: 'Spot a Satellite',
    description: 'Track the ISS and 10,000+ satellites. Learn when they\'re visible from your location.',
    href: '/satellite-spotting',
    icon: '🛰️',
    articles: [
      { label: 'Satellite Spotting Guide', href: '/satellite-spotting' },
      { label: 'How Many Satellites Are in Space?', href: '/blog/how-many-satellites-in-space-2026' },
    ],
  },
  {
    title: 'Check the Aurora',
    description: 'See if the Northern Lights are visible tonight based on real solar data.',
    href: '/aurora-forecast',
    icon: '🌌',
    articles: [
      { label: 'Space Weather Dashboard', href: '/space-weather' },
      { label: 'How Space Weather Affects Technology', href: '/blog/space-weather-impact-technology-infrastructure' },
    ],
  },
  {
    title: 'Learn Space History',
    description: 'What happened in space on this day? Explore milestones from Sputnik to Starship.',
    href: '/this-day-in-space',
    icon: '📅',
    articles: [
      { label: 'Space Timeline', href: '/timeline' },
      { label: 'The Artemis Program Explained', href: '/blog/artemis-program-explained-return-to-moon' },
    ],
  },
  {
    title: 'Understand the Industry',
    description: 'Learn about the $630B space economy, who the major players are, and where it\'s going.',
    href: '/space-economy',
    icon: '📊',
    articles: [
      { label: 'What Is NewSpace?', href: '/blog/what-is-new-space-commercial-space-revolution' },
      { label: 'Space Economy Value Chain', href: '/blog/space-economy-value-chain-2026' },
    ],
  },
  {
    title: 'Test Your Knowledge',
    description: 'Take the daily space quiz and learn something new every day.',
    href: '/dashboard',
    icon: '🧠',
    articles: [
      { label: 'Space Glossary (69 terms)', href: '/glossary' },
      { label: 'Space Acronyms (126+ entries)', href: '/acronyms' },
    ],
  },
];

export default function BeginnersPage() {
  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        <AnimatedPageHeader
          title="Space for Beginners"
          subtitle="New to space? Start here."
          icon="🔭"
          accentColor="purple"
        >
          <Link href="/discover" className="btn-secondary text-sm py-2 px-4">
            Discover More
          </Link>
        </AnimatedPageHeader>

        <div className="max-w-4xl mx-auto space-y-6">
          {topics.map((topic) => (
            <ScrollReveal key={topic.title}>
              <div className="card p-5 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-start gap-4">
                  <span className="text-3xl shrink-0">{topic.icon}</span>
                  <div className="flex-1">
                    <Link href={topic.href} className="group">
                      <h2 className="text-lg font-semibold text-white group-hover:text-cyan-300 transition-colors">
                        {topic.title}
                      </h2>
                    </Link>
                    <p className="text-slate-400 text-sm mt-1">{topic.description}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Link
                        href={topic.href}
                        className="text-xs px-3 py-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition-colors"
                      >
                        Open Tool
                      </Link>
                      {topic.articles.map((article) => (
                        <Link
                          key={article.href}
                          href={article.href}
                          className="text-xs px-3 py-1.5 bg-white/[0.04] text-slate-400 border border-white/[0.06] rounded-lg hover:text-white hover:border-white/[0.12] transition-colors"
                        >
                          {article.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}

          {/* CTA */}
          <ScrollReveal>
            <div className="text-center mt-8">
              <p className="text-slate-400 text-sm mb-4">Want the full experience?</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/register" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors">
                  Create Free Account
                </Link>
                <Link href="/app" className="text-sm text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                  Get the Android App
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
