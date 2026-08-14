import Link from 'next/link';
import ArtemisIIBlogClient from './ArtemisIIBlogClient';

export default function ArtemisIIBlogPage() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <section className="pt-8 pb-6 max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Link
              href="/live"
              className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Live Launch Hub
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-sm text-white font-medium">Artemis II Live Blog</span>
            <span className="text-slate-600">/</span>
            <Link
              href="/artemis"
              className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
            >
              Program tracker
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <span className="px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold border border-green-500/30">
              MISSION COMPLETE
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white mb-3 leading-tight">
            Artemis II Live Blog Archive — Real-Time Launch Coverage
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mb-2">
            Mission complete — flown April 1-10, 2026. Four astronauts — Wiseman, Glover,
            Koch, and Hansen — flew around the Moon and returned safely to Earth in a
            historic 10-day mission, the first crewed voyage beyond low Earth orbit since
            Apollo 17. This page preserves our full live-blog coverage from launch to splashdown.
          </p>
          <p className="text-slate-300 text-sm max-w-2xl mb-6 flex items-center gap-1.5">
            <span className="text-cyan-400 font-medium">Next:</span> Artemis III — Earth-orbit HLS demonstration, NET late 2027.
            <Link href="/ignition" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">Track progress</Link>
          </p>

          {/* Quick Links */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Link
              href="/mission-control"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 text-white rounded-lg transition-colors border border-white/[0.08]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              See Next Launch — Artemis III
            </Link>
            <Link
              href="/blog/how-to-watch-artemis-ii-launch-complete-guide"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white/70 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] rounded-lg transition-colors border border-white/[0.06]"
            >
              How We Covered It
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Mission Quick Facts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.04] p-3 text-center">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Launched</div>
              <div className="text-white font-semibold text-sm">Apr 1, 6:24 PM EDT</div>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.04] p-3 text-center">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Duration</div>
              <div className="text-white font-semibold text-sm">10 Days</div>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.04] p-3 text-center">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Crew</div>
              <div className="text-white font-semibold text-sm">4 Astronauts</div>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.04] p-3 text-center">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Vehicle</div>
              <div className="text-white font-semibold text-sm">SLS / Orion</div>
            </div>
          </div>
        </section>

        {/* Live Blog Component */}
        <ArtemisIIBlogClient />

        {/* Related Coverage */}
        <section className="max-w-4xl mx-auto py-8">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            More Artemis II Coverage
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/live"
              className="p-4 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/10 transition-all group"
            >
              <div className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors mb-1">Live Launch Stream</div>
              <p className="text-xs text-slate-400">Watch the launch with real-time telemetry and chat</p>
            </Link>
            <Link
              href="/blog/how-to-watch-artemis-ii-launch-complete-guide"
              className="p-4 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/10 transition-all group"
            >
              <div className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors mb-1">How to Watch: Complete Guide</div>
              <p className="text-xs text-slate-400">Viewing locations, times, and what to expect</p>
            </Link>
            <Link
              href="/blog/artemis-ii-moon-mission-everything-you-need-to-know"
              className="p-4 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/10 transition-all group"
            >
              <div className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors mb-1">Artemis II Mission Guide</div>
              <p className="text-xs text-slate-400">Crew, timeline, spacecraft, and mission objectives</p>
            </Link>
            <Link
              href="/ignition"
              className="p-4 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/10 transition-all group"
            >
              <div className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors mb-1">Ignition Tracker</div>
              <p className="text-xs text-slate-400">NASA&apos;s $20B Moon Base program tracker</p>
            </Link>
            <Link
              href="/mission-control"
              className="p-4 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/10 transition-all group"
            >
              <div className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors mb-1">Mission Control</div>
              <p className="text-xs text-slate-400">All upcoming launches and mission tracking</p>
            </Link>
            <Link
              href="/news"
              className="p-4 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/10 transition-all group"
            >
              <div className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors mb-1">Space News</div>
              <p className="text-xs text-slate-400">Latest space industry headlines</p>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
