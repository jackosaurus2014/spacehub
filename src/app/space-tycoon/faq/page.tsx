import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Space Tycoon FAQ - How to Play',
  description: 'Learn how to play Space Tycoon. FAQ covering how to make money, build infrastructure, research technologies, and expand across the solar system.',
  alternates: { canonical: 'https://spacenexus.us/space-tycoon/faq' },
};

const faqs = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'How do I start making money?',
        a: `You start with $500M. To generate ongoing revenue, you need to build infrastructure that enables **services**. The fastest path to revenue:

1. **Build a Small Launch Pad** ($50M, 6 months) → auto-activates "Small Launch Services" earning **$5M/mo net profit**
2. **Build a Ground Station** ($30M, 4 months) → auto-activates "Satellite Tracking Services" earning **$2.2M/mo net profit**
3. **Build a Mission Control Center** ($80M, 8 months) → auto-activates "Mission Operations Contracts" earning **$4M/mo net profit**

Once construction finishes, services activate automatically and revenue starts flowing. You need to **unpause the game** (press 1x, 2x, 5x, or 10x) for time to pass and construction to complete.`,
      },
      {
        q: 'I built buildings but I\'m not earning anything. What\'s wrong?',
        a: `Three common reasons:

1. **Construction isn't finished yet.** Buildings take months to build. Check the Dashboard for "Under Construction" items — they show completion dates. Revenue only starts when construction is complete.
2. **The game is paused.** Make sure you've pressed a speed button (1x, 2x, 5x, or 10x). The ⏸ button pauses time.
3. **The building doesn't generate revenue.** Check the Build panel — buildings that generate revenue show which service they enable. Some buildings (like solar farms) provide support but don't directly earn money.`,
      },
      {
        q: 'What does each speed setting do?',
        a: `Speed controls how fast in-game time passes:
- **⏸ Pause** — Time stops. Use this to plan your next moves.
- **1x** — 1 game month every 2 real seconds
- **2x** — 1 game month every 1 second
- **5x** — 1 game month every 0.4 seconds
- **10x** — 1 game month every 0.2 seconds (fastest)

Your monthly revenue and costs are calculated each game month regardless of speed.`,
      },
    ],
  },
  {
    category: 'Buildings & Revenue',
    questions: [
      {
        q: 'What does each building do?',
        a: `**Earth Surface buildings:**
- **Small Launch Pad** — Enables launch services ($8M/mo revenue). Your bread-and-butter early income.
- **Medium Launch Pad** — Requires Reusable Boosters research. $25M/mo revenue.
- **Heavy Launch Pad** — Requires Super Heavy Lift research. $80M/mo revenue.
- **Ground Station** — Satellite tracking services ($3M/mo revenue). Quick to build (4 months).
- **Mission Control** — Mission operations contracts ($6M/mo revenue).

**LEO (Low Earth Orbit) buildings:**
- **LEO Telecom Satellite** — Broadband internet service ($5M/mo). No research needed.
- **LEO Sensor Satellite** — Earth observation imagery ($4M/mo). Needs High-Res Optical research.
- **Orbital Outpost** (space station) — Space tourism ($8M/mo). Needs Modular Spacecraft research.
- **Orbital Data Center** — AI compute services ($15M/mo). Needs Rad-Hardened Processors research.
- **Orbital Fabrication Lab** — Manufacturing ($12M/mo). Needs Orbital Assembly research.
- **Orbital Solar Farm** — Powers other orbital facilities. No direct revenue.

Revenue increases as you unlock more locations (Moon, Mars, asteroids) and build higher-tier infrastructure.`,
      },
      {
        q: 'How do services work?',
        a: `Services are your revenue generators. When a building completes construction, any service it enables is **automatically activated**. You don't need to do anything extra.

Each service has:
- **Revenue/month** — How much it earns
- **Operating cost/month** — How much it costs to run
- **Net profit** = Revenue minus Operating cost

You can see all active services in the **Services** tab with a breakdown of revenue and costs.`,
      },
      {
        q: 'Why do buildings cost more when I build multiple?',
        a: `Each duplicate building at the same location costs **15% more** than the last. This is cost scaling — it prevents you from just spamming one building type. Your first Small Launch Pad costs $50M, the second costs $57.5M, the third costs $66.1M, and so on. Strategy matters: diversify your infrastructure for better economics.`,
      },
      {
        q: 'What\'s the difference between maintenance cost and operating cost?',
        a: `**Maintenance cost** is a monthly fee just for owning a building, regardless of whether it\'s running a service. Think of it as rent and upkeep.

**Operating cost** is the monthly cost of running a service. This only applies to active services.

Both are deducted from your income each month.`,
      },
    ],
  },
  {
    category: 'Research',
    questions: [
      {
        q: 'How does research work?',
        a: `Research unlocks new buildings, services, and locations. The flow:

1. Go to the **Research** tab
2. Find a technology you can afford (white border = available, gray = locked by prerequisites)
3. Click **Start** — this costs money upfront and takes several game months
4. Only **one research at a time** — choose wisely
5. When complete, new buildings and capabilities unlock automatically

Research is organized into 9 branches with 5 tiers each, from present-day tech (Tier 1) to far-future concepts like fusion drives and antimatter propulsion (Tier 5).`,
      },
      {
        q: 'What should I research first?',
        a: `Best early research paths:

**For revenue:** High-Res Optical ($100M) → unlocks LEO Sensor Satellites for Earth observation income
**For expansion:** Reusable Boosters ($200M) → unlocks Medium Launch Pad + lunar missions
**For tech income:** Rad-Hardened Processors ($200M) → unlocks Orbital Data Centers ($15M/mo!)
**For passive income:** Triple-Junction Solar Cells ($60M) → unlocks solar farms
**For infrastructure:** Modular Spacecraft ($150M) → unlocks space stations + tourism

The cheapest and fastest research is Triple-Junction Solar Cells (6 months, $60M). The highest early ROI is Rad-Hardened Processors → build an Orbital Data Center.`,
      },
      {
        q: 'What do the research prerequisites mean?',
        a: `Some technologies require you to complete other research first. For example, "Super Heavy Lift" requires "Rapid Launch Cadence" which requires "Reusable Boosters." You must research them in order.

Some advanced techs have **cross-branch prerequisites** — e.g., "Asteroid Capture" requires both "Regolith Processing" (Mining) and "Autonomous Docking" (Spacecraft). These create interesting strategic decisions about which branches to invest in.`,
      },
    ],
  },
  {
    category: 'Solar System & Expansion',
    questions: [
      {
        q: 'How do I expand to the Moon and beyond?',
        a: `New locations must be **unlocked** by spending money and completing required research:

- **GEO** (Geostationary Orbit) — $50M, no research needed. Premium telecom satellites.
- **Lunar Orbit** — $1B, needs Reusable Boosters
- **Lunar Surface** — $2B, needs Reusable Boosters + Modular Spacecraft
- **Mars Orbit** — $10B, needs Super Heavy Lift + Ion Drives
- **Mars Surface** — $25B, needs above + Resource Prospecting
- **Asteroid Belt** — $15B, needs Asteroid Capture + Autonomous Docking
- **Jupiter System** — $100B, needs Nuclear Thermal + Interplanetary Cruisers
- **Saturn System** — $200B, needs above + Deep Drilling
- **Outer System** — $500B, needs Fusion Drive + Generation Ships

Go to the **Map** tab to see all locations and their unlock requirements.`,
      },
      {
        q: 'Why should I expand to new locations?',
        a: `Each new location offers unique buildings and higher-revenue services:

- **Moon** — Lunar ice mining ($20M/mo), lunar tourism ($30M/mo), lunar manufacturing
- **Mars** — Resource extraction ($40M/mo), Mars tourism ($100M/mo!)
- **Asteroid Belt** — Asteroid metals ($60M/mo) — the most profitable mining
- **Jupiter** — Europa drilling ($150M/mo) — highest Tier 4 revenue
- **Saturn** — Titan hydrocarbons ($200M/mo) — highest mining revenue

The further you expand, the more you earn. But expansion is expensive — you need a solid revenue base first.`,
      },
    ],
  },
  {
    category: 'Strategy Tips',
    questions: [
      {
        q: 'What\'s the best strategy for beginners?',
        a: `**Phase 1 (Year 2025-2030):** Build your revenue base on Earth
- Build a Ground Station first (cheapest, fastest at 4 months)
- Build a Small Launch Pad (6 months, $5M/mo net)
- Build a Mission Control Center (8 months, $4M/mo net)
- Start researching: Triple-Junction Solar Cells → Rad-Hardened Processors

**Phase 2 (Year 2030-2035):** Go to orbit
- Build LEO Telecom Satellites ($5M/mo each, no research needed!)
- Build an Orbital Data Center once Rad-Hard Processors completes ($15M/mo net!)
- Research Reusable Boosters to unlock Moon missions
- Unlock GEO for premium telecom satellites

**Phase 3 (Year 2035-2045):** Expand to the Moon
- Unlock Lunar Surface, build mining and manufacturing
- Research toward Mars capabilities

Speed tip: Use 5x or 10x speed when waiting for construction, then pause to make decisions.`,
      },
      {
        q: 'How do I avoid going bankrupt?',
        a: `Watch your **net income** in the resource bar at the top. If it's red (negative), you're losing money each month.

Common causes of bankruptcy:
- Building too many things at once without revenue to cover maintenance
- Unlocking expensive locations before you can afford to build there
- Starting expensive research without enough cash reserves

Rule of thumb: Keep at least 6 months of operating costs in reserve. If your monthly costs are $10M, keep $60M+ in the bank.`,
      },
      {
        q: 'Does the game save automatically?',
        a: `Yes! The game auto-saves every 30 seconds. You can also manually save by clicking the 💾 button in the tab bar. Your save is stored in your browser's local storage.

Warning: Clearing your browser data will delete your save. Use the same browser to continue playing.`,
      },
    ],
  },
];

export default function SpaceTycoonFAQPage() {
  return (
    <div className="min-h-screen bg-[#050510]">
      <div className="container mx-auto px-4 py-8 pb-16">
        {/* Header */}
        <div className="max-w-3xl mx-auto mb-8">
          <Link href="/space-tycoon" className="text-cyan-400 text-xs hover:text-cyan-300 mb-4 inline-flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Game
          </Link>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300 mb-2">
            Space Tycoon FAQ
          </h1>
          <p className="text-slate-400 text-sm">
            Everything you need to know about building your space empire.
          </p>
        </div>

        {/* Quick Start Box */}
        <div className="max-w-3xl mx-auto mb-8 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5">
          <h2 className="text-cyan-400 font-bold text-sm mb-2">Quick Start Guide</h2>
          <p className="text-slate-300 text-sm leading-relaxed mb-3">
            Your goal is to build a profitable space company. Here&apos;s how to earn your first revenue in 3 steps:
          </p>
          <ol className="text-slate-300 text-sm space-y-2">
            <li className="flex gap-2">
              <span className="text-cyan-400 font-bold shrink-0">1.</span>
              <span>Go to <strong className="text-white">Build</strong> tab → select <strong className="text-white">Earth Surface</strong> → build a <strong className="text-white">Ground Station</strong> ($30M, 4 months to build)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-cyan-400 font-bold shrink-0">2.</span>
              <span><strong className="text-white">Unpause the game</strong> — press <strong className="text-white">2x</strong> or <strong className="text-white">5x</strong> speed and wait for construction to finish</span>
            </li>
            <li className="flex gap-2">
              <span className="text-cyan-400 font-bold shrink-0">3.</span>
              <span>When the building completes, a <strong className="text-white">service auto-activates</strong> and you start earning revenue every month!</span>
            </li>
          </ol>
          <p className="text-slate-500 text-xs mt-3">
            Then build a Small Launch Pad and Mission Control to multiply your income. See the full strategy guide below.
          </p>
        </div>

        {/* FAQ Sections */}
        <div className="max-w-3xl mx-auto space-y-8">
          {faqs.map((section) => (
            <div key={section.category}>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <div className="w-1 h-5 rounded-full bg-gradient-to-b from-cyan-500 to-purple-500" />
                {section.category}
              </h2>
              <div className="space-y-4">
                {section.questions.map((faq) => (
                  <details key={faq.q} className="group rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                    <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.02] transition-colors list-none">
                      <span className="text-white text-sm font-medium pr-4">{faq.q}</span>
                      <svg className="w-4 h-4 text-slate-500 shrink-0 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="px-4 pb-4 border-t border-white/[0.04]">
                      <div className="pt-3 text-slate-400 text-sm leading-relaxed whitespace-pre-line">
                        {faq.a.split('**').map((part, i) =>
                          i % 2 === 1
                            ? <strong key={i} className="text-white font-medium">{part}</strong>
                            : <span key={i}>{part}</span>
                        )}
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Revenue Reference Table */}
        <div className="max-w-3xl mx-auto mt-10">
          <h2 className="text-lg font-bold text-white mb-4">Quick Revenue Reference</h2>
          <div className="rounded-xl border border-white/[0.06] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/[0.04]">
                  <th className="text-left text-slate-400 font-medium py-2 px-4">Building</th>
                  <th className="text-left text-slate-400 font-medium py-2 px-4">Location</th>
                  <th className="text-right text-slate-400 font-medium py-2 px-4">Net Profit/mo</th>
                  <th className="text-left text-slate-400 font-medium py-2 px-4">Requires</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { building: 'Ground Station', location: 'Earth', net: '$2.2M', requires: 'Nothing' },
                  { building: 'Small Launch Pad', location: 'Earth', net: '$4.5M', requires: 'Nothing' },
                  { building: 'Mission Control', location: 'Earth', net: '$3.2M', requires: 'Nothing' },
                  { building: 'LEO Telecom Satellite', location: 'LEO', net: '$3.3M', requires: 'Nothing' },
                  { building: 'LEO Sensor Satellite', location: 'LEO', net: '$2.75M', requires: 'High-Res Optical' },
                  { building: 'Orbital Data Center', location: 'LEO', net: '$8M', requires: 'Rad-Hard Processors' },
                  { building: 'Orbital Outpost', location: 'LEO', net: '-$1M*', requires: 'Modular Spacecraft' },
                  { building: 'Medium Launch Pad', location: 'Earth', net: '$15.5M', requires: 'Reusable Boosters' },
                  { building: 'GEO Telecom Sat', location: 'GEO ($50M)', net: '$8.2M', requires: 'Unlock GEO' },
                  { building: 'Lunar Ice Mine', location: 'Moon ($2B)', net: '$9M', requires: 'Resource Prospecting' },
                ].map((row) => (
                  <tr key={row.building} className="border-t border-white/[0.04]">
                    <td className="text-white py-2 px-4">{row.building}</td>
                    <td className="text-slate-400 py-2 px-4">{row.location}</td>
                    <td className={`text-right py-2 px-4 font-mono ${row.net.startsWith('-') ? 'text-red-400' : 'text-green-400'}`}>{row.net}</td>
                    <td className="text-slate-500 py-2 px-4 text-xs">{row.requires}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-slate-600 text-[10px] px-4 py-2 bg-white/[0.02]">
              * Orbital Outpost costs more in maintenance than tourism revenue. It becomes profitable with Rotating Habitats research. Net = service revenue - service operating cost - building maintenance.
            </p>
          </div>
        </div>

        {/* Back to game */}
        <div className="max-w-3xl mx-auto mt-8 text-center">
          <Link
            href="/space-tycoon"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 rounded-xl transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58" />
            </svg>
            Back to Space Tycoon
          </Link>
        </div>
      </div>
    </div>
  );
}
