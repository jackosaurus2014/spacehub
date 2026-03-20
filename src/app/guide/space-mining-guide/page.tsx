import { Metadata } from 'next';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import FAQSchema from '@/components/seo/FAQSchema';

export const metadata: Metadata = {
  title: 'Space Mining Guide 2026: Asteroid Mining, Lunar Resources & In-Situ Utilization',
  description: 'Complete guide to space mining in 2026. Learn about asteroid mining companies, lunar ice extraction, Helium-3, ISRU technology, and the economics of mining resources in space.',
  keywords: ['space mining', 'asteroid mining', 'lunar mining', 'space resources', 'ISRU', 'helium-3 mining', 'space mining companies', 'asteroid mining companies 2026'],
  alternates: { canonical: 'https://spacenexus.us/guide/space-mining-guide' },
  openGraph: {
    title: 'Space Mining Guide 2026 — Asteroid Mining, Lunar Resources & More',
    description: 'Everything you need to know about mining resources in space. Companies, technology, economics, and regulatory framework.',
    url: 'https://spacenexus.us/guide/space-mining-guide',
  },
};

export const revalidate = 86400;

const faqs = [
  { question: 'Is space mining legal?', answer: 'Yes. The 2015 US Commercial Space Launch Competitiveness Act grants US companies the right to own and sell resources extracted from asteroids and other celestial bodies. The Artemis Accords (signed by 39 nations) support this principle.' },
  { question: 'What resources can be mined in space?', answer: 'Water ice (from the Moon and Mars), platinum group metals and gold (from asteroids), iron, nickel, and titanium (from asteroids and Mars), Helium-3 (from lunar regolith for fusion fuel), and methane/ethane (from Titan).' },
  { question: 'Which companies are working on space mining?', answer: 'AstroForge (asteroid mining), TransAstra (optical mining), ispace (lunar resources), Intuitive Machines (lunar landers for resource prospecting), and Planetary Resources (acquired by ConsenSys). NASA\'s VIPER rover is mapping lunar ice deposits.' },
  { question: 'How much is an asteroid worth?', answer: 'A single metallic asteroid like 16 Psyche contains an estimated $10,000 quadrillion in metals at terrestrial prices. However, actually mining and returning these resources would collapse commodity markets, so real economic value depends on space-based demand.' },
  { question: 'When will asteroid mining become commercially viable?', answer: 'Lunar water mining is expected to be commercially viable by 2030-2035 as cislunar infrastructure develops. Near-Earth asteroid mining for platinum group metals could follow by 2035-2040. Large-scale asteroid belt mining is likely a 2040s+ endeavor.' },
  { question: 'What is ISRU?', answer: 'In-Situ Resource Utilization (ISRU) means using materials found at the destination rather than bringing everything from Earth. For example, extracting water from lunar ice and splitting it into hydrogen and oxygen for rocket fuel. ISRU is critical for affordable deep space exploration.' },
];

export default function SpaceMiningGuidePage() {
  return (
    <div className="min-h-screen bg-space-900">
      <FAQSchema items={faqs} />
      <div className="container mx-auto px-4 pb-16">
        <AnimatedPageHeader
          title="Space Mining Guide"
          subtitle="Asteroid mining, lunar resources, and the economics of space"
          icon="⛏️"
          accentColor="amber"
        >
          <Link href="/space-mining" className="btn-secondary text-sm py-2 px-4">
            Space Mining Intel
          </Link>
        </AnimatedPageHeader>

        <div className="max-w-4xl mx-auto space-y-8">
          <ScrollReveal>
            <div className="card p-6">
              <h2 className="text-xl font-semibold bg-gradient-to-r from-slate-300 to-amber-400 bg-clip-text text-transparent mb-4">What Is Space Mining?</h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Space mining is the extraction of valuable resources from celestial bodies — asteroids, the Moon, Mars, and other planets or moons. These resources include water ice (for propellant and life support), metals (for construction), precious metals (for high-value export), and exotic materials (for advanced technology).
              </p>
              <p className="text-slate-400 text-sm leading-relaxed">
                The space mining market is projected to grow significantly as cislunar infrastructure develops. The first commercially viable space mining operations are expected to focus on lunar water ice, which can be converted into rocket propellant — creating a &quot;gas station in space&quot; that dramatically reduces the cost of deep space missions.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="card p-6">
              <h2 className="text-xl font-semibold bg-gradient-to-r from-slate-300 to-cyan-400 bg-clip-text text-transparent mb-4">Types of Space Resources</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { icon: '💧', title: 'Water Ice', where: 'Moon, Mars, asteroids', value: 'Rocket propellant, life support', status: 'NASA VIPER rover mapping ice deposits' },
                  { icon: '💎', title: 'Platinum Group Metals', where: 'Metallic asteroids', value: '$500K+/kg — catalysts, electronics', status: 'AstroForge testing in-space refining' },
                  { icon: '🔩', title: 'Iron, Nickel, Titanium', where: 'Asteroids, Mars', value: 'In-space construction', status: 'Future — requires orbital manufacturing' },
                  { icon: '⚛️', title: 'Helium-3', where: 'Lunar regolith', value: 'Fusion fuel — $5M/kg theoretical', status: 'Requires fusion reactors (2040s+)' },
                  { icon: '⛽', title: 'Methane & Ethane', where: 'Titan (Saturn moon)', value: 'Chemical feedstock, fuel', status: 'Far future — requires Titan missions' },
                  { icon: '✨', title: 'Rare Earth Elements', where: 'Asteroids', value: 'Electronics, sensors, advanced tech', status: 'Long-term target for in-space demand' },
                ].map(r => (
                  <div key={r.title} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{r.icon}</span>
                      <h3 className="text-white text-sm font-medium">{r.title}</h3>
                    </div>
                    <p className="text-slate-500 text-xs"><strong className="text-slate-400">Where:</strong> {r.where}</p>
                    <p className="text-slate-500 text-xs"><strong className="text-slate-400">Value:</strong> {r.value}</p>
                    <p className="text-slate-500 text-xs"><strong className="text-slate-400">Status:</strong> {r.status}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* FAQ Section */}
          <ScrollReveal>
            <div className="card p-6">
              <h2 className="text-xl font-semibold bg-gradient-to-r from-slate-300 to-green-400 bg-clip-text text-transparent mb-4">Frequently Asked Questions</h2>
              <div className="space-y-4">
                {faqs.map(faq => (
                  <details key={faq.question} className="group">
                    <summary className="flex items-center justify-between cursor-pointer py-2 text-white text-sm font-medium hover:text-cyan-300 transition-colors list-none">
                      {faq.question}
                      <svg className="w-4 h-4 text-slate-500 group-open:rotate-180 transition-transform shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <p className="text-slate-400 text-sm leading-relaxed pb-2">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* CTA */}
          <ScrollReveal>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
              <Link href="/space-mining" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">Space Mining Intelligence</Link>
              <span className="hidden sm:inline text-white/10">|</span>
              <Link href="/space-tycoon" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">Play Space Tycoon (mine virtual resources!)</Link>
              <span className="hidden sm:inline text-white/10">|</span>
              <Link href="/blog" className="text-slate-400 hover:text-slate-300 underline underline-offset-2">200+ Articles</Link>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
