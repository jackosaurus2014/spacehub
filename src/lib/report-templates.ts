// Report type configurations and prompt templates for Custom Intelligence Reports

export interface ReportSection {
  id: string;
  title: string;
  description: string;
}

export interface ReportType {
  id: string;
  name: string;
  description: string;
  icon: string;
  price: number; // 0 = free sample
  isSample: boolean;
  sections: ReportSection[];
  estimatedPages: number;
  generationTime: string;
  configFields: ReportConfigField[];
}

export interface ReportConfigField {
  id: string;
  label: string;
  type: 'select' | 'multi-select' | 'text' | 'typeahead';
  placeholder?: string;
  options?: { value: string; label: string }[];
  required: boolean;
  min?: number; // for multi-select minimum
  max?: number; // for multi-select maximum
}

export const SPACE_SECTORS = [
  { value: 'launch-services', label: 'Launch Services' },
  { value: 'satellite-manufacturing', label: 'Satellite Manufacturing' },
  { value: 'earth-observation', label: 'Earth Observation' },
  { value: 'satellite-communications', label: 'Satellite Communications' },
  { value: 'space-defense', label: 'Space Defense & National Security' },
  { value: 'in-space-services', label: 'In-Space Services & Logistics' },
  { value: 'ground-segment', label: 'Ground Segment & Infrastructure' },
  { value: 'space-analytics', label: 'Space Data & Analytics' },
  { value: 'cislunar-economy', label: 'Cislunar & Lunar Economy' },
  { value: 'space-manufacturing', label: 'Space Manufacturing' },
  { value: 'space-tourism', label: 'Space Tourism & Human Spaceflight' },
  { value: 'smallsat-constellation', label: 'SmallSat & Constellation Services' },
  { value: 'propulsion', label: 'Propulsion Systems' },
  { value: 'space-debris', label: 'Space Debris & Sustainability' },
  { value: 'spectrum-management', label: 'Spectrum Management & RF' },
];

export const REPORT_TYPES: ReportType[] = [
  {
    id: 'sector-overview',
    name: 'Sector Overview',
    description:
      'Comprehensive market overview including size, growth trajectories, key players, competitive dynamics, emerging trends, and 5-year forecasts for a specific space industry sector.',
    icon: 'chart-bar',
    price: 0,
    isSample: true,
    sections: [
      { id: 'exec-summary', title: 'Executive Summary', description: 'High-level overview and key takeaways' },
      { id: 'market-size', title: 'Market Size & Growth', description: 'TAM, SAM, SOM with CAGR projections' },
      { id: 'key-players', title: 'Key Players & Market Share', description: 'Top companies and competitive positions' },
      { id: 'value-chain', title: 'Value Chain Analysis', description: 'End-to-end industry structure and dependencies' },
      { id: 'trends', title: 'Technology & Market Trends', description: 'Emerging trends shaping the sector' },
      { id: 'regulatory', title: 'Regulatory Landscape', description: 'Key regulations, licenses, and policy developments' },
      { id: 'investment', title: 'Investment & Funding Activity', description: 'Recent funding rounds, M&A, and deal flow' },
      { id: 'forecasts', title: '5-Year Forecast', description: 'Growth projections and scenario analysis' },
      { id: 'risks', title: 'Risks & Challenges', description: 'Key risk factors and mitigation strategies' },
      { id: 'opportunities', title: 'Strategic Opportunities', description: 'Actionable opportunities for market participants' },
    ],
    estimatedPages: 15,
    generationTime: '2-3 minutes',
    configFields: [
      {
        id: 'sector',
        label: 'Select Sector',
        type: 'select',
        placeholder: 'Choose a sector to analyze...',
        options: SPACE_SECTORS,
        required: true,
      },
    ],
  },
  {
    id: 'company-deep-dive',
    name: 'Company Deep Dive',
    description:
      'In-depth company analysis covering financials, technology capabilities, competitive positioning, recent developments, leadership assessment, and strategic outlook.',
    icon: 'building',
    price: 49,
    isSample: false,
    sections: [
      { id: 'exec-summary', title: 'Executive Summary', description: 'Company snapshot and investment thesis' },
      { id: 'company-overview', title: 'Company Overview', description: 'History, mission, and corporate structure' },
      { id: 'leadership', title: 'Leadership & Team', description: 'Key executives and organizational strengths' },
      { id: 'products', title: 'Products & Services', description: 'Core offerings and technology capabilities' },
      { id: 'financials', title: 'Financial Analysis', description: 'Revenue, funding, valuation, and financial health' },
      { id: 'market-position', title: 'Market Position', description: 'Competitive positioning and market share' },
      { id: 'recent-developments', title: 'Recent Developments', description: 'Latest news, contracts, and milestones' },
      { id: 'partnerships', title: 'Partnerships & Customers', description: 'Key relationships and customer base' },
      { id: 'swot', title: 'SWOT Analysis', description: 'Strengths, weaknesses, opportunities, and threats' },
      { id: 'outlook', title: 'Strategic Outlook', description: 'Growth trajectory and future projections' },
    ],
    estimatedPages: 12,
    generationTime: '2-3 minutes',
    configFields: [
      {
        id: 'companySlug',
        label: 'Select Company',
        type: 'typeahead',
        placeholder: 'Search for a company...',
        required: true,
      },
    ],
  },
  {
    id: 'competitive-analysis',
    name: 'Competitive Analysis',
    description:
      'Head-to-head comparison of 2-5 companies across technology capabilities, financials, market positioning, and strategic direction. Ideal for investment decisions and partnership evaluation.',
    icon: 'scale',
    price: 79,
    isSample: false,
    sections: [
      { id: 'exec-summary', title: 'Executive Summary', description: 'Key findings and comparative highlights' },
      { id: 'company-profiles', title: 'Company Profiles', description: 'Brief overview of each company' },
      { id: 'capability-comparison', title: 'Capability Comparison', description: 'Side-by-side technology and service comparison' },
      { id: 'financial-comparison', title: 'Financial Comparison', description: 'Revenue, funding, and financial metrics' },
      { id: 'market-positioning', title: 'Market Positioning', description: 'Competitive positioning map and differentiation' },
      { id: 'customer-base', title: 'Customer & Contract Base', description: 'Key customers and contract portfolios' },
      { id: 'technology', title: 'Technology Assessment', description: 'Technical capabilities and IP comparison' },
      { id: 'growth-trajectory', title: 'Growth Trajectory', description: 'Historical growth and future projections' },
      { id: 'competitive-dynamics', title: 'Competitive Dynamics', description: 'Rivalry intensity and strategic moves' },
      { id: 'recommendation', title: 'Analyst Recommendation', description: 'Summary scorecard and strategic recommendations' },
    ],
    estimatedPages: 18,
    generationTime: '3-4 minutes',
    configFields: [
      {
        id: 'companySlugs',
        label: 'Select Companies to Compare',
        type: 'multi-select',
        placeholder: 'Search and select 2-5 companies...',
        required: true,
        min: 2,
        max: 5,
      },
    ],
  },
  {
    id: 'market-entry-brief',
    name: 'Market Entry Brief',
    description:
      'Strategic market entry analysis covering regulatory requirements, total addressable market, competitive landscape, go-to-market strategy, and risk assessment for a specific space market opportunity.',
    icon: 'rocket',
    price: 99,
    isSample: false,
    sections: [
      { id: 'exec-summary', title: 'Executive Summary', description: 'Market opportunity overview and key recommendations' },
      { id: 'market-definition', title: 'Market Definition & Scope', description: 'Target market boundaries and segmentation' },
      { id: 'tam-analysis', title: 'TAM/SAM/SOM Analysis', description: 'Market sizing with bottom-up and top-down estimates' },
      { id: 'regulatory', title: 'Regulatory Requirements', description: 'Licensing, compliance, and regulatory pathway' },
      { id: 'competitive-landscape', title: 'Competitive Landscape', description: 'Existing players and market gaps' },
      { id: 'customer-analysis', title: 'Customer Analysis', description: 'Target customers, needs, and buying behavior' },
      { id: 'barriers', title: 'Barriers to Entry', description: 'Technical, regulatory, financial, and competitive barriers' },
      { id: 'gtm-strategy', title: 'Go-to-Market Strategy', description: 'Recommended approach, partnerships, and positioning' },
      { id: 'financial-model', title: 'Financial Projections', description: 'Revenue model, cost structure, and break-even analysis' },
      { id: 'risk-assessment', title: 'Risk Assessment & Mitigation', description: 'Key risks with probability, impact, and mitigation strategies' },
      { id: 'action-plan', title: '90-Day Action Plan', description: 'Prioritized next steps for market entry' },
    ],
    estimatedPages: 20,
    generationTime: '3-5 minutes',
    configFields: [
      {
        id: 'topic',
        label: 'Market / Opportunity Description',
        type: 'text',
        placeholder: 'Describe the market or opportunity you want to enter (e.g., "LEO broadband constellation for maritime customers" or "On-orbit servicing for GEO satellites")',
        required: true,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Prompt templates
// ---------------------------------------------------------------------------

export function buildSectorOverviewPrompt(
  sector: string,
  sectorLabel: string,
  contextData: string
): string {
  return `You are a senior space industry analyst at SpaceNexus, a leading space industry intelligence platform. Generate a comprehensive Sector Overview report for the **${sectorLabel}** sector.

## Context Data from SpaceNexus Database
${contextData}

## Report Structure
Generate a detailed, professional report with the following sections. Each section should be thorough and data-driven where possible. Use markdown formatting within each section.

1. **Executive Summary** — 3-5 key takeaways summarizing the sector's current state and outlook.
2. **Market Size & Growth** — TAM, SAM, SOM estimates with CAGR. Reference real or well-estimated market data.
3. **Key Players & Market Share** — Top companies, approximate market shares, recent moves. Reference companies from the database where available.
4. **Value Chain Analysis** — How the sector's value chain works end-to-end.
5. **Technology & Market Trends** — 5-8 major trends with explanations.
6. **Regulatory Landscape** — Key regulatory bodies, licensing requirements, recent policy changes.
7. **Investment & Funding Activity** — Recent funding rounds, M&A activity, investor sentiment. Reference real deals from the database.
8. **5-Year Forecast** — Growth projections with bull/base/bear scenarios.
9. **Risks & Challenges** — Top 5-8 risk factors with severity assessment.
10. **Strategic Opportunities** — Actionable opportunities with specificity.

## Guidelines
- Be factual, cite specific data where available
- Use industry-standard terminology
- Include specific numbers, dates, and company names where known
- Present balanced analysis (not overly bullish or bearish)
- Clearly distinguish between verified data and analyst estimates
- Format each section with rich markdown: headers, bullet points, bold text, tables where appropriate
- Write 1500-2500 words total

Return your response as valid JSON in this exact format:
{
  "title": "Sector Overview: ${sectorLabel}",
  "subtitle": "Comprehensive market analysis and strategic outlook",
  "executive_summary": "2-3 sentence summary for the report cover",
  "methodology": "Brief description of data sources and analysis methodology",
  "sections": [
    {
      "id": "section-id",
      "title": "Section Title",
      "content": "Full markdown content for the section"
    }
  ]
}`;
}

export function buildCompanyDeepDivePrompt(
  companyName: string,
  contextData: string
): string {
  return `You are a senior space industry analyst at SpaceNexus. Generate a comprehensive Company Deep Dive report for **${companyName}**.

## Context Data from SpaceNexus Database
${contextData}

## Report Structure
Generate a detailed, professional company analysis with the following sections. Use markdown formatting within each section.

1. **Executive Summary** — Company snapshot: what they do, why they matter, key strengths.
2. **Company Overview** — History, mission, founding story, corporate structure, key milestones.
3. **Leadership & Team** — Key executives, notable hires, team strengths and gaps.
4. **Products & Services** — Core offerings, technology capabilities, differentiation.
5. **Financial Analysis** — Revenue, funding history, valuation trends, burn rate (where estimable), financial health.
6. **Market Position** — Market share, competitive positioning, key differentiators.
7. **Recent Developments** — Last 6-12 months of news, contracts, partnerships, milestones.
8. **Partnerships & Customers** — Key relationships, notable customers, government contracts.
9. **SWOT Analysis** — Structured Strengths, Weaknesses, Opportunities, Threats.
10. **Strategic Outlook** — Growth trajectory, upcoming milestones, 2-3 year outlook.

## Guidelines
- Be factual and specific, use data from the database where available
- Clearly distinguish between confirmed facts and analyst estimates
- Use markdown tables for financial data and SWOT analysis
- Include specific numbers, dates, and names
- Write 1200-2000 words total

Return your response as valid JSON:
{
  "title": "Company Deep Dive: ${companyName}",
  "subtitle": "Comprehensive company analysis and strategic assessment",
  "executive_summary": "2-3 sentence summary",
  "methodology": "Brief methodology note",
  "sections": [
    { "id": "section-id", "title": "Section Title", "content": "Markdown content" }
  ]
}`;
}

export function buildCompetitiveAnalysisPrompt(
  companyNames: string[],
  contextData: string
): string {
  const companiesStr = companyNames.join(', ');
  return `You are a senior space industry analyst at SpaceNexus. Generate a Competitive Analysis report comparing: **${companiesStr}**.

## Context Data from SpaceNexus Database
${contextData}

## Report Structure
Generate a detailed head-to-head comparison with the following sections. Use markdown formatting including tables for comparisons.

1. **Executive Summary** — Key findings: who leads in what, main differentiators, overall assessment.
2. **Company Profiles** — Brief 2-3 sentence overview of each company.
3. **Capability Comparison** — Side-by-side comparison table of products, services, and technical capabilities.
4. **Financial Comparison** — Revenue, funding, valuation, employee count comparison table.
5. **Market Positioning** — How each company is positioned, target markets, strategic focus areas.
6. **Customer & Contract Base** — Key customers, notable contracts, government vs. commercial split.
7. **Technology Assessment** — Technical capabilities, IP, R&D investment, innovation track record.
8. **Growth Trajectory** — Historical growth metrics and future projections for each company.
9. **Competitive Dynamics** — How these companies interact: direct competition, complementary, coopetition.
10. **Analyst Recommendation** — Summary scorecard (rate each company 1-10 on key dimensions) and strategic recommendations.

## Guidelines
- Use comparison tables extensively
- Be balanced and fact-based
- Rate companies on consistent criteria
- Include specific metrics where available
- Write 1500-2500 words total

Return your response as valid JSON:
{
  "title": "Competitive Analysis: ${companiesStr}",
  "subtitle": "Head-to-head comparison and strategic assessment",
  "executive_summary": "2-3 sentence summary",
  "methodology": "Brief methodology note",
  "sections": [
    { "id": "section-id", "title": "Section Title", "content": "Markdown content" }
  ]
}`;
}

export function buildMarketEntryBriefPrompt(
  topic: string,
  contextData: string
): string {
  return `You are a senior space industry strategy consultant at SpaceNexus. Generate a Market Entry Brief for the following opportunity: **${topic}**.

## Context Data from SpaceNexus Database
${contextData}

## Report Structure
Generate a detailed, actionable market entry analysis with the following sections. Use markdown formatting.

1. **Executive Summary** — Opportunity assessment: is this worth pursuing, key considerations, recommended approach.
2. **Market Definition & Scope** — Clear boundaries of the target market, segmentation, adjacent markets.
3. **TAM/SAM/SOM Analysis** — Market sizing with both bottom-up and top-down estimates, growth rates.
4. **Regulatory Requirements** — Specific licensing and compliance requirements (FCC, FAA, ITAR, ITU, etc.), timeline and cost estimates.
5. **Competitive Landscape** — Existing players, their strengths, identified market gaps and white space.
6. **Customer Analysis** — Target customer segments, needs assessment, buying criteria, decision-making process.
7. **Barriers to Entry** — Technical, regulatory, financial, and competitive barriers with severity ratings.
8. **Go-to-Market Strategy** — Recommended approach: build vs. buy vs. partner, positioning, initial target segments.
9. **Financial Projections** — Revenue model, cost structure, investment requirements, break-even timeline.
10. **Risk Assessment & Mitigation** — Top risks with probability/impact matrix and specific mitigation strategies.
11. **90-Day Action Plan** — Prioritized checklist of next steps with owners and deadlines.

## Guidelines
- Be specific and actionable, not generic
- Include realistic cost and timeline estimates
- Reference real companies, regulations, and market data
- Present a balanced view of the opportunity
- Use tables for financial projections and risk matrices
- Write 1800-3000 words total

Return your response as valid JSON:
{
  "title": "Market Entry Brief: ${topic}",
  "subtitle": "Strategic analysis and go-to-market roadmap",
  "executive_summary": "2-3 sentence summary",
  "methodology": "Brief methodology note",
  "sections": [
    { "id": "section-id", "title": "Section Title", "content": "Markdown content" }
  ]
}`;
}
