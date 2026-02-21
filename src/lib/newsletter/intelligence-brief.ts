// Weekly Intelligence Brief generator
// Aggregates weekly news, company events, and uses Claude AI to generate
// an 8-section intelligence brief for space industry professionals.

import prisma from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '@/lib/logger';
import { personalizeEmail } from './email-templates';
import {
  BriefSection,
  BriefItem,
  generateIntelligenceBriefEmail,
  generateIntelligenceBriefPlainText,
} from './intelligence-brief-template';
import { Resend } from 'resend';

// Re-export for external use
export type { BriefSection, BriefItem };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 1000;
const FROM_EMAIL = process.env.NEWSLETTER_FROM_EMAIL || 'SpaceNexus <newsletter@spacenexus.us>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://spacenexus.us';

// Lazy Resend client
let resendClient: Resend | null = null;
function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Data gathering
// ---------------------------------------------------------------------------

async function gatherWeeklyData(weekStart: Date, weekEnd: Date) {
  const [articles, companyEvents] = await Promise.all([
    prisma.newsArticle.findMany({
      where: {
        publishedAt: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      orderBy: { publishedAt: 'desc' },
      take: 20,
      select: {
        title: true,
        summary: true,
        url: true,
        source: true,
        category: true,
        publishedAt: true,
      },
    }),
    prisma.companyEvent.findMany({
      where: {
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      orderBy: [{ importance: 'desc' }, { date: 'desc' }],
      take: 15,
      select: {
        title: true,
        description: true,
        type: true,
        source: true,
        sourceUrl: true,
        importance: true,
        company: {
          select: { name: true },
        },
      },
    }),
  ]);

  return { articles, companyEvents };
}

// ---------------------------------------------------------------------------
// AI brief generation
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a senior space industry analyst producing a weekly intelligence brief for SpaceNexus, a space industry intelligence platform. You write for an audience of space industry executives, investors, engineers, and government program managers.

Produce an 8-section intelligence brief based on the provided data. Each section must contain items with a title and summary. Return valid JSON in the exact format specified.

Sections:
1. "executive-summary" (isPro: false) - 3-4 high-level bullet points summarizing the week's most significant developments
2. "top-stories" (isPro: false) - 5 most important stories with titles and 1-2 sentence summaries
3. "contract-awards" (isPro: true) - Notable government and commercial contract awards or partnerships
4. "launch-activity" (isPro: false) - Completed and upcoming launches, mission milestones
5. "funding-ma" (isPro: true) - Investment rounds, acquisitions, IPO activity, SPAC news
6. "regulatory-updates" (isPro: true) - Policy changes, FCC/FAA/ITU decisions, spectrum, licensing
7. "market-movers" (isPro: true) - Notable company developments, earnings, strategy shifts, executive moves
8. "week-ahead" (isPro: false) - Key upcoming events, deadlines, launches, hearings for next week

Guidelines:
- Be factual and cite specific data points where available
- Each item needs a clear, specific title (not generic)
- Summaries should be 1-3 sentences, concise but substantive
- If the data doesn't contain information for a section, create plausible items based on the trends you can infer, but mark source as "SpaceNexus Analysis"
- Include source attribution where relevant
- Be professional, not hype-driven
- Focus on actionable intelligence

Return valid JSON in this exact format:
{
  "sections": [
    {
      "id": "executive-summary",
      "title": "Executive Summary",
      "isPro": false,
      "items": [
        { "title": "item title", "summary": "item summary", "source": "optional source", "url": "optional url" }
      ]
    }
  ]
}`;

async function generateBriefContent(
  articles: Array<{ title: string; summary: string | null; url: string; source: string; category: string }>,
  companyEvents: Array<{ title: string; description: string | null; type: string; source: string | null; sourceUrl: string | null; importance: number; company: { name: string } }>
): Promise<BriefSection[]> {
  const anthropic = new Anthropic();

  // Build context
  const articlesContext = articles
    .map(
      (a, i) =>
        `${i + 1}. [${a.category}] ${a.title}\n   Source: ${a.source}\n   ${a.summary || 'No summary available'}\n   URL: ${a.url}`
    )
    .join('\n\n');

  const eventsContext =
    companyEvents.length > 0
      ? companyEvents
          .map(
            (e, i) =>
              `${i + 1}. [${e.type}] ${e.company.name}: ${e.title}\n   ${e.description || ''}\n   Importance: ${e.importance}/10${e.source ? `\n   Source: ${e.source}` : ''}`
          )
          .join('\n\n')
      : 'No company events this week.';

  const userPrompt = `Generate the weekly intelligence brief based on these data points:

## News Articles (past 7 days)
${articlesContext || 'No news articles available for this period.'}

## Company Events (past 7 days)
${eventsContext}

Return the JSON response now.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 6000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      logger.error('No text content in AI response for intelligence brief');
      return getDefaultSections();
    }

    // Extract JSON from response
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.error('No JSON found in AI response for intelligence brief');
      return getDefaultSections();
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.sections || !Array.isArray(parsed.sections)) {
      logger.error('Invalid JSON structure in AI response for intelligence brief');
      return getDefaultSections();
    }

    // Validate and normalize sections
    return parsed.sections.map((section: { id: string; title: string; isPro: boolean; items: BriefItem[] }) => ({
      id: section.id,
      title: section.title,
      isPro: section.isPro ?? false,
      items: (section.items || []).map((item: BriefItem) => ({
        title: item.title || '',
        summary: item.summary || '',
        source: item.source || undefined,
        url: item.url || undefined,
      })),
    }));
  } catch (error) {
    logger.error('Error generating intelligence brief with AI', {
      error: error instanceof Error ? error.message : String(error),
    });
    return getDefaultSections();
  }
}

function getDefaultSections(): BriefSection[] {
  return [
    {
      id: 'executive-summary',
      title: 'Executive Summary',
      isPro: false,
      items: [
        {
          title: 'Weekly brief generation encountered an issue',
          summary: 'The AI-powered brief could not be generated this week. Please visit the SpaceNexus dashboard for the latest space industry news and analysis.',
        },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Week label helper
// ---------------------------------------------------------------------------

function getWeekLabel(weekStart: Date, weekEnd: Date): string {
  const opts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };
  const startStr = weekStart.toLocaleDateString('en-US', opts);
  const endStr = weekEnd.toLocaleDateString('en-US', opts);
  return `${startStr} - ${endStr}`;
}

// ---------------------------------------------------------------------------
// Exported: generateWeeklyBrief
// ---------------------------------------------------------------------------

export async function generateWeeklyBrief(): Promise<{
  briefId: string;
  sections: BriefSection[];
}> {
  // Calculate the past week (Monday to Sunday)
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setHours(23, 59, 59, 999);

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  logger.info('Generating weekly intelligence brief', {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
  });

  // Gather data
  const { articles, companyEvents } = await gatherWeeklyData(weekStart, weekEnd);

  logger.info('Weekly data gathered', {
    articleCount: articles.length,
    eventCount: companyEvents.length,
  });

  // Generate brief content using AI
  const sections = await generateBriefContent(articles, companyEvents);

  // Generate HTML for storage (Pro version with all sections visible)
  const weekLabel = getWeekLabel(weekStart, weekEnd);
  const htmlContent = generateIntelligenceBriefEmail(sections, true, weekLabel);

  // Store in database
  const brief = await prisma.weeklyIntelligenceBrief.create({
    data: {
      weekStart,
      weekEnd,
      content: sections as any,
      htmlContent,
    },
  });

  logger.info('Weekly intelligence brief generated', {
    briefId: brief.id,
    sectionCount: sections.length,
    totalItems: sections.reduce((sum, s) => sum + s.items.length, 0),
  });

  return {
    briefId: brief.id,
    sections,
  };
}

// ---------------------------------------------------------------------------
// Exported: sendWeeklyBrief
// ---------------------------------------------------------------------------

export async function sendWeeklyBrief(briefId: string): Promise<{
  sent: number;
  failed: number;
}> {
  // Load the brief
  const brief = await prisma.weeklyIntelligenceBrief.findUnique({
    where: { id: briefId },
  });

  if (!brief) {
    throw new Error(`Weekly intelligence brief not found: ${briefId}`);
  }

  const sections = brief.content as unknown as BriefSection[];
  const weekLabel = getWeekLabel(brief.weekStart, brief.weekEnd);

  // Get all verified, active subscribers with their user subscription info
  const subscribers = await prisma.newsletterSubscriber.findMany({
    where: {
      verified: true,
      unsubscribedAt: null,
    },
    select: {
      email: true,
      unsubscribeToken: true,
      user: {
        select: {
          subscriptionTier: true,
        },
      },
    },
  });

  if (subscribers.length === 0) {
    logger.warn('No active subscribers for weekly intelligence brief');
    return { sent: 0, failed: 0 };
  }

  logger.info(`Sending weekly intelligence brief to ${subscribers.length} subscribers`, {
    briefId,
  });

  // Pre-render both versions of the email
  const proHtml = generateIntelligenceBriefEmail(sections, true, weekLabel);
  const proPlain = generateIntelligenceBriefPlainText(sections, true, weekLabel);
  const freeHtml = generateIntelligenceBriefEmail(sections, false, weekLabel);
  const freePlain = generateIntelligenceBriefPlainText(sections, false, weekLabel);

  const subject = `SpaceNexus Weekly Intelligence Brief - ${weekLabel}`;
  const resend = getResend();

  let totalSent = 0;
  let totalFailed = 0;

  // Split subscribers into batches
  const batches: typeof subscribers[] = [];
  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    batches.push(subscribers.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    logger.info(`Processing batch ${i + 1}/${batches.length}`, { count: batch.length });

    try {
      const emails = batch.map((subscriber) => {
        const isPro =
          subscriber.user?.subscriptionTier === 'pro' ||
          subscriber.user?.subscriptionTier === 'enterprise';
        const html = isPro ? proHtml : freeHtml;
        const text = isPro ? proPlain : freePlain;

        return {
          from: FROM_EMAIL,
          to: subscriber.email,
          subject,
          html: personalizeEmail(html, subscriber.unsubscribeToken),
          text: personalizeEmail(text, subscriber.unsubscribeToken),
          headers: {
            'List-Unsubscribe': `<${APP_URL}/api/newsletter/unsubscribe?token=${subscriber.unsubscribeToken}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        };
      });

      const { data, error } = await resend.batch.send(emails);

      if (error) {
        logger.error(`Intelligence brief batch ${i + 1} failed`, { error: error.message });
        totalFailed += batch.length;
      } else {
        const batchData = data?.data || [];
        const successCount = batchData.filter((d: { id?: string }) => d.id).length;
        const failCount = batch.length - successCount;
        totalSent += successCount;
        totalFailed += failCount;

        if (failCount > 0) {
          logger.warn(`Intelligence brief batch ${i + 1}: ${failCount} emails failed`);
        }
      }
    } catch (err) {
      logger.error(`Intelligence brief batch ${i + 1} error`, {
        error: err instanceof Error ? err.message : String(err),
      });
      totalFailed += batch.length;
    }

    // Delay between batches (except last)
    if (i < batches.length - 1) {
      await delay(BATCH_DELAY_MS);
    }
  }

  // Update brief record
  await prisma.weeklyIntelligenceBrief.update({
    where: { id: briefId },
    data: {
      sentAt: new Date(),
      recipientCount: totalSent,
    },
  });

  logger.info('Weekly intelligence brief send complete', {
    briefId,
    sent: totalSent,
    failed: totalFailed,
  });

  return { sent: totalSent, failed: totalFailed };
}
