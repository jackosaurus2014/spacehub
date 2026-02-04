import Link from 'next/link';
import Image from 'next/image';
import { ModuleContainer } from '@/components/modules';
import { getDefaultModulePreferences } from '@/lib/module-preferences';
import HeroActions from '@/components/HeroActions';

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
            <div className="mb-10">
              <Image
                src="/spacenexus-logo.png"
                alt="SpaceNexus"
                width={192}
                height={96}
                className="mx-auto w-48 h-auto rounded-lg opacity-90"
                priority
              />
            </div>
            <h1 className="text-4xl md:text-display-xl font-display font-bold mb-6">
              <span className="text-white">Your Gateway to the</span>
              <br />
              <span className="gradient-text">Space Industry</span>
            </h1>
            <p className="text-lg md:text-xl text-star-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              Stay informed with the latest news, launches, and insights from the
              rapidly evolving space market. Perfect for enthusiasts, investors,
              and industry professionals.
            </p>
            <HeroActions />
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float">
          <div className="w-6 h-10 border-2 border-white/20 rounded-full flex items-start justify-center p-1.5">
            <div className="w-1.5 h-2.5 bg-white/40 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Modular Content Area */}
      <section className="section-spacer">
        <div className="container mx-auto px-4">
          {/* Section heading with gradient rule */}
          <div className="mb-12 text-center">
            <h2 className="text-display-sm font-display font-bold text-white mb-4">Your Dashboard</h2>
            <div className="mx-auto w-24 h-px bg-gradient-to-r from-transparent via-nebula-500/50 to-transparent" />
          </div>
          <ModuleContainer initialModules={modules} />
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-spacer">
        <div className="container mx-auto px-4">
          <div className="relative card p-10 md:p-16 text-center rounded-3xl glow-border overflow-hidden">
            {/* Decorative glow orb */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-nebula-500/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="relative">
              <h2 className="text-3xl md:text-display-md font-display font-bold text-white mb-4">
                Ready to Stay Ahead?
              </h2>
              <p className="text-lg text-star-300 mb-8 max-w-2xl mx-auto leading-relaxed">
                Create a free account to personalize your dashboard, save your module preferences,
                and get notified about the space industry updates that matter most to you.
              </p>
              <Link href="/register" className="btn-primary text-base py-4 px-10">
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
