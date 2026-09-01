/**
 * AI-powered data research system.
 * Uses Claude Sonnet to verify and update module data based on recent news context.
 */

import { EDITORIAL_MODEL } from '@/lib/ai-models';
import Anthropic from '@anthropic-ai/sdk';
import prisma from '@/lib/db';
import { getModuleContent, upsertContent, logRefresh } from './dynamic-content';
import { FRESHNESS_POLICIES, getModulesBySource } from './freshness-policies';
import { logger } from './logger';

interface AIUpdateResult {
  module: string;
  itemsUpdated: number;
  itemsCreated: number;
  tokensUsed: number;
  notes: string;
}

interface AIRefreshResponse {
  updates: Array<{
    contentKey: string;
    section: string;
    data: unknown;
    confidence: number;
    changeNotes: string;
  }>;
  newItems: Array<{
    contentKey: string;
    section: string;
    data: unknown;
    confidence: number;
  }>;
  removals: string[];
  notes: string;
}

// Module-specific keyword configs for fetching relevant news
const MODULE_NEWS_KEYWORDS: Record<string, string[]> = {
  'space-stations': ['ISS', 'space station', 'Tiangong', 'crew', 'astronaut', 'cosmonaut', 'Axiom', 'Orbital Reef', 'Vast Haven', 'Starlab'],
  // 'space-economy' and 'startups' keyword entries removed (2026-08-14
  // orphaned-pipeline cleanup) — see matching note in freshness-policies.ts.
  'space-defense': ['Space Force', 'space defense', 'SDA', 'military space', 'space command', 'NRO', 'defense contract', 'USSF'],
  'cislunar': ['Artemis', 'lunar', 'moon mission', 'Gateway', 'CLPS', 'cislunar', 'Lunar Pathfinder', 'SLS', 'Orion'],
  'mars-planner': ['Mars', 'Perseverance', 'Curiosity', 'Mars mission', 'Mars launch', 'ExoMars', 'Mars Sample Return'],
  'launch-vehicles': ['Falcon 9', 'Starship', 'New Glenn', 'Vulcan', 'Ariane 6', 'launch vehicle', 'rocket', 'first flight', 'launch success'],
  'spaceports': ['spaceport', 'launch site', 'launch pad', 'Cape Canaveral', 'Boca Chica', 'launch complex', 'Vandenberg', 'DSN', 'deep space network', 'TDRS', 'relay satellite', 'optical comms', 'LCRD', 'ESTRACK', 'space communications'],
  'space-manufacturing': ['space manufacturing', 'in-space production', 'Varda', 'Redwire', 'space factory', 'microgravity', 'space materials'],
  'compliance': ['FCC space', 'FAA license', 'space law', 'space regulation', 'ITU filing', 'Artemis Accords', 'space treaty', 'spectrum allocation'],
  'talent-board': ['space expert', 'space consultant', 'space advisor', 'chief engineer', 'space workforce', 'space career', 'astronaut selection', 'space appointment', 'space executive'],
  'webinars': ['space conference', 'space webinar', 'space summit', 'space symposium', 'space forum', 'IAC', 'SATELLITE conference', 'SpaceCom', 'Space Symposium', 'space expo'],
  'space-tourism': ['space tourism', 'Blue Origin flight', 'Virgin Galactic', 'SpaceX tourism', 'Axiom mission', 'private astronaut', 'suborbital flight', 'Space Perspective', 'space hotel', 'orbital tourism'],
  'supply-chain': ['space supply chain', 'satellite components', 'space manufacturing', 'launch supply', 'radiation-hardened', 'space-grade', 'propulsion supplier', 'solar panel manufacturer', 'reaction wheel', 'star tracker'],
  // 'business-opportunities' keyword entry removed (2026-08-14
  // orphaned-pipeline cleanup) — see matching note in freshness-policies.ts.
  'ground-stations': ['ground station', 'satellite ground', 'KSAT', 'AWS Ground Station', 'SSC', 'antenna network', 'ground segment', 'TT&C', 'satellite uplink', 'deep space network'],
  'space-capital': ['space VC', 'space venture capital', 'space investment fund', 'space funding round', 'space SPAC', 'space IPO', 'Seraphim Capital', 'Space Capital', 'space fund raise', 'space acquisition'],
  'constellations': ['Starlink', 'OneWeb', 'Kuiper', 'constellation', 'satellite deploy', 'Iridium', 'Telesat', 'SDA Tranche', 'Guowang', 'satellite internet'],
};

// Module-specific prompt instructions
const MODULE_PROMPTS: Record<string, string> = {
  'space-stations': `Verify and update space station data across all sections:

ACTIVE STATIONS (section: active-stations):
- ISS status: orbit altitude, speed, any anomalies, expected deorbit timeline
- Tiangong station: current modules, operational status

CREW (section: crew):
- Current ISS crew: names, nationalities, mission names, arrival dates, expected return dates
- Current Tiangong crew: names, mission name

CREW ROTATIONS (section: crew-rotations):
- Upcoming Crew Dragon, Starliner, Soyuz missions — launch dates, crew assignments, mission names
- Recently completed rotations

COMMERCIAL STATIONS (section: commercial-stations):
- Axiom Station: module status, Axiom-4 mission plans, timeline to free-flying station
- Vast Haven-1: development milestones, launch target, funding status
- Orbital Reef (Blue Origin/Sierra Space): design progress, NASA CLD award status, timeline
- Starlab (Voyager/Airbus): development status, launch plans

CLD MILESTONES (section: cld-milestones):
- NASA Commercial LEO Destinations program: latest awards, deselections, schedule changes, funding updates`,

  // 'space-economy' and 'startups' MODULE_PROMPTS entries removed
  // (2026-08-14 orphaned-pipeline cleanup) — see matching note in
  // freshness-policies.ts. Neither module's DynamicContent rows are read by
  // any page.

  'space-defense': `Verify and update space defense data across all 5 sections:

SPACE FORCES (section: space-forces):
- US Space Force: update personnel count, budget (FY2025/2026), Chief of Space Operations, field command changes
- China PLA/Information Support Force: restructuring updates, new satellite launches, Beidou status
- Russia VKS Space Troops: GLONASS updates, new launches, Angara/Soyuz status, Ukraine conflict space impacts
- France CDE, UK Space Command, Japan SOG, India DSA, Germany, Australia, South Korea: personnel, budget, program updates

DEFENSE PROGRAMS (section: defense-programs):
- SDA Proliferated Warfighter Space Architecture: Tranche 1/2 launch progress, new contract awards
- GPS III/IIIF: latest satellite launches, constellation status
- Next-Gen OPIR: GEO/Polar satellite development/launch milestones
- NSSL Phase 2/3: launch assignments, Vulcan certification, Blue Origin New Glenn status
- AEHF/ESS: Evolved Strategic SATCOM development progress
- WGS-11+: production and launch timeline
- GSSAP/SILENTBARKER: any disclosed operations
- Allied programs: Skynet 6, CSO, SARah, CERES, Syracuse IV status updates

CONTRACTS (section: recent-contracts):
- New major defense space contract awards (>$100M)
- SDA tranche awards and modifications
- NSSL task order assignments
- Allied nation defense space procurements
- Emerging companies winning space defense contracts (Anduril, Palantir, etc.)

COUNTERSPACE (section: counterspace-events):
- New ASAT tests or demonstrations by any nation
- RPO incidents (Russian Luch, Chinese Shijian satellites near Western assets)
- GPS/GNSS jamming and spoofing events (Ukraine, Baltic, Middle East)
- Cyber attacks on space systems or ground infrastructure
- Directed energy weapon tests or incidents
- New counterspace capabilities disclosed in intelligence reports

ALLIANCES (section: alliances):
- CSpO membership changes or new joint exercises
- NATO Space Centre activities and policy updates
- AUKUS Pillar II space cooperation milestones
- Quad space initiatives progress
- New bilateral space security agreements
- Schriever Wargame or Global Sentinel exercise outcomes`,

  'cislunar': `Verify and update cislunar/Artemis data across all sections:

ARTEMIS MISSIONS (section: artemis-missions):
- Artemis II, III, IV, V, VI: current target launch dates, crew assignments, mission objectives, status
- SLS/Orion readiness updates, HLS (Starship/Blue Origin) milestones

CLPS MISSIONS (section: clps-missions):
- Active CLPS missions: which have launched, landed, or failed
- Upcoming CLPS deliveries: provider, payload, target date, landing site
- New CLPS task orders awarded

ISRU PROGRAMS (section: isru-programs):
- VIPER status (launch date, delays, cancellations)
- Other ice prospecting and resource utilization programs
- Commercial ISRU initiatives

INFRASTRUCTURE (section: infrastructure):
- Lunar surface infrastructure projects: habitats, power systems, rovers, comm relays
- Commercial lunar lander development updates

INVESTMENTS (section: investments):
- Artemis program budget and cost updates by component
- Commercial investment in cislunar activities

GATEWAY MODULES (section: gateway-modules):
- PPE/HALO: development, integration, launch date
- I-HAB, ESPRIT, Canadarm3: build progress, delivery timelines

INTERNATIONAL PARTNERS (section: international-partners):
- ESA, JAXA, CSA, ISRO contributions and timeline updates
- New Artemis Accords signatories relevant to cislunar`,

  'mars-planner': `Verify and update Mars exploration data across all sections:

ACTIVE MISSIONS (section: active-missions):
- Perseverance: sol count, location, sample cache status, Ingenuity helicopter status
- Curiosity: sol count, location, current science campaign
- Mars orbiters: MRO, MAVEN, TGO, Mars Express, Tianwen-1 orbiter, Hope — operational status
- Zhurong rover: current status (active/dormant)

UPCOMING MISSIONS (section: upcoming-missions):
- Mars Sample Return: current architecture, timeline, budget status, any restructuring
- ExoMars Rosalind Franklin: launch date, landing site
- Other planned missions: agencies, vehicles, objectives, target launch dates

LAUNCH WINDOWS (section: launch-windows):
- Next Mars launch windows with dates and delta-v requirements
- Which missions are targeting each window

COST ESTIMATES (section: cost-estimates):
- Mars mission cost ranges by type (flyby, orbiter, lander, crewed)
- MSR cost updates

COMMERCIAL OPPORTUNITIES (section: commercial-opportunities):
- SpaceX Starship Mars timeline and cargo mission plans
- Commercial Mars payload opportunities
- Private Mars mission proposals`,

  'launch-vehicles': `Verify and update launch vehicle data:

VEHICLES (section: vehicles):
For each vehicle update these fields: totalLaunches, successfulLaunches, successRate, status, lastFlightDate, and any notable changes.

Key vehicles to track:
- Falcon 9/Heavy: cumulative launch count, landing count, latest mission
- Starship: test flight count, latest flight results, FAA license status, timeline for operational missions
- New Glenn: first flight date/results, payload customers
- Vulcan Centaur: flight count, certification status, NSSL missions
- Ariane 6: flight count, anomalies, commercial manifest
- Electron: cumulative launches, Neutron development timeline
- H3 (JAXA): flight status after initial failure
- Long March variants: notable missions, new variants
- PSLV/LVM3 (ISRO): launch cadence
- Soyuz-2: launch count, sanctions impact
- New vehicles approaching first flight: Terran R, New Glenn, Neutron, Ariane 6.2
For each: id, name, manufacturer, country, status (operational/development/retired), totalLaunches, successfulLaunches, successRate, costPerKg, payloadToLEO, lastFlightDate`,

  'spaceports': `Verify and update spaceport and space communications data across all sections:

ACTIVE SPACEPORTS (section: active-spaceports):
- Launch counts for current year at each major site (Cape Canaveral, Vandenberg, Kennedy, Boca Chica, Mahia, Kourou, Jiuquan, etc.)
- New spaceports under construction or recently operational
- Notable facility upgrades, expansions, or regulatory approvals

EMERGING SPACEPORTS (section: emerging-spaceports):
- Status updates for spaceports in development (SaxaVord, Sutherland, Andøya, Arnhem, etc.)
- Expected operational dates, first launch targets
- FAA/regulatory license status

TRAFFIC DATA (section: traffic-data):
- Annual launch counts by site for recent years
- Year-over-year growth rates

DSN COMPLEXES (section: dsn-complexes):
- NASA Deep Space Network: Goldstone, Madrid, Canberra — antenna counts, diameters, current mission support
- Any new antenna construction or upgrades

RELAY NETWORKS (section: relay-networks):
- TDRS fleet status: operational vs. retired satellites, remaining lifetime
- ESA EDRS: current satellites, data relay capacity, commercial customers
- Any new relay satellite launches or planned replacements

OPTICAL SYSTEMS (section: optical-systems):
- NASA LCRD: operational status, data rates achieved, missions using it
- ESA EDRS optical: status and throughput
- JAXA LUCAS: operational status
- Any new optical comms demonstrations or records

LUNAR COMMS ELEMENTS (section: lunar-comms-elements):
- LunaNet architecture: development status, planned nodes
- ESA Moonlight: mission timeline, commercial partners
- Commercial lunar relay providers (Crescent Space, etc.)

ESTRACK STATIONS (section: estrack-stations):
- ESA tracking station network: locations, antenna sizes, current mission support
- New station construction or antenna upgrades

FREQUENCY ALLOCATIONS (section: frequency-allocations):
- S-band, X-band, Ka-band, optical — allocation updates, congestion status
- Any new ITU decisions on space communication bands

COMMS HERO STATS (section: comms-hero-stats):
- Total ground stations worldwide, countries with DSN access, max deep space data rate, farthest communication contact`,

  'space-manufacturing': `Verify and update space manufacturing data across all sections:

COMPANIES (section: companies):
- Varda Space Industries: mission count, reentry capsule results, next mission date
- Redwire: ISS experiments, revenue, commercial activities
- Space Forge: development status, ForgeStar missions
- Flawless Photonics: ZBLAN fiber optic production status
- Other in-space manufacturing companies and milestones

PRODUCT CATEGORIES (section: product-categories):
- Pharmaceuticals, ZBLAN fiber, bioprinted organs, semiconductors, alloys, protein crystals
- TRL updates for each category

MARKET PROJECTIONS (section: market-projections):
- In-space manufacturing market size estimates by year (2024-2035)
- Growth rate updates

IMAGERY PROVIDERS (section: img-providers):
- Maxar, Planet, Airbus, Capella, ICEYE, BlackSky, Satellogic — constellation updates, resolution improvements, new products

IMAGERY USE CASES (section: img-use-cases):
- Agriculture, defense, insurance, climate, urban planning — market size and adoption updates`,

  'compliance': `Verify and update space regulatory data:
- New Artemis Accords signatories
- Recent FCC satellite/spectrum actions
- FAA launch license updates
- ITU coordination changes
- New or proposed space regulations (US, EU, international)
- Notable legal proceedings or bid protests in space sector`,

  'talent-board': `Research and update notable space industry professionals and experts:
- New executive appointments at major space companies (CEO, CTO, VP Engineering, Chief Scientist)
- Advisory board changes at space organizations and companies
- Award winners (Space Foundation awards, AIAA fellowships, NASA Distinguished Service medals)
- Prominent conference speakers and panelists from recent events
- New space consulting firms or notable independent consultants
- Space law practitioners handling significant cases
- Export control/ITAR compliance specialists at major defense/space firms
- Government affairs leaders at commercial space companies
- International space policy figures (UN COPUOS delegates, Artemis Accords negotiators)
For each person provide: name, current title, organization, expertise areas (space_law, export_controls, regulatory, propulsion, avionics, systems_engineering, government_relations, international_policy), brief bio, and availability status`,

  'webinars': `Research and update upcoming space industry events, conferences, and webinars:
- Major conferences: Space Symposium, SATELLITE, IAC, SmallSat, SpaceCom, AIAA Space Forum
- Industry events: Space Tech Expo, Satellite Innovation, World Satellite Business Week, AMOS
- Defense events: Global MilSatCom, Space & Missile Defense Symposium
- Advocacy events: ISDC, Humans to Mars Summit, Von Braun Symposium
- Virtual webinars and panels from industry organizations
- Government-hosted events: National Space Council, FAA Commercial Space Transportation Conference
For each event provide: title, description, date, duration in minutes, key speaker(s), speaker bios, topic category, registration URL. Mark events as past if their date has passed.`,

  'space-tourism': `Verify and update space tourism offerings and missions:
- Blue Origin New Shepard: latest flight number, crew details, ticket pricing, flight cadence
- Virgin Galactic: operational status, flight count, ticket price, upcoming missions
- SpaceX tourism missions: Inspiration4 follow-ons, dearMoon status, Polaris program updates
- Axiom Space: ISS mission count, commercial station timeline, crew details
- Space Perspective: Spaceship Neptune status, test flights, commercial timeline
- Vast: Haven-1 station development status, planned launch date
- Orbital Reef (Blue Origin/Sierra Space): development milestones
- New entrants: any new companies offering space tourism
For each offering: provider, vehicle/destination, type (suborbital/orbital/station), price range, status, upcoming missions`,

  'supply-chain': `Verify and update space industry supply chain data across all sections:

COMPANIES (section: companies):
- Major component suppliers across all tiers: prime contractors, subsystem providers, component manufacturers
- For each: name, tier (EXACTLY one of: "prime", "tier1", "tier2", "tier3" — never bare numbers), products, customers, country, countryCode (ISO-3), production capacity, lead times, recent developments
- Update any M&A activity, new facilities, or capacity expansions
- NOTE: your output is merged onto a curated 60+-company catalog (dynamic wins name collisions), so returning only the handful of companies with news is fine — but every company you DO return must carry the full field set above

RELATIONSHIPS (section: relationships):
- Key supplier-customer relationships with estimated annual values
- New partnerships or supply agreements
- Vertical integration moves

SHORTAGES (section: shortages):
- Critical material shortages affecting the space industry
- Radiation-hardened electronics availability and lead times
- Titanium, carbon fiber, rare earth pricing and availability
- For each: material/component, severity (critical/moderate/low), affected programs, estimated resolution timeline`,

  // 'business-opportunities' MODULE_PROMPTS entry removed (2026-08-14
  // orphaned-pipeline cleanup) — see matching note in freshness-policies.ts.

  'ground-stations': `Verify and update ground station network data:
- Major commercial networks: KSAT, SSC (Swedish Space Corp), Viasat RTE, AWS Ground Station, Azure Orbital, Leaf Space
- Government networks: NASA DSN (Goldstone, Madrid, Canberra), ESA ESTRACK, CNES
- New ground station deployments and expansions
- Ground-station-as-a-service offerings and pricing
- Optical ground terminals for laser communications
- Ground station capacity and frequency band availability (S, X, Ka, optical)
- Emerging players and M&A activity in ground segment
For each network/station: operator, locations, antenna count, supported bands, key customers, recent expansions, service model`,

  'space-capital': `Verify and update space capital/investment data:

INVESTORS (section: investors):
- Top space-focused VC/PE firms: name, AUM, check size range, stage preference, sector focus, notable portfolio companies
- Include: Space Capital, Seraphim Capital, Airbus Ventures, a16z, Bessemer Venture Partners, Type One Ventures, Promus Ventures, In-Q-Tel, Lockheed Martin Ventures, Boeing HorizonX
- Update deal counts and recent investments
- Flag any new funds launched or fund raises announced
For each investor: id, name, type (VC/PE/CVC/Government), description, aum, checkSize (min-max), stagePreference, sectorFocus (array), dealCount, portfolio (array of company names), location, foundedYear

FUNDING BY YEAR (section: funding-by-year):
- Annual total VC investment in space sector (in billions USD)
- Deal count per year
- Update current year with latest available data
For each year: year, amount (billions USD), dealCount`,

  'constellations': `Verify and update satellite constellation data:

CONSTELLATIONS (section: constellations):
For each constellation (Starlink, OneWeb, Kuiper, Iridium, Telesat Lightspeed, Guowang, Qianfan, SDA Transport/Tracking):
- activeSatellites: current count of operational satellites
- authorizedSatellites: total authorized by FCC/ITU
- status: deploying, operational, planned, or decommissioning
- Regulatory updates: new FCC/ITU filings, spectrum coordination changes
- Debris compliance updates: any incidents or policy changes
- Service area or capability expansions
- New generation plans or design changes
For each: id, name, operator, country, activeSatellites, authorizedSatellites, status, altitudeKm, frequencyBands, serviceType, description`,
};

/**
 * Fetch recent news articles relevant to a module's keywords
 */
async function getRelevantNews(module: string, daysBack: number = 7): Promise<string> {
  const keywords = MODULE_NEWS_KEYWORDS[module] || [];
  if (keywords.length === 0) return 'No recent news available for this module.';

  const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  // Build OR conditions for keyword matching in title or summary
  const articles = await prisma.newsArticle.findMany({
    where: {
      publishedAt: { gte: cutoff },
      OR: keywords.map((kw) => ({
        OR: [
          { title: { contains: kw, mode: 'insensitive' as const } },
          { summary: { contains: kw, mode: 'insensitive' as const } },
        ],
      })),
    },
    orderBy: { publishedAt: 'desc' },
    take: 20,
    select: {
      title: true,
      summary: true,
      source: true,
      publishedAt: true,
      url: true,
    },
  });

  if (articles.length === 0) {
    return 'No recent news articles found matching this module\'s topics.';
  }

  return articles
    .map(
      (a, i) =>
        `${i + 1}. ${a.title}\n   Source: ${a.source} | ${a.publishedAt.toISOString().split('T')[0]}\n   ${a.summary || ''}\n   ${a.url}`
    )
    .join('\n\n');
}

/**
 * Refresh a single module's data using AI research.
 *
 * @param priorityKeys - Optional content keys (stalest-first) that the
 *   caller wants prioritized in this pass. See refreshAllAIResearchedModules
 *   for how these are computed from actual per-key ages.
 */
/** Output budget for a module refresh. Covers adaptive thinking AND the JSON
 *  payload — the two share this cap. See the note at the API call below. */
const MAX_REFRESH_TOKENS = 16000;

export async function refreshModuleViaAI(module: string, priorityKeys?: string[]): Promise<AIUpdateResult> {
  const start = Date.now();
  const result: AIUpdateResult = {
    module,
    itemsUpdated: 0,
    itemsCreated: 0,
    tokensUsed: 0,
    notes: '',
  };

  try {
    // 1. Load current module data from DynamicContent
    const currentContent = await getModuleContent(module);
    const currentDataSummary = currentContent.length > 0
      ? currentContent.map((c) => {
          const dataStr = JSON.stringify(c.data);
          // Truncate large data to fit in context
          const truncated = dataStr.length > 2000 ? dataStr.slice(0, 2000) + '...[truncated]' : dataStr;
          return `[${c.contentKey}] (section: ${c.section})\n${truncated}`;
        }).join('\n\n')
      : 'No existing data in database for this module.';

    // 2. Get recent relevant news
    const newsContext = await getRelevantNews(module);

    // 3. Get module-specific prompt
    const moduleInstructions = MODULE_PROMPTS[module] || `Verify and update data for the ${module} module.`;

    // 3b. Priority steering — the LLM only ever updates an arbitrary subset
    // of sections per pass, so without an explicit nudge some content keys
    // never get touched across many refresh passes. If the caller computed
    // the stalest keys, tell the model to treat them as must-review.
    const priorityNote = priorityKeys && priorityKeys.length > 0
      ? `\n\n## Priority — Stalest Content Keys (review these first)\nThese content keys have gone the longest without a refresh and MUST be reviewed and included in "updates" (with a changeNotes explaining what changed, or "no change needed" if verification found nothing to update) before you spend remaining budget elsewhere: ${priorityKeys.join(', ')}`
      : '';

    // 4. Build the AI prompt
    const prompt = `You are a space industry data analyst for SpaceNexus, a professional space intelligence platform. Your job is to verify and update module data based on your knowledge and recent news articles.

## Module: ${module}

## Task
${moduleInstructions}${priorityNote}

## Current Data in Our Database
${currentDataSummary}

## Recent Relevant News (Last 7 Days)
${newsContext}

## Instructions
1. Review each existing data item for accuracy based on your training knowledge and the news context above
2. Update any values that have changed (dates, counts, statuses, personnel, etc.)
3. Add significant NEW items that should be tracked (new missions, new companies, new developments)
4. Mark items for removal if they are no longer relevant (completed missions, dissolved entities)
5. For each update, set a confidence score: 1.0 = confirmed fact, 0.8 = very likely, 0.6 = probable, 0.4 = uncertain

IMPORTANT: Only update values you are confident about. If you're unsure about something, keep the existing value and note the uncertainty. Never fabricate data.

Respond with valid JSON (no markdown code fences):
{
  "updates": [
    {
      "contentKey": "${module}:section-name",
      "section": "section-name",
      "data": { ... complete updated data object ... },
      "confidence": 0.9,
      "changeNotes": "Brief description of what changed"
    }
  ],
  "newItems": [
    {
      "contentKey": "${module}:new-section",
      "section": "new-section",
      "data": { ... new data object ... },
      "confidence": 0.8
    }
  ],
  "removals": [],
  "notes": "Summary of changes made and any uncertainties"
}`;

    // 5. Call Claude.
    //
    // max_tokens is a HARD CAP ON THINKING + TEXT COMBINED, and Sonnet 5 runs
    // adaptive thinking by default (see ai-models.ts). This call used to ask
    // for 4000, which the reasoning alone could consume on a large module —
    // leaving a response with a thinking block and no text block at all, or a
    // text block cut off mid-JSON. That produced two misleading errors
    // ("no text content" / "failed to parse JSON") that read like model
    // misbehaviour, and silently flatlined several modules for days. Give the
    // budget real headroom and cap the reasoning depth with effort instead.
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: EDITORIAL_MODEL,
      max_tokens: MAX_REFRESH_TOKENS,
      output_config: { effort: 'medium' },
      messages: [{ role: 'user', content: prompt }],
    });

    result.tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

    // 6. Parse response. Check stop_reason FIRST — a truncated or refused
    // response is a budget/policy problem, not a parsing problem, and saying
    // so is the difference between a one-line fix and a week of stale data.
    if (response.stop_reason === 'max_tokens') {
      throw new Error(
        `AI response hit the ${MAX_REFRESH_TOKENS}-token cap before finishing (thinking + output). ` +
        'Raise max_tokens or lower output_config.effort for this module.',
      );
    }
    if (response.stop_reason === 'refusal') {
      throw new Error('AI declined to answer this refresh prompt (stop_reason: refusal)');
    }

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      const kinds = response.content.map((b) => b.type).join(', ') || 'none';
      throw new Error(`AI response contained no text block (blocks: ${kinds})`);
    }

    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI response contained no valid JSON');
    }

    let parsed: AIRefreshResponse;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error(
        `Failed to parse AI response JSON (${jsonMatch[0].length} chars, ` +
        `stop_reason: ${response.stop_reason})`,
      );
    }

    // 7. Apply updates
    if (parsed.updates && Array.isArray(parsed.updates)) {
      for (const update of parsed.updates) {
        if (!update.contentKey || !update.data) continue;
        await upsertContent(
          update.contentKey,
          module,
          update.section || null,
          update.data,
          {
            sourceType: 'ai-research',
            aiConfidence: update.confidence || 0.7,
            aiNotes: update.changeNotes,
          }
        );
        result.itemsUpdated++;
      }
    }

    // 8. Add new items
    if (parsed.newItems && Array.isArray(parsed.newItems)) {
      for (const item of parsed.newItems) {
        if (!item.contentKey || !item.data) continue;
        await upsertContent(
          item.contentKey,
          module,
          item.section || null,
          item.data,
          {
            sourceType: 'ai-research',
            aiConfidence: item.confidence || 0.6,
          }
        );
        result.itemsCreated++;
      }
    }

    // 9. Handle removals (mark as inactive rather than delete)
    if (parsed.removals && Array.isArray(parsed.removals)) {
      for (const key of parsed.removals) {
        await prisma.dynamicContent.updateMany({
          where: { contentKey: key, module },
          data: { isActive: false },
        });
      }
    }

    result.notes = parsed.notes || 'AI research completed';

    await logRefresh(module, 'ai-research', 'success', {
      itemsUpdated: result.itemsUpdated,
      itemsCreated: result.itemsCreated,
      tokensUsed: result.tokensUsed,
      duration: Date.now() - start,
      details: { notes: result.notes },
    });

    logger.info(`AI research complete for ${module}`, {
      updated: result.itemsUpdated,
      created: result.itemsCreated,
      tokens: result.tokensUsed,
    });

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    result.notes = `Error: ${errorMsg}`;

    await logRefresh(module, 'ai-research', 'failed', {
      errorMessage: errorMsg,
      tokensUsed: result.tokensUsed,
      duration: Date.now() - start,
    });

    logger.error(`AI research failed for ${module}`, { error: errorMsg });
    return result;
  }
}

/**
 * Refresh all modules that use AI research, checking staleness first.
 *
 * IMPORTANT: the staleness gate looks at the OLDEST active content key for
 * the module, not the most-recently-refreshed one. Several modules mix an
 * API-refreshed key (e.g. a daily live-procurement feed) with AI-researched
 * keys — checking only the newest key meant a single daily API refresh
 * masked AI-authored sections that hadn't been touched in months (e.g.
 * space-defense's 5 AI sections sat at sourceType 'seed', 186 days old,
 * because the module's live-procurement key kept looking "fresh").
 */
export async function refreshAllAIResearchedModules(): Promise<{
  totalUpdated: number;
  totalCreated: number;
  totalTokens: number;
  results: AIUpdateResult[];
}> {
  const aiModules = getModulesBySource('ai-research');
  const results: AIUpdateResult[] = [];
  let totalUpdated = 0;
  let totalCreated = 0;
  let totalTokens = 0;

  for (const moduleItem of aiModules) {
    // Check if module has data that needs refresh
    const policy = FRESHNESS_POLICIES[moduleItem];
    if (!policy) continue;

    // Pull every active key's age (lightweight columns only) ordered
    // oldest-first. This both (a) drives the gate off the OLDEST key so a
    // single fresh API-refreshed key can't mask stale AI sections, and
    // (b) gives us per-key coverage visibility in the logs regardless of
    // whether the module ends up qualifying for a refresh pass.
    const activeRows = await prisma.dynamicContent.findMany({
      where: { module: moduleItem, isActive: true },
      orderBy: { refreshedAt: 'asc' },
      select: { contentKey: true, refreshedAt: true },
    });

    const ttlMs = policy.ttlHours * 60 * 60 * 1000;
    const now = Date.now();

    if (activeRows.length > 0) {
      logger.info(`Per-key freshness snapshot for ${moduleItem}`, {
        keys: activeRows.map((r) => ({
          contentKey: r.contentKey,
          ageHours: Math.round((now - r.refreshedAt.getTime()) / 3600000),
        })),
      });

      // Skip only if the OLDEST active key is still within TTL.
      const oldest = activeRows[0];
      const oldestAgeMs = now - oldest.refreshedAt.getTime();
      if (oldestAgeMs < ttlMs) {
        logger.info(`Skipping AI research for ${moduleItem}: oldest active key "${oldest.contentKey}" is fresh (${Math.round(oldestAgeMs / 3600000)}h old, TTL ${policy.ttlHours}h)`);
        continue;
      }
    }

    // Steer the AI pass toward the stalest keys first. The LLM only updates
    // an arbitrary subset of sections per pass within its token budget, so
    // without explicit steering some keys (e.g. launch-vehicles:soyuz-5)
    // never get touched across many passes. Pass the oldest N key names in
    // as an explicit priority list for the prompt.
    const priorityKeys = activeRows.slice(0, 8).map((r) => r.contentKey);

    const result = await refreshModuleViaAI(moduleItem, priorityKeys);
    results.push(result);
    totalUpdated += result.itemsUpdated;
    totalCreated += result.itemsCreated;
    totalTokens += result.tokensUsed;

    // Add a small delay between modules to avoid rate limiting
    await new Promise((r) => setTimeout(r, 1000));
  }

  logger.info('AI research refresh complete', {
    modulesProcessed: results.length,
    totalUpdated,
    totalCreated,
    totalTokens,
  });

  return { totalUpdated, totalCreated, totalTokens, results };
}
