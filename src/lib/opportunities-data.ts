import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';

const prisma = new PrismaClient();

// Initialize Anthropic client if API key is available
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export interface OpportunityData {
  slug: string;
  title: string;
  description: string;
  fullAnalysis?: string;
  type: string;
  category: string;
  sector?: string;
  estimatedValue?: string;
  timeframe?: string;
  difficulty?: string;
  sourceType: string;
  sourceUrl?: string;
  sourceName?: string;
  solicitationId?: string;
  agency?: string;
  dueDate?: Date;
  contractType?: string;
  setAside?: string;
  aiConfidence?: number;
  aiReasoning?: string;
  relatedTrends?: string[];
  targetAudience?: string[];
  status?: string;
  featured?: boolean;
  expiresAt?: Date;
}

// Seed opportunities for demonstration
const SEED_OPPORTUNITIES: OpportunityData[] = [
  // Government Contracts
  {
    slug: 'nasa-clps-task-order-2026',
    title: 'NASA CLPS Lunar Delivery Services - Task Order 2026',
    description: 'NASA seeks commercial lunar payload delivery services under the Commercial Lunar Payload Services (CLPS) program for scientific instruments and technology demonstrations.',
    fullAnalysis: 'The CLPS program continues to expand with multiple task orders expected in 2026. Companies should focus on landing precision, payload capacity, and survivability for the lunar night. Key technical requirements include soft-landing capability, power provision during lunar day, and data relay services.',
    type: 'government_contract',
    category: 'launch_services',
    sector: 'civil',
    estimatedValue: '$50M-$150M',
    timeframe: 'medium_term',
    difficulty: 'expert',
    sourceType: 'sam_gov',
    sourceName: 'NASA',
    agency: 'NASA',
    contractType: 'idiq',
    aiConfidence: 0.95,
    aiReasoning: 'Active NASA program with proven funding and multiple awards expected.',
    relatedTrends: ['lunar_economy', 'artemis_program', 'commercial_space'],
    targetAudience: ['corporations', 'investors'],
    featured: true,
  },
  {
    slug: 'ussf-responsive-launch-2026',
    title: 'USSF Tactically Responsive Space Launch Services',
    description: 'US Space Force solicitation for rapid-response launch capabilities to deploy small satellites within 24-48 hours of call-up.',
    fullAnalysis: 'The Department of Defense is prioritizing responsive launch capabilities for national security. This represents a paradigm shift from scheduled launches to on-demand deployment. Companies with mobile launch platforms or rapid integration capabilities have significant advantages.',
    type: 'government_contract',
    category: 'launch_services',
    sector: 'defense',
    estimatedValue: '$100M-$500M',
    timeframe: 'short_term',
    difficulty: 'expert',
    sourceType: 'sam_gov',
    sourceName: 'US Space Force',
    agency: 'USSF',
    contractType: 'idiq',
    setAside: 'small_business',
    aiConfidence: 0.90,
    aiReasoning: 'Strategic priority for DoD with significant budget allocation.',
    relatedTrends: ['responsive_space', 'national_security', 'small_launch'],
    targetAudience: ['corporations', 'entrepreneurs'],
    featured: true,
  },

  // Industry Needs
  {
    slug: 'in-space-manufacturing-materials',
    title: 'In-Space Manufacturing Raw Materials Supply Chain',
    description: 'Growing demand for specialized materials that can be processed in microgravity, including high-purity semiconductors, fiber optics, and pharmaceutical compounds.',
    fullAnalysis: 'As commercial space stations come online (Axiom, Vast, Orbital Reef), there is an urgent need for a supply chain of raw materials optimized for space manufacturing. This includes ultra-pure silicon for semiconductors, ZBLAN glass precursors for fiber optics, and pharmaceutical-grade compounds. Companies that can provide certified, space-ready materials with proper packaging and documentation will find a growing market.',
    type: 'industry_need',
    category: 'manufacturing',
    sector: 'commercial',
    estimatedValue: '$10M-$100M annually',
    timeframe: 'medium_term',
    difficulty: 'medium',
    sourceType: 'ai_generated',
    aiConfidence: 0.85,
    aiReasoning: 'Multiple space stations planned with manufacturing as key revenue stream.',
    relatedTrends: ['space_manufacturing', 'microgravity_research', 'commercial_stations'],
    targetAudience: ['entrepreneurs', 'investors', 'corporations'],
    featured: true,
  },
  {
    slug: 'satellite-deorbit-services',
    title: 'Satellite End-of-Life and Deorbit Services',
    description: 'Regulatory pressure and sustainability requirements are creating demand for active debris removal and satellite deorbiting services.',
    fullAnalysis: 'With FCC requiring deorbit plans and ESA pushing Zero Debris by 2030, satellite operators need end-of-life solutions. Services include: (1) Deorbit propulsion modules attached before launch, (2) Active debris removal for defunct satellites, (3) Graveyard orbit transfer services, (4) Mission extension before final deorbit. The market is nascent but regulatory tailwinds are strong.',
    type: 'industry_need',
    category: 'other',
    sector: 'commercial',
    estimatedValue: '$5M-$50M per mission',
    timeframe: 'short_term',
    difficulty: 'high',
    sourceType: 'news_analysis',
    sourceName: 'Industry Analysis',
    aiConfidence: 0.88,
    aiReasoning: 'Regulatory requirements creating mandatory market demand.',
    relatedTrends: ['space_sustainability', 'debris_removal', 'regulations'],
    targetAudience: ['entrepreneurs', 'investors', 'corporations'],
  },

  // Resource Shortages
  {
    slug: 'space-grade-solar-cell-shortage',
    title: 'Space-Grade Solar Cell Manufacturing Capacity',
    description: 'Global shortage of radiation-hardened, high-efficiency solar cells for satellites and spacecraft due to limited manufacturing capacity.',
    fullAnalysis: 'The explosion in satellite constellations has created a bottleneck in space-grade solar cell supply. Current manufacturers (SolAero, Spectrolab, AZUR SPACE) cannot meet demand. Opportunities exist in: (1) New manufacturing facilities, (2) Alternative solar cell technologies (perovskite, thin-film), (3) Solar cell recycling from decommissioned satellites, (4) On-orbit solar array servicing.',
    type: 'resource_shortage',
    category: 'hardware',
    sector: 'commercial',
    estimatedValue: '$500M+ market',
    timeframe: 'immediate',
    difficulty: 'high',
    sourceType: 'news_analysis',
    sourceName: 'Space Industry Analysis',
    aiConfidence: 0.92,
    aiReasoning: 'Documented supply constraints with major constellation operators.',
    relatedTrends: ['mega_constellations', 'supply_chain', 'manufacturing'],
    targetAudience: ['investors', 'corporations'],
    featured: true,
  },
  {
    slug: 'xenon-propellant-supply',
    title: 'Xenon Propellant Supply for Electric Propulsion',
    description: 'Critical shortage of xenon gas for satellite electric propulsion systems, with Starlink alone consuming significant global supply.',
    fullAnalysis: 'Xenon is essential for ion and Hall-effect thrusters used in modern satellites. Global production is ~70 tonnes/year, with space industry consuming growing share. Opportunities: (1) Xenon extraction technology improvements, (2) Alternative propellants (krypton, iodine) development, (3) Xenon recovery and recycling, (4) Propellant-as-a-service for satellite operators.',
    type: 'resource_shortage',
    category: 'other',
    sector: 'commercial',
    estimatedValue: '$100M-$300M',
    timeframe: 'short_term',
    difficulty: 'high',
    sourceType: 'ai_generated',
    aiConfidence: 0.87,
    aiReasoning: 'Known supply constraint with limited production capacity expansion.',
    relatedTrends: ['electric_propulsion', 'mega_constellations', 'rare_gases'],
    targetAudience: ['entrepreneurs', 'investors'],
  },

  // Service Gaps
  {
    slug: 'space-insurance-innovation',
    title: 'Space Insurance and Risk Management Innovation',
    description: 'Traditional space insurance market struggling to adapt to new business models like constellations, space tourism, and in-space servicing.',
    fullAnalysis: 'The space insurance market needs modernization. Opportunities include: (1) Parametric insurance products for launch delays, (2) Constellation coverage models (fleet vs. individual), (3) Space tourism liability products, (4) In-space servicing insurance, (5) Insurtech platforms for automated underwriting using satellite telemetry, (6) Reinsurance capacity for growing market.',
    type: 'service_gap',
    category: 'consulting',
    sector: 'commercial',
    estimatedValue: '$2B+ market',
    timeframe: 'immediate',
    difficulty: 'medium',
    sourceType: 'ai_generated',
    aiConfidence: 0.83,
    aiReasoning: 'Insurance market lagging behind space industry innovation.',
    relatedTrends: ['insurtech', 'space_tourism', 'commercial_space'],
    targetAudience: ['entrepreneurs', 'investors', 'corporations'],
  },
  {
    slug: 'space-workforce-training',
    title: 'Space Industry Workforce Training and Certification',
    description: 'Critical skills gap in space industry workforce, from technicians to mission controllers to business professionals.',
    fullAnalysis: 'The space industry is experiencing rapid growth but workforce development has not kept pace. Opportunities: (1) Technical training programs for satellite operations, (2) Launch operations certification courses, (3) Space business and regulatory education, (4) VR/AR training simulations, (5) Apprenticeship programs with major contractors, (6) Online platforms for space engineering continuing education.',
    type: 'service_gap',
    category: 'other',
    sector: 'commercial',
    estimatedValue: '$50M-$200M',
    timeframe: 'immediate',
    difficulty: 'low',
    sourceType: 'news_analysis',
    sourceName: 'Industry Reports',
    aiConfidence: 0.90,
    aiReasoning: 'Documented skills shortage across the industry.',
    relatedTrends: ['workforce_development', 'education', 'industry_growth'],
    targetAudience: ['entrepreneurs', 'students'],
    featured: true,
  },

  // AI-Generated Insights
  {
    slug: 'lunar-water-extraction-services',
    title: 'Lunar Water Extraction and Processing Services',
    description: 'As Artemis missions establish lunar presence, water ice extraction from permanently shadowed craters becomes economically viable.',
    fullAnalysis: 'NASA and international partners are committed to sustained lunar presence. Water ice at the lunar poles can be converted to drinking water, oxygen for life support, and hydrogen/oxygen propellant. Business models include: (1) Extraction equipment manufacturing, (2) Processing and storage facilities, (3) Water delivery services to lunar bases, (4) Propellant depot operations. First-mover advantage is critical as lunar real estate is limited.',
    type: 'ai_insight',
    category: 'other',
    sector: 'commercial',
    estimatedValue: '$1B+ long-term',
    timeframe: 'long_term',
    difficulty: 'expert',
    sourceType: 'ai_generated',
    aiConfidence: 0.75,
    aiReasoning: 'Artemis program creates anchor customer; physics and economics favor ISRU.',
    relatedTrends: ['artemis_program', 'isru', 'lunar_economy', 'propellant_depot'],
    targetAudience: ['investors', 'corporations', 'entrepreneurs'],
  },
  {
    slug: 'orbital-data-center-cooling',
    title: 'Orbital Data Centers with Passive Cooling',
    description: 'Space-based data centers leveraging unlimited cold sink of space for cooling, potentially solving major terrestrial computing challenge.',
    fullAnalysis: 'Data centers consume ~1% of global electricity, with ~40% going to cooling. In space, the cold void provides infinite heat sink. Challenges include launch costs (rapidly decreasing), latency (suitable for batch processing, AI training), and power (abundant solar). Microsoft has explored underwater data centers; space may be next frontier. Early applications: AI model training, blockchain mining, scientific computing.',
    type: 'ai_insight',
    category: 'software',
    sector: 'commercial',
    estimatedValue: 'Potentially $10B+',
    timeframe: 'long_term',
    difficulty: 'expert',
    sourceType: 'ai_generated',
    aiConfidence: 0.65,
    aiReasoning: 'Speculative but physics advantages are real; depends on launch cost trajectory.',
    relatedTrends: ['cloud_computing', 'ai_infrastructure', 'space_solar_power'],
    targetAudience: ['investors', 'corporations'],
  },
  {
    slug: 'space-debris-tracking-saas',
    title: 'Space Situational Awareness SaaS Platform',
    description: 'Commercial platform providing real-time debris tracking, collision avoidance recommendations, and regulatory compliance for satellite operators.',
    fullAnalysis: 'With 10,000+ active satellites and growing, operators need better tools than the free 18th Space Defense Squadron data. Business opportunity: (1) Higher-accuracy tracking using commercial sensors, (2) Predictive analytics for conjunction events, (3) Automated maneuver planning, (4) Compliance reporting for FCC/ITU, (5) Insurance integration for premium discounts. Subscription model with tiered pricing based on constellation size.',
    type: 'ai_insight',
    category: 'software',
    sector: 'commercial',
    estimatedValue: '$50M-$200M',
    timeframe: 'short_term',
    difficulty: 'medium',
    sourceType: 'ai_generated',
    aiConfidence: 0.88,
    aiReasoning: 'Clear market need with existing competitors but room for innovation.',
    relatedTrends: ['space_traffic_management', 'saas', 'debris_tracking'],
    targetAudience: ['entrepreneurs', 'investors'],
  },

  // Market Trends
  {
    slug: 'space-tourism-support-services',
    title: 'Space Tourism Ground Support and Experience Services',
    description: 'As space tourism scales, demand grows for training facilities, spaceport hospitality, merchandise, and post-flight services.',
    fullAnalysis: 'Space tourism is expanding beyond just the flight. Opportunities in the ecosystem: (1) Pre-flight training facilities, (2) Spaceport hotels and hospitality, (3) Commemorative merchandise and NFTs, (4) Medical screening and certification, (5) Post-flight rehabilitation, (6) Travel agency specialization, (7) Documentary and media production, (8) Space tourism insurance products.',
    type: 'market_trend',
    category: 'other',
    sector: 'commercial',
    estimatedValue: '$500M-$1B',
    timeframe: 'medium_term',
    difficulty: 'low',
    sourceType: 'news_analysis',
    sourceName: 'Market Analysis',
    aiConfidence: 0.82,
    aiReasoning: 'Multiple providers scaling operations with proven demand.',
    relatedTrends: ['space_tourism', 'hospitality', 'luxury_market'],
    targetAudience: ['entrepreneurs', 'investors'],
  },
  {
    slug: 'small-sat-components-market',
    title: 'Standardized SmallSat Component Manufacturing',
    description: 'Growing demand for COTS and standardized components for CubeSats and small satellites, enabling faster and cheaper satellite development.',
    fullAnalysis: 'The small satellite market is shifting from custom to commercial-off-the-shelf (COTS) components. Opportunities: (1) Standardized reaction wheels and attitude control, (2) Modular power systems, (3) Plug-and-play communication modules, (4) Standardized structural buses, (5) Thermal management kits, (6) Software-defined radios. Focus on reliability testing and space qualification documentation.',
    type: 'market_trend',
    category: 'hardware',
    sector: 'commercial',
    estimatedValue: '$200M-$500M',
    timeframe: 'short_term',
    difficulty: 'medium',
    sourceType: 'news_analysis',
    sourceName: 'Industry Analysis',
    aiConfidence: 0.91,
    aiReasoning: 'Clear market trend with quantifiable demand growth.',
    relatedTrends: ['smallsats', 'cots', 'rapid_development'],
    targetAudience: ['entrepreneurs', 'investors', 'corporations'],
  },
  {
    slug: 'orbital-bio-enhancement-clinics',
    title: 'Orbital Bio-Enhancement Clinics',
    description: 'Exclusive medical clinics in low-Earth orbit offering anti-aging treatments and custom pharmaceuticals leveraging microgravity\'s unique effects on biology, targeting ultra-high-net-worth individuals.',
    fullAnalysis: 'With reusable rockets like Starship slashing launch costs to under $10 million per flight by the early 2030s, microgravity environments will become accessible for short-duration commercial trips. Orbital bio-enhancement clinics would offer treatments leveraging zero-gravity\'s unique effects on biology—accelerated stem cell regeneration for anti-aging, optimized protein folding for custom pharmaceuticals that can\'t be replicated on Earth. This isn\'t just space tourism; it\'s a high-margin medical service blending biotech and adventure. Clients pay $5-10 million for a 1-2 week stay, including personalized gene therapies tested in real-time microgravity labs. Revenue streams: Direct fees, partnerships with pharma giants for R&D data, and spin-off products like Earth-based simulators. Ground-based anti-aging is saturated, but orbital clinics tap into the billionaire longevity craze, with projected space economy growth to $1 trillion by 2030 fueling demand. No one is commercializing this yet—it\'s beyond current ISS experiments, positioning early movers as pioneers in space rejuvenation for the ultra-rich.',
    type: 'ai_insight',
    category: 'research',
    sector: 'commercial',
    estimatedValue: '$1B-$5B',
    timeframe: 'long_term',
    difficulty: 'expert',
    sourceType: 'ai_generated',
    sourceName: 'SpaceNexus Analysis',
    aiConfidence: 0.82,
    aiReasoning: 'Convergence of declining launch costs, growing longevity market, and unique microgravity biotech advantages creates a novel high-margin opportunity with no current competitors.',
    relatedTrends: ['reusable_rockets', 'space_tourism', 'biotech', 'longevity', 'microgravity_research'],
    targetAudience: ['entrepreneurs', 'investors', 'corporations'],
    featured: true,
  },
];

// Initialize opportunities database
export async function initializeOpportunities() {
  let count = 0;

  for (const opp of SEED_OPPORTUNITIES) {
    await prisma.businessOpportunity.upsert({
      where: { slug: opp.slug },
      update: {
        title: opp.title,
        description: opp.description,
        fullAnalysis: opp.fullAnalysis,
        type: opp.type,
        category: opp.category,
        sector: opp.sector,
        estimatedValue: opp.estimatedValue,
        timeframe: opp.timeframe,
        difficulty: opp.difficulty,
        sourceType: opp.sourceType,
        sourceUrl: opp.sourceUrl,
        sourceName: opp.sourceName,
        solicitationId: opp.solicitationId,
        agency: opp.agency,
        dueDate: opp.dueDate,
        contractType: opp.contractType,
        setAside: opp.setAside,
        aiConfidence: opp.aiConfidence,
        aiReasoning: opp.aiReasoning,
        relatedTrends: opp.relatedTrends ? JSON.stringify(opp.relatedTrends) : null,
        targetAudience: opp.targetAudience ? JSON.stringify(opp.targetAudience) : null,
        status: opp.status || 'active',
        featured: opp.featured || false,
        expiresAt: opp.expiresAt,
      },
      create: {
        slug: opp.slug,
        title: opp.title,
        description: opp.description,
        fullAnalysis: opp.fullAnalysis,
        type: opp.type,
        category: opp.category,
        sector: opp.sector,
        estimatedValue: opp.estimatedValue,
        timeframe: opp.timeframe,
        difficulty: opp.difficulty,
        sourceType: opp.sourceType,
        sourceUrl: opp.sourceUrl,
        sourceName: opp.sourceName,
        solicitationId: opp.solicitationId,
        agency: opp.agency,
        dueDate: opp.dueDate,
        contractType: opp.contractType,
        setAside: opp.setAside,
        aiConfidence: opp.aiConfidence,
        aiReasoning: opp.aiReasoning,
        relatedTrends: opp.relatedTrends ? JSON.stringify(opp.relatedTrends) : null,
        targetAudience: opp.targetAudience ? JSON.stringify(opp.targetAudience) : null,
        status: opp.status || 'active',
        featured: opp.featured || false,
        expiresAt: opp.expiresAt,
      },
    });
    count++;
  }

  return { success: true, count };
}

// Get opportunities with filtering
export async function getOpportunities(options?: {
  type?: string;
  category?: string;
  sector?: string;
  targetAudience?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
}) {
  const where: Record<string, unknown> = {
    status: 'active',
  };

  if (options?.type) {
    where.type = options.type;
  }
  if (options?.category) {
    where.category = options.category;
  }
  if (options?.sector) {
    where.sector = options.sector;
  }
  if (options?.featured !== undefined) {
    where.featured = options.featured;
  }
  if (options?.targetAudience) {
    where.targetAudience = {
      contains: options.targetAudience,
    };
  }

  const [opportunities, total] = await Promise.all([
    prisma.businessOpportunity.findMany({
      where,
      orderBy: [
        { featured: 'desc' },
        { discoveredAt: 'desc' },
      ],
      take: options?.limit || 20,
      skip: options?.offset || 0,
    }),
    prisma.businessOpportunity.count({ where }),
  ]);

  return {
    opportunities: opportunities.map((opp) => ({
      ...opp,
      relatedTrends: opp.relatedTrends ? JSON.parse(opp.relatedTrends) : null,
      targetAudience: opp.targetAudience ? JSON.parse(opp.targetAudience) : null,
    })),
    total,
  };
}

// Get opportunity stats
export async function getOpportunityStats() {
  const [
    total,
    byType,
    byCategory,
    featured,
    recentCount,
  ] = await Promise.all([
    prisma.businessOpportunity.count({ where: { status: 'active' } }),
    prisma.businessOpportunity.groupBy({
      by: ['type'],
      where: { status: 'active' },
      _count: { type: true },
    }),
    prisma.businessOpportunity.groupBy({
      by: ['category'],
      where: { status: 'active' },
      _count: { category: true },
    }),
    prisma.businessOpportunity.count({ where: { status: 'active', featured: true } }),
    prisma.businessOpportunity.count({
      where: {
        status: 'active',
        discoveredAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
    }),
  ]);

  return {
    total,
    featured,
    recentCount,
    byType: Object.fromEntries(byType.map((t) => [t.type, t._count.type])),
    byCategory: Object.fromEntries(byCategory.map((c) => [c.category, c._count.category])),
  };
}

// AI Analysis function - generates new opportunities based on news and trends
export async function runAIAnalysis(focusAreas?: string[]): Promise<{
  success: boolean;
  opportunitiesFound: number;
  insights: string[];
  error?: string;
}> {
  if (!anthropic) {
    return {
      success: false,
      opportunitiesFound: 0,
      insights: [],
      error: 'Anthropic API key not configured. Set ANTHROPIC_API_KEY environment variable.',
    };
  }

  // Create analysis run record
  const analysisRun = await prisma.aIAnalysisRun.create({
    data: {
      runType: 'deep_dive',
      status: 'running',
      focusAreas: focusAreas ? JSON.stringify(focusAreas) : null,
    },
  });

  try {
    const prompt = `You are a space industry business analyst identifying opportunities for entrepreneurs, investors, and students.

Analyze the current state of the space industry and generate 3-5 NEW business opportunities. Consider:

1. **Government Programs**: Artemis, ISS transition, Space Force modernization, international programs
2. **Commercial Trends**: Mega-constellations, space tourism, in-space manufacturing, lunar economy
3. **Technology Gaps**: What's needed but doesn't exist yet?
4. **Resource Constraints**: What materials, components, or services are in short supply?
5. **Regulatory Changes**: New requirements creating compliance markets
6. **Emerging Markets**: What adjacent industries could expand into space?

For each opportunity, provide:
- A specific, actionable title
- Detailed description (2-3 sentences)
- Type: one of [government_contract, industry_need, resource_shortage, service_gap, ai_insight, market_trend]
- Category: one of [launch_services, hardware, satellites, software, logistics, manufacturing, research, consulting, other]
- Estimated market value (range)
- Timeframe: immediate, short_term (1-2 years), medium_term (2-5 years), long_term (5+ years)
- Difficulty: low, medium, high, expert
- Target audience: array of [entrepreneurs, investors, students, corporations]
- Confidence score (0.0 to 1.0)
- Brief reasoning for why this is a viable opportunity

Focus on opportunities that are:
- Specific and actionable (not vague)
- Based on real trends and data
- Differentiated from obvious ideas
- Appropriate for the target audiences

Return your response as a JSON array of opportunity objects.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse the AI response
    let opportunities: OpportunityData[] = [];
    try {
      // Extract JSON from the response
      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        opportunities = parsed.map((opp: Record<string, unknown>, index: number) => ({
          slug: `ai-${Date.now()}-${index}`,
          title: opp.title as string,
          description: opp.description as string,
          type: opp.type as string,
          category: opp.category as string,
          estimatedValue: opp.estimated_value as string || opp.estimatedValue as string,
          timeframe: opp.timeframe as string,
          difficulty: opp.difficulty as string,
          sourceType: 'ai_generated',
          aiConfidence: opp.confidence as number || opp.confidence_score as number,
          aiReasoning: opp.reasoning as string,
          targetAudience: opp.target_audience as string[] || opp.targetAudience as string[],
          featured: false,
        }));
      }
    } catch {
      console.error('Failed to parse AI response');
    }

    // Store new opportunities
    let stored = 0;
    for (const opp of opportunities) {
      try {
        await prisma.businessOpportunity.create({
          data: {
            slug: opp.slug,
            title: opp.title,
            description: opp.description,
            type: opp.type,
            category: opp.category,
            estimatedValue: opp.estimatedValue,
            timeframe: opp.timeframe,
            difficulty: opp.difficulty,
            sourceType: opp.sourceType,
            aiConfidence: opp.aiConfidence,
            aiReasoning: opp.aiReasoning,
            targetAudience: opp.targetAudience ? JSON.stringify(opp.targetAudience) : null,
            status: 'active',
          },
        });
        stored++;
      } catch {
        // Skip duplicates
      }
    }

    // Update analysis run
    await prisma.aIAnalysisRun.update({
      where: { id: analysisRun.id },
      data: {
        status: 'completed',
        opportunitiesFound: stored,
        insightsGenerated: opportunities.length,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
        completedAt: new Date(),
      },
    });

    return {
      success: true,
      opportunitiesFound: stored,
      insights: opportunities.map((o) => o.title),
    };
  } catch (error) {
    await prisma.aIAnalysisRun.update({
      where: { id: analysisRun.id },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      },
    });

    return {
      success: false,
      opportunitiesFound: 0,
      insights: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Get recent AI analysis runs
export async function getRecentAnalysisRuns(limit = 5) {
  return prisma.aIAnalysisRun.findMany({
    orderBy: { startedAt: 'desc' },
    take: limit,
  });
}
