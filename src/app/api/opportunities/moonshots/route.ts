import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

interface MoonshotIdea {
  id: string;
  title: string;
  description: string;
  riskLevel: 'extreme' | 'very_high';
  potentialReturn: string;
  timeHorizon: string;
  whyUnlikely: string;
  keyInsight: string;
  targetAudience: string[];
  requiredCapital: string;
  generatedAt: string;
}

// Seed moonshots - these are unusual, high-risk/high-reward ideas
const SEED_MOONSHOTS: MoonshotIdea[] = [
  {
    id: 'moonshot-1',
    title: 'Orbital Advertising Platform: Space-Based Dynamic Billboards',
    description: 'Deploy a constellation of satellites with large reflective surfaces that can be oriented to create visible patterns or text from Earth during twilight hours. Partner with major brands for "sky writing" campaigns visible to billions.',
    riskLevel: 'extreme',
    potentialReturn: '$1B+ annually if successful',
    timeHorizon: '5-10 years',
    whyUnlikely: 'Massive regulatory hurdles (light pollution, aviation safety, ITU coordination), high technical complexity, and significant public backlash risk. Requires unprecedented international cooperation and novel satellite formation flying technology.',
    keyInsight: 'The advertising industry spends $750B annually. Capturing even 0.1% through an unmissable, global medium would be transformative. First-mover advantage would be absolute.',
    targetAudience: ['investors', 'entrepreneurs'],
    requiredCapital: '$500M-$2B',
    generatedAt: new Date().toISOString(),
  },
  {
    id: 'moonshot-2',
    title: 'Lunar Ice Water Rights Trading Exchange',
    description: 'Establish the first commodities exchange for trading futures contracts on lunar water ice extraction rights. Create the legal framework, trading infrastructure, and verification systems before large-scale extraction begins.',
    riskLevel: 'very_high',
    potentialReturn: 'Market-maker position in $500B+ lunar economy',
    timeHorizon: '10-20 years',
    whyUnlikely: 'No international legal framework for lunar resource rights exists. The Artemis Accords are voluntary. Requires betting on specific interpretations of the Outer Space Treaty and significant first-mover infrastructure investment with decades-long payback.',
    keyInsight: 'Whoever controls the trading infrastructure for lunar resources controls the lunar economy. The Chicago Mercantile Exchange equivalent for space commodities doesn\'t exist yet. Being first could mean being dominant for centuries.',
    targetAudience: ['investors', 'corporations'],
    requiredCapital: '$100M-$500M for legal/infrastructure',
    generatedAt: new Date().toISOString(),
  },
];

// AI-generated moonshots (when API key is available)
async function generateAIMoonshots(): Promise<MoonshotIdea[]> {
  const anthropic = process.env.ANTHROPIC_API_KEY
    ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    : null;

  if (!anthropic) {
    return SEED_MOONSHOTS;
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `You are a visionary space industry analyst. Generate 2 highly unconventional, "moonshot" business opportunities in the space industry that most people would NOT think of. These should be:

1. High-risk, high-reward ideas
2. Unusual or counterintuitive
3. Based on emerging trends but not obvious
4. Potentially transformative if successful

For each moonshot, provide:
- title: A compelling, specific title
- description: 2-3 sentences explaining the idea
- potentialReturn: Estimated revenue/return if successful
- timeHorizon: Realistic timeframe
- whyUnlikely: Why most people would dismiss this idea
- keyInsight: The non-obvious insight that makes this viable
- requiredCapital: Rough capital requirement

Format as JSON array with these fields. Be creative and think beyond conventional opportunities.`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const ideas = JSON.parse(jsonMatch[0]);
        return ideas.map((idea: Partial<MoonshotIdea>, idx: number) => ({
          id: `ai-moonshot-${idx + 1}`,
          title: idea.title || 'Untitled Moonshot',
          description: idea.description || '',
          riskLevel: 'extreme' as const,
          potentialReturn: idea.potentialReturn || 'Unknown',
          timeHorizon: idea.timeHorizon || '5-15 years',
          whyUnlikely: idea.whyUnlikely || '',
          keyInsight: idea.keyInsight || '',
          targetAudience: ['investors', 'entrepreneurs'],
          requiredCapital: idea.requiredCapital || 'Significant',
          generatedAt: new Date().toISOString(),
        }));
      }
    }

    return SEED_MOONSHOTS;
  } catch (error) {
    console.error('Failed to generate AI moonshots:', error);
    return SEED_MOONSHOTS;
  }
}

export async function GET() {
  try {
    // For now, return seed moonshots
    // In production, could rotate or generate new ones periodically
    return NextResponse.json({
      moonshots: SEED_MOONSHOTS,
      generatedAt: new Date().toISOString(),
      disclaimer: 'These are speculative, high-risk ideas for educational purposes. Not investment advice.',
    });
  } catch (error) {
    console.error('Failed to fetch moonshots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch moonshots' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    // Generate fresh moonshots using AI
    const moonshots = await generateAIMoonshots();

    return NextResponse.json({
      moonshots,
      generatedAt: new Date().toISOString(),
      disclaimer: 'These are speculative, high-risk ideas for educational purposes. Not investment advice.',
    });
  } catch (error) {
    console.error('Failed to generate moonshots:', error);
    return NextResponse.json(
      { error: 'Failed to generate moonshots' },
      { status: 500 }
    );
  }
}
