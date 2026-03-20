import { Metadata } from 'next';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { generateMonthlyReport } from '@/lib/monthly-report-generator';

export const metadata: Metadata = {
  title: 'Monthly Space Economy Report',
  description: 'Free monthly report on the space economy — launches, funding, company health, regulatory updates, and SpaceNexus outlook. Download PDF or read online.',
  keywords: ['space economy report', 'monthly space industry report', 'space investment report', 'space market analysis'],
  alternates: { canonical: 'https://spacenexus.us/report/monthly' },
};

export const revalidate = 3600; // Refresh hourly

export default async function MonthlyReportPage() {
  let report;
  try {
    report = await generateMonthlyReport();
  } catch {
    report = null;
  }

  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        <AnimatedPageHeader
          title="Space Economy Report"
          subtitle={report?.month || 'Monthly Analysis'}
          icon="📊"
          accentColor="cyan"
        >
          <Link href="/report/state-of-space-2026" className="btn-secondary text-sm py-2 px-4">
            Annual Report
          </Link>
        </AnimatedPageHeader>

        <div className="max-w-3xl mx-auto space-y-6">
          {/* Report Header */}
          <ScrollReveal>
            <div className="card p-6 border border-cyan-500/20 text-center">
              <p className="text-slate-500 text-xs mb-1">SpaceNexus Monthly Intelligence Report</p>
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300">
                {report?.month || 'Space Economy Report'}
              </h2>
              <p className="text-slate-400 text-sm mt-2">
                Launches, funding, company health, and market analysis
              </p>
            </div>
          </ScrollReveal>

          {/* Report Sections */}
          {report?.sections.map((section, i) => (
            <ScrollReveal key={i}>
              <div className="card p-5">
                <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                  <span>{section.icon}</span>
                  {section.title}
                </h3>

                {section.items.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                    {section.items.map((item, j) => (
                      <div key={j} className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                        <p className="text-white text-sm font-bold">{item.value}</p>
                        <p className="text-slate-500 text-[10px]">{item.label}</p>
                        {item.change && (
                          <p className={`text-[10px] ${
                            item.changeType === 'positive' ? 'text-green-400' :
                            item.changeType === 'negative' ? 'text-red-400' : 'text-slate-500'
                          }`}>{item.change}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {section.narrative && (
                  <p className="text-slate-400 text-xs leading-relaxed">{section.narrative}</p>
                )}
              </div>
            </ScrollReveal>
          ))}

          {/* Email Gate for PDF Download */}
          <ScrollReveal>
            <div className="rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-cyan-500/5 p-6 text-center">
              <span className="text-3xl block mb-2">📥</span>
              <h3 className="text-white text-lg font-bold mb-1">Download the Full Report (PDF)</h3>
              <p className="text-slate-400 text-sm mb-4">
                Get the complete analysis delivered to your inbox. Free — no credit card required.
              </p>
              <form className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto" action="/api/newsletter/subscribe" method="POST">
                <input type="hidden" name="source" value="monthly-report" />
                <input
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  required
                  className="flex-1 px-4 py-2.5 rounded-lg bg-white/[0.06] border border-white/[0.1] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500/30"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 rounded-lg transition-all"
                >
                  Send Report
                </button>
              </form>
              <p className="text-slate-600 text-[10px] mt-3">
                Also subscribes you to the weekly Space Intelligence Brief. Unsubscribe anytime.
              </p>
            </div>
          </ScrollReveal>

          {/* Links */}
          <ScrollReveal>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
              <Link href="/market-intel" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">Market Intelligence</Link>
              <span className="hidden sm:inline text-white/10">|</span>
              <Link href="/funding-rounds" className="text-slate-400 hover:text-slate-300 underline underline-offset-2">Funding Rounds</Link>
              <span className="hidden sm:inline text-white/10">|</span>
              <Link href="/company-profiles" className="text-slate-400 hover:text-slate-300 underline underline-offset-2">Company Profiles</Link>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
