import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';
import HeroArt from '@/components/ui/HeroArt';
import ScrollReveal from '@/components/ui/ScrollReveal';
import GuideNavigation from '@/components/guide/GuideNavigation';
import ReadingTime from '@/components/ui/ReadingTime';
import RelatedModules from '@/components/ui/RelatedModules';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import { getJobsHubData } from '@/lib/jobs-hub';
import { getSalaryBenchmarks } from '@/lib/workforce-data';
import { SALARY_ROLES, LOCATION_MODIFIERS, SALARY_DATA_AS_OF, type SalaryCategory } from '@/lib/salary-data';
import { JOB_CATEGORIES, SENIORITY_LEVELS } from '@/types';

// "Space industry salary" / "aerospace engineer salary space" (2026-09-10).
// Two sources, both shown with their provenance: the curated multi-role
// benchmark dataset (src/lib/salary-data.ts, dated) and the ranges employers
// actually state in live postings (computed at request time). The same
// estimator labels the salary band on every job card, so this page is also
// the explanation of where those bands come from.
export const dynamic = 'force-dynamic';

const SLUG = 'space-industry-salaries';
const CANONICAL = `https://spacenexus.us/guide/${SLUG}`;
const DESCRIPTION =
  `What space industry jobs pay in 2026: salary ranges for ${SALARY_ROLES.length} roles from propulsion engineer to mission director, by seniority and by city, plus the ranges employers state in live postings. How to read an estimate, what clearance adds, and how to negotiate.`;
/** Bumped by hand when the prose changes; the figures are live or dated. */
const LAST_EDITED = '2026-09-10T00:00:00Z';

const getHub = cache(() => getJobsHubData());
const getSalaries = cache(() => getSalaryBenchmarks());

const CATEGORY_LABELS: Record<SalaryCategory, string> = {
  engineering: 'Engineering',
  'mission-operations': 'Mission operations',
  business: 'Business and program',
  science: 'Science and research',
  executive: 'Executive',
  manufacturing: 'Manufacturing and technicians',
  emerging: 'Emerging roles',
};
const CATEGORY_ORDER: SalaryCategory[] = ['engineering', 'mission-operations', 'manufacturing', 'science', 'business', 'emerging', 'executive'];

const TOC = [
  { id: 'verdict', label: 'The short answer' },
  { id: 'roles', label: `What ${SALARY_ROLES.length} roles pay` },
  { id: 'live', label: 'What postings actually state (live)' },
  { id: 'level', label: 'By seniority' },
  { id: 'city', label: 'By city' },
  { id: 'estimate', label: 'How our salary bands are made' },
  { id: 'premiums', label: 'Clearance, equity, overtime' },
  { id: 'negotiate', label: 'Negotiating a space offer' },
  { id: 'faq', label: 'FAQ' },
];

const FAQ = [
  { q: 'How much does a space industry engineer make?', a: 'Mid-career engineers in the curated dataset on this page sit between roughly $110k and $160k base in the United States, with propulsion, GNC and systems roles at the top of that band and senior staff above $150k. The live table shows what employers are stating in current postings; those ranges run higher than base-only benchmarks because postings often quote total cash.' },
  { q: 'Does SpaceX pay more or less than the primes?', a: 'Base pay at the newer launch companies is usually at or slightly below the primes for the same level; the difference is equity and hours. Prime contractors (Lockheed Martin, Northrop Grumman, L3Harris) pay steadier base with defined-benefit or matched retirement and paid overtime for many technician grades.' },
  { q: 'How much is a security clearance worth?', a: 'Postings that require an active TS/SCI cluster around 10 to 20 percent above the same title without a clearance, because the employer cannot hire and wait a year for adjudication. A Secret clearance adds less; eligibility to obtain one adds almost nothing until it is granted.' },
  { q: 'Are the salary bands on SpaceNexus job listings real?', a: 'When the employer states a range, we show it and label it "stated by employer". When they do not, we show a SpaceNexus estimate built from the curated dataset, matched by title and seniority and adjusted for location, labelled "estimate". The estimate is a starting point for a conversation, not an offer.' },
  { q: 'Do remote space jobs pay less?', a: 'Remote-eligible roles are mostly software, analysis and program roles, and they are usually benchmarked to a national rate rather than the LA or Seattle premium. Expect the Denver-level figure in the city table rather than the coastal one.' },
  { q: 'What do space technicians and machinists make?', a: 'Manufacturing and test technicians in the dataset run from the high $40ks for entry roles to above $100k for senior integration and test leads, and overtime during launch campaigns pushes take-home well above base.' },
  { q: 'How often is this page updated?', a: 'The curated benchmark dataset carries its own date (shown in the tables). The live "stated by employers" figures are recomputed from the postings every time the page loads.' },
];

const money = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? '—' : `$${Math.round(n / 1000)}k`);

export async function generateMetadata(): Promise<Metadata> {
  const title = `Space Industry Salaries (2026): What ${SALARY_ROLES.length} Roles Pay, by Level and City`;
  return {
    title,
    description: DESCRIPTION,
    keywords: ['space industry salary', 'aerospace engineer salary', 'spacex engineer salary', 'propulsion engineer salary', 'satellite engineer salary', 'space jobs pay', 'mission operations salary', 'space technician salary'],
    alternates: { canonical: CANONICAL },
    openGraph: { title, description: DESCRIPTION, type: 'article', publishedTime: LAST_EDITED, modifiedTime: LAST_EDITED, authors: ['SpaceNexus'] },
    twitter: { card: 'summary_large_image', title, description: DESCRIPTION },
  };
}

export default async function SpaceIndustrySalariesGuide() {
  const [hub, salaries] = await Promise.all([getHub().catch(() => null), getSalaries().catch(() => null)]);
  const title = `Space Industry Salaries (2026): What ${SALARY_ROLES.length} Roles Pay, by Level and City`;
  const edited = new Date(LAST_EDITED);
  const asOf = new Date(`${SALARY_DATA_AS_OF}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  const byCategory = CATEGORY_ORDER.map((c) => ({
    category: c,
    label: CATEGORY_LABELS[c],
    roles: SALARY_ROLES.filter((r) => r.category === c).slice().sort((a, b) => b.salaryRange.median - a.salaryRange.median),
  })).filter((g) => g.roles.length > 0);
  const allSorted = SALARY_ROLES.slice().sort((a, b) => b.salaryRange.median - a.salaryRange.median);
  const overallMedian = allSorted[Math.floor(allSorted.length / 2)]?.salaryRange.median ?? 0;
  const highDemand = SALARY_ROLES.filter((r) => r.demandLevel === 'high').slice().sort((a, b) => b.salaryRange.median - a.salaryRange.median).slice(0, 8);
  const engineering = SALARY_ROLES.filter((r) => r.category === 'engineering');
  const engMid = engineering.map((r) => r.experienceLevels.mid);
  const engMidMin = Math.round(engMid.reduce((s, x) => s + x.min, 0) / engMid.length);
  const engMidMax = Math.round(engMid.reduce((s, x) => s + x.max, 0) / engMid.length);

  const liveSeniority = SENIORITY_LEVELS.map((lvl) => ({ ...lvl, row: salaries?.bySeniority.find((r) => r.seniorityLevel === lvl.value) ?? null })).filter((x) => x.row && x.row.count > 0);
  const liveCategory = JOB_CATEGORIES.map((cat) => ({ ...cat, row: salaries?.byCategory.find((r) => r.category === cat.value) ?? null })).filter((x) => x.row && x.row.count > 0);
  const statedCount = liveCategory.reduce((s, x) => s + (x.row?.count ?? 0), 0);
  const denver = LOCATION_MODIFIERS.find((l) => l.id === 'denver-cos');
  const stated = statedCount > 0;

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6 flex-wrap">
            <Link href="/" className="hover:text-white/80">Home</Link><span>/</span>
            <Link href="/guide" className="hover:text-white/80">Guides</Link><span>/</span>
            <span className="text-slate-400">Space industry salaries</span>
          </nav>
          <ScrollReveal>
            <article>
              <header className="mb-8">
                <p className="text-xs uppercase tracking-wider text-cyan-400 mb-3">Careers · Compensation</p>
                <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">{title}</h1>
                <p className="text-lg text-slate-300 leading-relaxed">{DESCRIPTION}</p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-4">
                  <span>Updated {edited.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</span>
                  <span>Benchmark dataset: {asOf}</span>
                  <ReadingTime wordCount={2400} className="flex items-center gap-1.5" />
                </div>
              </header>
              <HeroArt src="/art/hero-space-operations.png" className="mb-8" />

              <div className="card p-5 mb-10">
                <h2 className="text-lg font-bold text-white mb-3">In this guide</h2>
                <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                  {TOC.map((t, i) => <li key={t.id}><a href={`#${t.id}`} className="text-cyan-400 hover:text-cyan-300">{i + 1}. {t.label}</a></li>)}
                </ol>
              </div>

              <div className="space-y-12 text-slate-300 leading-relaxed">
                <section id="verdict">
                  <h2 className="text-2xl font-bold text-white mb-4">The short answer</h2>
                  <div className="card p-5 border-cyan-500/20 mb-4">
                    <p className="text-base text-slate-200">
                      <strong className="text-cyan-300">Mid-career engineer, US:</strong> about {money(engMidMin)} to {money(engMidMax)} base across the {engineering.length} engineering roles in our dataset.
                      The median role of all {SALARY_ROLES.length} sits at {money(overallMedian)}. Propulsion, GNC and systems roles run above that; technician and coordinator roles below; directors and VPs well above.
                      {stated && <> Employers stating a range in live postings right now ({statedCount.toLocaleString('en-US')} of {hub?.activeCount.toLocaleString('en-US') ?? 'the open'} roles) quote {money(liveSeniority[0]?.row?.avgMin)}–{money(liveSeniority[liveSeniority.length - 1]?.row?.avgMax)} from entry to the most senior level listed.</>}
                    </p>
                  </div>
                  <p>
                    Two things move a space salary more than the job title: <strong className="text-white">where you sit</strong> (a Los Angeles or Seattle role pays about 15 to 20 percent more than the same role in Denver or Huntsville) and <strong className="text-white">what you are cleared for</strong>. Company type matters less than people assume. The rest of this page is the tables.
                  </p>
                </section>

                <section id="roles">
                  <h2 className="text-2xl font-bold text-white mb-4">What {SALARY_ROLES.length} roles pay</h2>
                  <p className="mb-4 text-sm text-slate-400">Curated benchmark dataset, US base salary, as of {asOf}. Median with the 25th to 75th percentile band. Sorted by median within each group. The full explorer with skills, top employers and growth rate is on the <Link href="/space-talent?tab=salaries" className="text-cyan-400 hover:text-cyan-300">talent page</Link>.</p>
                  <div className="space-y-6">
                    {byCategory.map((g) => (
                      <div key={g.category} className="card p-4">
                        <h3 className="text-base font-semibold text-white mb-3">{g.label} <span className="text-xs text-slate-500 font-normal">· {g.roles.length} roles</span></h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead><tr className="text-left text-xs text-slate-500"><th className="pb-2 font-medium">Role</th><th className="pb-2 font-medium text-right">Median</th><th className="pb-2 font-medium text-right">P25–P75</th><th className="pb-2 font-medium text-right hidden sm:table-cell">Demand</th></tr></thead>
                            <tbody>
                              {g.roles.map((r) => (
                                <tr key={r.id} className="border-t border-white/[0.05]">
                                  <td className="py-1.5 pr-3 text-slate-200">{r.title}</td>
                                  <td className="py-1.5 text-right text-white tabular-nums font-medium">{money(r.salaryRange.median)}</td>
                                  <td className="py-1.5 text-right text-slate-400 tabular-nums">{money(r.salaryRange.p25)}–{money(r.salaryRange.p75)}</td>
                                  <td className={`py-1.5 text-right hidden sm:table-cell text-xs ${r.demandLevel === 'high' ? 'text-emerald-300' : r.demandLevel === 'medium' ? 'text-slate-300' : 'text-slate-500'}`}>{r.demandLevel}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4">
                    The highest-paid high-demand roles right now: {highDemand.map((r, i) => <span key={r.id}>{i > 0 ? ', ' : ''}{r.title} ({money(r.salaryRange.median)})</span>)}.
                  </p>
                </section>

                <section id="live">
                  <h2 className="text-2xl font-bold text-white mb-4">What postings actually state (live)</h2>
                  {stated ? (
                    <>
                      <p className="mb-4 text-sm text-slate-400">Computed at page load from the {statedCount.toLocaleString('en-US')} open postings on the <Link href="/jobs" className="text-cyan-400 hover:text-cyan-300">jobs board</Link> that state a salary range. Averages of the stated minimum and maximum, by category. Postings that state a range skew toward states with pay-transparency laws (California, Colorado, Washington, New York), so these run a little above a national average.</p>
                      <div className="card p-4 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead><tr className="text-left text-xs text-slate-500"><th className="pb-2 font-medium">Category</th><th className="pb-2 font-medium text-right">Stated min</th><th className="pb-2 font-medium text-right">Stated max</th><th className="pb-2 font-medium text-right">Postings</th></tr></thead>
                          <tbody>
                            {liveCategory.map((c) => (
                              <tr key={c.value} className="border-t border-white/[0.05]">
                                <td className="py-1.5 text-slate-200">{c.label}</td>
                                <td className="py-1.5 text-right tabular-nums text-white">{money(c.row?.avgMin)}</td>
                                <td className="py-1.5 text-right tabular-nums text-white">{money(c.row?.avgMax)}</td>
                                <td className="py-1.5 text-right tabular-nums text-slate-400">{c.row?.count.toLocaleString('en-US')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-400">The live table is unavailable right now; the board is refreshed every morning. The curated tables above and below do not depend on it.</p>
                  )}
                </section>

                <section id="level">
                  <h2 className="text-2xl font-bold text-white mb-4">By seniority</h2>
                  <p className="mb-4">Junior, mid and senior bands from the benchmark dataset for the ten most-posted engineering roles, next to what employers state in live postings by seniority level.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="card p-4 overflow-x-auto">
                      <h3 className="text-sm font-semibold text-white mb-2">Benchmark bands · engineering</h3>
                      <table className="w-full text-sm">
                        <thead><tr className="text-left text-xs text-slate-500"><th className="pb-2 font-medium">Role</th><th className="pb-2 font-medium text-right">Junior</th><th className="pb-2 font-medium text-right">Mid</th><th className="pb-2 font-medium text-right">Senior</th></tr></thead>
                        <tbody>
                          {engineering.slice().sort((a, b) => b.salaryRange.median - a.salaryRange.median).slice(0, 10).map((r) => (
                            <tr key={r.id} className="border-t border-white/[0.05]">
                              <td className="py-1.5 pr-2 text-slate-200">{r.title}</td>
                              <td className="py-1.5 text-right tabular-nums text-slate-300 whitespace-nowrap">{money(r.experienceLevels.junior.min)}–{money(r.experienceLevels.junior.max)}</td>
                              <td className="py-1.5 text-right tabular-nums text-slate-300 whitespace-nowrap">{money(r.experienceLevels.mid.min)}–{money(r.experienceLevels.mid.max)}</td>
                              <td className="py-1.5 text-right tabular-nums text-white whitespace-nowrap">{money(r.experienceLevels.senior.min)}–{money(r.experienceLevels.senior.max)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="card p-4 overflow-x-auto">
                      <h3 className="text-sm font-semibold text-white mb-2">Stated in live postings · by level</h3>
                      {stated ? (
                        <table className="w-full text-sm">
                          <thead><tr className="text-left text-xs text-slate-500"><th className="pb-2 font-medium">Level</th><th className="pb-2 font-medium text-right">Min</th><th className="pb-2 font-medium text-right">Max</th><th className="pb-2 font-medium text-right">n</th></tr></thead>
                          <tbody>
                            {liveSeniority.map((l) => (
                              <tr key={l.value} className="border-t border-white/[0.05]">
                                <td className="py-1.5 text-slate-200">{l.label}</td>
                                <td className="py-1.5 text-right tabular-nums text-white">{money(l.row?.avgMin)}</td>
                                <td className="py-1.5 text-right tabular-nums text-white">{money(l.row?.avgMax)}</td>
                                <td className="py-1.5 text-right tabular-nums text-slate-400">{l.row?.count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : <p className="text-sm text-slate-400">Unavailable right now.</p>}
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-slate-400">The jump from mid to senior is the largest step in most roles; the jump into staff or principal after that is smaller in base and larger in equity or bonus.</p>
                </section>

                <section id="city">
                  <h2 className="text-2xl font-bold text-white mb-4">By city</h2>
                  <p className="mb-4">The dataset's location multipliers, applied to the national figure. {denver ? `${denver.label} is the reference (1.00).` : ''} These are the same multipliers the estimator uses for the salary band on job listings.</p>
                  <div className="card p-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-xs text-slate-500"><th className="pb-2 font-medium">Metro</th><th className="pb-2 font-medium text-right">Multiplier</th><th className="pb-2 font-medium text-right whitespace-nowrap">Mid-career engineer</th><th className="pb-2 font-medium hidden md:table-cell pl-4">Why</th></tr></thead>
                      <tbody>
                        {LOCATION_MODIFIERS.slice().sort((a, b) => b.multiplier - a.multiplier).map((l) => (
                          <tr key={l.id} className="border-t border-white/[0.05]">
                            <td className="py-1.5 text-slate-200 whitespace-nowrap">{l.label}</td>
                            <td className="py-1.5 text-right tabular-nums text-slate-300">×{l.multiplier.toFixed(2)}</td>
                            <td className="py-1.5 text-right tabular-nums text-white whitespace-nowrap">{money(engMidMin * l.multiplier)}–{money(engMidMax * l.multiplier)}</td>
                            <td className="py-1.5 hidden md:table-cell pl-4 text-xs text-slate-500">{l.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section id="estimate">
                  <h2 className="text-2xl font-bold text-white mb-4">How our salary bands are made</h2>
                  <p className="mb-3">Every listing on the <Link href="/jobs" className="text-cyan-400 hover:text-cyan-300">jobs board</Link> shows a salary band. There are two kinds and the label tells you which:</p>
                  <ul className="list-disc pl-5 space-y-2 mb-3">
                    <li><strong className="text-white">Stated by employer.</strong> The posting includes a range. We show it unchanged.</li>
                    <li><strong className="text-white">SpaceNexus estimate.</strong> The posting has no range. We match the title against the {SALARY_ROLES.length} benchmark roles (a &ldquo;Senior GNC Engineer&rdquo; matches the GNC engineer role at the senior band), apply the city multiplier from the table above, and round to the nearest $5k. If the title matches nothing we know, we show no band rather than a guess.</li>
                  </ul>
                  <p className="text-sm text-slate-400">The estimate is base salary only. It does not include equity, bonus, overtime, relocation or the value of a clearance. Treat it as the opening number for a conversation, not the number on the offer letter.</p>
                </section>

                <section id="premiums">
                  <h2 className="text-2xl font-bold text-white mb-4">Clearance, equity, overtime</h2>
                  <ul className="list-disc pl-5 space-y-3">
                    <li><strong className="text-white">Active clearance.</strong> A TS/SCI that is already adjudicated is the single largest premium in the industry outside of executive roles: the employer skips a year of waiting. Postings that require it sit roughly 10 to 20 percent above the same title without it. &ldquo;Ability to obtain&rdquo; is not a premium.</li>
                    <li><strong className="text-white">Equity at private launch and satellite companies.</strong> Base is close to the primes; the upside is stock. Value it at what the last priced round implies, then discount for the chance the company never lists or is acquired at a lower price. Ask for the strike price, the 409A, and the vesting cliff in writing.</li>
                    <li><strong className="text-white">Overtime.</strong> Many technician, test and launch-operations grades are hourly or overtime-eligible. During a campaign, take-home can run well above the base in the tables. Ask how many hours the last campaign actually took.</li>
                    <li><strong className="text-white">Government and FFRDC.</strong> NASA civil service and the labs (JPL, APL, Aerospace Corp.) pay below the private median at mid-career and above it in pension and stability. Their bands are public; look them up before the interview.</li>
                  </ul>
                </section>

                <section id="negotiate">
                  <h2 className="text-2xl font-bold text-white mb-4">Negotiating a space offer</h2>
                  <ol className="list-decimal pl-5 space-y-3">
                    <li><strong className="text-white">Anchor on the role, level and city,</strong> not the company. Use the benchmark median for your role at your level, times the city multiplier, as the number you name first.</li>
                    <li><strong className="text-white">Quote a stated range from a competing posting.</strong> The live table above tells you what employers in the same category are publishing right now; a posting from a competitor with a range is the most persuasive comparison you can bring.</li>
                    <li><strong className="text-white">Trade base for things the company can give cheaply:</strong> a signing bonus (one-off, does not compound their budget), relocation, an earlier review date, or a title bump that moves you into the next band.</li>
                    <li><strong className="text-white">If you hold a clearance,</strong> say so in the first sentence of the negotiation. It is the reason they can close the requisition this quarter.</li>
                    <li><strong className="text-white">Get the level in writing.</strong> Two offers with the same base can be a full band apart in what the next promotion pays.</li>
                  </ol>
                </section>

                <section id="faq">
                  <h2 className="text-2xl font-bold text-white mb-4">Frequently asked</h2>
                  <div className="space-y-4">
                    {FAQ.map((f) => (
                      <div key={f.q}>
                        <h3 className="text-base font-semibold text-white mb-1">{f.q}</h3>
                        <p className="text-sm text-slate-400 leading-relaxed">{f.a}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="pt-6 border-t border-white/[0.06]">
                  <h2 className="text-lg font-bold text-white mb-3">Keep going</h2>
                  <ul className="space-y-2 text-sm">
                    <li><Link href="/jobs" className="text-cyan-400 hover:text-cyan-300">The live jobs board</Link> — every posting with its salary band, filterable by category, company and remote.</li>
                    <li><Link href="/space-talent?tab=salaries" className="text-cyan-400 hover:text-cyan-300">Salary explorer</Link> — all {SALARY_ROLES.length} roles with skills, top employers and growth rate.</li>
                    <li><Link href="/guide/how-to-get-a-job-in-the-space-industry" className="text-cyan-400 hover:text-cyan-300">How to get a job in the space industry</Link> — where the jobs are and what the postings ask for.</li>
                    <li><Link href="/hire" className="text-cyan-400 hover:text-cyan-300">Hiring?</Link> — post a role with a stated range; postings with a range get more applicants.</li>
                  </ul>
                  <p className="text-xs text-slate-500 mt-4">
                    Benchmark figures are from the SpaceNexus salary dataset (as of {asOf}), compiled from stated ranges in postings, public pay bands and industry surveys, US base salary. Live figures are computed from job postings aggregated from company career sites at the moment the page loads{hub ? ` (board as of ${new Date(hub.asOf).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})` : ''}. Nothing here is an offer or a guarantee of pay.
                  </p>
                </section>
                <GuideNavigation currentSlug={SLUG} />
                <RelatedModules modules={PAGE_RELATIONS[`guide/${SLUG}`]} />
              </div>
            </article>
          </ScrollReveal>

          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org', '@type': 'Article', headline: title, description: DESCRIPTION,
            author: { '@type': 'Organization', name: 'SpaceNexus' }, publisher: { '@type': 'Organization', name: 'SpaceNexus' },
            datePublished: LAST_EDITED, dateModified: LAST_EDITED, mainEntityOfPage: { '@type': 'WebPage', '@id': CANONICAL },
          }) }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org', '@type': 'FAQPage',
            mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
          }) }} />
          <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Guides', href: '/guide' }, { name: 'Space industry salaries' }]} />
        </div>
      </div>
    </div>
  );
}
