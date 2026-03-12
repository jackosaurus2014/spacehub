import type { Metadata } from 'next';
import Link from 'next/link';

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

const OPEN_ROLES = [
  {
    title: 'Full-Stack Engineer',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
    description: 'Build and scale our Next.js platform serving thousands of space industry professionals.',
  },
  {
    title: 'Space Industry Analyst',
    department: 'Content & Intelligence',
    location: 'Remote',
    type: 'Full-time',
    description: 'Research and write deep-dive analysis on market trends, company profiles, and regulatory changes.',
  },
  {
    title: 'Growth Marketing Manager',
    department: 'Marketing',
    location: 'Remote',
    type: 'Full-time',
    description: 'Drive user acquisition and engagement across the space professional community.',
  },
];

export default function CareersPage() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400 mb-3">
            Careers
          </p>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
            Help Build the Future of Space Intelligence
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed">
            SpaceNexus is the premier intelligence platform for the space industry.
            We&apos;re looking for passionate people to join our mission.
          </p>
          <div className="gradient-line max-w-xs mx-auto mt-6" />
        </div>

        {/* Values */}
        <div className="stagger-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-20 max-w-5xl mx-auto">
          {VALUES.map((value) => (
            <div key={value.title} className="card p-6 text-center hover:border-cyan-500/30 transition-colors group">
              <span className="text-3xl mb-3 block group-hover:scale-110 transition-transform duration-200">{value.icon}</span>
              <h3 className="text-lg font-semibold text-white mb-2">{value.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{value.description}</p>
            </div>
          ))}
        </div>

        {/* Open Positions */}
        <div className="max-w-3xl mx-auto mb-20">
          <h2 className="text-2xl font-display font-bold text-white mb-2 text-center">
            Open Positions
          </h2>
          <p className="text-slate-400 text-center mb-8">
            All roles are remote-friendly. We value talent over location.
          </p>

          <div className="stagger-grid space-y-4">
            {OPEN_ROLES.map((role) => (
              <div key={role.title} className="card p-6 hover:border-cyan-500/30 transition-colors group">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                  <h3 className="text-lg font-semibold text-white group-hover:text-cyan-300 transition-colors">{role.title}</h3>
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {role.department}
                    </span>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-700/50 text-slate-300 border border-slate-600/30">
                      {role.location}
                    </span>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-700/50 text-slate-300 border border-slate-600/30">
                      {role.type}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">{role.description}</p>
                <div className="mt-3 flex items-center gap-1 text-xs text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-medium">
                  Apply for this role
                  <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="card-elevated p-8 md:p-12 text-center max-w-2xl mx-auto">
          <h2 className="text-2xl font-display font-bold text-white mb-3">
            Don&apos;t See Your Role?
          </h2>
          <p className="text-slate-300 mb-6 leading-relaxed">
            We&apos;re always looking for exceptional people passionate about space and technology.
            Send us your resume and tell us how you&apos;d contribute.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold hover:from-cyan-400 hover:to-blue-500 transition-all duration-200 shadow-lg shadow-cyan-500/25"
          >
            Get in Touch
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
