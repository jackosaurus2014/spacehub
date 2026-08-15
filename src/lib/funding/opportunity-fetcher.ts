import { createCircuitBreaker } from '@/lib/circuit-breaker';
import { logger } from '@/lib/logger';

// Circuit breakers for each source
const grantsBreaker = createCircuitBreaker('grants-gov', { failureThreshold: 3, resetTimeout: 120000 });
const sbirBreaker = createCircuitBreaker('sbir-gov', { failureThreshold: 3, resetTimeout: 120000 });
const nasaBreaker = createCircuitBreaker('nasa-nspires', { failureThreshold: 3, resetTimeout: 120000 });

// Map common fields
export interface FundingOpportunityInput {
  externalId: string;
  title: string;
  description?: string;
  agency: string;
  program?: string;
  fundingType: string;
  amountMin?: number;
  amountMax?: number;
  totalBudget?: number;
  deadline?: Date;
  openDate?: Date;
  status: string;
  eligibility: string[];
  setAside?: string;
  categories: string[];
  applicationUrl?: string;
  sourceUrl?: string;
  source: string;
  contactName?: string;
  contactEmail?: string;
  naicsCode?: string;
  solicitationNumber?: string;
  stateIncentive?: boolean;
  state?: string;
  recurring?: boolean;
}

// Space-related keywords for filtering.
//
// IMPORTANT: bare generic words ('space', 'orbit', 'launch', 'debris',
// 'navigation', 'constellation', 'payload', 'mars', 'lunar' on their own)
// were removed from this list (2026-08-14 data-integrity fix). They
// substring-matched federal grants that have nothing to do with the space
// industry — e.g. USDA's "Community Forest and Open Space Conservation
// Program" (matched bare 'space') and the State Department's "Enhancing and
// Supporting the Network of American Spaces in Armenia" (cultural centers,
// matched bare 'space'/'spaces'), both of which surfaced at the top of
// /funding-opportunities. 'orbit'/'launch' have the same trap ("launching a
// program", "orbit of influence" in policy-speak) and 'mars'/'lunar' alone
// false-positive on things like "Marshall"/"Marseille" or Lunar New Year
// cultural grants. Every entry below is either a compound phrase specific
// enough to be unambiguous, or (via isSpaceRelated's agency check) requires
// the funding agency to be a space-relevant one.
const SPACE_KEYWORDS = [
  'space technology', 'space station', 'space telescope', 'space debris',
  'space weather', 'space domain awareness', 'space situational awareness',
  'space propulsion', 'space exploration', 'space launch', 'space force',
  'outer space', 'spacecraft', 'spaceport', 'satellite', 'orbital',
  'in-space', 'cislunar', 'deep space', 'low earth orbit',
  'geostationary orbit', 'launch vehicle', 'launch pad', 'launch site',
  'launch services', 'rocket propulsion', 'reusable rocket',
  'remote sensing', 'earth observation', 'lunar lander', 'lunar surface',
  'lunar exploration', 'lunar orbit', 'lunar mission', 'mars mission',
  'mars exploration', 'mars sample', 'asteroid detection',
  'asteroid deflection', 'asteroid mining', 'planetary defense',
  'planetary science', 'astrophysics', 'astronomical sciences',
  'small satellite', 'cubesat', 'satellite constellation',
  'satellite payload', 'satellite navigation', 'gps satellite',
  'microgravity',
];

// Titles/descriptions containing these phrases are excluded even if a
// SPACE_KEYWORDS phrase also matches — known false-positive patterns for
// federal grant listings (e.g. HRSA "satellite clinic" grants, NEA/State
// Dept "open space" and "American Spaces" cultural-center programs).
const EXCLUDE_PHRASES = [
  'satellite campus', 'satellite office', 'satellite clinic',
  'satellite location', 'satellite center', 'satellite facility',
  'open space', 'space conservation', 'parking space', 'green space',
  'community space', 'gallery space', 'exhibition space', 'workspace',
  'coworking space', 'maker space', 'american spaces', 'cultural space',
  'event space', 'retail space',
];

// Agencies whose grants are presumed space-relevant even without a keyword
// hit (e.g. a NASA solicitation whose title doesn't literally say "space",
// or ESA's NAVISP GNSS programme whose title says "Navigation Innovation"
// without the word "satellite"). National/international space agencies are
// space-relevant by definition; DARPA is included narrowly since its space
// portfolio (Blackjack, DRACO, NOM4D — see STATE_INCENTIVES 'darpa-space'
// below) is a small fraction of its overall docket, but its grant titles
// reliably mention the program name, which the phrase list above catches.
const SPACE_AGENCIES = [
  'NASA', 'SPACE FORCE', 'SPACEWERX', 'AFWERX', 'DARPA',
  'ESA', 'EUROPEAN SPACE AGENCY', 'UK SPACE AGENCY', 'CANADIAN SPACE AGENCY',
  'JAXA', 'CNES', 'DLR', 'ISRO',
];

function isSpaceRelated(text: string, agency?: string): boolean {
  const lower = text.toLowerCase();
  if (EXCLUDE_PHRASES.some(p => lower.includes(p))) return false;
  if (SPACE_KEYWORDS.some(kw => lower.includes(kw))) return true;
  if (agency) {
    const upperAgency = agency.toUpperCase();
    if (SPACE_AGENCIES.some(a => upperAgency.includes(a))) return true;
  }
  return false;
}

// Category classifier based on text content
function classifyCategories(title: string, desc: string): string[] {
  const text = `${title} ${desc}`.toLowerCase();
  const cats: string[] = [];
  if (/propulsion|engine|thruster|fuel/.test(text)) cats.push('propulsion');
  if (/earth observation|remote sensing|imaging|sar/.test(text)) cats.push('earth_observation');
  if (/communicat|antenna|transponder|spectrum/.test(text)) cats.push('communications');
  if (/launch|rocket|spaceport/.test(text)) cats.push('launch');
  if (/in.space|orbit|servic|manufactur|assembl/.test(text)) cats.push('in_space');
  if (/defense|military|dod|darpa|classified|deterr/.test(text)) cats.push('defense');
  if (/lunar|moon|artemis|gateway/.test(text)) cats.push('lunar');
  if (/debris|ssa|space.?situational|tracking/.test(text)) cats.push('debris');
  if (/mars|deep.space|interplanetary/.test(text)) cats.push('exploration');
  if (/navigation|gps|pnt/.test(text)) cats.push('navigation');
  if (/climat|weather|atmospher/.test(text)) cats.push('earth_science');
  if (cats.length === 0) cats.push('general');
  return cats;
}

function parseEligibility(elig: string): string[] {
  const lower = elig.toLowerCase();
  const result: string[] = [];
  if (lower.includes('small business')) result.push('small_business');
  if (lower.includes('universit') || lower.includes('higher education')) result.push('university');
  if (lower.includes('nonprofit') || lower.includes('non-profit')) result.push('nonprofit');
  if (lower.includes('state') || lower.includes('local government')) result.push('government');
  if (result.length === 0) result.push('any');
  return result;
}

function mapSamType(type: string): string {
  const lower = type.toLowerCase();
  if (lower.includes('grant')) return 'grant';
  if (lower.includes('sbir')) return 'sbir';
  if (lower.includes('sttr')) return 'sttr';
  return 'contract';
}

function getDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0].replace(/-/g, '/');
}

function isOpen(closeDate?: string): boolean {
  if (!closeDate) return true;
  return new Date(closeDate) > new Date();
}

// ---- Grants.gov API ----
// Grants.gov retired the old `www.grants.gov/grantsws/rest/opportunities/search`
// REST endpoint (now returns HTTP 405) and migrated to the "Search2" API at
// api.grants.gov. Verified live 2026-08-14: POST returns 200 with
// { errorcode, msg, data: { oppHits: [...] } } — note the extra `data` wrapper
// vs. the old top-level `oppHits`.
export async function fetchGrantsGov(): Promise<FundingOpportunityInput[]> {
  const results: FundingOpportunityInput[] = [];
  try {
    const response = await grantsBreaker.execute(async () => {
      const res = await fetch('https://api.grants.gov/v1/api/search2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: 'space satellite orbit launch',
          oppStatuses: 'forecasted|posted',
          rows: 50,
          sortBy: 'openDate|desc',
        }),
      });
      if (!res.ok) throw new Error(`Grants.gov HTTP ${res.status}`);
      return res.json();
    });

    const opps = response?.data?.oppHits || response?.oppHits || [];
    for (const opp of opps) {
      if (!isSpaceRelated(`${opp.title || ''} ${opp.synopsis || ''}`, opp.agency || opp.agencyCode)) continue;
      results.push({
        externalId: `grants-${opp.id}`,
        title: opp.title || 'Untitled',
        description: opp.synopsis || undefined,
        agency: opp.agency || opp.agencyCode || 'Unknown',
        // cfdaList comes back as a string[] from the Search2 API (the old
        // REST API returned a comma-joined string here) — FundingOpportunity.program
        // is a plain String column, so an array value throws a Prisma
        // validation error at write time. Join it.
        program: Array.isArray(opp.cfdaList) ? opp.cfdaList.join(', ') : (opp.cfdaList || undefined),
        fundingType: 'grant',
        amountMin: opp.awardFloor || undefined,
        amountMax: opp.awardCeiling || undefined,
        totalBudget: opp.estimatedFunding || undefined,
        deadline: opp.closeDate ? new Date(opp.closeDate) : undefined,
        openDate: opp.openDate ? new Date(opp.openDate) : undefined,
        status: opp.oppStatus === 'posted' ? 'open' : opp.oppStatus === 'forecasted' ? 'upcoming' : 'closed',
        eligibility: parseEligibility(opp.eligibilities || ''),
        categories: classifyCategories(opp.title || '', opp.synopsis || ''),
        applicationUrl: `https://www.grants.gov/search-results-detail/${opp.id}`,
        sourceUrl: `https://www.grants.gov/search-results-detail/${opp.id}`,
        source: 'grants.gov',
        solicitationNumber: opp.number || undefined,
      });
    }
  } catch (error) {
    logger.error('Failed to fetch from Grants.gov', { error: error instanceof Error ? error.message : String(error) });
  }
  return results;
}

// ---- SAM.gov opportunities API ----
export async function fetchSamGovOpportunities(): Promise<FundingOpportunityInput[]> {
  const results: FundingOpportunityInput[] = [];
  const apiKey = process.env.SAM_API_KEY;
  if (!apiKey) {
    logger.warn('SAM_API_KEY not set, skipping SAM.gov opportunity fetch');
    return results;
  }
  try {
    const keywords = ['space', 'satellite', 'launch vehicle', 'spacecraft'];
    for (const keyword of keywords) {
      const url = `https://api.sam.gov/opportunities/v2/search?api_key=${apiKey}&keyword=${encodeURIComponent(keyword)}&postedFrom=${getDateDaysAgo(30)}&limit=25&offset=0`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      for (const opp of data?.opportunitiesData || []) {
        const extId = `sam-${opp.noticeId}`;
        if (results.some(r => r.externalId === extId)) continue;
        if (!isSpaceRelated(`${opp.title || ''} ${opp.description || ''}`, opp.department || opp.subtier)) continue;
        results.push({
          externalId: extId,
          title: opp.title || 'Untitled',
          description: opp.description?.slice(0, 5000) || undefined,
          agency: opp.department || opp.subtier || 'Unknown',
          program: opp.solicitationNumber || undefined,
          fundingType: mapSamType(opp.type || ''),
          amountMin: undefined,
          amountMax: undefined,
          deadline: opp.responseDeadLine ? new Date(opp.responseDeadLine) : undefined,
          openDate: opp.postedDate ? new Date(opp.postedDate) : undefined,
          status: 'open',
          eligibility: opp.setAside ? [opp.setAside] : ['any'],
          setAside: opp.setAsideCode || undefined,
          categories: classifyCategories(opp.title || '', opp.description || ''),
          applicationUrl: opp.uiLink || `https://sam.gov/opp/${opp.noticeId}/view`,
          sourceUrl: opp.uiLink || `https://sam.gov/opp/${opp.noticeId}/view`,
          source: 'sam.gov',
          solicitationNumber: opp.solicitationNumber || undefined,
          contactName: opp.pointOfContact?.[0]?.fullName || undefined,
          contactEmail: opp.pointOfContact?.[0]?.email || undefined,
          naicsCode: opp.naicsCode || undefined,
        });
      }
    }
  } catch (error) {
    logger.error('Failed to fetch from SAM.gov', { error: error instanceof Error ? error.message : String(error) });
  }
  return results;
}

// ---- SBIR.gov ----
// The old `www.sbir.gov/api/solicitations.json` endpoint (flat array of
// topic-level records) is gone — sbir.gov rebuilt on Drupal 10 and moved its
// public API to a new domain: api.www.sbir.gov, documented at
// https://www.sbir.gov/api/solicitation. Verified 2026-08-14: the new
// endpoint responds (through CloudFront/API Gateway) but currently returns
// HTTP 403 "Forbidden" — sbir.gov's own /api page displays a banner stating
// "the SBIR.gov APIs are currently undergoing maintenance", so this looks
// like an upstream outage on SBIR's end, not a client-side auth problem.
// Response shape (per their docs) is a list of *solicitations*, each with a
// nested `solicitation_topics` array (each topic optionally has
// `subtopics`) — one FundingOpportunityInput is emitted per topic to match
// the previous per-topic granularity.
export async function fetchSBIROpportunities(): Promise<FundingOpportunityInput[]> {
  const results: FundingOpportunityInput[] = [];
  try {
    const response = await sbirBreaker.execute(async () => {
      const res = await fetch('https://api.www.sbir.gov/public/api/solicitations?open=1&rows=100', {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`SBIR.gov HTTP ${res.status}`);
      return res.json();
    });

    const solicitations: unknown[] = Array.isArray(response) ? response : (response?.data ?? []);

    for (const solRaw of solicitations) {
      const sol = solRaw as Record<string, unknown>;
      const solicitationTitle = String(sol.solicitation_title || '');
      const agency = String(sol.agency || 'Unknown');
      const program = String(sol.program || 'SBIR');
      const phase = String(sol.phase || '');
      const closeDate = sol.close_date as string | undefined;
      const openDate = sol.open_date as string | undefined;
      const solicitationUrl = sol.solicitation_agency_url as string | undefined;
      const solicitationNumber = sol.solicitation_number as string | undefined;

      const topics = Array.isArray(sol.solicitation_topics) ? sol.solicitation_topics : [];
      const items: { title: string; desc: string; id: string; url?: string }[] = topics.length > 0
        ? topics.map((t: Record<string, unknown>, i: number) => ({
            title: String(t.topic_title || solicitationTitle),
            desc: String(t.topic_description || ''),
            id: String(t.topic_number || `${solicitationNumber || i}`),
            url: (t.sbir_topic_link as string | undefined) || solicitationUrl,
          }))
        : [{ title: solicitationTitle, desc: '', id: String(solicitationNumber || solicitationTitle), url: solicitationUrl }];

      for (const item of items) {
        if (!item.title) continue;
        if (!isSpaceRelated(`${item.title} ${item.desc}`, agency)) continue;
        results.push({
          externalId: `sbir-${item.id}`,
          title: item.title || 'Untitled SBIR Topic',
          description: item.desc.slice(0, 5000) || undefined,
          agency,
          program: `${program} ${phase}`.trim(),
          fundingType: program.toLowerCase().includes('sttr') ? 'sttr' : 'sbir',
          amountMin: undefined,
          amountMax: undefined,
          deadline: closeDate ? new Date(closeDate) : undefined,
          openDate: openDate ? new Date(openDate) : undefined,
          status: isOpen(closeDate) ? 'open' : 'closed',
          eligibility: ['small_business'],
          categories: classifyCategories(item.title, item.desc),
          applicationUrl: item.url || undefined,
          sourceUrl: item.url || 'https://www.sbir.gov/topics',
          source: 'sbir.gov',
          solicitationNumber,
        });
      }
    }
  } catch (error) {
    logger.error('Failed to fetch from SBIR.gov', { error: error instanceof Error ? error.message : String(error) });
  }
  return results;
}

// ---- NASA ROSES (via RSS NSPIRES) ----
// Verified 2026-08-14: `nspires.nasaprs.com/external/solicitations/rss.do`
// returns HTTP 404 ("NSPIRES: Page Not Found"). Probed the NSPIRES site for a
// replacement RSS/JSON feed (solicitations.do listing page, site homepage) —
// no public syndication endpoint was found; NASA appears to have retired RSS
// output from NSPIRES entirely (public solicitation browsing is now a
// JS-rendered search UI with no documented feed). Left the original URL in
// place — it fails loudly via the circuit breaker + logger.error below —
// pending manual follow-up to find NASA's current solicitation feed (if any)
// or replace this source.
export async function fetchNASASolicitations(): Promise<FundingOpportunityInput[]> {
  const results: FundingOpportunityInput[] = [];
  try {
    const text = await nasaBreaker.execute(async () => {
      const res = await fetch('https://nspires.nasaprs.com/external/solicitations/rss.do?method=open');
      if (!res.ok) throw new Error(`NSPIRES RSS HTTP ${res.status}`);
      return res.text();
    });
    // Parse XML RSS
    const items = text.match(/<item>([\s\S]*?)<\/item>/g) || [];
    for (const item of items) {
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1] || '';
      const desc = item.match(/<description><!\[CDATA\[(.*?)\]\]>/)?.[1] || item.match(/<description>(.*?)<\/description>/)?.[1] || '';
      const link = item.match(/<link>(.*?)<\/link>/)?.[1] || '';
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';

      results.push({
        externalId: `nspires-${Buffer.from(title).toString('base64').slice(0, 40)}`,
        title,
        description: desc.slice(0, 5000),
        agency: 'NASA',
        program: 'ROSES / NSPIRES',
        fundingType: 'cooperative_agreement',
        status: 'open',
        eligibility: ['any'],
        categories: classifyCategories(title, desc),
        applicationUrl: link || undefined,
        sourceUrl: link || undefined,
        source: 'nasa.gov',
        openDate: pubDate ? new Date(pubDate) : undefined,
      });
    }
  } catch (error) {
    logger.error('Failed to fetch NASA solicitations', { error: error instanceof Error ? error.message : String(error) });
  }
  return results;
}

// ---- Master aggregator ----
export async function aggregateAllOpportunities(): Promise<FundingOpportunityInput[]> {
  const [grants, sam, sbir, nasa] = await Promise.allSettled([
    fetchGrantsGov(),
    fetchSamGovOpportunities(),
    fetchSBIROpportunities(),
    fetchNASASolicitations(),
  ]);

  const all: FundingOpportunityInput[] = [];
  if (grants.status === 'fulfilled') all.push(...grants.value);
  if (sam.status === 'fulfilled') all.push(...sam.value);
  if (sbir.status === 'fulfilled') all.push(...sbir.value);
  if (nasa.status === 'fulfilled') all.push(...nasa.value);

  const counts = {
    grants: grants.status === 'fulfilled' ? grants.value.length : 0,
    sam: sam.status === 'fulfilled' ? sam.value.length : 0,
    sbir: sbir.status === 'fulfilled' ? sbir.value.length : 0,
    nasa: nasa.status === 'fulfilled' ? nasa.value.length : 0,
    total: all.length,
  };

  logger.info('Aggregated funding opportunities', counts);

  // Each individual fetcher already swallows its own errors (so one dead
  // source doesn't block the others) and logs at error level. But a fetcher
  // returning zero results looks identical to "no new opportunities today"
  // in that per-source log line — which is exactly how this pipeline went
  // silently stale for ~170+ days. Surface it loudly here whenever *every*
  // live source came back empty, since that's overwhelmingly more likely to
  // mean "every external API is broken" than "there is genuinely nothing
  // new across grants.gov, SAM.gov, SBIR.gov, and NASA combined."
  if (counts.grants === 0 && counts.sam === 0 && counts.sbir === 0 && counts.nasa === 0) {
    logger.error('aggregateAllOpportunities: ALL external funding sources returned zero results — likely an upstream API outage/breakage, not a real "no new opportunities" day', counts);
  }

  return all;
}

// ---- State & Regional Space Incentives (manually curated) ----
export const STATE_INCENTIVES: FundingOpportunityInput[] = [
  {
    externalId: 'state-fl-space-tax',
    title: 'Florida Space Business Tax Exemption',
    description: 'Sales tax exemptions for machinery and equipment used in spaceport activities. Manufacturing equipment and launch services equipment qualify for exemption.',
    agency: 'Space Florida',
    program: 'Space Business Incentives',
    fundingType: 'grant',
    status: 'rolling',
    eligibility: ['any'],
    categories: ['launch', 'general'],
    applicationUrl: 'https://www.spaceflorida.gov/offering/incentives/',
    sourceUrl: 'https://www.spaceflorida.gov/offering/incentives/',
    source: 'manual',
    stateIncentive: true,
    state: 'FL',
    recurring: true,
  },
  {
    externalId: 'state-fl-workforce',
    title: 'Florida Quick Response Training (QRT)',
    description: 'Customized skills-training grants for new or expanding businesses in Florida. Space companies can receive up to $250,000 for workforce training programs.',
    agency: 'Space Florida / CareerSource',
    program: 'Workforce Development',
    fundingType: 'grant',
    amountMax: 250000,
    status: 'rolling',
    eligibility: ['any'],
    categories: ['general'],
    applicationUrl: 'https://floridajobs.org/business-growth-and-partnerships/for-businesses-702702702/quick-response-training',
    sourceUrl: 'https://floridajobs.org/',
    source: 'manual',
    stateIncentive: true,
    state: 'FL',
    recurring: true,
  },
  {
    externalId: 'state-tx-enterprise',
    title: 'Texas Enterprise Fund',
    description: 'Deal-closing fund for significant job creation and capital investment in Texas. Aerospace and defense companies are priority targets.',
    agency: 'Office of the Governor',
    program: 'Texas Enterprise Fund',
    fundingType: 'grant',
    status: 'rolling',
    eligibility: ['any'],
    categories: ['general'],
    applicationUrl: 'https://gov.texas.gov/business/page/texas-enterprise-fund',
    sourceUrl: 'https://gov.texas.gov/business/page/texas-enterprise-fund',
    source: 'manual',
    stateIncentive: true,
    state: 'TX',
    recurring: true,
  },
  {
    externalId: 'state-tx-spaceport',
    title: 'Texas Spaceport Development Fund',
    description: 'State funding to support the development and operation of licensed spaceport facilities in Texas. Supports Brownsville and Midland spaceport operations.',
    agency: 'Texas Aerospace Commission',
    program: 'Spaceport Development',
    fundingType: 'grant',
    status: 'rolling',
    eligibility: ['any'],
    categories: ['launch'],
    applicationUrl: 'https://gov.texas.gov/business',
    sourceUrl: 'https://gov.texas.gov/',
    source: 'manual',
    stateIncentive: true,
    state: 'TX',
    recurring: true,
  },
  {
    externalId: 'state-co-advanced-industries',
    title: 'Colorado Advanced Industries Accelerator Program',
    description: 'Grants for proof of concept ($150K) and early-stage capital ($250K) for advanced industries including aerospace. Colorado is home to 400+ aerospace companies.',
    agency: 'Colorado OEDIT',
    program: 'Advanced Industries',
    fundingType: 'grant',
    amountMin: 150000,
    amountMax: 250000,
    status: 'open',
    eligibility: ['small_business', 'university'],
    categories: ['general'],
    applicationUrl: 'https://oedit.colorado.gov/advanced-industries-accelerator-programs',
    sourceUrl: 'https://oedit.colorado.gov/',
    source: 'manual',
    stateIncentive: true,
    state: 'CO',
    recurring: true,
  },
  {
    externalId: 'state-va-space-grant',
    title: 'Virginia Space Grant Consortium',
    description: 'NASA-funded state program supporting research, education, and industry development in Virginia. Includes MAGS/VSGC fellowship programs and industry collaboration grants.',
    agency: 'Virginia Space Grant',
    program: 'Industry Collaboration',
    fundingType: 'grant',
    amountMax: 50000,
    status: 'rolling',
    eligibility: ['university', 'small_business'],
    categories: ['general'],
    applicationUrl: 'https://vsgc.odu.edu/',
    sourceUrl: 'https://vsgc.odu.edu/',
    source: 'manual',
    stateIncentive: true,
    state: 'VA',
    recurring: true,
  },
  {
    externalId: 'state-nm-spaceport',
    title: 'New Mexico Spaceport Tax Incentive District',
    description: 'Gross receipts tax increment financing for businesses operating at or supporting Spaceport America. Includes tax exemptions for spacecraft manufacturers.',
    agency: 'New Mexico Spaceport Authority',
    program: 'Tax Incentive District',
    fundingType: 'grant',
    status: 'rolling',
    eligibility: ['any'],
    categories: ['launch', 'general'],
    applicationUrl: 'https://www.spaceportamerica.com/',
    sourceUrl: 'https://www.spaceportamerica.com/',
    source: 'manual',
    stateIncentive: true,
    state: 'NM',
    recurring: true,
  },
  {
    externalId: 'state-al-huntsville',
    title: 'Alabama Cummings Research Park Innovation Fund',
    description: 'Grants and incentives for technology companies in Huntsville/Cummings Research Park, the second-largest research park in the US. Strong aerospace and defense focus.',
    agency: 'City of Huntsville / Cummings Research Park',
    program: 'Innovation Fund',
    fundingType: 'grant',
    status: 'rolling',
    eligibility: ['small_business'],
    categories: ['defense', 'general'],
    applicationUrl: 'https://cfrp.org/',
    sourceUrl: 'https://cfrp.org/',
    source: 'manual',
    stateIncentive: true,
    state: 'AL',
    recurring: true,
  },
  {
    externalId: 'state-ca-ibank',
    title: 'California IBank Small Business Finance Center',
    description: 'Loan guarantees and direct loans for small businesses in California. Aerospace and defense manufacturing companies eligible for up to $20M in guarantees.',
    agency: 'California IBank',
    program: 'Small Business Finance Center',
    fundingType: 'grant',
    amountMax: 20000000,
    status: 'rolling',
    eligibility: ['small_business'],
    categories: ['general'],
    applicationUrl: 'https://ibank.ca.gov/small-business/',
    sourceUrl: 'https://ibank.ca.gov/',
    source: 'manual',
    stateIncentive: true,
    state: 'CA',
    recurring: true,
  },
  {
    externalId: 'state-md-tedco',
    title: 'Maryland TEDCO Space Venture Fund',
    description: 'Pre-seed and seed investment for Maryland-based space technology startups. TEDCO invests $50K-$200K with mentorship from aerospace industry experts.',
    agency: 'TEDCO',
    program: 'Technology Development Corporation',
    fundingType: 'grant',
    amountMin: 50000,
    amountMax: 200000,
    status: 'rolling',
    eligibility: ['small_business'],
    categories: ['general'],
    applicationUrl: 'https://www.tedcomd.com/',
    sourceUrl: 'https://www.tedcomd.com/',
    source: 'manual',
    stateIncentive: true,
    state: 'MD',
    recurring: true,
  },
  // International Programs
  {
    externalId: 'intl-esa-bic',
    title: 'ESA Business Incubation Centre (BIC) Program',
    description: 'Two-year business support program for startups using space technology or space data. Includes up to EUR 50,000 in funding, office space, and technical/business mentorship. 20+ BIC locations across Europe.',
    agency: 'ESA',
    program: 'ESA BIC Network',
    fundingType: 'grant',
    amountMax: 55000,
    status: 'rolling',
    eligibility: ['small_business'],
    categories: ['general'],
    applicationUrl: 'https://commercialisation.esa.int/startups/',
    sourceUrl: 'https://commercialisation.esa.int/',
    source: 'manual',
    recurring: true,
  },
  {
    externalId: 'intl-esa-invest',
    title: 'ESA InCubed Programme',
    description: 'Co-funding program for innovative Earth observation products and services. ESA co-invests up to 50% of development costs for commercial EO applications.',
    agency: 'ESA',
    program: 'InCubed (Investing in Industrial Innovation)',
    fundingType: 'cooperative_agreement',
    status: 'rolling',
    eligibility: ['any'],
    categories: ['earth_observation'],
    applicationUrl: 'https://incubed.phi.esa.int/',
    sourceUrl: 'https://incubed.phi.esa.int/',
    source: 'manual',
    recurring: true,
  },
  {
    externalId: 'intl-uk-nstp',
    title: 'UK National Space Technology Programme (NSTP)',
    description: 'Grants from UK Space Agency to develop space technology. Funds range from GBP 50K for feasibility studies to GBP 500K for demonstration projects.',
    agency: 'UK Space Agency',
    program: 'NSTP',
    fundingType: 'grant',
    amountMin: 65000,
    amountMax: 650000,
    status: 'open',
    eligibility: ['small_business', 'university'],
    categories: ['general'],
    applicationUrl: 'https://www.gov.uk/government/collections/national-space-technology-programme',
    sourceUrl: 'https://www.gov.uk/government/organisations/uk-space-agency',
    source: 'manual',
    recurring: true,
  },
  {
    externalId: 'intl-csa-stdp',
    title: 'Canadian Space Agency - Space Technology Development Program',
    description: 'Funds Canadian organizations to develop space technologies. Supports projects from concept to prototype. Focus on communications, Earth observation, and space exploration.',
    agency: 'Canadian Space Agency',
    program: 'STDP',
    fundingType: 'grant',
    status: 'open',
    eligibility: ['small_business', 'university'],
    categories: ['general', 'communications', 'earth_observation'],
    applicationUrl: 'https://www.asc-csa.gc.ca/eng/funding-programs/',
    sourceUrl: 'https://www.asc-csa.gc.ca/',
    source: 'manual',
    recurring: true,
  },
  // NASA-specific well-known programs
  {
    externalId: 'nasa-sbir',
    title: 'NASA SBIR/STTR Program',
    description: 'NASA awards ~$200M annually through SBIR/STTR for small businesses developing innovative technologies. Phase I: $150K/6mo, Phase II: $750K/24mo, Phase III: production contracts.',
    agency: 'NASA',
    program: 'SBIR/STTR',
    fundingType: 'sbir',
    amountMin: 150000,
    amountMax: 750000,
    totalBudget: 200000000,
    status: 'rolling',
    eligibility: ['small_business'],
    categories: ['general'],
    applicationUrl: 'https://sbir.nasa.gov/',
    sourceUrl: 'https://sbir.nasa.gov/',
    source: 'manual',
    recurring: true,
  },
  {
    externalId: 'nasa-tipping-point',
    title: 'NASA Tipping Point Solicitations',
    description: 'NASA invests in commercial space technologies that are at a tipping point in their development. Awards typically $2M-$25M for partnerships advancing critical space capabilities.',
    agency: 'NASA',
    program: 'Space Technology Mission Directorate',
    fundingType: 'cooperative_agreement',
    amountMin: 2000000,
    amountMax: 25000000,
    status: 'upcoming',
    eligibility: ['any'],
    categories: ['in_space', 'lunar', 'propulsion'],
    applicationUrl: 'https://www.nasa.gov/directorates/stmd/solicitations/',
    sourceUrl: 'https://www.nasa.gov/directorates/stmd/',
    source: 'manual',
    recurring: true,
  },
  {
    externalId: 'nasa-ventures',
    title: 'NASA Ventures',
    description: 'Commercial partnerships program for licensing NASA-developed technologies. Enables startups to leverage NASA IP for commercial products with favorable licensing terms.',
    agency: 'NASA',
    program: 'Technology Transfer',
    fundingType: 'cooperative_agreement',
    status: 'rolling',
    eligibility: ['any'],
    categories: ['general'],
    applicationUrl: 'https://technology.nasa.gov/',
    sourceUrl: 'https://technology.nasa.gov/',
    source: 'manual',
    recurring: true,
  },
  {
    externalId: 'darpa-space',
    title: 'DARPA Space Programs',
    description: 'DARPA funds revolutionary space technologies through BAAs and other mechanisms. Programs like Blackjack (mesh satellite network), DRACO (nuclear thermal propulsion), and NOM4D (large space structures).',
    agency: 'DARPA',
    program: 'Strategic Technology Office',
    fundingType: 'contract',
    status: 'rolling',
    eligibility: ['any'],
    categories: ['defense', 'in_space'],
    applicationUrl: 'https://www.darpa.mil/work-with-us/opportunities',
    sourceUrl: 'https://www.darpa.mil/',
    source: 'manual',
    recurring: true,
  },
  {
    externalId: 'sfc-spacewerx',
    title: 'SpaceWERX (Space Force)',
    description: 'US Space Force innovation arm providing SBIR/STTR, Primes, and direct-to-phase-II awards for space technology. Focus on space domain awareness, communications, and launch.',
    agency: 'US Space Force',
    program: 'SpaceWERX / AFWERX',
    fundingType: 'sbir',
    amountMin: 50000,
    amountMax: 1500000,
    status: 'rolling',
    eligibility: ['small_business'],
    categories: ['defense', 'communications', 'debris'],
    applicationUrl: 'https://spacewerx.us/',
    sourceUrl: 'https://spacewerx.us/',
    source: 'manual',
    recurring: true,
  },
  {
    externalId: 'nsf-astro',
    title: 'NSF Astronomical Sciences Division Grants',
    description: 'NSF funds research in astronomy and astrophysics. Includes grants for instrument development, data analysis, and theoretical work. Awards range from $100K to several million.',
    agency: 'NSF',
    program: 'Division of Astronomical Sciences',
    fundingType: 'grant',
    amountMin: 100000,
    amountMax: 5000000,
    status: 'rolling',
    eligibility: ['university'],
    categories: ['exploration', 'general'],
    applicationUrl: 'https://www.nsf.gov/div/index.jsp?div=AST',
    sourceUrl: 'https://www.nsf.gov/',
    source: 'manual',
    recurring: true,
  },
];
