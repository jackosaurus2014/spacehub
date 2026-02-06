import Image from 'next/image';
import { Suspense } from 'react';
import { ModuleContainer } from '@/components/modules';
import { getDefaultModulePreferences } from '@/lib/module-preferences';
import HeroActions from '@/components/HeroActions';
import HeroStats from '@/components/HeroStats';
import NewsletterSignup from '@/components/NewsletterSignup';
import { AdBanner } from '@/components/ads';

// Force dynamic rendering - no static generation at build time
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Get default module configuration for SSR
  const modules = await getDefaultModulePreferences();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Decorative gradient orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-nebula-500/15 rounded-full blur-[128px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-plasma-500/10 rounded-full blur-[128px] pointer-events-none" />

        <div className="absolute inset-0 bg-gradient-to-b from-nebula-500/5 via-transparent to-space-950/50" />
        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="mb-10 w-full">
              <Image
                src="/spacenexus-logo.png"
                alt="SpaceNexus logo"
                width={1200}
                height={600}
                className="w-full h-auto rounded-lg opacity-90"
                priority
              />
            </div>
            <h1 className="text-4xl md:text-display-xl font-display font-bold mb-6">
              <span className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Your Gateway to the</span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">Space Industry</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-200 mb-10 max-w-2xl mx-auto leading-relaxed drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              Stay informed with the latest news, launches, and insights from the
              rapidly evolving space market. Perfect for enthusiasts, investors,
              and industry professionals.
            </p>
            <HeroActions />
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float">
          <div className="w-6 h-10 border-2 border-cyan-400/50 rounded-full flex items-start justify-center p-1.5 shadow-lg shadow-cyan-500/20">
            <div className="w-1.5 h-2.5 bg-cyan-400/70 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Live Stats Section */}
      <section className="py-8 -mt-16 relative z-10">
        <div className="container mx-auto px-4">
          <HeroStats />
        </div>
      </section>

      {/* Modular Content Area */}
      <section className="section-spacer-sm">
        <div className="container mx-auto px-4">
          {/* Section heading with gradient rule */}
          <div className="mb-8 text-center">
            <h2 className="text-display-sm font-display font-bold text-white mb-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Your Dashboard</h2>
            <div className="mx-auto w-24 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />
          </div>
          <ModuleContainer initialModules={modules} />
        </div>
      </section>

      {/* Ad Banner Section */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <AdBanner slot="homepage-banner-1" format="horizontal" />
        </div>
      </section>

      {/* Newsletter CTA Section */}
      <section className="section-spacer">
        <div className="container mx-auto px-4">
          <Suspense fallback={
            <div className="relative card p-10 md:p-16 text-center rounded-3xl glow-border overflow-hidden">
              <div className="animate-pulse">
                <div className="h-8 bg-slate-200 rounded w-3/4 mx-auto mb-4"></div>
                <div className="h-4 bg-slate-200 rounded w-2/3 mx-auto mb-8"></div>
                <div className="h-12 bg-nebula-600/50 rounded-xl w-48 mx-auto"></div>
              </div>
            </div>
          }>
            <NewsletterSignup variant="cta" source="homepage_cta" />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
