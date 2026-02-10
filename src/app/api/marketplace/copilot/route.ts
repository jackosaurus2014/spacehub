import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MARKETPLACE_CATEGORIES, CERTIFICATION_OPTIONS } from '@/lib/marketplace-types';

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You are the SpaceNexus Procurement Copilot, an AI assistant that helps buyers find space industry services and create RFQs (Requests for Quotes).

## Your Capabilities
1. **Understand procurement needs** from natural language descriptions
2. **Recommend matching providers** from the SpaceNexus marketplace
3. **Generate structured RFQs** that buyers can review and submit
4. **Answer questions** about space industry services, pricing, and procurement

## Service Categories
${MARKETPLACE_CATEGORIES.map(c => `- **${c.label}** (${c.value}): ${c.description}. Subcategories: ${c.subcategories.map(s => s.label).join(', ')}`).join('\n')}

## Certifications
Available certifications: ${CERTIFICATION_OPTIONS.map(c => c.label).join(', ')}

## Response Format
When you identify a procurement need, respond with your analysis AND a JSON block containing the structured RFQ data. Format the JSON inside <rfq_data> tags:

<rfq_data>
{
  "title": "Clear descriptive title",
  "description": "Detailed description of the requirement",
  "category": "category_value",
  "subcategory": "subcategory_value or null",
  "budgetMin": number_or_null,
  "budgetMax": number_or_null,
  "budgetCurrency": "USD",
  "complianceReqs": ["ITAR", "AS9100"],
  "isPublic": true
}
</rfq_data>

Only include the <rfq_data> block when you have enough information to generate a meaningful RFQ. Ask clarifying questions first if the request is vague.

## Guidelines
- Be conversational and helpful
- Ask clarifying questions when requirements are ambiguous
- Provide realistic cost estimates based on industry knowledge
- Explain trade-offs between different approaches
- Reference specific types of providers when relevant
- When generating an RFQ, explain what you included and why
- If the user's need doesn't fit marketplace categories, suggest alternatives`;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { message, history } = body as { message: string; history?: Message[] };

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (message.length > 5000) {
      return NextResponse.json({ error: 'Message too long (max 5000 characters)' }, { status: 400 });
    }

    // Fetch marketplace context to enrich the conversation
    const [listingCount, categoryBreakdown, recentRfqs] = await Promise.all([
      prisma.serviceListing.count({ where: { status: 'active' } }),
      prisma.serviceListing.groupBy({
        by: ['category'],
        where: { status: 'active' },
        _count: { id: true },
      }),
      prisma.rFQ.findMany({
        where: { status: 'open', isPublic: true },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { title: true, category: true, budgetMin: true, budgetMax: true },
      }),
    ]);

    const marketplaceContext = `
## Current Marketplace State
- Total active listings: ${listingCount}
- Categories with listings: ${categoryBreakdown.map(c => `${c.category} (${c._count.id})`).join(', ')}
- Recent open RFQs: ${recentRfqs.map(r => `"${r.title}" [${r.category}]`).join('; ') || 'None'}
`;

    // Build conversation messages
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    // Include history (last 10 messages max)
    if (history && Array.isArray(history)) {
      const trimmedHistory = history.slice(-10);
      for (const msg of trimmedHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    // Add current message with marketplace context
    messages.push({
      role: 'user',
      content: `${message}\n\n---\n${marketplaceContext}`,
    });

    // Call Claude
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages,
    });

    const textBlock = response.content.find(block => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return internalError('AI response contained no text');
    }

    const responseText = textBlock.text;

    // Extract RFQ data if present
    let rfqData = null;
    const rfqMatch = responseText.match(/<rfq_data>\s*([\s\S]*?)\s*<\/rfq_data>/);
    if (rfqMatch) {
      try {
        rfqData = JSON.parse(rfqMatch[1]);
      } catch {
        logger.warn('Failed to parse copilot RFQ data', { raw: rfqMatch[1].slice(0, 200) });
      }
    }

    // Clean response text (remove rfq_data tags for display)
    const cleanText = responseText.replace(/<rfq_data>[\s\S]*?<\/rfq_data>/g, '').trim();

    // Find matching providers if we have a category
    let matchedProviders: Array<{ name: string; slug: string; company: string; category: string; priceMin: number | null; priceMax: number | null }> = [];
    if (rfqData?.category) {
      const listings = await prisma.serviceListing.findMany({
        where: {
          category: rfqData.category,
          status: 'active',
          ...(rfqData.subcategory ? { subcategory: rfqData.subcategory } : {}),
        },
        take: 5,
        include: {
          company: {
            select: { name: true, slug: true, verificationLevel: true },
          },
        },
        orderBy: { viewCount: 'desc' },
      });

      matchedProviders = listings.map(l => ({
        name: l.name,
        slug: l.slug,
        company: l.company.name,
        category: l.category,
        priceMin: l.priceMin,
        priceMax: l.priceMax,
      }));
    }

    logger.info('Copilot response', {
      userId: session.user.id,
      hasRfq: !!rfqData,
      matchedProviders: matchedProviders.length,
    });

    return NextResponse.json({
      response: cleanText,
      rfqData,
      matchedProviders,
    });
  } catch (error) {
    logger.error('Copilot error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Copilot failed to process your request');
  }
}
