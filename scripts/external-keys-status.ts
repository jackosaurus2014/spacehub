/**
 * Which external data sources are actually reachable right now? (2026-09-15)
 *
 *   npx tsx scripts/external-keys-status.ts                 (local .env)
 *   railway ssh -s spacehub -- npx tsx scripts/external-keys-status.ts
 *
 * For every third-party source the site depends on: is a key configured, and
 * does a real request succeed? Both halves matter and they fail differently.
 * Two FCC fetchers sat dead for weeks in 2026 because the endpoint started
 * demanding a key and the fetchers swallowed the 403 — the only symptom was
 * an empty tab. A key that is set but rejected looks exactly like a key that
 * was never set, unless something asks.
 *
 * Run it after pasting a new key. It is the fastest way to know whether the
 * key works, before wiring a fetcher around it.
 *
 * Read-only: every request is a single minimal GET/POST against a public
 * endpoint. Prints a table, and `HEX <hex JSON>` for machine reading.
 */

const UA = 'SpaceNexus/1.0 (https://spacenexus.us; jgriffiths74@gmail.com)';

interface SourceCheck {
  id: string;
  /** What we lose if this is down. */
  purpose: string;
  /** Env var holding the key, or null when the source needs none. */
  envVar: string | null;
  /** Env vars the real code falls back to. The probe MUST mirror the
   *  fallback, or it reports a working feed as broken — which is the same
   *  class of lie as a feed that reports nothing while it is broken. */
  fallbackEnvVars?: string[];
  /** Where a human goes to get the key. */
  signupUrl?: string;
  probe: (key: string | null) => Promise<{ ok: boolean; status: number | string; note: string }>;
}

async function head(url: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number | string; note: string }> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: { 'User-Agent': UA, Accept: 'application/json', ...(init.headers || {}) },
      signal: AbortSignal.timeout(20_000),
    });
    const body = await res.text().catch(() => '');
    return {
      ok: res.ok,
      status: res.status,
      note: res.ok ? `${body.length} bytes` : body.slice(0, 120).replace(/\s+/g, ' '),
    };
  } catch (err) {
    return { ok: false, status: 'network', note: err instanceof Error ? err.message.slice(0, 120) : String(err) };
  }
}

const SOURCES: SourceCheck[] = [
  {
    id: 'congress-gov',
    purpose: 'Congressional bill tracking on the Regulatory Radar',
    envVar: 'CONGRESS_GOV_API_KEY',
    signupUrl: 'https://api.congress.gov/sign-up/',
    probe: (key) => head(`https://api.congress.gov/v3/bill?limit=1&api_key=${encodeURIComponent(key || '')}`),
  },
  {
    id: 'fcc-ecfs',
    purpose: 'Live FCC spectrum and satellite docket filings',
    // The same api.data.gov key serves both federal feeds; ecfs-api-key.ts
    // falls back to the Congress key, so this probe does too.
    envVar: 'FCC_API_KEY',
    fallbackEnvVars: ['CONGRESS_GOV_API_KEY'],
    signupUrl: 'https://api.congress.gov/sign-up/ (one key serves both)',
    probe: (key) => head(`https://publicapi.fcc.gov/ecfs/filings?limit=1&api_key=${encodeURIComponent(key || '')}`),
  },
  {
    id: 'sec-edgar',
    purpose: 'Form D funding rounds, insider filings, company facts',
    envVar: null,
    probe: () => head('https://data.sec.gov/submissions/CIK0001318605.json'),
  },
  {
    id: 'usaspending',
    purpose: 'Federal contract awards won by space companies',
    envVar: null,
    probe: () => head('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filters: { keywords: ['Rocket Lab'], award_type_codes: ['A', 'B', 'C', 'D'] },
        fields: ['Award ID'],
        limit: 1,
      }),
    }),
  },
  {
    id: 'nasa',
    purpose: 'DONKI space weather, imagery, NEO feeds',
    envVar: 'NASA_API_KEY',
    signupUrl: 'https://api.nasa.gov/',
    probe: (key) => head(`https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(key || 'DEMO_KEY')}`),
  },
  {
    id: 'companies-house',
    purpose: 'UK company registry — closes the non-US coverage gap (~40% of the roster files nothing with the SEC)',
    envVar: 'COMPANIES_HOUSE_API_KEY',
    signupUrl: 'https://developer.company-information.service.gov.uk/how-to-create-an-application/',
    probe: (key) => head('https://api.company-information.service.gov.uk/search/companies?q=space&items_per_page=1', {
      // Companies House uses HTTP Basic with the key as the username and an
      // empty password — NOT a bearer token, which is the usual first mistake.
      headers: key ? { Authorization: 'Basic ' + Buffer.from(`${key}:`).toString('base64') } : {},
    }),
  },
  {
    id: 'uspto-odp',
    purpose: 'Patent filings as an R&D-intensity signal (PatentsView was retired into this)',
    envVar: 'USPTO_ODP_API_KEY',
    signupUrl: 'https://data.uspto.gov/apis/api-key',
    probe: (key) => head('https://api.uspto.gov/api/v1/patent/applications/search?q=satellite&limit=1', {
      headers: key ? { 'X-API-KEY': key } : {},
    }),
  },
  {
    id: 'sbir',
    purpose: 'SBIR/STTR award history',
    envVar: null,
    // Known upstream maintenance since 2026 — AWS API Gateway returns a bare
    // ForbiddenException. Not a key problem and not ours to fix; this probe
    // exists so we notice the day it comes back.
    probe: () => head('https://api.www.sbir.gov/public/api/awards?agency=NASA&rows=1'),
  },
];

async function main() {
  const rows: Array<Record<string, unknown>> = [];
  for (const s of SOURCES) {
    const candidates = [s.envVar, ...(s.fallbackEnvVars || [])].filter(Boolean) as string[];
    const usedVar = candidates.find((v) => (process.env[v] || '').trim().length > 0) || null;
    const key = usedVar ? (process.env[usedVar] as string) : null;
    const configured = s.envVar ? Boolean(key) : true;
    const r = await s.probe(key);
    rows.push({
      id: s.id,
      keyRequired: s.envVar !== null,
      envVar: s.envVar,
      // Which var actually supplied the key, so a fallback is visible rather
      // than looking like the primary var was set.
      keyFrom: usedVar,
      configured,
      ok: r.ok,
      status: r.status,
      note: r.note,
      signupUrl: s.signupUrl ?? null,
      purpose: s.purpose,
    });
  }

  const pad = (v: unknown, n: number) => String(v).padEnd(n).slice(0, n);
  console.log('');
  console.log(pad('source', 18), pad('key', 10), pad('live', 6), pad('status', 10), 'note');
  console.log('-'.repeat(96));
  for (const r of rows) {
    console.log(
      pad(r.id, 18),
      pad(r.keyRequired ? (r.configured ? (r.keyFrom === r.envVar ? 'set' : 'fallback') : 'MISSING') : 'none needed', 10),
      pad(r.ok ? 'yes' : 'NO', 6),
      pad(r.status, 10),
      String(r.note).slice(0, 52),
    );
  }
  const needsKey = rows.filter(r => r.keyRequired && !r.configured);
  if (needsKey.length > 0) {
    console.log('\nWaiting on a key:');
    for (const r of needsKey) console.log(`  ${r.envVar} — ${r.signupUrl}\n      ${r.purpose}`);
  }
  console.log('\nHEX ' + Buffer.from(JSON.stringify(rows)).toString('hex'));
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
