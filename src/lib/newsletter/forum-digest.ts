/**
 * Weekly Forum Digest Email Generator
 *
 * Generates an HTML email summarizing the top forum threads,
 * community stats, and top contributors from the past week.
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  escapeHtml,
  wrapInEmailTemplate,
  getHeader,
  getFooter,
  styles,
  APP_URL,
} from './email-templates';

interface ForumDigestResult {
  html: string;
  plain: string;
  subject: string;
}

interface TrendingThreadData {
  id: string;
  title: string;
  categorySlug: string;
  categoryName: string;
  upvoteCount: number;
  viewCount: number;
  postCount: number;
  authorName: string;
  score: number;
  createdAt: Date;
}

interface TopContributor {
  name: string;
  reputationGained: number;
}

export async function generateForumDigestEmail(): Promise<ForumDigestResult> {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 1. Get threads from the last 7 days and calculate trending scores
  const recentThreads = await prisma.forumThread.findMany({
    where: {
      createdAt: { gte: oneWeekAgo },
    },
    include: {
      author: {
        select: { id: true, name: true },
      },
      category: {
        select: { slug: true, name: true },
      },
      _count: {
        select: { posts: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100, // Fetch extra to compute top 10 by score
  });

  // Score and sort
  const scoredThreads: TrendingThreadData[] = recentThreads.map((t: any) => {
    const ageInHours = (now.getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
    const postCount = t._count?.posts || 0;
    const score =
      (t.upvoteCount || 0) * 3 +
      (t.viewCount || 0) * 0.1 +
      postCount * 5 -
      ageInHours * 0.5;
    return {
      id: t.id,
      title: t.title,
      categorySlug: t.category?.slug || '',
      categoryName: t.category?.name || 'General',
      upvoteCount: t.upvoteCount || 0,
      viewCount: t.viewCount || 0,
      postCount,
      authorName: t.author?.name || 'Anonymous',
      score: Math.round(score * 100) / 100,
      createdAt: t.createdAt,
    };
  });

  scoredThreads.sort((a, b) => b.score - a.score);
  const topThreads = scoredThreads.slice(0, 10);

  // 2. Get weekly stats
  const newThreadCount = recentThreads.length;

  const totalPostCount = await prisma.forumPost.count({
    where: {
      createdAt: { gte: oneWeekAgo },
    },
  });

  // 3. Get top contributor (user who gained the most reputation this week)
  // We approximate this by looking at upvotes received + accepted answers in the past week
  let topContributor: TopContributor | null = null;
  try {
    // Find users who received the most upvotes on posts/threads created this week
    const topPosters = await prisma.forumPost.groupBy({
      by: ['authorId'],
      where: {
        createdAt: { gte: oneWeekAgo },
      },
      _sum: {
        upvoteCount: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          upvoteCount: 'desc',
        },
      },
      take: 1,
    });

    if (topPosters.length > 0) {
      const topUser = await prisma.user.findUnique({
        where: { id: topPosters[0].authorId },
        select: { name: true },
      });
      if (topUser) {
        const repGained =
          (topPosters[0]._count?.id || 0) * 2 + // POST_CREATED points
          (topPosters[0]._sum?.upvoteCount || 0) * 10; // UPVOTE_RECEIVED points
        topContributor = {
          name: topUser.name || 'Anonymous',
          reputationGained: repGained,
        };
      }
    }
  } catch {
    // Gracefully handle if groupBy fails (e.g., no posts)
    logger.warn('Could not determine top contributor for forum digest');
  }

  // 4. Build the email
  const weekLabel = `${oneWeekAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  const subject = `SpaceNexus Forum Weekly Digest - ${weekLabel}`;

  // Build thread rows HTML
  let threadsHtml = '';
  let threadsPlain = '';

  topThreads.forEach((thread, index) => {
    const threadUrl = `${APP_URL}/community/forums/${thread.categorySlug}/${thread.id}`;
    threadsHtml += `
      <tr>
        <td style="padding: 12px 30px; background-color: ${index % 2 === 0 ? styles.bgCard : styles.bgCardHover};">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="width: 30px; vertical-align: top; padding-top: 2px;">
                <span style="display: inline-block; width: 24px; height: 24px; line-height: 24px; text-align: center; background-color: ${styles.accentNebula}22; color: ${styles.accentNebulaLight}; border-radius: 4px; font-size: 12px; font-weight: 600;">
                  ${index + 1}
                </span>
              </td>
              <td style="padding-left: 12px;">
                <a href="${escapeHtml(threadUrl)}" style="font-size: 14px; font-weight: 500; color: ${styles.textWhite}; text-decoration: none; line-height: 1.4;">
                  ${escapeHtml(thread.title)}
                </a>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: ${styles.textMuted};">
                  <span style="color: ${styles.accentNebulaLight};">${escapeHtml(thread.categoryName)}</span>
                  &nbsp;&middot;&nbsp;
                  by ${escapeHtml(thread.authorName)}
                  &nbsp;&middot;&nbsp;
                  ${thread.postCount} ${thread.postCount === 1 ? 'reply' : 'replies'}
                  &nbsp;&middot;&nbsp;
                  ${thread.upvoteCount} ${thread.upvoteCount === 1 ? 'upvote' : 'upvotes'}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;

    threadsPlain += `
${index + 1}. ${thread.title}
   ${thread.categoryName} | by ${thread.authorName} | ${thread.postCount} replies | ${thread.upvoteCount} upvotes
   ${threadUrl}
`;
  });

  // Stats section
  const statsHtml = `
    <tr>
      <td style="padding: 20px 30px; background-color: ${styles.bgCard};">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td align="center" style="width: 33%; padding: 12px;">
              <p style="margin: 0; font-size: 28px; font-weight: 700; color: ${styles.accentNebulaLight};">
                ${newThreadCount}
              </p>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: ${styles.textMuted}; text-transform: uppercase; letter-spacing: 0.5px;">
                New Threads
              </p>
            </td>
            <td align="center" style="width: 33%; padding: 12px; border-left: 1px solid ${styles.borderColor}; border-right: 1px solid ${styles.borderColor};">
              <p style="margin: 0; font-size: 28px; font-weight: 700; color: ${styles.accentNebulaLight};">
                ${totalPostCount}
              </p>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: ${styles.textMuted}; text-transform: uppercase; letter-spacing: 0.5px;">
                New Posts
              </p>
            </td>
            <td align="center" style="width: 33%; padding: 12px;">
              <p style="margin: 0; font-size: 28px; font-weight: 700; color: ${styles.accentNebulaLight};">
                ${topContributor ? escapeHtml(topContributor.name) : 'N/A'}
              </p>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: ${styles.textMuted}; text-transform: uppercase; letter-spacing: 0.5px;">
                Top Contributor${topContributor ? ` (+${topContributor.reputationGained} rep)` : ''}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

  const html = wrapInEmailTemplate(`
    ${getHeader('Weekly Forum Digest')}
    <tr>
      <td style="padding: 20px 30px; background-color: ${styles.bgCard}; text-align: center;">
        <p style="margin: 0 0 5px 0; font-size: 14px; color: ${styles.textMuted}; text-transform: uppercase; letter-spacing: 1px;">
          Community Highlights
        </p>
        <p style="margin: 0; font-size: 14px; color: ${styles.textLight};">
          ${weekLabel}
        </p>
      </td>
    </tr>
    ${statsHtml}
    <tr>
      <td style="padding: 20px 30px 10px 30px; background-color: ${styles.bgCard};">
        <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: ${styles.accentNebulaLight}; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid ${styles.borderColor}; padding-bottom: 10px;">
          Top Threads This Week
        </h3>
      </td>
    </tr>
    ${threadsHtml}
    <tr>
      <td style="padding: 25px 30px; background-color: ${styles.bgCard}; text-align: center;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
          <tr>
            <td align="center" style="border-radius: 8px; background: linear-gradient(135deg, ${styles.accentNebula} 0%, #5b21b6 100%);">
              <a href="${APP_URL}/community/forums" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 600; color: ${styles.textWhite}; text-decoration: none;">
                Join the Discussion
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${getFooter('{{UNSUBSCRIBE_URL}}')}
  `, `This week in SpaceNexus forums: ${newThreadCount} new threads, ${totalPostCount} posts`);

  const plain = `SPACENEXUS WEEKLY FORUM DIGEST
${weekLabel}

COMMUNITY STATS
- New Threads: ${newThreadCount}
- New Posts: ${totalPostCount}
${topContributor ? `- Top Contributor: ${topContributor.name} (+${topContributor.reputationGained} rep)` : ''}

TOP THREADS THIS WEEK
${threadsPlain}

Join the discussion: ${APP_URL}/community/forums

---
SpaceNexus - Your gateway to the space industry
Unsubscribe: {{UNSUBSCRIBE_URL}}`;

  return { html, plain, subject };
}
