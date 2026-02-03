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
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-nebula-500/10 to-transparent" />
        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="mb-8">
              <Image
                src="/spacenexus-logo.png"
                alt="SpaceNexus"
                width={600}
                height={300}
                className="mx-auto w-full max-w-lg h-auto rounded-lg"
                priority
              />
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold mb-6">
              <span className="gradient-text">Your Gateway to the</span>
              <br />
              <span className="text-white">Space Industry</span>
            </h1>
            <p className="text-lg md:text-xl text-star-300 mb-8 max-w-2xl mx-auto">
              Stay informed with the latest news, launches, and insights from the
              rapidly evolving space market. Perfect for enthusiasts, investors,
              and industry professionals.
            </p>
            <HeroActions />
          </div>
        </div>
      </section>

      {/* Modular Content Area */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <ModuleContainer initialModules={modules} />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="card p-8 md:p-12 text-center glow-border">
            <h2 className="text-3xl font-display font-bold text-white mb-4">
              Ready to Stay Ahead?
            </h2>
            <p className="text-star-300 mb-6 max-w-2xl mx-auto">
              Create a free account to personalize your dashboard, save your module preferences,
              and get notified about the space industry updates that matter most to you.
            </p>
            <Link href="/register" className="btn-primary text-lg py-3 px-8">
              Get Started Free
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
