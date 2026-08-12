import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

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
    logger.error('Failed to fetch moonshots', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch moonshots' },
      { status: 500 }
    );
  }
}
