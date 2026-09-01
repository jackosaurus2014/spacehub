import type { Metadata } from 'next';
import Link from 'next/link';
import Console from '@/components/ui/Console';
import Telemetry from '@/components/ui/Telemetry';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import FAQSchema from '@/components/seo/FAQSchema';
import DatasetSchema from '@/components/seo/DatasetSchema';
import CiteEmbed from '@/components/CiteEmbed';
import { getSpaceBudgetPageData, fmtUsdM, fmtPct, PROGRAM_TABLE_SIZE } from '@/lib/space-budget-page';

// /space-budget — the server-rendered, citable answer to "how big is the US
// space budget". The interactive tabs live on /procurement (client-side,
// fetched after hydration, invisible to crawlers); this page puts the same
// curated tables in the HTML. Hand-curated seed data, refreshed each budget
// cycle — the page says so, and asOf is the real newest row timestamp.
export const dynamic = 'force-dynamic';

const PROVENANCE = "Curated from FY2026 President's Budget Request and committee records";

export const metadata: Metadata = {
  title: 'US Space Budget Tracker — NASA, Space Force, NOAA, DARPA FY2026',
  description: 'Request vs enacted vs prior year for NASA, Space Force, NOAA and DARPA space programs, line by line, plus the congressional hearings, markups and bills that decide them. Curated from the FY2026 President\'s Budget Request and committee records.',
  alternates: { canonical: 'https://spacenexus.us/space-budget' },
};

function fmtDate(iso: string | null, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }): string {
  return iso ? new Date(iso).toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' }) : 'TBD';
}

function deltaClass(v: number | null): string {
  if (v == null) return 'text-slate-500';
  return v > 0 ? 'text-emerald-400' : v < 0 ? 'text-amber-400' : 'text-slate-400';
}

const STATUS_LABEL: Record<string, string> = { scheduled: 'Scheduled', completed: 'Completed', postponed: 'Postponed' };
const TYPE_LABEL: Record<string, string> = { hearing: 'Hearing', markup: 'Markup', authorization: 'Authorization', appropriation: 'Appropriation', report: 'Report' };

export default async function SpaceBudgetPage() {
  const data = await getSpaceBudgetPageData();
  const fy = data?.latestFiscalYear ?? 2026;
  const ex = data?.requestEnactedExample ?? null;

  const faq = data ? [
    {
      question: `How big is NASA's FY${fy} budget request?`,
      answer: data.nasaRequest != null
        ? `Across the ${data.nasaLineItems} NASA line items tracked here, the FY${fy} President's Budget Request totals ${fmtUsdM(data.nasaRequest)} (${data.nasaRequest.toLocaleString('en-US')} million USD). These are the major program lines — Artemis, SLS, Orion, HLS, Science, ISS, commercial LEO destinations, Space Technology and Aeronautics — not every account in the agency's full submission, so the headline agency figure is larger.`
        : `The tracked NASA line items for FY${fy} have no request figures loaded yet.`,
    },
    {
      question: 'How is the US Space Force funded?',
      answer: data.spaceForceRequest != null
        ? `The Space Force is funded through the Department of Defense: Congress authorizes programs in the annual National Defense Authorization Act (NDAA) and appropriates the money in the Defense Appropriations Act. Its budget is split across procurement, research/development/test/evaluation (RDT&E) and operations & maintenance accounts. Across the tracked FY${fy} line items the request totals ${fmtUsdM(data.spaceForceRequest)}: ${data.spaceForceCategories.map(c => `${c.category} ${fmtUsdM(c.request)}`).join(', ')}.`
        : 'The Space Force is funded through the Department of Defense: Congress authorizes programs in the annual NDAA and appropriates the money in the Defense Appropriations Act, split across procurement, RDT&E and operations & maintenance accounts.',
    },
    {
      question: "What's the difference between a budget request and an enacted amount?",
      answer: ex
        ? `The request is what the President asks Congress for in the annual budget submission; the enacted amount is what Congress actually appropriates in law, which can be higher or lower. Example from this table: ${ex.agency} ${ex.program ?? ex.category} FY${ex.fiscalYear} was requested at ${fmtUsdM(ex.requestAmount)} and enacted at ${fmtUsdM(ex.enactedAmount)} — a ${fmtPct(ex.requestAmount ? Math.round((((ex.enactedAmount ?? 0) - ex.requestAmount) / ex.requestAmount) * 1000) / 10 : null)} change by Congress. Current-year lines show a request but no enacted figure until appropriations pass.`
        : 'The request is what the President asks Congress for in the annual budget submission; the enacted amount is what Congress actually appropriates in law, which can be higher or lower. Current-year lines show a request but no enacted figure until appropriations pass.',
    },
  ] : [];

  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-5xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6">
          <Link href="/" className="hover:text-white/80">Home</Link><span>/</span>
          <Link href="/procurement" className="hover:text-white/80">Contracts &amp; Opportunities</Link><span>/</span>
          <span className="text-slate-400">Space Budget</span>
        </nav>
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">US Space Budget Tracker</h1>
          <p className="text-lg text-white/70 max-w-3xl">
            What Washington asked for, what it enacted, and what it spent last year — NASA, Space Force, NOAA and
            DARPA, line by line — plus the hearings, markups and bills that decide the numbers. Amounts in USD millions.
          </p>
          <p className="mt-3 text-sm text-slate-400 max-w-3xl">
            This table is <span className="text-white/90">hand-curated</span> from the FY{fy} President&apos;s Budget Request and
            committee records and refreshed with each budget cycle — it is not a live feed. Filter and export it on the{' '}
            <Link href="/procurement?tab=budget" className="text-cyan-300 hover:underline">interactive budget tracker</Link>{' '}
            or the <Link href="/procurement?tab=congressional" className="text-cyan-300 hover:underline">congressional tracker</Link>.
          </p>
        </header>

        {!data || data.budgetRowCount === 0 ? (
          <div className="card p-6"><p className="text-slate-400 text-sm">Budget data is temporarily unavailable.</p></div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Telemetry label={`NASA FY${fy} request`} value={fmtUsdM(data.nasaRequest)} sub={`${data.nasaLineItems} tracked lines`} />
              <Telemetry label={`Space Force FY${fy} request`} value={fmtUsdM(data.spaceForceRequest)} sub={`${data.spaceForceCategories.length} accounts`} />
              <Telemetry label="Budget lines tracked" value={data.budgetRowCount} sub={`${data.agencies.length} agency-years`} />
              <Telemetry label="Congressional actions" value={data.congressRowCount} sub="hearings, markups, bills" />
            </div>

            <Console title="By agency — request vs enacted vs prior year" source={PROVENANCE} asOf={data.asOf} status="verified">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">Space budget totals by agency and fiscal year: request, enacted, prior year and percent change</caption>
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                      <th className="py-2 pr-3">Agency</th>
                      <th className="py-2 pr-3">FY</th>
                      <th className="py-2 pr-3 text-right">Request</th>
                      <th className="py-2 pr-3 text-right">Enacted</th>
                      <th className="py-2 pr-3 text-right">Prior year</th>
                      <th className="py-2 pr-3 text-right">Req vs prior</th>
                      <th className="py-2 pr-3 text-right">Enacted vs req</th>
                      <th className="py-2 text-right">Lines</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.agencies.map(a => (
                      <tr key={`${a.agency}-${a.fiscalYear}`} className="border-b border-white/[0.04]">
                        <td className="py-2 pr-3 text-white/90">{a.agency}</td>
                        <td className="py-2 pr-3 font-mono tabular-nums text-slate-400">{a.fiscalYear}</td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums text-white">{fmtUsdM(a.totalRequest)}</td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums text-slate-300">{fmtUsdM(a.totalEnacted)}</td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums text-slate-300">{fmtUsdM(a.totalPreviousYear)}</td>
                        <td className={`py-2 pr-3 text-right font-mono tabular-nums ${deltaClass(a.requestVsPriorPct)}`}>{fmtPct(a.requestVsPriorPct)}</td>
                        <td className={`py-2 pr-3 text-right font-mono tabular-nums ${deltaClass(a.enactedVsRequestPct)}`}>{fmtPct(a.enactedVsRequestPct)}</td>
                        <td className="py-2 text-right font-mono tabular-nums text-slate-500">{a.lineItems}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Totals sum the tracked line items only, so they are smaller than each agency&apos;s full topline. Enacted is blank until appropriations are signed.
              </p>
            </Console>

            <Console title={`By program — top ${PROGRAM_TABLE_SIZE} by request`} source={PROVENANCE} asOf={data.asOf} status="verified">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">Largest tracked space budget lines by request amount, with enacted and prior-year figures and notes</caption>
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                      <th className="py-2 pr-3">Program</th>
                      <th className="py-2 pr-3">Agency</th>
                      <th className="py-2 pr-3">FY</th>
                      <th className="py-2 pr-3 text-right">Request</th>
                      <th className="py-2 pr-3 text-right">Enacted</th>
                      <th className="py-2 pr-3 text-right">Prior</th>
                      <th className="py-2 pr-3 text-right">YoY</th>
                      <th className="py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.programs.map((p, i) => (
                      <tr key={`${p.agency}-${p.fiscalYear}-${p.program ?? p.category}-${i}`} className="border-b border-white/[0.04] align-top">
                        <td className="py-2 pr-3 text-white/90 whitespace-nowrap">{p.program ?? p.category}<div className="text-[11px] text-slate-500">{p.category}</div></td>
                        <td className="py-2 pr-3 text-slate-400 whitespace-nowrap">{p.agency}</td>
                        <td className="py-2 pr-3 font-mono tabular-nums text-slate-400">{p.fiscalYear}</td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums text-white">{fmtUsdM(p.requestAmount)}</td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums text-slate-300">{fmtUsdM(p.enactedAmount)}</td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums text-slate-300">{fmtUsdM(p.previousYear)}</td>
                        <td className={`py-2 pr-3 text-right font-mono tabular-nums ${deltaClass(p.changePercent)}`}>{fmtPct(p.changePercent)}</td>
                        <td className="py-2 text-slate-400 text-xs min-w-[220px]">{p.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Console>

            <Console title="Congressional calendar" source={PROVENANCE} asOf={data.asOf} status="verified">
              {data.congress.length === 0 ? (
                <p className="text-slate-400 text-sm">No congressional activity recorded yet.</p>
              ) : (
                <ul className="divide-y divide-white/[0.04]">
                  {data.congress.map(c => (
                    <li key={c.id} className="py-3 flex flex-col md:flex-row md:items-baseline gap-1 md:gap-4">
                      <span className="font-mono tabular-nums text-xs text-slate-400 md:w-28 shrink-0">{fmtDate(c.date)}</span>
                      <span className="text-xs text-slate-500 md:w-44 shrink-0">{c.committee}{c.subcommittee ? ` · ${c.subcommittee}` : ''}</span>
                      <span className="flex-1 min-w-0">
                        <span className="text-white/90">{c.sourceUrl ? <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-300">{c.title}</a> : c.title}</span>
                        <span className="ml-2 text-[11px] uppercase tracking-wider text-slate-500">{TYPE_LABEL[c.type] ?? c.type}{c.billNumber ? ` · ${c.billNumber}` : ''}</span>
                      </span>
                      <span className={`text-xs shrink-0 ${c.status === 'completed' ? 'text-emerald-400' : c.status === 'postponed' ? 'text-amber-400' : 'text-cyan-300'}`}>
                        {c.status ? (STATUS_LABEL[c.status] ?? c.status) : '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-slate-500">
                Filter by committee and type on the <Link href="/procurement?tab=congressional" className="text-cyan-300 hover:underline">congressional tracker</Link>.
              </p>
            </Console>

            <CiteEmbed
              title="US Space Budget Tracker"
              pageUrl="https://spacenexus.us/space-budget"
              sourceLine={`SpaceNexus US Space Budget Tracker (${PROVENANCE.toLowerCase()})`}
            />

            <p className="text-sm text-slate-500">
              Related: <Link href="/procurement" className="text-cyan-300 hover:underline">contracts &amp; opportunities</Link>{' · '}
              <Link href="/procurement?tab=global-budgets" className="text-cyan-300 hover:underline">global space budgets</Link>{' · '}
              <Link href="/regulatory-radar" className="text-cyan-300 hover:underline">regulatory radar</Link>{' · '}
              <Link href="/space-defense" className="text-cyan-300 hover:underline">space defense</Link>
            </p>
          </div>
        )}

        {faq.length > 0 && <FAQSchema items={faq} />}
        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Contracts & Opportunities', href: '/procurement' }, { name: 'Space Budget' }]} />
        {data && data.budgetRowCount > 0 && (
          <DatasetSchema
            name="SpaceNexus US Space Budget Tracker"
            description={`Request, enacted and prior-year amounts for NASA, Space Force, NOAA and DARPA space programs by fiscal year and program, with notes, plus a calendar of congressional hearings, markups and bills. ${PROVENANCE}; hand-curated and refreshed each budget cycle.`}
            url="https://spacenexus.us/space-budget"
            temporalCoverage={`${Math.min(...data.agencies.map(a => a.fiscalYear))}/${fy}`}
            dateModified={data.asOf ?? undefined}
            keywords={['NASA budget', 'Space Force budget', 'space appropriations', "President's Budget Request", 'NDAA']}
          />
        )}
      </div>
    </div>
  );
}
