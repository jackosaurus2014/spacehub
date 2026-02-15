import { Suspense } from 'react';
import { ModuleContainer } from '@/components/modules';
import { getDefaultModulePreferences } from '@/lib/module-preferences';
import LandingHero from '@/components/LandingHero';
import LandingValueProp from '@/components/LandingValueProp';
import TrustSignals from '@/components/TrustSignals';
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
      {/* Hero Section with Video Background */}
      <LandingHero />

      {/* Value Proposition Sections */}
      <LandingValueProp />

      {/* Trust Signals & Data Sources */}
      <TrustSignals />

      {/* Live Stats Section */}
      <section className="py-8 relative z-10">
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
            <div className="gradient-line max-w-xs mx-auto" />
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
