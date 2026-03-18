'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import SocialShare from '@/components/ui/SocialShare';

/* ─── Animated Counter Hook ─────────────────────────────────────────────── */
function useAnimatedCounter(target: number, duration = 1800, prefix = '', suffix = '') {
  const [display, setDisplay] = useState(`${prefix}0${suffix}`);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const start = performance.now();

          const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(eased * target);

            if (current >= 1000) {
              setDisplay(`${prefix}${current.toLocaleString()}${suffix}`);
            } else {
              setDisplay(`${prefix}${current}${suffix}`);
            }

            if (progress < 1) requestAnimationFrame(animate);
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration, prefix, suffix]);

  return { ref, display };
}

/* ─── Stat Card Component ───────────────────────────────────────────────── */
function StatCard({
  number,
  label,
  description,
  source,
  year,
  color = 'blue',
}: {
  number: string;
  label: string;
  description: string;
  source: string;
  year: string;
  color?: 'blue' | 'green' | 'purple' | 'amber' | 'rose' | 'cyan' | 'indigo' | 'emerald';
}) {
  const colorMap = {
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/20',
    green: 'from-green-500/20 to-green-600/5 border-green-500/20',
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/20',
    amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/20',
    rose: 'from-rose-500/20 to-rose-600/5 border-rose-500/20',
    cyan: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/20',
    indigo: 'from-indigo-500/20 to-indigo-600/5 border-indigo-500/20',
    emerald: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20',
  };

  const textColorMap = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    purple: 'text-purple-400',
    amber: 'text-amber-400',
    rose: 'text-rose-400',
    cyan: 'text-cyan-400',
    indigo: 'text-indigo-400',
    emerald: 'text-emerald-400',
  };

  return (
    <div className={`relative rounded-xl border bg-gradient-to-br ${colorMap[color]} p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20`}>
      <div className={`text-2xl sm:text-3xl font-bold ${textColorMap[color]} mb-1`}>{number}</div>
      <div className="text-white font-medium text-sm mb-2">{label}</div>
      <p className="text-slate-400 text-xs leading-relaxed mb-3">{description}</p>
      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-white/[0.06]">
        <span>{source}</span>
        <span>{year}</span>
      </div>
    </div>
  );
}

/* ─── Hero Stat (Large Animated) ────────────────────────────────────────── */
function HeroStat({
  target,
  prefix,
  suffix,
  label,
  color = 'blue',
}: {
  target: number;
  prefix?: string;
  suffix?: string;
  label: string;
  color?: 'blue' | 'green' | 'purple' | 'amber' | 'rose' | 'cyan';
}) {
  const { ref, display } = useAnimatedCounter(target, 2000, prefix, suffix);

  const textColorMap = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    purple: 'text-purple-400',
    amber: 'text-amber-400',
    rose: 'text-rose-400',
    cyan: 'text-cyan-400',
  };

  const bgMap = {
    blue: 'bg-blue-500/10 border-blue-500/20',
    green: 'bg-green-500/10 border-green-500/20',
    purple: 'bg-purple-500/10 border-purple-500/20',
    amber: 'bg-amber-500/10 border-amber-500/20',
    rose: 'bg-rose-500/10 border-rose-500/20',
    cyan: 'bg-cyan-500/10 border-cyan-500/20',
  };

  return (
    <div className={`text-center p-6 rounded-xl border ${bgMap[color]} transition-transform duration-300 hover:scale-105`}>
      <div ref={ref} className={`text-3xl sm:text-4xl lg:text-5xl font-bold ${textColorMap[color]} mb-2 tabular-nums`}>
        {display}
      </div>
      <div className="text-slate-300 text-sm font-medium">{label}</div>
    </div>
  );
}

/* ─── Section Header ────────────────────────────────────────────────────── */
function SectionHeader({ icon, title, id }: { icon: string; title: string; id: string }) {
  return (
    <div className="flex items-center gap-3 mb-6" id={id}>
      <span className="text-2xl">{icon}</span>
      <h2 className="text-xl sm:text-2xl font-bold text-white">{title}</h2>
      <div className="h-px flex-1 bg-white/[0.08]" />
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */
export default function SpaceStatsPage() {
  const relatedModules = PAGE_RELATIONS['space-stats'] || [];

  const tocSections = [
    { id: 'market-size', label: 'Market Size' },
    { id: 'launch-stats', label: 'Launch Statistics' },
    { id: 'satellite-stats', label: 'Satellites' },
    { id: 'government-spending', label: 'Government Spending' },
    { id: 'workforce', label: 'Workforce' },
    { id: 'investment', label: 'Investment' },
    { id: 'revenue', label: 'Revenue Breakdown' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute top-40 right-1/4 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 py-16 sm:py-20 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
              <span className="text-blue-400 text-xs font-medium uppercase tracking-wider">Comprehensive Reference</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-4 tracking-tight">
              Space Industry Statistics{' '}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">&amp; Facts 2026</span>
            </h1>
            <p className="text-slate-400 text-lg sm:text-xl max-w-3xl mx-auto mb-4">
              The definitive collection of space industry data, market figures, and key metrics.
              Updated regularly with the latest available statistics.
            </p>
            <p className="text-slate-500 text-sm mb-4">
              Last updated: March 2026 | Sources include Space Foundation, SIA, Bryce Tech, Euroconsult, FAA, NASA
            </p>
            <SocialShare
              title="Space Industry Statistics & Facts 2026 - SpaceNexus"
              url="https://spacenexus.us/space-stats"
              description="The definitive collection of space industry data: $626B market, 230+ launches, 10,000+ satellites, and more."
            />
          </div>

          {/* Hero Stats - Animated Counters */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-12 max-w-6xl mx-auto">
            <HeroStat target={626} prefix="$" suffix="B" label="Market Size (2025)" color="blue" />
            <HeroStat target={230} suffix="+" label="Orbital Launches (2024)" color="green" />
            <HeroStat target={10000} suffix="+" label="Active Satellites" color="purple" />
            <HeroStat target={95} prefix="$" suffix="B+" label="Gov. Spending" color="amber" />
            <HeroStat target={360} suffix="K+" label="US Workforce" color="rose" />
            <HeroStat target={10} prefix="$" suffix="B+" label="Annual VC" color="cyan" />
          </div>
        </div>
      </section>

      {/* Table of Contents */}
      <div className="container mx-auto px-4 mb-12">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 max-w-3xl mx-auto">
          <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">Jump to Section</h3>
          <div className="flex flex-wrap gap-2">
            {tocSections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="text-sm text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 rounded-lg transition-colors"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Market Size Section ────────────────────────────────────────── */}
      <section className="container mx-auto px-4 mb-16">
        <SectionHeader icon="💰" title="Space Economy Market Size" id="market-size" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            number="$626B"
            label="Global Space Economy (2025)"
            description="Total revenue generated by the global space economy including satellite services, ground equipment, launch services, and government budgets."
            source="Space Foundation"
            year="2025"
            color="blue"
          />
          <StatCard
            number="$1T+"
            label="Projected Market Size by 2034"
            description="Multiple analysts project the space economy will exceed $1 trillion by the early-to-mid 2030s, driven by satellite broadband, Earth observation, and commercial space stations."
            source="Morgan Stanley / BofA"
            year="2034 projection"
            color="blue"
          />
          <StatCard
            number="$1.8T"
            label="Projected Market Size by 2035"
            description="The most aggressive estimates project $1.8 trillion by 2035, factoring in space tourism, in-space manufacturing, and cislunar economic activity."
            source="Space Foundation"
            year="2035 projection"
            color="blue"
          />
          <StatCard
            number="9%"
            label="Annual Growth Rate (CAGR)"
            description="The space economy is growing approximately 9% per year, outpacing global GDP growth. Commercial space is growing even faster at 12-15% CAGR."
            source="Euroconsult"
            year="2020-2025"
            color="green"
          />
          <StatCard
            number="78%"
            label="Commercial Share of Space Economy"
            description="Commercial activities now account for approximately 78% of the global space economy, up from ~60% a decade ago. Government spending represents the remaining 22%."
            source="Space Foundation"
            year="2025"
            color="purple"
          />
          <StatCard
            number="$14B"
            label="Launch Services Market"
            description="The launch services market reached approximately $14 billion in 2025, with SpaceX commanding over 60% market share by launch count."
            source="Bryce Tech"
            year="2025"
            color="amber"
          />
        </div>
      </section>

      {/* ─── Launch Stats Section ───────────────────────────────────────── */}
      <section className="container mx-auto px-4 mb-16">
        <SectionHeader icon="🚀" title="Launch Statistics" id="launch-stats" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            number="230+"
            label="Orbital Launches (2024)"
            description="Over 230 orbital launch attempts globally in 2024, more than double the pace of five years ago. This represents an all-time annual record."
            source="Space Launch Report"
            year="2024"
            color="green"
          />
          <StatCard
            number="96%"
            label="Overall Launch Success Rate"
            description="The global orbital launch success rate has reached approximately 96%, reflecting improvements in vehicle reliability and manufacturing quality."
            source="FAA / AST"
            year="2024"
            color="green"
          />
          <StatCard
            number="130+"
            label="SpaceX Falcon 9 Launches"
            description="SpaceX alone launched over 130 Falcon 9 missions in 2024, achieving unprecedented reuse cadence with individual boosters flying 20+ times."
            source="SpaceX"
            year="2024"
            color="green"
          />
          <StatCard
            number="60%+"
            label="SpaceX Global Launch Share"
            description="SpaceX commands over 60% of global launch market share by launch count, and an even higher share of commercial payload mass to orbit."
            source="Bryce Tech"
            year="2024"
            color="emerald"
          />
          <StatCard
            number="$2,720/kg"
            label="Average LEO Launch Cost (Falcon 9)"
            description="SpaceX Falcon 9 has driven LEO launch costs to approximately $2,720/kg, down from $54,500/kg on the Space Shuttle. Starship targets under $100/kg."
            source="SpaceX / Industry Est."
            year="2025"
            color="emerald"
          />
          <StatCard
            number="15+"
            label="Active Launch Providers"
            description="Over 15 active orbital launch providers worldwide including SpaceX, ULA, Arianespace, ISRO, CASC, Rocket Lab, Roscosmos, and Mitsubishi."
            source="Bryce Tech"
            year="2024"
            color="emerald"
          />
        </div>
      </section>

      {/* ─── Satellite Stats Section ────────────────────────────────────── */}
      <section className="container mx-auto px-4 mb-16">
        <SectionHeader icon="🛰️" title="Satellite Statistics" id="satellite-stats" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            number="10,000+"
            label="Active Satellites in Orbit"
            description="Over 10,000 active satellites are currently operating in Earth orbit, a number that has more than tripled since 2019 due to mega-constellation deployments."
            source="UCS Satellite Database"
            year="2025"
            color="purple"
          />
          <StatCard
            number="6,000+"
            label="Starlink Satellites (Active)"
            description="SpaceX Starlink is the largest satellite constellation in history with over 6,000 operational satellites providing broadband internet in 70+ countries."
            source="SpaceX"
            year="2025"
            color="purple"
          />
          <StatCard
            number="2,800+"
            label="Satellites Launched Per Year"
            description="Approximately 2,800 satellites were deployed in 2024, with Starlink accounting for the majority. The pace is expected to accelerate with Kuiper and Starship."
            source="Bryce Tech"
            year="2024"
            color="purple"
          />
          <StatCard
            number="58%"
            label="LEO Constellation Share"
            description="Low Earth Orbit constellations now represent approximately 58% of all active satellites, up from less than 10% a decade ago. GEO satellites now represent less than 6%."
            source="SIA"
            year="2025"
            color="indigo"
          />
          <StatCard
            number="$40B"
            label="Satellite Broadband Revenue (2030 Est.)"
            description="Satellite broadband revenue is projected to reach $40 billion by 2030, driven by Starlink, Amazon Kuiper, and OneWeb serving underserved and maritime markets."
            source="Euroconsult"
            year="2030 projection"
            color="indigo"
          />
          <StatCard
            number="3,236"
            label="Amazon Kuiper Planned Satellites"
            description="Amazon's Project Kuiper plans to deploy 3,236 satellites for broadband internet, with initial launches beginning in 2025-2026 aboard Atlas V, Vulcan, and New Glenn."
            source="Amazon / FCC Filing"
            year="2025"
            color="indigo"
          />
        </div>
      </section>

      {/* ─── Government Spending Section ────────────────────────────────── */}
      <section className="container mx-auto px-4 mb-16">
        <SectionHeader icon="🏛️" title="Government Space Spending" id="government-spending" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            number="$95B+"
            label="Global Government Space Spending"
            description="Governments worldwide spent over $95 billion on space programs in 2024, with the United States accounting for roughly half of that total."
            source="Euroconsult"
            year="2024"
            color="amber"
          />
          <StatCard
            number="$25.4B"
            label="NASA Annual Budget"
            description="NASA's annual budget is approximately $25.4 billion (FY2025), funding Artemis lunar exploration, ISS operations, planetary science, and commercial partnerships."
            source="NASA"
            year="FY2025"
            color="amber"
          />
          <StatCard
            number="$29.4B"
            label="US Space Force & NRO Budget"
            description="Combined U.S. military and intelligence space budgets exceed $29 billion, funding missile warning, GPS, communications, and space domain awareness."
            source="DoD / ODNI"
            year="FY2025"
            color="amber"
          />
          <StatCard
            number="70+"
            label="National Space Agencies"
            description="Over 70 countries now have national space agencies or space programs, though only about 15 have indigenous launch capability."
            source="OECD Space Forum"
            year="2024"
            color="rose"
          />
          <StatCard
            number="$12B+"
            label="ESA Budget (2025)"
            description="The European Space Agency budget exceeds $12 billion for 2025, funding Earth observation (Copernicus), Ariane 6, and human spaceflight via ISS."
            source="ESA"
            year="2025"
            color="rose"
          />
          <StatCard
            number="$15B+"
            label="China Space Budget (Est.)"
            description="China's estimated space spending exceeds $15 billion annually, funding the Tiangong space station, Chang'e lunar missions, and an expanding launch cadence."
            source="Euroconsult Est."
            year="2024"
            color="rose"
          />
        </div>
      </section>

      {/* ─── Workforce Section ──────────────────────────────────────────── */}
      <section className="container mx-auto px-4 mb-16">
        <SectionHeader icon="👥" title="Space Workforce Statistics" id="workforce" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            number="360,000+"
            label="US Space Workforce"
            description="The U.S. space industry directly employs over 360,000 people across government, commercial, and defense sectors. This excludes indirect and induced jobs."
            source="Space Foundation"
            year="2024"
            color="rose"
          />
          <StatCard
            number="5%"
            label="Annual Workforce Growth"
            description="The space workforce is growing at approximately 5% annually, outpacing overall aerospace employment growth. Software and data roles are growing even faster."
            source="BLS / Space Foundation"
            year="2023-2024"
            color="rose"
          />
          <StatCard
            number="$115K"
            label="Median Salary (US Space Industry)"
            description="The median salary in the U.S. space industry is approximately $115,000, significantly above the national median. Specialized roles in mission operations and systems engineering command $150K+."
            source="Glassdoor / SpaceNexus Data"
            year="2025"
            color="rose"
          />
          <StatCard
            number="1M+"
            label="Global Space Workforce"
            description="The global space workforce exceeds 1 million people when including all government agencies, commercial companies, and academic research institutions."
            source="OECD"
            year="2024"
            color="cyan"
          />
          <StatCard
            number="42%"
            label="STEM Degree Holders"
            description="Approximately 42% of space industry workers hold STEM graduate degrees (MS or PhD), making it one of the most highly educated workforces in any industry."
            source="AIAA Survey"
            year="2024"
            color="cyan"
          />
          <StatCard
            number="24%"
            label="Women in Space Workforce"
            description="Women represent approximately 24% of the space workforce globally, up from 20% five years ago. Leadership representation remains lower at approximately 15%."
            source="Space Foundation"
            year="2024"
            color="cyan"
          />
        </div>
      </section>

      {/* ─── Investment Section ──────────────────────────────────────────── */}
      <section className="container mx-auto px-4 mb-16">
        <SectionHeader icon="📈" title="Space Investment & Funding" id="investment" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            number="$10B+"
            label="Annual VC Investment"
            description="Venture capital and private equity investment in space companies exceeds $10 billion annually, with 2021 peaking at $15 billion before moderating."
            source="Space Capital"
            year="2024"
            color="cyan"
          />
          <StatCard
            number="500+"
            label="Active Space Startups"
            description="Over 500 venture-backed space startups are active globally, spanning launch, satellites, analytics, in-space manufacturing, debris removal, and more."
            source="Bryce Tech / Space Capital"
            year="2025"
            color="cyan"
          />
          <StatCard
            number="$10B+"
            label="SpaceX Valuation Funding"
            description="SpaceX's latest private valuation exceeds $350 billion, making it the most valuable private company in the world. The company has raised over $10 billion in total funding."
            source="Bloomberg / CNBC"
            year="2025"
            color="cyan"
          />
          <StatCard
            number="15+"
            label="Space SPACs (Completed)"
            description="Over 15 space companies went public via SPAC mergers during 2020-2022, including Rocket Lab, Planet, Spire, and Astra. Most have seen significant post-SPAC stock declines."
            source="CNBC"
            year="2020-2022"
            color="indigo"
          />
          <StatCard
            number="$2.4B"
            label="Sierra Space + Vast Raises (2025)"
            description="Sierra Space ($1.5B) and Vast ($1B) completed billion-dollar funding rounds in 2025, signaling strong investor appetite for commercial space stations."
            source="TechCrunch / SpaceNews"
            year="2025"
            color="indigo"
          />
          <StatCard
            number="35%"
            label="Launch Sector Investment Share"
            description="Launch services attract approximately 35% of space VC investment, followed by satellite communications (25%), Earth observation (15%), and in-space services (10%)."
            source="Space Capital"
            year="2024"
            color="indigo"
          />
        </div>
      </section>

      {/* ─── Revenue Breakdown Section ──────────────────────────────────── */}
      <section className="container mx-auto px-4 mb-16">
        <SectionHeader icon="💵" title="Space Industry Revenue Breakdown" id="revenue" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            number="$130B"
            label="Satellite Services Revenue"
            description="Satellite services including TV distribution, broadband, mobile, and managed network services generate approximately $130 billion annually."
            source="SIA"
            year="2024"
            color="emerald"
          />
          <StatCard
            number="$140B"
            label="Ground Equipment Revenue"
            description="Ground equipment including satellite dishes, GNSS receivers, chipsets, and network equipment generates approximately $140 billion in annual revenue."
            source="SIA"
            year="2024"
            color="emerald"
          />
          <StatCard
            number="$20B"
            label="Satellite Manufacturing Revenue"
            description="Revenue from manufacturing satellites (commercial and government) totals approximately $20 billion annually, driven by mega-constellation production."
            source="SIA"
            year="2024"
            color="emerald"
          />
          <StatCard
            number="$7B"
            label="Earth Observation Market"
            description="The Earth observation data and services market generates approximately $7 billion in revenue, growing at 15% CAGR driven by climate, agriculture, and defense."
            source="Euroconsult"
            year="2024"
            color="blue"
          />
          <StatCard
            number="$300B+"
            label="GNSS Downstream Applications"
            description="GPS, Galileo, BeiDou, and GLONASS underpin over $300 billion in downstream economic activity across transportation, agriculture, logistics, and financial services."
            source="European GNSS Agency"
            year="2024"
            color="blue"
          />
          <StatCard
            number="$2.6B"
            label="Space Tourism Revenue (Est. 2030)"
            description="The space tourism market is projected to reach $2.6 billion by 2030, including suborbital (Blue Origin, Virgin Galactic) and orbital (SpaceX) experiences."
            source="UBS"
            year="2030 projection"
            color="blue"
          />
        </div>
      </section>

      {/* ─── Key Trends Summary ─────────────────────────────────────────── */}
      <section className="container mx-auto px-4 mb-16">
        <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.08] rounded-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-6">Key Trends Shaping the Space Industry</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-400 rounded-full" /> Reusability is Transforming Economics
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                SpaceX has demonstrated over 300 booster landings. Falcon 9 individual boosters have flown 20+ times. Starship, if successful, could drop heavy-lift costs below $100/kg to LEO.
              </p>
            </div>
            <div>
              <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full" /> Mega-Constellations Dominating LEO
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Starlink has over 6,000 satellites and serves 4M+ subscribers. Amazon Kuiper, Telesat Lightspeed, and SDA Transport Layer are deploying thousands more by 2028.
              </p>
            </div>
            <div>
              <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-400 rounded-full" /> Commercial Space Stations on the Horizon
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                With ISS retirement planned for 2030, NASA is funding commercial replacements from Axiom Space, Vast, and Orbital Reef (Blue Origin/Sierra Space). The LEO economy is transitioning.
              </p>
            </div>
            <div>
              <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-400 rounded-full" /> Artemis and the Cislunar Economy
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                NASA&apos;s Artemis program is building a sustained lunar presence with the Gateway station. Commercial lunar landers (Intuitive Machines, Astrobotic) are creating a cislunar services market.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA Section ────────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 mb-16">
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Explore Space Industry Data Live</h2>
          <p className="text-slate-400 text-sm mb-6 max-w-xl mx-auto">
            SpaceNexus aggregates real-time data from 50+ sources. Track launches, markets, satellites, and more with our intelligence platform.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/market-intel"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 text-sm font-medium rounded-lg transition-colors"
            >
              Market Intelligence
            </Link>
            <Link
              href="/space-economy"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/[0.08] hover:bg-white/[0.12] text-white text-sm font-medium rounded-lg transition-colors"
            >
              Space Economy Dashboard
            </Link>
            <Link
              href="/satellites"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/[0.08] hover:bg-white/[0.12] text-white text-sm font-medium rounded-lg transition-colors"
            >
              Satellite Tracker
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Methodology Note ───────────────────────────────────────────── */}
      <section className="container mx-auto px-4 mb-16">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 max-w-3xl mx-auto">
          <h3 className="text-white font-medium text-sm mb-2">Methodology &amp; Sources</h3>
          <p className="text-slate-500 text-xs leading-relaxed">
            Statistics on this page are compiled from publicly available reports by the Space Foundation, Satellite Industry Association (SIA), Bryce Tech, Euroconsult,
            Morgan Stanley, Bank of America, FAA Office of Commercial Space Transportation, NASA, ESA, OECD Space Forum, Space Capital, UCS Satellite Database,
            and company disclosures. Projections are consensus estimates from multiple analysts. All figures are approximate and represent the most recent data available
            at the time of publication. SpaceNexus updates this page regularly as new data becomes available.
          </p>
        </div>
      </section>

      {/* ─── Related Modules ────────────────────────────────────────────── */}
      {relatedModules.length > 0 && (
        <section className="container mx-auto px-4 mb-16">
          <h2 className="text-lg font-bold text-white mb-4">Related Modules</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {relatedModules.map((mod) => (
              <Link
                key={mod.href}
                href={mod.href}
                className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl p-4 transition-colors group"
              >
                <span className="text-xl mb-1 block">{mod.icon}</span>
                <span className="text-white text-sm font-medium group-hover:text-blue-400 transition-colors">{mod.name}</span>
                <span className="text-slate-500 text-xs block">{mod.description}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ─── Schema.org Structured Data ─────────────────────────────────── */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Space Industry Statistics & Facts 2026',
            description: 'Comprehensive space industry statistics covering market size, launches, satellites, government spending, workforce, and investment.',
            url: 'https://spacenexus.us/space-stats',
            publisher: {
              '@type': 'Organization',
              name: 'SpaceNexus',
              url: 'https://spacenexus.us',
            },
            about: {
              '@type': 'Thing',
              name: 'Space Industry',
            },
            mainEntity: {
              '@type': 'Dataset',
              name: 'Space Industry Statistics 2026',
              description: 'Key statistics about the global space industry including market size ($626B), launches (230+), active satellites (10,000+), and workforce (360,000+ US).',
              creator: { '@type': 'Organization', name: 'SpaceNexus' },
            },
          }),
        }}
      />
    </div>
  );
}
