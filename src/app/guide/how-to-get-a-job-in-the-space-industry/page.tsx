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
import { getHiringIndex, latestEditionMonthKey, parseMonthParam } from '@/lib/hiring-index';
import { getSalaryBenchmarks } from '@/lib/workforce-data';
import { JOB_CATEGORIES, SENIORITY_LEVELS } from '@/types';

// "How do I get a job in the space industry" (2026-09-04). The searches for
// this question return nothing useful — generic career-site listicles. We
// have the one thing they don't: ~6,500 live postings from 16 ATS boards,
// a monthly hiring index, and salary ranges from the postings that state
// them. So every number on this page is read from those at request time,
// and the advice is organised around what the postings actually ask for.
export const dynamic = 'force-dynamic';

const SLUG = 'how-to-get-a-job-in-the-space-industry';
const CANONICAL = `https://spacenexus.us/guide/${SLUG}`;
const DESCRIPTION =
  'Where the jobs are, who is hiring, what they pay and what the postings ask for — read live from thousands of space-industry job listings. Six routes in, including the no-degree path, plus clearance and ITAR realities.';
/** Bumped by hand when the prose changes; the figures are live. */
const LAST_EDITED = '2026-09-04T00:00:00Z';

const getHub = cache(() => getJobsHubData());
const getIndex = cache(() => {
  const parsed = parseMonthParam(latestEditionMonthKey());
  return parsed ? getHiringIndex(parsed.year, parsed.month) : Promise.resolve(null);
});
const getSalaries = cache(() => getSalaryBenchmarks());

function titleFor(active: number | null): string {
  if (active && active >= 1000) {
    const rounded = Math.floor(active / 100) * 100;
    return `How to Get a Job in the Space Industry (2026): What ${rounded.toLocaleString('en-US')}+ Live Postings Say`;
  }
  return 'How to Get a Job in the Space Industry (2026): What the Live Postings Say';
}

export async function generateMetadata(): Promise<Metadata> {
  let active: number | null = null;
  try { active = (await getHub())?.activeCount ?? null; } catch { /* static title */ }
  const title = titleFor(active);
  return {
    title,
    description: DESCRIPTION,
    keywords: ['how to get a job in the space industry', 'space industry jobs', 'space careers', 'aerospace jobs no degree', 'spacex jobs requirements', 'space industry salary', 'how to work at nasa', 'space jobs entry level'],
    alternates: { canonical: CANONICAL },
    openGraph: { title, description: DESCRIPTION, type: 'article', publishedTime: LAST_EDITED, modifiedTime: LAST_EDITED, authors: ['SpaceNexus'] },
    twitter: { card: 'summary_large_image', title, description: DESCRIPTION },
  };
}

const TOC = [
  { id: 'verdict', label: 'The short answer' },
  { id: 'where', label: 'Where the jobs are (live)' },
  { id: 'who', label: 'Who is hiring right now' },
  { id: 'pay', label: 'What it pays' },
  { id: 'location', label: 'Where you have to live' },
  { id: 'routes', label: 'Six routes in' },
  { id: 'no-degree', label: 'The no-degree path' },
  { id: 'clearance', label: 'Citizenship, clearances and ITAR' },
  { id: 'apply', label: 'How to actually apply' },
  { id: 'faq', label: 'FAQ' },
];

const FAQ = [
  { q: 'Do I need an engineering degree to work in the space industry?', a: 'No. Engineering is the largest category of postings, but manufacturing, operations, business and legal roles together make up a large share, and many technician, machinist, welder, quality and test roles ask for certifications or trade experience rather than a degree. The no-degree section of this guide lists which roles those are.' },
  { q: 'Can I work in the US space industry as a non-citizen?', a: 'Sometimes. Many US postings require a "US person" (citizen or permanent resident) because the work touches ITAR-controlled technology, and defence-adjacent roles require a clearance that only citizens can hold. Commercial satellite operators, software, data and business roles are more often open. Read the citizenship line in each posting before you apply; it is rarely negotiable.' },
  { q: 'What does an entry-level space job pay?', a: 'Use the live salary table on this page: it is computed from the postings that state a range, grouped by seniority. Entry-level ranges vary widely by role and city, and postings that omit a range are excluded, so treat the table as the floor of what employers are willing to print.' },
  { q: 'Is SpaceX the only company hiring?', a: 'Far from it. The "who is hiring" table on this page ranks companies by live open roles. The primes, the newer launch companies, satellite operators, Earth-observation firms and the defence-space startups all post continuously, and several smaller companies have more open roles than their size suggests.' },
  { q: 'Are remote space jobs real?', a: 'Some are — the live remote share on this page tells you how many. Hardware, test, launch and manufacturing roles are almost always on site; software, analysis, business development and some engineering roles are the ones that go remote or hybrid.' },
  { q: 'How do I get from another industry into space?', a: 'Lead with the skill the posting names, not the industry you came from. Automotive manufacturing, semiconductor cleanrooms, oil-and-gas field operations, defence software and finance all transfer directly to specific space roles; this guide maps which. The industry hires for the skill and teaches the domain.' },
  { q: 'When are the most jobs posted?', a: 'Our hiring index tracks new postings month by month. Hiring follows funding and contract awards more than the calendar: a company that just closed a round or won a government contract posts in bursts. The movers table on the monthly index shows who is expanding right now.' },
];

function money(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `$${Math.round(n / 1000)}k`;
}

export default async function HowToGetASpaceJobGuide() {
  const [hub, index, salaries] = await Promise.all([
    getHub().catch(() => null),
    getIndex().catch(() => null),
    getSalaries().catch(() => null),
  ]);
  const edited = new Date(LAST_EDITED);
  const title = titleFor(hub?.activeCount ?? null);
  const categories = (hub?.categories ?? []).slice().sort((a, b) => b.count - a.count);
  const totalCat = categories.reduce((s, c) => s + c.count, 0);
  const topCompanies = (hub?.topCompanies ?? []).slice(0, 15);
  const bySeniority = SENIORITY_LEVELS.map((lvl) => ({
    ...lvl,
    row: salaries?.bySeniority.find((r) => r.seniorityLevel === lvl.value) ?? null,
  })).filter((x) => x.row && x.row.count > 0);
  const byCategory = JOB_CATEGORIES.map((cat) => ({
    ...cat,
    row: salaries?.byCategory.find((r) => r.category === cat.value) ?? null,
  })).filter((x) => x.row && x.row.count > 0);
  const rawRemote = index?.remoteShare.percent ?? (hub && hub.activeCount > 0 ? (hub.remoteCount / hub.activeCount) * 100 : null);
  // The index reports an unrounded ratio; one decimal is all a reader needs.
  const remotePct = rawRemote == null ? null : Math.round(rawRemote * 10) / 10;

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6 flex-wrap">
            <Link href="/" className="hover:text-white/80">Home</Link><span>/</span>
            <Link href="/guide" className="hover:text-white/80">Guides</Link><span>/</span>
            <span className="text-slate-400">Get a job in space</span>
          </nav>

          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{title}</h1>
            <p className="text-lg text-slate-300 leading-relaxed">
              Most advice about space careers is written by people who have never read a space job posting. We read all of them, continuously — every listing from the industry&apos;s applicant-tracking systems — so this guide is organised around what employers actually ask for, with the numbers pulled live.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-400">
              <span>Updated {edited.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} · figures live</span>
              <span>|</span>
              <span>By SpaceNexus Team</span>
              <span>|</span>
              <ReadingTime wordCount={2600} className="flex items-center gap-1.5" />
            </div>
          </header>
          <HeroArt src="/art/hero-space-operations.png" className="mb-8" />

          <nav className="card p-6 mb-10">
            <h2 className="text-lg font-bold text-white mb-3">In this guide</h2>
            <ol className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {TOC.map((item, i) => (
                <li key={item.id}><a href={`#${item.id}`} className="text-slate-300 hover:text-white text-sm transition-colors">{i + 1}. {item.label}</a></li>
              ))}
            </ol>
          </nav>

          <ScrollReveal delay={0.1}>
            <article className="card p-8 space-y-10">
              <section id="verdict">
                <h2 className="text-2xl font-bold text-white mb-4">The short answer</h2>
                {hub && (
                  <p className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-slate-300 leading-relaxed mb-5">
                    <strong className="text-cyan-300">Right now:</strong> {hub.activeCount.toLocaleString('en-US')} open space-industry roles across {hub.companiesHiring.toLocaleString('en-US')} companies on our board{remotePct != null ? `, ${remotePct}% of them remote or hybrid` : ''}.
                    {categories[0] ? ` The largest category is ${categories[0].label.toLowerCase()}.` : ''}
                  </p>
                )}
                <p className="text-slate-400 leading-relaxed mb-4">
                  The space industry hires for skills, not for a love of space. Nobody is paid to be enthusiastic. They are paid to design a valve, run a test campaign, machine a part to tolerance, close a government contract, write flight software, or keep a satellite operator on the right side of export law. If you can already do one of those things in another industry, you are closer than you think; if you cannot yet, the fastest route is to pick one and get demonstrably good at it.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Three things separate this industry from most others. It is <strong className="text-slate-300">geographically concentrated</strong> — a handful of metro areas hold most of the roles, and hardware jobs do not go remote. It is <strong className="text-slate-300">citizenship-sensitive</strong> — a large share of US postings require a US person because the technology is export-controlled. And it <strong className="text-slate-300">hires in bursts</strong>, following funding rounds and contract awards, which is why watching who is expanding matters more than watching the calendar.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  The rest of this guide is the live picture — where, who, how much — followed by the six routes in, including the one that needs no degree.
                </p>
              </section>

              <section id="where">
                <h2 className="text-2xl font-bold text-white mb-4">Where the jobs are (live)</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Open roles by category, from the board at the moment you loaded this page. The shape is the point: engineering is the biggest slice, but it is not the majority, and the rest is where people who did not study aerospace get in.
                </p>
                {categories.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {categories.map((c) => {
                      const pct = totalCat > 0 ? Math.round((c.count / totalCat) * 100) : 0;
                      return (
                        <div key={c.value} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                          <div className="flex items-center justify-between gap-4 text-sm">
                            <span className="text-white font-medium"><span aria-hidden="true">{c.icon}</span> {c.label}</span>
                            <span className="text-slate-300 tabular-nums">{c.count.toLocaleString('en-US')} <span className="text-slate-500">· {pct}%</span></span>
                          </div>
                          <div className="h-1.5 mt-2 w-full rounded-full bg-white/[0.06] overflow-hidden" aria-hidden="true">
                            <div className="h-full rounded-full bg-cyan-500/60" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm mb-4">Live category counts are unavailable right now — see the <Link href="/jobs" className="text-cyan-400 hover:text-cyan-300">jobs board</Link>.</p>
                )}
                {index && index.newPostings.total > 0 && (
                  <p className="text-slate-400 leading-relaxed">
                    New postings in {index.monthLabel}: <strong className="text-slate-300">{index.newPostings.total.toLocaleString('en-US')}</strong>
                    {index.newPostings.bySeniority[0] ? <>, led by <strong className="text-slate-300">{SENIORITY_LEVELS.find((s) => s.value === index.newPostings.bySeniority[0].key)?.label ?? index.newPostings.bySeniority[0].key}</strong> roles</> : null}
                    . The full monthly picture, with month-on-month movers, is in the <Link href={`/hiring-index/${index.month}`} className="text-cyan-400 hover:text-cyan-300">Space Hiring Index</Link>.
                  </p>
                )}
              </section>

              <section id="who">
                <h2 className="text-2xl font-bold text-white mb-4">Who is hiring right now</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Companies ranked by live open roles. Apply to the ones near the top of this list before the ones you have heard of: a company with sixty open roles is a company that needs people this quarter, and that changes how your application is read.
                </p>
                {topCompanies.length > 0 ? (
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full text-sm min-w-[420px]">
                      <thead>
                        <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                          <th className="px-3 py-2.5">#</th><th className="px-3 py-2.5">Company</th><th className="px-3 py-2.5 text-right">Open roles</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topCompanies.map((c, i) => (
                          <tr key={c.slug ?? c.name} className="border-b border-white/[0.06] last:border-0">
                            <td className="px-3 py-2.5 text-slate-500 tabular-nums">{i + 1}</td>
                            <td className="px-3 py-2.5 text-white">
                              {c.slug ? <Link href={`/company-profiles/${c.slug}`} className="hover:text-cyan-300">{c.name}</Link> : c.name}
                            </td>
                            <td className="px-3 py-2.5 text-right text-white tabular-nums">{c.activeCount.toLocaleString('en-US')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm mb-4">The live company ranking is unavailable right now — the <Link href="/jobs" className="text-cyan-400 hover:text-cyan-300">jobs board</Link> has it.</p>
                )}
                {index && index.movers.gainers.length > 0 && (
                  <p className="text-slate-400 leading-relaxed">
                    Expanding fastest in {index.monthLabel}: {index.movers.gainers.slice(0, 4).map((m, i) => (
                      <span key={m.companyName}>{i > 0 ? ', ' : ''}<strong className="text-slate-300">{m.companyName}</strong> ({m.change > 0 ? '+' : ''}{m.change})</span>
                    ))}. A company on that list has just raised money or won a contract; that is when to apply.
                  </p>
                )}
              </section>

              <section id="pay">
                <h2 className="text-2xl font-bold text-white mb-4">What it pays</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Computed from the live postings that state a salary range, so these are the numbers employers were willing to print, not survey self-reports. Postings without a range are excluded, which biases this toward companies in states that require pay transparency — and those ranges are the ones you can actually negotiate against.
                </p>
                {bySeniority.length > 0 ? (
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full text-sm min-w-[520px]">
                      <thead>
                        <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                          <th className="px-3 py-2.5">Seniority</th><th className="px-3 py-2.5 text-right">Typical low</th><th className="px-3 py-2.5 text-right">Median</th><th className="px-3 py-2.5 text-right">Typical high</th><th className="px-3 py-2.5 text-right">Postings</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bySeniority.map(({ value, label, row }) => (
                          <tr key={value} className="border-b border-white/[0.06] last:border-0">
                            <td className="px-3 py-2.5 text-white">{label}</td>
                            <td className="px-3 py-2.5 text-right text-slate-300 tabular-nums">{money(row!.avgMin)}</td>
                            <td className="px-3 py-2.5 text-right text-white tabular-nums">{money(row!.avgMedian)}</td>
                            <td className="px-3 py-2.5 text-right text-slate-300 tabular-nums">{money(row!.avgMax)}</td>
                            <td className="px-3 py-2.5 text-right text-slate-500 tabular-nums">{row!.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm mb-4">Live salary benchmarks are unavailable right now — see <Link href="/space-talent?tab=salaries" className="text-cyan-400 hover:text-cyan-300">Salary Benchmarks</Link>.</p>
                )}
                {byCategory.length > 0 && (
                  <p className="text-slate-400 leading-relaxed">
                    By function, the highest stated medians right now are {byCategory.slice().sort((a, b) => (b.row!.avgMedian - a.row!.avgMedian)).slice(0, 3).map((c, i) => (
                      <span key={c.value}>{i > 0 ? ', ' : ''}<strong className="text-slate-300">{c.label.toLowerCase()}</strong> ({money(c.row!.avgMedian)})</span>
                    ))}. Full breakdown on the <Link href="/space-talent?tab=salaries" className="text-cyan-400 hover:text-cyan-300">salary benchmarks page</Link>.
                  </p>
                )}
              </section>

              <section id="location">
                <h2 className="text-2xl font-bold text-white mb-4">Where you have to live</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Hardware does not commute. Launch, test, integration and manufacturing roles sit where the factories and pads are, and the industry is more concentrated than almost any other: Southern California, the Space Coast, the Seattle area, Colorado&apos;s Front Range, Houston, Huntsville, and the DC area for government and defence. Software, data and business roles are the exception — those are the ones that go remote.
                </p>
                {index && index.topLocations.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                    {index.topLocations.slice(0, 8).map((l) => (
                      <div key={l.location} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                        <div className="text-white text-sm font-medium truncate">{l.location}</div>
                        <div className="text-slate-400 text-xs tabular-nums">{l.count.toLocaleString('en-US')} new in {index.monthLabel}</div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-slate-400 leading-relaxed">
                  {remotePct != null ? <>About <strong className="text-slate-300">{remotePct}%</strong> of open roles are remote or hybrid today. </> : null}
                  If you are not willing to relocate, filter for the remote-eligible categories from the start rather than applying broadly and being screened out on the first question. If you are willing, say so in the first line of your application; recruiters in this industry read for it.
                </p>
              </section>

              <section id="routes">
                <h2 className="text-2xl font-bold text-white mb-4">Six routes in</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  The six categories the industry posts in, what the postings actually ask for, and which adjacent industries already have the skill.
                </p>
                <div className="space-y-5">
                  {[
                    { icon: '⚙️', name: 'Engineering', ask: 'A bachelor\'s in mechanical, aerospace, electrical or software engineering; hands-on project evidence (a rocketry team, a CubeSat, a robotics competition, a personal build) matters more than GPA; CAD, GD&T, structural or thermal analysis, embedded C/C++, Python; for flight software, real-time systems and testing discipline.', from: 'Automotive and EV, defence, semiconductors, robotics, medical devices, any embedded-systems shop.' },
                    { icon: '🏭', name: 'Manufacturing', ask: 'Machinists, welders (especially TIG on aluminium and stainless), composites technicians, avionics and harness technicians, quality inspectors, CNC programmers. Certifications and a portfolio of tolerances held beat degrees.', from: 'Aerospace suppliers, automotive plants, shipyards, oil and gas fabrication, semiconductor fabs (cleanroom discipline transfers directly).' },
                    { icon: '🎯', name: 'Operations', ask: 'Launch and range operations, mission and satellite operations, test conductors, propellant and pad crews, supply chain and production planning. Shift work, procedures, and calm under a countdown. Military operations backgrounds are prized.', from: 'Military (especially missile, aviation and naval nuclear), airline operations, power plants, process industries.' },
                    { icon: '💼', name: 'Business', ask: 'Business development into government and defence (capture, proposals, FAR/DFARS literacy), programme and project management (EVM, schedules), finance, contracts, recruiting, marketing. Government-contracting experience is the fast lane.', from: 'Defence contractors, consulting, government agencies, any regulated B2B sales role.' },
                    { icon: '🔬', name: 'Research', ask: 'Advanced degrees in physics, planetary science, materials, propulsion, RF, optics, or data science; publications; instrument or experiment experience. Fewer roles, longer searches, and NASA centres, JPL, national labs and universities hold most of them.', from: 'Academia, national labs, semiconductor and photonics R&D, meteorology and remote sensing.' },
                    { icon: '⚖️', name: 'Legal and regulatory', ask: 'Export control (ITAR/EAR), FCC and ITU spectrum licensing, FAA launch licensing, government contracts law, and increasingly space-traffic and debris policy. A small field where specific regulatory experience is worth more than a general practice pedigree.', from: 'Defence and export-compliance practices, telecom regulatory, government agencies, trade compliance departments.' },
                  ].map((r) => (
                    <div key={r.name} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                      <h3 className="text-base font-semibold text-white mb-2"><span aria-hidden="true">{r.icon}</span> {r.name}</h3>
                      <p className="text-sm text-slate-400 leading-relaxed mb-2"><strong className="text-slate-300">What the postings ask for:</strong> {r.ask}</p>
                      <p className="text-sm text-slate-400 leading-relaxed"><strong className="text-slate-300">Where the skill already lives:</strong> {r.from}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section id="no-degree">
                <h2 className="text-2xl font-bold text-white mb-4">The no-degree path</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  A rocket is mostly metal, composites and wiring, and somebody has to make, join, inspect and install all of it. Technician roles — machinist, welder, composite layup, avionics and harness assembly, propulsion technician, quality inspector, test technician, tooling — are posted continuously by every hardware company, and the barrier is a demonstrated skill, not a diploma. Certifications that show up in postings: AWS welding certs, FAA airframe-and-powerplant, IPC-620 and J-STD-001 for wiring and soldering, NIMS for machining, and a forklift or crane licence more often than you would expect.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  The other no-degree door is the military. Missile, aviation, naval nuclear and communications specialties map almost one-to-one onto launch operations, propulsion test, satellite operations and RF roles, and defence-adjacent space companies actively recruit veterans because they already hold or can quickly get a clearance.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  What does not work: applying for engineering roles without engineering credentials. The technician track has its own ladder — technician, lead, supervisor, manufacturing engineer with a later degree — and it is a real career, not a consolation.
                </p>
              </section>

              <section id="clearance">
                <h2 className="text-2xl font-bold text-white mb-4">Citizenship, clearances and ITAR</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Read the citizenship line before anything else in a US posting. Rockets, satellites and their components are on the US Munitions List or controlled under the EAR, and a company cannot let a non-US person see controlled technical data without a licence it usually will not apply for. That is why so many postings say &ldquo;must be a US citizen or lawful permanent resident&rdquo; — it is export law, not preference, and it is not negotiable at the recruiter level. Our <Link href="/guide/itar-compliance-guide" className="text-cyan-400 hover:text-cyan-300">ITAR compliance guide</Link> explains the rules.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Defence and intelligence-adjacent roles add a security clearance on top, which requires citizenship and a background investigation that can take months. A posting that says &ldquo;active TS/SCI required&rdquo; is not going to sponsor you; one that says &ldquo;ability to obtain&rdquo; will. Holding a clearance is worth a substantial premium, which is one reason veterans move into the industry so easily.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  If you are not a US person, the open doors are the commercial satellite operators and constellation companies, software and data roles, business functions, and — more broadly — the European, Japanese, Indian, Australian and Canadian industries, each with its own agency and commercial ecosystem and far fewer citizenship gates on commercial work.
                </p>
              </section>

              <section id="apply">
                <h2 className="text-2xl font-bold text-white mb-4">How to actually apply</h2>
                <ul className="space-y-3 text-slate-400 leading-relaxed">
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">Apply to the expanding companies first.</strong> The hiring index&apos;s monthly movers are companies that just funded or won work. Their recruiters are under pressure to fill seats; a well-matched application gets read.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">Mirror the posting&apos;s nouns.</strong> Applicant-tracking systems and the humans behind them search for the specific tools and standards in the listing. If it says GD&T, NX, TIG, EVM or ITAR, those words belong in your résumé where they are true.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">Show something you built.</strong> For engineers and technicians this industry weights evidence over credentials more than most: a student rocket, a CubeSat, a machining portfolio with tolerances, a GitHub with a flight-software-style project. It is the single most common differentiator recruiters mention.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">State relocation and citizenship in the first line.</strong> Those are the first two screens. Answering them before they are asked saves your application from the pile.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">Set an alert instead of refreshing.</strong> New roles at the companies you care about, delivered when they post: <Link href="/jobs#alerts" className="text-cyan-400 hover:text-cyan-300">space job alerts</Link>. The whole live board is at <Link href="/jobs" className="text-cyan-400 hover:text-cyan-300">/jobs</Link>.</span></li>
                </ul>
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
                  <li><Link href="/jobs" className="text-cyan-400 hover:text-cyan-300">The live jobs board</Link> — every posting, filterable by category, company and remote.</li>
                  <li><Link href={`/hiring-index/${index?.month ?? latestEditionMonthKey()}`} className="text-cyan-400 hover:text-cyan-300">Space Hiring Index</Link> — who is expanding and contracting, month by month.</li>
                  <li><Link href="/space-talent?tab=salaries" className="text-cyan-400 hover:text-cyan-300">Salary benchmarks</Link> — ranges by function and seniority.</li>
                  <li><Link href="/guide/itar-compliance-guide" className="text-cyan-400 hover:text-cyan-300">ITAR compliance guide</Link> — why the citizenship line is there.</li>
                </ul>
                <p className="text-xs text-slate-500 mt-4">
                  Figures on this page are computed from job postings aggregated from company career sites at the moment the page loads{hub ? ` (board as of ${new Date(hub.asOf).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })})` : ''}. Salary figures include only postings that state a range. Advice is general and not individual career counselling.
                </p>
              </section>
              <GuideNavigation currentSlug={SLUG} />
              <RelatedModules modules={PAGE_RELATIONS[`guide/${SLUG}`]} />
            </article>
          </ScrollReveal>

          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org', '@type': 'Article', headline: title, description: DESCRIPTION,
            author: { '@type': 'Organization', name: 'SpaceNexus' }, publisher: { '@type': 'Organization', name: 'SpaceNexus', logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/logo.png' } },
            datePublished: LAST_EDITED, dateModified: LAST_EDITED, mainEntityOfPage: { '@type': 'WebPage', '@id': CANONICAL },
          }).replace(/</g, '\\u003c') }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org', '@type': 'FAQPage',
            mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
          }).replace(/</g, '\\u003c') }} />
          <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Guides', href: '/guide' }, { name: 'Get a job in the space industry' }]} />
        </div>
      </div>
    </div>
  );
}
