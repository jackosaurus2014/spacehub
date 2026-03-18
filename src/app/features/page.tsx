import Link from 'next/link';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { getRelatedModules } from '@/lib/module-relationships';
import SocialShare from '@/components/ui/SocialShare';

/* ─── Module data ────────────────────────────────────────────────────── */

interface ModuleCard {
  icon: string;
  name: string;
  description: string;
  href: string;
  tier?: 'Pro' | 'Enterprise';
}

interface CategorySection {
  id: string;
  title: string;
  description: string;
  modules: ModuleCard[];
}

const CATEGORIES: CategorySection[] = [
  {
    id: 'explore',
    title: 'Explore',
    description: 'Track missions, monitor the space environment, and stay informed with curated news from across the industry.',
    modules: [
      {
        icon: '\uD83D\uDE80',
        name: 'Mission Control',
        description: 'Countdown to launches, mission tracking, event calendar',
        href: '/mission-control',
      },
      {
        icon: '\uD83D\uDCF0',
        name: 'News & Media',
        description: 'Curated space news from 50+ sources, AI categorization',
        href: '/news',
      },
      {
        icon: '\u2600\uFE0F',
        name: 'Solar System Expansion',
        description: 'Planetary exploration, Mars planning, cislunar economy',
        href: '/solar-exploration',
      },
      {
        icon: '\uD83C\uDF0D',
        name: 'Space Environment',
        description: 'Solar weather, debris tracking, conjunction alerts',
        href: '/space-environment',
      },
    ],
  },
  {
    id: 'intelligence',
    title: 'Intelligence',
    description: 'Data-driven market analysis, company profiles, regulatory tracking, and AI-powered insights.',
    modules: [
      {
        icon: '\uD83D\uDCCA',
        name: 'Space Market Intelligence',
        description: 'Market sizing, trends, company profiles, funding data',
        href: '/market-intel',
        tier: 'Pro',
      },
      {
        icon: '\u2696\uFE0F',
        name: 'Regulatory & Compliance',
        description: 'Export controls, ITAR, spectrum management, filings',
        href: '/compliance',
        tier: 'Pro',
      },
      {
        icon: '\uD83E\uDD16',
        name: 'AI Insights',
        description: 'Machine learning analysis of industry developments',
        href: '/ai-insights',
        tier: 'Pro',
      },
      {
        icon: '\uD83D\uDC54',
        name: 'Executive Moves',
        description: 'C-suite tracking across space companies',
        href: '/executive-moves',
        tier: 'Pro',
      },
    ],
  },
  {
    id: 'business',
    title: 'Business',
    description: 'Discover deals, track investments, find talent, and monitor government procurement activity.',
    modules: [
      {
        icon: '\uD83D\uDCBC',
        name: 'Business Opportunities',
        description: 'AI-scored deal flow, procurement, supply chain',
        href: '/business-opportunities',
        tier: 'Pro',
      },
      {
        icon: '\uD83D\uDC65',
        name: 'Space Talent Hub',
        description: 'Jobs, salary benchmarks, workforce analytics',
        href: '/space-talent',
      },
      {
        icon: '\uD83D\uDCB0',
        name: 'Investment Research',
        description: 'Funding rounds, investor directory, deal alerts',
        href: '/space-capital',
        tier: 'Enterprise',
      },
      {
        icon: '\uD83C\uDFC6',
        name: 'Contract Awards',
        description: 'Government procurement, SBIR/STTR tracking',
        href: '/contract-awards',
        tier: 'Pro',
      },
    ],
  },
  {
    id: 'tools',
    title: 'Tools',
    description: 'Engineering calculators, mission simulators, satellite tracking, and data export capabilities.',
    modules: [
      {
        icon: '\uD83E\uDDEE',
        name: 'Mission Planning',
        description: 'Cost simulator, insurance estimator, launch windows',
        href: '/mission-cost',
      },
      {
        icon: '\uD83D\uDEF0\uFE0F',
        name: 'Space Operations',
        description: 'Satellite tracker, orbital calculator, constellation designer',
        href: '/satellites',
      },
      {
        icon: '\uD83D\uDD27',
        name: 'Engineering Calculators',
        description: 'Thermal, radiation, link budget, power budget',
        href: '/tools',
      },
      {
        icon: '\uD83D\uDD0C',
        name: 'Data Export & API',
        description: 'REST API, webhooks, custom dashboards',
        href: '/developer',
        tier: 'Enterprise',
      },
    ],
  },
];

/* ─── Pricing comparison data ────────────────────────────────────────── */

interface PlanRow {
  feature: string;
  explorer: string;
  professional: string;
  enterprise: string;
}

const PLAN_ROWS: PlanRow[] = [
  { feature: 'News articles per day', explorer: '25', professional: 'Unlimited', enterprise: 'Unlimited' },
  { feature: 'Company profiles', explorer: 'Basic', professional: 'Full', enterprise: 'Full + API' },
  { feature: 'Satellite tracking', explorer: 'Limited', professional: 'Full', enterprise: 'Full + Webhooks' },
  { feature: 'AI insights', explorer: '\u2014', professional: '\u2713', enterprise: '\u2713 + Custom' },
  { feature: 'Engineering calculators', explorer: 'Basic', professional: 'All', enterprise: 'All' },
  { feature: 'Export & reports', explorer: '\u2014', professional: 'CSV / PDF', enterprise: 'Full API' },
  { feature: 'Custom dashboards', explorer: '\u2014', professional: '\u2014', enterprise: '\u2713' },
  { feature: 'Priority support', explorer: 'Community', professional: 'Priority', enterprise: 'Dedicated' },
];

/* ─── Page component ─────────────────────────────────────────────────── */

export default function FeaturesPage() {
  const related = getRelatedModules('features');

  return (
    <div className="min-h-screen bg-black">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 pt-16 pb-12 text-center relative z-10">
          <ScrollReveal>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
              Everything You Need for{' '}
              <span className="bg-gradient-to-r from-white/80 to-white/40 bg-clip-text text-transparent">
                Space Industry Intelligence
              </span>
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.15}>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
              30+ modules, one platform &mdash; from mission planning to market analysis,
              satellite tracking to regulatory compliance.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Category Quick Nav ── */}
      <div className="container mx-auto px-4 mb-10">
        <ScrollReveal delay={0.25}>
          <div className="flex flex-wrap justify-center gap-3">
            {CATEGORIES.map((cat) => (
              <a
                key={cat.id}
                href={`#${cat.id}`}
                className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.06] border border-white/[0.06] hover:border-white/15 hover:bg-white/[0.08] transition-all text-sm text-slate-300 hover:text-white"
              >
                <span className="font-medium">{cat.title}</span>
                <span className="text-xs text-slate-500 bg-white/[0.06] px-1.5 py-0.5 rounded-full group-hover:text-white group-hover:bg-white/[0.1] transition-colors">{cat.modules.length}</span>
              </a>
            ))}
          </div>
        </ScrollReveal>
      </div>

      {/* ── Category Sections ── */}
      <div className="container mx-auto px-4 pb-8">
        {CATEGORIES.map((category, idx) => (
          <section key={category.id} id={category.id} className={`mb-16${idx > 0 ? ' content-auto' : ''}`}>
            <ScrollReveal>
              <div className="mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{category.title}</h2>
                <p className="text-slate-400 max-w-2xl">{category.description}</p>
              </div>
            </ScrollReveal>

            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {category.modules.map((mod) => (
                <StaggerItem key={mod.href}>
                  <Link
                    href={mod.href}
                    className="group relative flex flex-col p-5 rounded-xl border border-white/[0.06] bg-white/[0.04] hover:border-white/15 hover:bg-white/[0.06] transition-all h-full"
                  >
                    {mod.tier && (
                      <span
                        className={`absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          mod.tier === 'Enterprise'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-white/8 text-slate-300 border border-white/10'
                        }`}
                      >
                        {mod.tier}
                      </span>
                    )}
                    <span className="text-2xl mb-3 group-hover:scale-110 transition-transform duration-200">{mod.icon}</span>
                    <h3 className="text-base font-semibold text-white group-hover:text-white transition-colors mb-1 flex items-center gap-1.5">
                      {mod.name}
                      <svg className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{mod.description}</p>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </section>
        ))}
      </div>

      {/* ── Plan Comparison Matrix ── */}
      <section className="container mx-auto px-4 pb-20 content-auto">
        <ScrollReveal>
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Compare Plans</h2>
            <p className="text-slate-400">Choose the tier that fits your needs</p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-white/[0.06]">
                  <th className="sticky left-0 bg-white/[0.06] backdrop-blur text-left p-4 text-slate-300 font-medium w-[200px] min-w-[160px] border-b border-white/[0.06]">
                    Feature
                  </th>
                  <th className="p-4 text-center text-slate-300 font-medium border-b border-white/[0.06] min-w-[140px]">
                    <div className="text-white">Explorer</div>
                    <div className="text-xs text-slate-500 mt-0.5">Free</div>
                  </th>
                  <th className="p-4 text-center font-medium border-b border-white/10 min-w-[160px] bg-white/5">
                    <div className="text-slate-300 font-bold">Professional</div>
                    <div className="text-xs text-slate-300/70 mt-0.5">$19.99 / mo</div>
                    <span className="inline-block mt-1 text-[10px] uppercase tracking-wider bg-white/8 text-slate-300 border border-white/10 rounded-full px-2 py-0.5 font-semibold">
                      Most Popular
                    </span>
                  </th>
                  <th className="p-4 text-center text-slate-300 font-medium border-b border-white/[0.06] min-w-[140px]">
                    <div className="text-white">Enterprise</div>
                    <div className="text-xs text-slate-500 mt-0.5">$49.99 / mo</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {PLAN_ROWS.map((row, idx) => (
                  <tr
                    key={row.feature}
                    className={idx % 2 === 0 ? 'bg-black/30' : 'bg-white/[0.04]'}
                  >
                    <td className="sticky left-0 bg-inherit p-4 text-slate-300 font-medium border-b border-white/[0.06]">
                      {row.feature}
                    </td>
                    <td className="p-4 text-center text-slate-400 border-b border-white/[0.06]">
                      <CellValue value={row.explorer} />
                    </td>
                    <td className="p-4 text-center border-b border-white/[0.06] bg-white/[0.02]">
                      <CellValue value={row.professional} highlight />
                    </td>
                    <td className="p-4 text-center text-slate-400 border-b border-white/[0.06]">
                      <CellValue value={row.enterprise} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollReveal>
      </section>

      {/* ── CTA ── */}
      <section className="container mx-auto px-4 pb-20 content-auto">
        <ScrollReveal>
          <div className="text-center rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.06] to-[#0a0a0a]/60 p-10 md:p-16">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Start Building Your Space Intelligence Stack
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto mb-6">
              Whether you are tracking launches, analyzing markets, or planning missions &mdash;
              SpaceNexus has the tools you need.
            </p>
            <p className="text-sm text-slate-500 mb-8">
              No credit card required &bull; 14-day free trial &bull; Cancel anytime
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-3 rounded-lg bg-gradient-to-r from-white/80 to-white/40 hover:from-white hover:to-white/60 text-black font-semibold transition-all shadow-lg shadow-black/15"
              >
                Get Started Free
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-white/[0.1] hover:border-white/[0.15] text-slate-300 hover:text-white font-semibold transition-colors"
              >
                Compare Plans
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ── Share This Page ── */}
      <section className="container mx-auto px-4 pb-8">
        <ScrollReveal>
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl border border-white/[0.06] bg-white/[0.04]">
              <span className="text-sm text-slate-400">Share this page:</span>
              <SocialShare
                title="SpaceNexus Features — Everything You Need for Space Industry Intelligence"
                url="https://spacenexus.us/features"
                description="30+ modules, one platform — from mission planning to market analysis, satellite tracking to regulatory compliance."
              />
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ── Breadcrumb Schema + Related Modules ── */}
      <div className="container mx-auto px-4 pb-16">
        <RelatedModules modules={related} title="Explore More" />
      </div>
    </div>
  );
}

/* ─── Cell value helper ──────────────────────────────────────────────── */

function CellValue({ value, highlight }: { value: string; highlight?: boolean }) {
  if (value === '\u2713') {
    return (
      <span className={highlight ? 'text-slate-300 font-semibold' : 'text-emerald-400'}>
        &#10003;
      </span>
    );
  }
  if (value === '\u2014') {
    return <span className="text-slate-600">&mdash;</span>;
  }
  if (value.startsWith('\u2713 ')) {
    return (
      <span className={highlight ? 'text-white/90' : 'text-slate-300'}>
        <span className={highlight ? 'text-slate-300' : 'text-emerald-400'}>&#10003;</span>{' '}
        {value.slice(2)}
      </span>
    );
  }
  return (
    <span className={highlight ? 'text-white/90 font-medium' : 'text-slate-300'}>{value}</span>
  );
}
