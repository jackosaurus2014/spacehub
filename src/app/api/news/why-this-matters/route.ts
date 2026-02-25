import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Context templates based on news category for fast, non-AI responses
// Categories match those used in NewsCard: launches, missions, companies, satellites,
// defense, earnings, mergers, development, policy, debris
const categoryContext: Record<string, (title: string) => string> = {
  launches: (title) =>
    `Launch developments directly impact mission planning timelines and costs. ${
      title.includes('SpaceX') || title.includes('Falcon')
        ? 'SpaceX launches set industry pricing benchmarks and drive competition.'
        : 'New launch capabilities expand access to space for commercial and government customers.'
    } Track implications for your missions in the Launch Dashboard.`,

  missions: (title) =>
    `Mission outcomes shape future exploration priorities and funding allocation. ${
      title.includes('Mars') || title.includes('Moon') || title.includes('Lunar')
        ? 'Lunar and Mars mission progress directly influences cislunar economy development.'
        : 'This mission may open new data sources, scientific partnerships, or commercial opportunities.'
    } Follow related developments in Solar System Expansion.`,

  companies: (title) =>
    `Corporate movements signal shifting competitive dynamics in the space economy. This may affect supply chains, talent markets, and partnership opportunities across the industry. Track company activity in Company Profiles.`,

  satellites: (title) =>
    `Satellite developments affect orbital capacity, spectrum utilization, and downstream service markets. ${
      title.includes('Starlink') || title.includes('constellation')
        ? 'Mega-constellation activity directly impacts orbital management and broadband competition.'
        : 'Changes in satellite operations can reshape connectivity, Earth observation, and communications markets.'
    } Monitor orbital activity in Space Operations.`,

  defense: (title) =>
    `Defense and national security developments shape procurement budgets and technology priorities. This may create new contract opportunities or affect existing programs. Monitor related opportunities in Procurement Intelligence.`,

  earnings: (title) =>
    `Financial results reveal sector health and investment momentum. Earnings trends influence valuations, M&A activity, and capital allocation across the space economy. Track financial data in Market Intelligence.`,

  mergers: (title) =>
    `M&A activity signals market consolidation and strategic repositioning. This may reshape competitive landscapes, supply chains, and partnership dynamics. Assess implications for your business in Market Intelligence.`,

  development: (title) =>
    `Technology advances can disrupt existing markets and create new opportunities. Companies should assess competitive implications and potential integration into their product roadmaps. Explore related innovations in Market Intelligence.`,

  policy: (title) =>
    `Regulatory and policy changes can create new compliance requirements or open market opportunities. Space companies should assess how this affects their licensing timelines and operational permissions. Check the Regulatory Calendar for upcoming deadlines.`,

  debris: (title) =>
    `Space debris events affect orbital safety, insurance costs, and mission planning. ${
      title.includes('collision') || title.includes('avoidance')
        ? 'Active collision avoidance maneuvers impact fuel budgets and mission timelines across the industry.'
        : 'Debris tracking developments influence space sustainability policies and operational guidelines.'
    } Monitor the situation in Space Environment.`,

  default: (title) =>
    `This development reflects broader trends in the space industry that may impact market dynamics, technology roadmaps, or regulatory landscapes. Use SpaceNexus modules to track how this affects your specific interests and investments.`,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, category, summary } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const normalizedCategory = (category || 'default').toLowerCase();
    const contextFn = categoryContext[normalizedCategory] || categoryContext['default'];
    const insight = contextFn(title);

    return NextResponse.json({ insight });
  } catch (error) {
    logger.error('Why This Matters error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({
      insight: 'This development may have implications for the space industry.',
    });
  }
}
