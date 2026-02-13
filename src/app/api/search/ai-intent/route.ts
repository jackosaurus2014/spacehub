import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '@/lib/logger';
import { internalError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You are a search assistant for SpaceNexus, a space industry intelligence platform covering 100+ companies, satellite tracking, launch events, market intelligence, procurement, regulatory compliance, and more.

Given a user's search query, determine their intent and suggest optimized searches.

Intents:
- "company_lookup": Looking for a specific company
- "comparison": Comparing companies, products, or capabilities
- "capability_search": Looking for companies with specific capabilities or in a sector
- "market_question": Asking about market trends, funding, or industry data
- "regulatory": Asking about compliance, regulations, spectrum, or legal matters
- "operational": Asking about satellites, orbits, launches, or space operations
- "general": Standard keyword search

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "intent": "company_lookup",
  "explanation": "Brief explanation of what the user is looking for",
  "reformulatedQueries": ["query1", "query2"],
  "suggestedCompanies": ["Company Name 1", "Company Name 2"],
  "suggestedModules": ["company-profiles", "news", "market-intel"],
  "suggestedFilters": { "sector": "launch", "tier": 1 }
}

Only include suggestedCompanies if relevant. suggestedModules should map to SpaceNexus modules:
company-profiles, news, market-intel, business-opportunities, procurement, satellites, compliance, space-environment, mission-cost, space-talent, marketplace`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = body.query?.trim();

    if (!query || query.length < 3) {
      return NextResponse.json({ error: 'Query must be at least 3 characters' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI search is not configured' }, { status: 503 });
    }

    const anthropic = new Anthropic();

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: `Search query: "${query}"` },
      ],
    });

    // Extract text response
    const textBlock = message.content.find(block => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    // Parse JSON response
    try {
      const result = JSON.parse(textBlock.text);
      return NextResponse.json(result);
    } catch {
      // If the response isn't valid JSON, return a basic interpretation
      logger.warn('AI intent response was not valid JSON', { response: textBlock.text.slice(0, 200) });
      return NextResponse.json({
        intent: 'general',
        explanation: textBlock.text.slice(0, 200),
        reformulatedQueries: [query],
        suggestedCompanies: [],
        suggestedModules: ['company-profiles', 'news'],
        suggestedFilters: {},
      });
    }
  } catch (error) {
    logger.error('AI intent search failed', { error: error instanceof Error ? error.message : String(error) });
    return internalError('AI search failed');
  }
}
