import type { Metadata } from 'next';
import Link from 'next/link';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'Careers at SpaceNexus | Join Our Team',
  description: 'Join the SpaceNexus team and help build the premier intelligence platform for the space industry. View open positions and learn about our culture.',
};

const VALUES = [
  {
    icon: '🚀',
    title: 'Mission-Driven',
    description: 'We believe the space industry deserves better tools. Every feature we build helps professionals make better decisions.',
  },
  {
    icon: '🌍',
    title: 'Remote-First',
    description: 'Work from anywhere. Our team spans multiple time zones, united by a shared passion for space and technology.',
  },
  {
    icon: '⚡',
    title: 'Move Fast',
    description: 'We ship weekly. Small team, big impact. Every team member has real ownership over their work.',
  },
  {
    icon: '📊',
    title: 'Data-Obsessed',
    description: 'We aggregate 50+ data sources and build tools that transform raw data into actionable intelligence.',
  },
];


export default function CareersPage() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-white/70 mb-3">
            Careers
          </p>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
            Help Build the Future of Space Intelligence
          </h1>
          <p className="text-lg text-white/70 leading-relaxed">
            SpaceNexus is the premier intelligence platform for the space industry,
            built by a small team that cares deeply about the mission.
          </p>
        </div>

        {/* Values */}
        <div className="stagger-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-20 max-w-5xl mx-auto">
          {VALUES.map((value) => (
            <div key={value.title} className="card p-6 text-center hover:border-white/10 transition-colors group">
              <span className="text-3xl mb-3 block group-hover:scale-110 transition-transform duration-200">{value.icon}</span>
              <h3 className="text-lg font-semibold text-white mb-2">{value.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{value.description}</p>
            </div>
          ))}
        </div>

        {/* Open Positions */}
        <div className="card-elevated p-8 md:p-12 text-center max-w-2xl mx-auto">
          <h2 className="text-2xl font-display font-bold text-white mb-3">
            We&apos;re Not Actively Hiring Right Now
          </h2>
          <p className="text-white/70 mb-6 leading-relaxed">
            SpaceNexus is built and run by a lean, founder-led team, and we don&apos;t have open roles
            posted at the moment. But we&apos;re always interested in hearing from people who are genuinely
            passionate about the space industry &mdash; reach out and tell us how you&apos;d like to
            contribute. We keep resumes on file and follow up as the team grows.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-white to-blue-600 text-white font-semibold hover:from-slate-300 hover:to-blue-500 transition-all duration-200 shadow-lg shadow-black/15"
          >
            Get in Touch
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>

        <RelatedModules modules={PAGE_RELATIONS['careers']} />
      </div>
    </div>
  );
}
