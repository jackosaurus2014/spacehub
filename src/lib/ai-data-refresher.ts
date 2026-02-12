/**
 * AI-powered data research system.
 * Uses Claude Sonnet to verify and update module data based on recent news context.
 */

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
  'space-economy': ['space economy', 'space market', 'venture capital', 'space investment', 'space IPO', 'space funding', 'space revenue', 'satellite market', 'launch cost', 'space salary', 'space workforce', 'launch price'],
  'startups': ['startup', 'funding round', 'Series A', 'Series B', 'seed round', 'space venture', 'space company', 'acquisition'],
  'space-defense': ['Space Force', 'space defense', 'SDA', 'military space', 'space command', 'NRO', 'defense contract', 'USSF'],
  'cislunar': ['Artemis', 'lunar', 'moon mission', 'Gateway', 'CLPS', 'cislunar', 'Lunar Pathfinder', 'SLS', 'Orion'],
  'mars-planner': ['Mars', 'Perseverance', 'Curiosity', 'Mars mission', 'Mars launch', 'ExoMars', 'Mars Sample Return'],
  'launch-vehicles': ['Falcon 9', 'Starship', 'New Glenn', 'Vulcan', 'Ariane 6', 'launch vehicle', 'rocket', 'first flight', 'launch success'],
  'spaceports': ['spaceport', 'launch site', 'launch pad', 'Cape Canaveral', 'Boca Chica', 'launch complex', 'Vandenberg'],
  'space-manufacturing': ['space manufacturing', 'in-space production', 'Varda', 'Redwire', 'space factory', 'microgravity', 'space materials'],
  'compliance': ['FCC space', 'FAA license', 'space law', 'space regulation', 'ITU filing', 'Artemis Accords', 'space treaty', 'spectrum allocation'],
  'talent-board': ['space expert', 'space consultant', 'space advisor', 'chief engineer', 'space workforce', 'space career', 'astronaut selection', 'space appointment', 'space executive'],
  'webinars': ['space conference', 'space webinar', 'space summit', 'space symposium', 'space forum', 'IAC', 'SATELLITE conference', 'SpaceCom', 'Space Symposium', 'space expo'],
};

// Module-specific prompt instructions
const MODULE_PROMPTS: Record<string, string> = {
  'space-stations': `Verify and update space station data:
- Current ISS crew: names, nationalities, mission names, arrival dates, expected return dates
- ISS status: orbit altitude, speed, any issues
- Tiangong station: current crew, mission name
- Commercial stations: Axiom, Vast Haven-1, Orbital Reef, Starlab — latest development status, timeline updates
- CLD (Commercial LEO Destinations) milestones: any updates to NASA awards or timelines`,

  'space-economy': `Verify and update space economy data across these sections:

MARKET SEGMENTS (section: market-segments):
- Global space economy market size (latest estimate)
- Segment revenue breakdown: satellite services, manufacturing, launch, ground equipment
- Growth rates per segment

QUARTERLY VC (section: quarterly-vc):
- Recent VC/funding deals in space sector (last quarter)
- Deal counts and total invested per quarter

ANNUAL INVESTMENT (section: annual-investment):
- Annual VC, debt financing, public offerings totals

GOVERNMENT BUDGETS (section: government-budgets):
- Space budgets for US (NASA, Space Force, NRO), China, ESA, India, Japan, etc.

WORKFORCE STATS (section: workforce-stats):
- Space industry employment, hiring trends, unfilled positions, salary growth

LAUNCH COST TRENDS (section: launch-cost-trends):
- Cost per kg to LEO for ALL major launch vehicles worldwide
- Each entry needs: vehicle, operator, year, costPerKgLEO (number), payload (kg to LEO), reusable (boolean)
- Include SpaceX (Falcon 9, Falcon Heavy, Starship), Rocket Lab (Electron, Neutron), ULA (Vulcan, Atlas V), Arianespace (Ariane 6, Vega C), Blue Origin (New Glenn), ISRO (PSLV, LVM3), JAXA (H3), CASC (Long March 2D/3B/5/8), Roscosmos (Soyuz-2, Proton-M, Angara A5), Firefly, Relativity, Northrop Grumman

SALARY BENCHMARKS (section: salary-benchmarks):
- US space industry salary data by role
- Each entry needs: role (string), minSalary, maxSalary, median (all numbers in USD), growth (YoY percentage)
- Include: Software, GNC, Propulsion, Systems, RF/Comms, Avionics, Thermal, Structures, Mission Ops, AI/ML, Manufacturing, Test, Program Manager, Ground Systems, Integration, Policy/Regulatory, Launch Ops, Orbital Mechanics`,

  'startups': `Verify and update space startup data:
- Recently funded space startups (funding rounds, amounts, investors)
- Company status changes (IPO, acquisition, shutdown, pivot)
- New notable space startups
- Funding trends and total quarterly/annual investment figures
- Top space VC investors and their recent deals`,

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

  'cislunar': `Verify and update cislunar/Artemis data:
- Artemis mission timeline: Artemis II, III, IV, V current target dates and status
- CLPS missions: which have launched, which are upcoming, any failures
- Lunar Gateway: module development status, launch dates
- ISRU (In-Situ Resource Utilization) programs: VIPER, other ice prospecting missions
- Cislunar infrastructure investments and commercial activities`,

  'mars-planner': `Verify and update Mars exploration data:
- Active Mars missions: Perseverance, Curiosity, Zhurong, InSight status
- Upcoming Mars missions: target dates, agencies, objectives
- Mars launch windows: next optimal windows
- Mars Sample Return program status
- SpaceX Starship Mars timeline updates`,

  'launch-vehicles': `Verify and update launch vehicle data:
- Active launch vehicles: recent launch counts, success rates, status
- Starship: latest test flights, timeline for operational missions
- New Glenn: first flight status and results
- Vulcan Centaur: flight history update
- Ariane 6: flight count and status
- New vehicles in development: Neutron, Terran R, etc.
- Cost per kg to LEO for each vehicle (if updated)`,

  'spaceports': `Verify and update spaceport data:
- Active spaceport launch counts (2024-current year)
- New spaceports under construction or recently operational
- Notable facility upgrades or expansions
- Regulatory approvals for new launch sites
- Commercial spaceport developments`,

  'space-manufacturing': `Verify and update space manufacturing data:
- Varda Space Industries: latest missions and pharmaceutical results
- Redwire: ISS experiments and commercial activities
- Other in-space manufacturing companies and milestones
- ISS National Lab experiment updates
- Technology readiness level updates for key programs
- Market projections for in-space manufacturing`,

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
 * Refresh a single module's data using AI research
 */
export async function refreshModuleViaAI(module: string): Promise<AIUpdateResult> {
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

    // 4. Build the AI prompt
    const prompt = `You are a space industry data analyst for SpaceNexus, a professional space intelligence platform. Your job is to verify and update module data based on your knowledge and recent news articles.

## Module: ${module}

## Task
${moduleInstructions}

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

    // 5. Call Claude Sonnet
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    result.tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

    // 6. Parse response
    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('AI response contained no text content');
    }

    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI response contained no valid JSON');
    }

    let parsed: AIRefreshResponse;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error('Failed to parse AI response JSON');
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
 * Refresh all modules that use AI research, checking staleness first
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

  for (const module of aiModules) {
    // Check if module has data that needs refresh
    const policy = FRESHNESS_POLICIES[module];
    if (!policy) continue;

    const latestContent = await prisma.dynamicContent.findFirst({
      where: { module, isActive: true },
      orderBy: { refreshedAt: 'desc' },
      select: { refreshedAt: true },
    });

    // Skip if recently refreshed (within TTL)
    if (latestContent) {
      const ageMs = Date.now() - latestContent.refreshedAt.getTime();
      const ttlMs = policy.ttlHours * 60 * 60 * 1000;
      if (ageMs < ttlMs) {
        logger.info(`Skipping AI research for ${module}: data is fresh (${Math.round(ageMs / 3600000)}h old, TTL ${policy.ttlHours}h)`);
        continue;
      }
    }

    const result = await refreshModuleViaAI(module);
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
