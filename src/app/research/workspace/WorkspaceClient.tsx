'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from '@/lib/toast';

interface DatasetInfo {
  id: string;
  label: string;
  coverage: string;
}

interface SeatRow {
  id: string;
  email: string;
  status: string;
  acceptedAt: string | null;
  withinCap?: boolean;
}

interface ScreenRow {
  id: string;
  name: string;
  summary: string;
  alertCadence: string;
  lastRunAt: string | null;
  lastResultCount: number;
}

interface PortfolioRow {
  id: string;
  name: string;
  holdings: string[];
}

type TabId = 'exports' | 'portfolios' | 'screens' | 'quarterly' | 'seats';

const BASE_TABS: { id: TabId; label: string }[] = [
  { id: 'exports', label: 'Exports' },
  { id: 'portfolios', label: 'Portfolio exposure' },
  { id: 'screens', label: 'Screens' },
  { id: 'quarterly', label: 'Quarterly' },
];

const panelClass = 'rounded-xl border border-slate-800 bg-slate-900/50 p-5';
const inputClass =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 min-h-[44px]';
const buttonClass =
  'inline-flex min-h-[44px] items-center justify-center rounded-lg bg-cyan-500 px-4 font-semibold text-slate-950 transition-colors hover:bg-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:opacity-60';

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.message || json?.error || 'Request failed');
  }
  return json.data ?? json;
}

export default function WorkspaceClient({
  isOwner,
  seatsTotal,
  totalSeatsAdvertised,
  datasets,
}: {
  isOwner: boolean;
  seatsTotal: number;
  totalSeatsAdvertised: number;
  datasets: DatasetInfo[];
}) {
  const tabs = isOwner ? [...BASE_TABS, { id: 'seats' as TabId, label: 'Seats' }] : BASE_TABS;
  const [tab, setTab] = useState<TabId>('exports');

  return (
    <div>
      <div role="tablist" aria-label="Research workspace sections" className="flex flex-wrap gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`min-h-[44px] rounded-lg px-4 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-cyan-500 text-slate-950'
                : 'border border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'exports' && <ExportsPanel datasets={datasets} />}
        {tab === 'portfolios' && <PortfoliosPanel />}
        {tab === 'screens' && <ScreensPanel />}
        {tab === 'quarterly' && <QuarterlyPanel />}
        {tab === 'seats' && isOwner && (
          <SeatsPanel seatsTotal={seatsTotal} totalSeatsAdvertised={totalSeatsAdvertised} />
        )}
      </div>
    </div>
  );
}

function ExportsPanel({ datasets }: { datasets: DatasetInfo[] }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Downloads are served straight from the API and re-check your subscription
        server-side on every request. CSV opens in Excel; JSON carries the same
        coverage statement in its metadata.
      </p>
      {datasets.map((d) => (
        <div key={d.id} className={panelClass}>
          <h2 className="text-white font-semibold">{d.label}</h2>
          <p className="mt-1.5 text-sm text-slate-300 leading-relaxed">{d.coverage}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              className={buttonClass}
              href={`/api/research/export/${d.id}?format=csv`}
              download
            >
              Download CSV
            </a>
            <a
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-700 px-4 text-sm font-medium text-slate-200 hover:border-slate-500"
              href={`/api/research/export/${d.id}?format=json`}
              download
            >
              Download JSON
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

function PortfoliosPanel() {
  const [portfolios, setPortfolios] = useState<PortfolioRow[]>([]);
  const [name, setName] = useState('');
  const [holdings, setHoldings] = useState('');
  const [exposure, setExposure] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api('/api/research/portfolios');
      setPortfolios(data.portfolios ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load portfolios.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    setBusy(true);
    try {
      await api('/api/research/portfolios', {
        method: 'POST',
        body: JSON.stringify({
          name,
          holdings: holdings
            .split(/[\n,]/)
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      setName('');
      setHoldings('');
      await load();
      toast.success('Portfolio saved.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save that portfolio.');
    } finally {
      setBusy(false);
    }
  };

  const analyse = async (id: string) => {
    try {
      const data = await api(`/api/research/exposure?portfolioId=${encodeURIComponent(id)}`);
      setExposure(data.exposure);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not compute exposure.');
    }
  };

  return (
    <div className="space-y-5">
      <div className={panelClass}>
        <h2 className="text-white font-semibold mb-3">New portfolio</h2>
        <div className="space-y-3">
          <div>
            <label htmlFor="pf-name" className="block text-sm text-slate-300 mb-1.5">
              Name
            </label>
            <input
              id="pf-name"
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Propulsion book"
            />
          </div>
          <div>
            <label htmlFor="pf-holdings" className="block text-sm text-slate-300 mb-1.5">
              Holdings — one company name, slug or id per line
            </label>
            <textarea
              id="pf-holdings"
              rows={5}
              className={`${inputClass} font-mono`}
              value={holdings}
              onChange={(e) => setHoldings(e.target.value)}
              placeholder={'Aerojet Rocketdyne\nMoog\nHoneywell Aerospace'}
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Anything we cannot match is reported back by name rather than
              silently scored as zero risk.
            </p>
          </div>
          <button type="button" onClick={create} disabled={busy || !name} className={buttonClass}>
            {busy ? 'Saving…' : 'Save portfolio'}
          </button>
        </div>
      </div>

      {portfolios.map((p) => (
        <div key={p.id} className={panelClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-white font-semibold">{p.name}</h3>
              <p className="text-xs text-slate-400">{p.holdings.length} holdings</p>
            </div>
            <button type="button" onClick={() => analyse(p.id)} className={buttonClass}>
              Analyse exposure
            </button>
          </div>
        </div>
      ))}

      {exposure && <ExposureReport exposure={exposure as never} />}
    </div>
  );
}

interface ExposureShape {
  summary: Record<string, number>;
  byTier: { key: string; label: string; count: number; percent: number }[];
  byCountry: { key: string; label: string; count: number; percent: number }[];
  sharedSuppliers: { supplierId: string; supplierName: string; dependentHoldings: string[] }[];
  bomRiskItems: { id: string; component: string; riskLevel: string; viaHoldings: string[] }[];
  shortages: { id: string; material: string; severity: string; viaHoldings: string[] }[];
  unmatched: string[];
  coverageNote: string;
}

function ExposureReport({ exposure }: { exposure: ExposureShape }) {
  return (
    <div className={panelClass}>
      <h3 className="text-white font-semibold mb-3">Exposure</h3>
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        {Object.entries(exposure.summary).map(([k, v]) => (
          <div key={k} className="rounded-lg border border-slate-800 p-3">
            <dt className="text-xs text-slate-400">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</dt>
            <dd className="text-lg font-semibold text-white">{v}</dd>
          </div>
        ))}
      </dl>

      <Section title="Concentration by tier">
        {exposure.byTier.map((t) => (
          <li key={t.key} className="text-sm text-slate-300">
            {t.label} — {t.count} ({t.percent}%)
          </li>
        ))}
      </Section>

      <Section title="Suppliers shared by more than one holding">
        {exposure.sharedSuppliers.length === 0 ? (
          <li className="text-sm text-slate-400">None found in the covered roster.</li>
        ) : (
          exposure.sharedSuppliers.map((s) => (
            <li key={s.supplierId} className="text-sm text-slate-300">
              {s.supplierName} — {s.dependentHoldings.join(', ')}
            </li>
          ))
        )}
      </Section>

      <Section title="BOM risk reached through this portfolio">
        {exposure.bomRiskItems.length === 0 ? (
          <li className="text-sm text-slate-400">No covered BOM risk items touch these holdings.</li>
        ) : (
          exposure.bomRiskItems.slice(0, 20).map((b) => (
            <li key={b.id} className="text-sm text-slate-300">
              {b.component} — {b.riskLevel} (via {b.viaHoldings.join(', ')})
            </li>
          ))
        )}
      </Section>

      <Section title="Shortages">
        {exposure.shortages.length === 0 ? (
          <li className="text-sm text-slate-400">No tracked shortage touches these holdings.</li>
        ) : (
          exposure.shortages.map((s) => (
            <li key={s.id} className="text-sm text-slate-300">
              {s.material} — {s.severity} (via {s.viaHoldings.join(', ')})
            </li>
          ))
        )}
      </Section>

      {exposure.unmatched.length > 0 && (
        <p className="mt-4 text-sm text-amber-300">
          Not matched: {exposure.unmatched.join(', ')}
        </p>
      )}
      <p className="mt-4 text-xs text-slate-500 leading-relaxed">{exposure.coverageNote}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h4 className="text-sm font-semibold text-cyan-300 mb-1.5">{title}</h4>
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}

function ScreensPanel() {
  const [screens, setScreens] = useState<ScreenRow[]>([]);
  const [name, setName] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [sinceDays, setSinceDays] = useState('90');
  const [cadence, setCadence] = useState('none');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api('/api/research/screens');
      setScreens(data.screens ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load screens.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    setBusy(true);
    try {
      const criteria: Record<string, unknown> = {};
      if (minAmount) criteria.minAmountUsd = Number(minAmount) * 1_000_000;
      if (sinceDays) criteria.sinceDays = Number(sinceDays);
      await api('/api/research/screens', {
        method: 'POST',
        body: JSON.stringify({ name, criteria, alertCadence: cadence }),
      });
      setName('');
      await load();
      toast.success('Screen saved.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save that screen.');
    } finally {
      setBusy(false);
    }
  };

  const run = async (id: string) => {
    try {
      const data = await api(`/api/research/screens/${id}/run`, { method: 'POST' });
      toast.success(`${data.count} matches, ${data.newSinceLastRun} new since the last run.`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not run that screen.');
    }
  };

  return (
    <div className="space-y-5">
      <div className={panelClass}>
        <h2 className="text-white font-semibold mb-3">New screen</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="sc-name" className="block text-sm text-slate-300 mb-1.5">
              Name
            </label>
            <input
              id="sc-name"
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Large recent raises"
            />
          </div>
          <div>
            <label htmlFor="sc-min" className="block text-sm text-slate-300 mb-1.5">
              Minimum round size ($M)
            </label>
            <input
              id="sc-min"
              type="number"
              min={0}
              className={inputClass}
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="sc-days" className="block text-sm text-slate-300 mb-1.5">
              Within the last (days)
            </label>
            <input
              id="sc-days"
              type="number"
              min={1}
              max={3650}
              className={inputClass}
              value={sinceDays}
              onChange={(e) => setSinceDays(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="sc-cadence" className="block text-sm text-slate-300 mb-1.5">
              Alerts
            </label>
            <select
              id="sc-cadence"
              className={inputClass}
              value={cadence}
              onChange={(e) => setCadence(e.target.value)}
            >
              <option value="none">No alerts</option>
              <option value="weekly">Weekly, only when it changes</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="button" onClick={create} disabled={busy || !name} className={buttonClass}>
              {busy ? 'Saving…' : 'Save screen'}
            </button>
          </div>
        </div>
      </div>

      {screens.map((s) => (
        <div key={s.id} className={panelClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-white font-semibold">{s.name}</h3>
              <p className="text-xs text-slate-400">
                {s.summary} · {s.lastResultCount} matches ·{' '}
                {s.alertCadence === 'weekly' ? 'weekly alerts' : 'no alerts'}
              </p>
            </div>
            <button type="button" onClick={() => run(s.id)} className={buttonClass}>
              Run now
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function QuarterlyPanel() {
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api('/api/research/quarterly')
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load the quarterly.'));
  }, []);

  if (error) {
    return (
      <p className={`${panelClass} text-sm text-red-200`} role="alert">
        {error}
      </p>
    );
  }
  if (!report) return <p className="text-slate-400">Building the quarterly…</p>;

  const funding = report.funding as {
    roundCount: number;
    disclosedRoundCount: number;
    totalUsd: number;
    changePercent: number | null;
    bySector: { sector: string; roundCount: number; totalUsd: number }[];
  };

  return (
    <div className={panelClass}>
      <h2 className="text-white font-semibold text-lg">{String(report.label)} sector report</h2>
      <p className="text-sm text-slate-400 mb-4">
        {String(report.startDate)} to {String(report.endDate)}
      </p>
      <p className="text-slate-200">
        ${(funding.totalUsd / 1_000_000_000).toFixed(2)}B across {funding.roundCount} rounds (
        {funding.disclosedRoundCount} with a disclosed amount)
        {funding.changePercent !== null && `, ${funding.changePercent}% vs the prior quarter`}.
      </p>

      <h3 className="mt-5 text-sm font-semibold text-cyan-300 mb-1.5">By sector</h3>
      <ul className="space-y-1">
        {funding.bySector.slice(0, 12).map((s) => (
          <li key={s.sector} className="text-sm text-slate-300">
            {s.sector} — ${(s.totalUsd / 1_000_000).toFixed(0)}M across {s.roundCount} rounds
          </li>
        ))}
      </ul>

      <h3 className="mt-5 text-sm font-semibold text-cyan-300 mb-1.5">Coverage</h3>
      <ul className="space-y-1.5">
        {(report.coverage as string[]).map((c) => (
          <li key={c} className="text-xs text-slate-500 leading-relaxed">
            {c}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SeatsPanel({
  seatsTotal,
  totalSeatsAdvertised,
}: {
  seatsTotal: number;
  totalSeatsAdvertised: number;
}) {
  const [seats, setSeats] = useState<SeatRow[]>([]);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api('/api/research/seats');
      setSeats(data.seats ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load seats.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const invite = async () => {
    setBusy(true);
    try {
      await api('/api/research/seats', { method: 'POST', body: JSON.stringify({ email }) });
      setEmail('');
      await load();
      toast.success('Invite sent.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send that invite.');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    try {
      await api(`/api/research/seats/${id}`, { method: 'DELETE' });
      await load();
      toast.success('Seat revoked.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not revoke that seat.');
    }
  };

  return (
    <div className="space-y-5">
      <div className={panelClass}>
        <h2 className="text-white font-semibold mb-1">
          {seatsTotal} named seats
          {seatsTotal !== totalSeatsAdvertised && ' (adjusted on your subscription)'}
        </h2>
        <p className="text-sm text-slate-400 mb-4">
          You hold one; {Math.max(0, seatsTotal - 1)} can be invited. An invite is
          single-use and only works for the address it was sent to.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <label htmlFor="seat-email" className="sr-only">
            Colleague&rsquo;s email address
          </label>
          <input
            id="seat-email"
            type="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@firm.com"
          />
          <button type="button" onClick={invite} disabled={busy || !email} className={buttonClass}>
            {busy ? 'Sending…' : 'Invite'}
          </button>
        </div>
      </div>

      {seats.length > 0 && (
        <div className={panelClass}>
          <h3 className="text-white font-semibold mb-3">Seats</h3>
          <ul className="divide-y divide-slate-800">
            {seats.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm text-white">{s.email}</p>
                  <p className="text-xs text-slate-400">
                    {s.status}
                    {s.withinCap === false && ' · outside the current seat count'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => revoke(s.id)}
                  className="min-h-[44px] rounded-lg border border-slate-700 px-4 text-sm text-slate-200 hover:border-red-500 hover:text-red-300"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
