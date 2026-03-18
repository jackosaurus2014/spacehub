'use client';

import { useState, useEffect, useRef } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import MobileValueProp from '@/components/marketing/MobileValueProp';
import QuickFacts from '@/components/ui/QuickFacts';

const SPACE_ECONOMY_FACTS = [
  { value: '$626B', label: 'Global Space Economy (2025)' },
  { value: '6.4%', label: 'Annual Growth Rate (CAGR)' },
  { value: '70+', label: 'National Space Agencies' },
  { value: '10,000+', label: 'Active Satellites in Orbit' },
];

// ── Data ─────────────────────────────────────────────────────
const MARKET_SEGMENTS = [
  { name: 'Satellite Services', size: 184, growth: 6.8, detail: 'TV, broadband, Earth observation, data' },
  { name: 'Ground Equipment', size: 152, growth: 5.2, detail: 'GNSS devices, network equipment, terminals' },
  { name: 'Government Procurement', size: 65, growth: 9.1, detail: 'Defense satellites, national security space' },
  { name: 'Government R&D', size: 55, growth: 7.4, detail: 'NASA, ESA, CNSA exploration & science' },
  { name: 'Satellite Manufacturing', size: 15.8, growth: 12.3, detail: 'Commercial & government spacecraft' },
  { name: 'Launch Services', size: 9.7, growth: 15.6, detail: 'Commercial & government launches' },
  { name: 'In-Space Economy', size: 3.2, growth: 28.5, detail: 'Servicing, tourism, stations (emerging)' },
  { name: 'Space Insurance', size: 0.6, growth: -2.1, detail: 'Launch & in-orbit coverage' },
];

const NATION_BUDGETS = [
  { country: 'United States', budget: 62, flag: '\u{1F1FA}\u{1F1F8}' },
  { country: 'China', budget: 12, flag: '\u{1F1E8}\u{1F1F3}', est: true },
  { country: 'EU / ESA', budget: 8.5, flag: '\u{1F1EA}\u{1F1FA}' },
  { country: 'Russia', budget: 3.6, flag: '\u{1F1F7}\u{1F1FA}' },
  { country: 'Japan', budget: 3.4, flag: '\u{1F1EF}\u{1F1F5}' },
  { country: 'India', budget: 1.6, flag: '\u{1F1EE}\u{1F1F3}' },
  { country: 'South Korea', budget: 0.8, flag: '\u{1F1F0}\u{1F1F7}' },
  { country: 'Others', budget: 5.0, flag: '\u{1F30D}' },
];

const PROJECTIONS = [
  { year: 2024, size: 546, source: 'Space Foundation (actual)' },
  { year: 2027, size: 640, source: 'Space Foundation (est.)' },
  { year: 2030, size: 737, source: 'Space Foundation' },
  { year: 2035, size: 900, source: 'Consensus estimate' },
  { year: 2040, size: 1100, source: 'Morgan Stanley / Goldman Sachs' },
];

const MAX_SEGMENT = Math.max(...MARKET_SEGMENTS.map(s => s.size));
const MAX_BUDGET = Math.max(...NATION_BUDGETS.map(n => n.budget));
const MAX_PROJ = Math.max(...PROJECTIONS.map(p => p.size));

// ── Animated Counter Hook ────────────────────────────────────
function useCounter(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const animate = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(target * eased * 10) / 10);
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return { value, ref };
}

function StatCounter({ target, prefix = '', suffix = '', label, sub, color }: {
  target: number; prefix?: string; suffix?: string; label: string; sub: string; color: string;
}) {
  const { value, ref } = useCounter(target);
  return (
    <div ref={ref} className="card p-5 text-center">
      <div className={`text-3xl md:text-4xl font-bold ${color}`}>
        {prefix}{target >= 100 ? Math.round(value) : value.toFixed(1)}{suffix}
      </div>
      <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">{label}</div>
      <div className="text-slate-500 text-xs mt-1">{sub}</div>
    </div>
  );
}

// ── Trend Arrow ──────────────────────────────────────────────
function Trend({ value }: { value: number }) {
  if (value > 0) return <span className="text-green-400 text-sm font-medium">{'\u25B2'} +{value.toFixed(1)}%</span>;
  if (value < 0) return <span className="text-red-400 text-sm font-medium">{'\u25BC'} {value.toFixed(1)}%</span>;
  return <span className="text-slate-400 text-sm">--</span>;
}

// ── Bar Component ────────────────────────────────────────────
function HBar({ width, color, delay = 0 }: { width: number; color: string; delay?: number }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(width), 80 + delay);
    return () => clearTimeout(t);
  }, [width, delay]);
  return (
    <div className="h-5 bg-white/[0.08] rounded-full overflow-hidden flex-1">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
        style={{ width: `${w}%` }}
      />
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function SpaceEconomyPage() {
  const [search, setSearch] = useState('');

  const filteredSegments = MARKET_SEGMENTS.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.detail.toLowerCase().includes(search.toLowerCase())
  );
  const filteredNations = NATION_BUDGETS.filter(n =>
    n.country.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatedPageHeader
          title="Space Economy Dashboard"
          subtitle="Comprehensive intelligence on the $546B global space economy -- market segments, national budgets, and growth projections"
          icon={'\u{1F4B0}'}
          accentColor="emerald"
        />

        <MobileValueProp feature="space economy market data and projections" />

        <QuickFacts facts={SPACE_ECONOMY_FACTS} title="Space Economy at a Glance" />

        {/* ── Search / Filter ────────────────────────────── */}
        <div className="mb-8">
          <input
            type="search"
            placeholder="Filter segments, countries..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full max-w-md bg-white/[0.04] border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white/15"
          />
        </div>

        {/* ── Global Overview Stats ──────────────────────── */}
        <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StaggerItem><StatCounter target={546} prefix="$" suffix="B" label="2024 Market Size" sub="Space Foundation" color="bg-gradient-to-r from-slate-300 to-blue-400 bg-clip-text text-transparent" /></StaggerItem>
          <StaggerItem><StatCounter target={78} suffix="%" label="Commercial Share" sub="~$426B of total" color="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent" /></StaggerItem>
          <StaggerItem><StatCounter target={8.2} suffix="%" label="YoY Growth" sub="2023 to 2024" color="text-slate-300" /></StaggerItem>
          <StaggerItem><StatCounter target={1.1} prefix="$" suffix="T" label="2040 Forecast" sub="Morgan Stanley" color="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent" /></StaggerItem>
        </StaggerContainer>

        {/* ── Commercial vs Government Split ─────────────── */}
        <ScrollReveal>
        <div className="card p-6 mb-10">
          <h3 className="text-lg font-semibold text-white mb-4">Commercial vs Government Split (2024)</h3>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm text-slate-300 w-28 shrink-0">Commercial 78%</span>
            <HBar width={78} color="bg-gradient-to-r from-white to-blue-500" />
            <span className="text-slate-300 font-mono text-sm w-16 text-right">$426B</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-300 w-28 shrink-0">Government 22%</span>
            <HBar width={22} color="bg-gradient-to-r from-amber-500 to-orange-500" delay={100} />
            <span className="text-amber-400 font-mono text-sm w-16 text-right">$120B</span>
          </div>
          <p className="text-slate-500 text-xs mt-3">Source: Space Foundation -- The Space Report 2024</p>
        </div>
        </ScrollReveal>

        {/* ── Market Segments ────────────────────────────── */}
        <ScrollReveal>
        <div className="card p-6 mb-10">
          <h3 className="text-lg font-semibold text-white mb-1">Market Segments (2024)</h3>
          <p className="text-slate-500 text-xs mb-5">Approximate revenue by sector. Source: SIA, Euroconsult, Space Foundation.</p>
          {filteredSegments.length === 0 && (
            <p className="text-slate-500 text-sm py-4 text-center">No segments match &ldquo;{search}&rdquo;</p>
          )}
          <div className="space-y-3">
            {filteredSegments.map((s, i) => (
              <div key={s.name} className="group">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-300 w-44 shrink-0 truncate" title={s.name}>{s.name}</span>
                  <HBar width={(s.size / MAX_SEGMENT) * 100} color={s.growth > 10 ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-white to-blue-500'} delay={i * 60} />
                  <span className="text-slate-300 font-mono text-sm w-16 text-right shrink-0">
                    {s.size >= 1 ? `$${s.size}B` : `$${(s.size * 1000).toFixed(0)}M`}
                  </span>
                  <span className="w-20 shrink-0 text-right"><Trend value={s.growth} /></span>
                </div>
                <div className="text-slate-500 text-xs ml-44 pl-3 mt-0.5 hidden sm:block">{s.detail}</div>
              </div>
            ))}
          </div>
        </div>
        </ScrollReveal>

        {/* ── National Budgets ───────────────────────────── */}
        <ScrollReveal>
        <div className="card p-6 mb-10">
          <h3 className="text-lg font-semibold text-white mb-1">Top Space Nations by Budget (2024)</h3>
          <p className="text-slate-500 text-xs mb-5">Government space spending in USD. Sources: NASA, ESA, JAXA, ISRO, Euroconsult, OECD.</p>
          {filteredNations.length === 0 && (
            <p className="text-slate-500 text-sm py-4 text-center">No countries match &ldquo;{search}&rdquo;</p>
          )}
          <div className="space-y-3">
            {filteredNations.map((n, i) => (
              <div key={n.country} className="flex items-center gap-3">
                <span className="text-lg w-8 text-center shrink-0">{n.flag}</span>
                <span className="text-sm text-slate-300 w-32 shrink-0 truncate">
                  {n.country}{'est' in n ? ' *' : ''}
                </span>
                <HBar
                  width={(n.budget / MAX_BUDGET) * 100}
                  color={n.budget >= 10 ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : 'bg-gradient-to-r from-slate-500 to-slate-400'}
                  delay={i * 80}
                />
                <span className="text-purple-400 font-mono text-sm w-14 text-right shrink-0">${n.budget}B</span>
              </div>
            ))}
          </div>
          <p className="text-slate-600 text-xs mt-3">* Estimated -- China does not publish official space budget figures.</p>
        </div>
        </ScrollReveal>

        {/* ── Growth Projections ─────────────────────────── */}
        <ScrollReveal>
        <div className="card p-6 mb-10">
          <h3 className="text-lg font-semibold text-white mb-1">Growth Projections</h3>
          <p className="text-slate-500 text-xs mb-5">Industry forecasts for global space economy size.</p>
          {/* Timeline bar chart */}
          <div className="flex items-end gap-3 h-48">
            {PROJECTIONS.map((p, i) => {
              const pct = (p.size / MAX_PROJ) * 100;
              return (
                <div key={p.year} className="flex-1 flex flex-col items-center justify-end h-full">
                  <span className="text-xs text-slate-300 font-mono mb-1">
                    {p.size >= 1000 ? `$${(p.size / 1000).toFixed(1)}T` : `$${p.size}B`}
                  </span>
                  <AnimatedBar pct={pct} delay={i * 120} />
                  <span className="text-xs text-slate-400 mt-2 font-medium">{p.year}</span>
                  <span className="text-[10px] text-slate-600 mt-0.5 text-center hidden sm:block">{p.source}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 bg-white/[0.06] rounded-lg p-3">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-400">
              <span>Morgan Stanley: <strong className="text-white">$1.1T by 2040</strong></span>
              <span>Goldman Sachs: <strong className="text-white">$1T+ by 2040</strong></span>
              <span>Space Foundation: <strong className="text-white">$737B by 2030</strong></span>
            </div>
          </div>
        </div>
        </ScrollReveal>

        {/* ── Key Trends ─────────────────────────────────── */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <StaggerItem>
            <div className="card p-6 h-full">
              <h4 className="text-white font-semibold mb-3">Growth Drivers</h4>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">{'\u25B2'}</span> Mega-constellation broadband (Starlink, Kuiper)</li>
                <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">{'\u25B2'}</span> National security space spending surge</li>
                <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">{'\u25B2'}</span> Falling launch costs enabling new applications</li>
                <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">{'\u25B2'}</span> Direct-to-device satellite connectivity</li>
                <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">{'\u25B2'}</span> Commercial space station development</li>
              </ul>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card p-6 h-full">
              <h4 className="text-white font-semibold mb-3">Market Risks</h4>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">{'\u25BC'}</span> Orbital debris threatening sustainability</li>
                <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">{'\u25BC'}</span> Spectrum congestion and regulatory bottlenecks</li>
                <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">{'\u25BC'}</span> Geopolitical tensions fragmenting supply chains</li>
                <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">{'\u25BC'}</span> SPAC-era companies facing profitability pressure</li>
                <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">{'\u25BC'}</span> Workforce shortage constraining growth</li>
              </ul>
            </div>
          </StaggerItem>
        </StaggerContainer>

        <RelatedModules modules={[
          { name: 'Market Intelligence', description: 'Stock prices and company data', href: '/market-intel', icon: '\u{1F4C8}' },
          { name: 'Company Profiles', description: '200+ space company profiles', href: '/company-profiles', icon: '\u{1F3E2}' },
          { name: 'Space Talent Hub', description: 'Jobs and workforce data', href: '/space-talent', icon: '\u{1F468}\u{200D}\u{1F680}' },
          { name: 'Launch Vehicles', description: 'Launch costs and vehicle comparison', href: '/launch-vehicles', icon: '\u{1F680}' },
        ]} />

        {/* ── Sources Footer ─────────────────────────────── */}
        <ScrollReveal>
        <div className="mt-12 card p-6">
          <h4 className="text-slate-400 font-semibold text-sm mb-3">Data Sources & Citations</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-slate-500">
            <div>Space Foundation -- The Space Report (2024)</div>
            <div>Satellite Industry Association -- SOTSI 2024</div>
            <div>Morgan Stanley -- Space Economy at $1.1T (2040)</div>
            <div>Goldman Sachs -- Space: The Next Frontier</div>
            <div>Euroconsult -- Gov&apos;t Space Programs 2024</div>
            <div>OECD -- The Space Economy at a Glance</div>
            <div>NASA, ESA, JAXA, ISRO -- Official Budgets</div>
            <div>Bryce Tech -- State of the Space Industry</div>
            <div>Space Capital -- Quarterly Reports</div>
          </div>
          <p className="text-slate-600 text-xs mt-3">
            Data compiled from publicly available industry reports. Chinese budget is estimated as official figures are not published.
            Market sizes are approximate and not intended as investment advice. Figures reflect 2024 actuals and analyst projections.
          </p>
        </div>
        </ScrollReveal>
      </div>
    </div>
  );
}

// ── Vertical Animated Bar (for projections) ──────────────────
function AnimatedBar({ pct, delay = 0 }: { pct: number; delay?: number }) {
  const [h, setH] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setH(pct), 100 + delay);
    return () => clearTimeout(t);
  }, [pct, delay]);
  return (
    <div className="w-full flex-1 flex items-end">
      <div
        className="w-full rounded-t-md bg-gradient-to-t from-slate-200 to-slate-400 transition-all duration-700 ease-out"
        style={{ height: `${h}%` }}
      />
    </div>
  );
}
