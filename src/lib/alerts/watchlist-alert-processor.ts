import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://spacenexus.us';

/**
 * Process watchlist alerts: check for new news, contracts, and listings
 * that match watched companies, and create AlertDelivery records.
 */
export async function processWatchlistAlerts(prisma: PrismaClient): Promise<{
  newsAlerts: number;
  contractAlerts: number;
  listingAlerts: number;
}> {
  const stats = { newsAlerts: 0, contractAlerts: 0, listingAlerts: 0 };
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    // ─── News Alerts ───────────────────────────────────────────
    const recentNews = await prisma.newsArticle.findMany({
      where: {
        publishedAt: { gte: twentyFourHoursAgo },
        companyTags: { some: {} },
      },
      select: {
        id: true,
        title: true,
        summary: true,
        url: true,
        source: true,
        companyTags: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    for (const article of recentNews) {
      for (const company of article.companyTags) {
        // Find watchers with notifyNews=true
        const watchers = await (prisma as any).companyWatchlistItem.findMany({
          where: {
            companyProfileId: company.id,
            notifyNews: true,
          },
          select: { userId: true },
        });

        for (const watcher of watchers) {
          // Dedup check
          try {
            await (prisma as any).watchlistAlertLog.create({
              data: {
                userId: watcher.userId,
                companyProfileId: company.id,
                alertType: 'news',
                referenceId: article.id,
              },
            });
          } catch {
            // Unique constraint violation = already sent
            continue;
          }

          // Create in-app delivery
          await prisma.alertDelivery.create({
            data: {
              userId: watcher.userId,
              channel: 'in_app',
              status: 'pending',
              title: `${company.name}: ${article.title}`,
              message: article.summary || `New article about ${company.name} from ${article.source}`,
              source: 'watchlist',
              data: {
                type: 'watchlist_news',
                companySlug: company.slug,
                companyName: company.name,
                articleUrl: article.url,
                articleId: article.id,
                link: `/company-profiles/${company.slug}`,
              } as any,
            },
          });

          // Create email delivery (daily digest)
          await prisma.alertDelivery.create({
            data: {
              userId: watcher.userId,
              channel: 'email',
              status: 'pending',
              title: `${company.name}: ${article.title}`,
              message: article.summary || `New article about ${company.name}`,
              source: 'watchlist',
              data: {
                type: 'watchlist_news',
                companySlug: company.slug,
                companyName: company.name,
                articleUrl: article.url,
                emailFrequency: 'daily_digest',
              } as any,
            },
          });

          stats.newsAlerts++;
        }
      }
    }

    // ─── Contract Alerts ───────────────────────────────────────
    const recentContracts = await (prisma as any).governmentContractAward.findMany({
      where: {
        awardDate: { gte: twentyFourHoursAgo },
        companyProfileId: { not: null },
      },
      select: {
        id: true,
        title: true,
        awardAmount: true,
        agency: true,
        companyProfileId: true,
        companyProfile: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    for (const contract of recentContracts) {
      if (!contract.companyProfile) continue;

      const watchers = await (prisma as any).companyWatchlistItem.findMany({
        where: {
          companyProfileId: contract.companyProfileId,
          notifyContracts: true,
        },
        select: { userId: true },
      });

      for (const watcher of watchers) {
        try {
          await (prisma as any).watchlistAlertLog.create({
            data: {
              userId: watcher.userId,
              companyProfileId: contract.companyProfileId,
              alertType: 'contract',
              referenceId: contract.id,
            },
          });
        } catch {
          continue;
        }

        const amount = contract.awardAmount
          ? `$${(contract.awardAmount / 1e6).toFixed(1)}M`
          : 'undisclosed amount';

        await prisma.alertDelivery.create({
          data: {
            userId: watcher.userId,
            channel: 'in_app',
            status: 'pending',
            title: `${contract.companyProfile.name}: New ${amount} Contract`,
            message: contract.title || `New contract awarded by ${contract.agency}`,
            source: 'watchlist',
            data: {
              type: 'watchlist_contract',
              companySlug: contract.companyProfile.slug,
              companyName: contract.companyProfile.name,
              link: `/company-profiles/${contract.companyProfile.slug}?tab=contracts`,
            } as any,
          },
        });

        await prisma.alertDelivery.create({
          data: {
            userId: watcher.userId,
            channel: 'email',
            status: 'pending',
            title: `${contract.companyProfile.name}: New ${amount} Contract`,
            message: contract.title || `New contract awarded by ${contract.agency}`,
            source: 'watchlist',
            data: {
              type: 'watchlist_contract',
              companySlug: contract.companyProfile.slug,
              emailFrequency: 'daily_digest',
            } as any,
          },
        });

        stats.contractAlerts++;
      }
    }

    // ─── Listing Alerts ────────────────────────────────────────
    const recentListings = await (prisma as any).serviceListing.findMany({
      where: {
        createdAt: { gte: twentyFourHoursAgo },
        companyProfileId: { not: null },
      },
      select: {
        id: true,
        title: true,
        category: true,
        companyProfileId: true,
        companyProfile: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    for (const listing of recentListings) {
      if (!listing.companyProfile) continue;

      const watchers = await (prisma as any).companyWatchlistItem.findMany({
        where: {
          companyProfileId: listing.companyProfileId,
          notifyListings: true,
        },
        select: { userId: true },
      });

      for (const watcher of watchers) {
        try {
          await (prisma as any).watchlistAlertLog.create({
            data: {
              userId: watcher.userId,
              companyProfileId: listing.companyProfileId,
              alertType: 'listing',
              referenceId: listing.id,
            },
          });
        } catch {
          continue;
        }

        await prisma.alertDelivery.create({
          data: {
            userId: watcher.userId,
            channel: 'in_app',
            status: 'pending',
            title: `${listing.companyProfile.name}: New Marketplace Listing`,
            message: listing.title || `New ${listing.category} listing`,
            source: 'watchlist',
            data: {
              type: 'watchlist_listing',
              companySlug: listing.companyProfile.slug,
              companyName: listing.companyProfile.name,
              link: `/marketplace/listings/${listing.id}`,
            } as any,
          },
        });

        stats.listingAlerts++;
      }
    }

    logger.info('Watchlist alert processing complete', stats);
  } catch (error) {
    logger.error('Error processing watchlist alerts', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return stats;
}

/**
 * Send daily digest emails for watchlist alerts.
 * Handles deliveries where source='watchlist' and channel='email'.
 */
export async function sendWatchlistDailyDigest(prisma: PrismaClient): Promise<{
  usersProcessed: number;
  emailsSent: number;
  errors: number;
}> {
  const stats = { usersProcessed: 0, emailsSent: 0, errors: 0 };

  try {
    // Find pending watchlist email deliveries
    const pendingDeliveries = await prisma.alertDelivery.findMany({
      where: {
        channel: 'email',
        status: 'pending',
        source: 'watchlist',
      },
      orderBy: { createdAt: 'asc' },
    });

    if (pendingDeliveries.length === 0) {
      logger.debug('No pending watchlist digest deliveries');
      return stats;
    }

    // Group by userId
    const byUser = new Map<string, typeof pendingDeliveries>();
    for (const delivery of pendingDeliveries) {
      const existing = byUser.get(delivery.userId) || [];
      existing.push(delivery);
      byUser.set(delivery.userId, existing);
    }

    for (const [userId, deliveries] of Array.from(byUser.entries())) {
      stats.usersProcessed++;

      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, name: true },
        });

        if (!user) continue;

        const resendApiKey = process.env.RESEND_API_KEY;
        if (!resendApiKey) {
          logger.warn('RESEND_API_KEY not configured, skipping watchlist digest');
          continue;
        }

        const { generateWatchlistDigestEmail } = await import('@/lib/alerts/alert-templates');

        const alertItems = deliveries.map((d) => ({
          title: d.title,
          message: d.message,
          data: d.data as Record<string, unknown> | null,
          createdAt: d.createdAt,
        }));

        const { html, text } = generateWatchlistDigestEmail(alertItems, user.name || undefined);

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'SpaceNexus Alerts <alerts@spacenexus.us>',
            to: user.email,
            subject: `SpaceNexus Watchlist Update - ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
            html,
            text,
          }),
        });

        if (response.ok) {
          await prisma.alertDelivery.updateMany({
            where: { id: { in: deliveries.map((d) => d.id) } },
            data: { status: 'sent', sentAt: new Date() },
          });
          stats.emailsSent++;
        } else {
          const errorBody = await response.text();
          logger.error('Failed to send watchlist digest', { userId, status: response.status, body: errorBody });
          stats.errors++;
        }
      } catch (error) {
        logger.error('Error processing watchlist digest for user', {
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
        stats.errors++;
      }
    }

    logger.info('Watchlist daily digest processing complete', stats);
  } catch (error) {
    logger.error('Error in sendWatchlistDailyDigest', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return stats;
}
