import { Metadata } from 'next';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';

export const metadata: Metadata = {
  title: 'Get the App - SpaceNexus on Google Play',
  description: 'Download SpaceNexus for Android on Google Play. Track rocket launches, satellite orbits, market data, and space weather on the go. Free to install.',
  alternates: { canonical: 'https://spacenexus.us/app' },
  openGraph: {
    title: 'Get the SpaceNexus App',
    description: 'Your space industry intelligence platform — now on Android. Free on Google Play.',
    url: 'https://spacenexus.us/app',
  },
};

export const revalidate = 86400;

const appFeatures = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.841m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      </svg>
    ),
    title: 'Live Launch Tracking',
    description: 'Real-time countdowns, live streams, and mission status for every orbital launch worldwide.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
    title: 'Satellite Tracker',
    description: 'Track 10,000+ satellites including Starlink, ISS, and classified payloads in real time.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: 'Market Intelligence',
    description: 'Space stocks, funding rounds, M&A deals, and industry trends at your fingertips.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
      </svg>
    ),
    title: 'Space Weather',
    description: 'Solar flare alerts, geomagnetic storm tracking, and aurora forecasts with push notifications.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
      </svg>
    ),
    title: 'News & Analysis',
    description: '160+ articles, AI insights, daily digests, and aggregated news from 12+ RSS feeds.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
    title: 'Push Notifications',
    description: 'Get alerted for upcoming launches, breaking news, and space weather events in real time.',
  },
];

const requirements = [
  { label: 'Android', value: '5.0+ (Lollipop)' },
  { label: 'Size', value: '~3.4 MB install' },
  { label: 'Price', value: 'Free (with optional Pro upgrade)' },
  { label: 'Category', value: 'Business / News' },
  { label: 'Content Rating', value: 'Everyone' },
  { label: 'Permissions', value: 'Internet, Notifications (optional)' },
];

export default function AppDownloadPage() {
  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        <AnimatedPageHeader
          title="Get SpaceNexus"
          subtitle="Space industry intelligence in your pocket"
          icon="📱"
          accentColor="cyan"
        />

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Hero Download Card */}
          <ScrollReveal>
            <div className="card p-8 text-center border border-cyan-500/20 relative overflow-hidden">
              {/* Background glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="relative">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                  <svg className="w-10 h-10 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                  </svg>
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">SpaceNexus for Android</h2>
                <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
                  Track launches, satellites, markets, and space weather. Your comprehensive
                  space intelligence hub — free on Google Play.
                </p>

                {/* Google Play Badge */}
                <a
                  href="https://play.google.com/store/apps/details?id=com.spacenexus.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-6 py-3.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-semibold text-base transition-all duration-200 hover:shadow-lg hover:shadow-white/10 active:scale-[0.98]"
                >
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.4l2.453 1.42a1 1 0 010 1.546l-2.453 1.42-2.537-2.386 2.537-2zm-3.906-2.093L5.157 1.58l10.937 6.333-2.302 2.301z" />
                  </svg>
                  <div className="text-left">
                    <div className="text-[10px] uppercase tracking-wider opacity-70 leading-none">Get it on</div>
                    <div className="text-lg leading-tight -mt-0.5">Google Play</div>
                  </div>
                </a>

                <p className="text-slate-500 text-xs mt-4">
                  Also available as a <Link href="/getting-started" className="text-cyan-400/70 hover:text-cyan-400 underline">web app</Link> — install from any browser
                </p>
              </div>
            </div>
          </ScrollReveal>

          {/* App Features Grid */}
          <ScrollReveal>
            <div className="card p-6">
              <h2 className="text-xl font-semibold bg-gradient-to-r from-slate-300 to-cyan-400 bg-clip-text text-transparent mb-6">
                What You Get
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {appFeatures.map((feature) => (
                  <div key={feature.title} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0 text-cyan-400">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="text-white text-sm font-medium">{feature.title}</h3>
                      <p className="text-slate-500 text-xs leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Screenshots placeholder */}
          <ScrollReveal>
            <div className="card p-6">
              <h2 className="text-xl font-semibold bg-gradient-to-r from-slate-300 to-blue-400 bg-clip-text text-transparent mb-6">
                Screenshots
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className="shrink-0 w-48 h-[400px] rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.06] flex items-center justify-center snap-start overflow-hidden"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/play-store/nb-phone-screenshot-${n}.png`}
                      alt={`SpaceNexus app screenshot ${n}`}
                      className="w-full h-full object-cover rounded-2xl"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Requirements */}
          <ScrollReveal>
            <div className="card p-6">
              <h2 className="text-xl font-semibold bg-gradient-to-r from-slate-300 to-green-400 bg-clip-text text-transparent mb-4">
                App Details
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {requirements.map((req) => (
                  <div key={req.label} className="p-3 rounded-lg bg-white/[0.02]">
                    <p className="text-slate-500 text-xs mb-0.5">{req.label}</p>
                    <p className="text-white text-sm font-medium">{req.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Data Safety Link */}
          <ScrollReveal>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
              <Link href="/data-safety" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                Data Safety Information
              </Link>
              <span className="hidden sm:inline text-white/10">|</span>
              <Link href="/privacy" className="text-slate-400 hover:text-slate-300 underline underline-offset-2">
                Privacy Policy
              </Link>
              <span className="hidden sm:inline text-white/10">|</span>
              <Link href="/terms" className="text-slate-400 hover:text-slate-300 underline underline-offset-2">
                Terms of Service
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
