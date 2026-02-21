import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import {
  validationError,
  unauthorizedError,
  internalError,
  rateLimitedError,
} from '@/lib/errors';
import {
  generateSectorReport,
  generateCompanyDeepDive,
  generateCompetitiveAnalysis,
  generateMarketEntryBrief,
} from '@/lib/report-generator';
import { REPORT_TYPES, SPACE_SECTORS } from '@/lib/report-templates';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Concurrency limiter — max 1 concurrent generation per user
// ---------------------------------------------------------------------------

const activeGenerations = new Map<string, number>(); // userId -> timestamp

function acquireLock(userId: string): boolean {
  const existing = activeGenerations.get(userId);
  // Allow if no lock or lock is stale (> 5 minutes)
  if (existing && Date.now() - existing < 5 * 60 * 1000) {
    return false;
  }
  activeGenerations.set(userId, Date.now());
  return true;
}

function releaseLock(userId: string): void {
  activeGenerations.delete(userId);
}

// Clean up stale locks periodically
setInterval(() => {
  const staleThreshold = Date.now() - 5 * 60 * 1000;
  for (const key of Array.from(activeGenerations.keys())) {
    const ts = activeGenerations.get(key);
    if (ts && ts < staleThreshold) {
      activeGenerations.delete(key);
    }
  }
}, 60 * 1000);

// ---------------------------------------------------------------------------
// Tier-based limits
// ---------------------------------------------------------------------------

interface TierLimits {
  monthlyReports: number;
  allowedTypes: string[];
}

const TIER_LIMITS: Record<string, TierLimits> = {
  free: {
    monthlyReports: 1,
    allowedTypes: ['sector-overview'], // Free users only get 1 sample report
  },
  pro: {
    monthlyReports: 5,
    allowedTypes: ['sector-overview', 'company-deep-dive', 'competitive-analysis', 'market-entry-brief'],
  },
  enterprise: {
    monthlyReports: 999, // Effectively unlimited
    allowedTypes: ['sector-overview', 'company-deep-dive', 'competitive-analysis', 'market-entry-brief'],
  },
};

// In-memory usage tracking (simple; production would use database)
const monthlyUsage = new Map<string, { count: number; month: string }>();

function getMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getUserUsage(userId: string): number {
  const currentMonth = getMonthKey();
  const usage = monthlyUsage.get(userId);
  if (!usage || usage.month !== currentMonth) {
    return 0;
  }
  return usage.count;
}

function incrementUsage(userId: string): void {
  const currentMonth = getMonthKey();
  const usage = monthlyUsage.get(userId);
  if (!usage || usage.month !== currentMonth) {
    monthlyUsage.set(userId, { count: 1, month: currentMonth });
  } else {
    usage.count++;
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let userId: string | null = null;

  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('Sign in to generate intelligence reports');
    }

    userId = session.user.id;
    const userTier = (session.user as { subscriptionTier?: string }).subscriptionTier || 'free';
    const tierLimits = TIER_LIMITS[userTier] || TIER_LIMITS.free;

    // Parse body
    const body = await request.json();
    const { reportType, config } = body as {
      reportType: string;
      config: {
        sector?: string;
        companySlug?: string;
        companySlugs?: string[];
        topic?: string;
      };
    };

    // Validate report type
    const reportTypeConfig = REPORT_TYPES.find((rt) => rt.id === reportType);
    if (!reportTypeConfig) {
      return validationError('Invalid report type', {
        reportType: `Must be one of: ${REPORT_TYPES.map((rt) => rt.id).join(', ')}`,
      });
    }

    // Tier access check
    if (!tierLimits.allowedTypes.includes(reportType)) {
      return validationError(
        `Your ${userTier} plan does not include ${reportTypeConfig.name} reports. Upgrade to Pro or Enterprise for access.`
      );
    }

    // Monthly usage check
    const currentUsage = getUserUsage(userId);
    if (currentUsage >= tierLimits.monthlyReports) {
      return validationError(
        `You have reached your monthly limit of ${tierLimits.monthlyReports} report${tierLimits.monthlyReports === 1 ? '' : 's'}. Upgrade your plan for more reports.`
      );
    }

    // Validate config based on report type
    switch (reportType) {
      case 'sector-overview': {
        if (!config?.sector) {
          return validationError('Sector is required for Sector Overview reports');
        }
        if (!SPACE_SECTORS.find((s) => s.value === config.sector)) {
          return validationError('Invalid sector selected');
        }
        break;
      }
      case 'company-deep-dive': {
        if (!config?.companySlug || typeof config.companySlug !== 'string') {
          return validationError('Company selection is required for Company Deep Dive reports');
        }
        if (config.companySlug.length > 200) {
          return validationError('Company slug is too long');
        }
        break;
      }
      case 'competitive-analysis': {
        if (
          !config?.companySlugs ||
          !Array.isArray(config.companySlugs) ||
          config.companySlugs.length < 2 ||
          config.companySlugs.length > 5
        ) {
          return validationError('Select 2-5 companies for Competitive Analysis');
        }
        // Validate each slug
        for (const slug of config.companySlugs) {
          if (typeof slug !== 'string' || slug.length > 200) {
            return validationError('Invalid company slug in selection');
          }
        }
        break;
      }
      case 'market-entry-brief': {
        if (!config?.topic || typeof config.topic !== 'string' || config.topic.trim().length < 10) {
          return validationError('Topic description must be at least 10 characters for Market Entry Brief');
        }
        if (config.topic.length > 2000) {
          return validationError('Topic description is too long (max 2000 characters)');
        }
        break;
      }
      default:
        return validationError('Unsupported report type');
    }

    // Concurrency check
    if (!acquireLock(userId)) {
      return rateLimitedError(30);
    }

    // Generate the report
    logger.info('Starting report generation', {
      userId,
      reportType,
      tier: userTier,
      usageThisMonth: currentUsage + 1,
    });

    let report;
    try {
      switch (reportType) {
        case 'sector-overview':
          report = await generateSectorReport(config.sector!);
          break;
        case 'company-deep-dive':
          report = await generateCompanyDeepDive(config.companySlug!);
          break;
        case 'competitive-analysis':
          report = await generateCompetitiveAnalysis(config.companySlugs!);
          break;
        case 'market-entry-brief':
          report = await generateMarketEntryBrief(config.topic!);
          break;
        default:
          return validationError('Unsupported report type');
      }
    } finally {
      releaseLock(userId);
    }

    // Increment usage
    incrementUsage(userId);

    logger.info('Report generated successfully', {
      userId,
      reportType,
      title: report.title,
      sectionCount: report.sections.length,
    });

    return NextResponse.json({
      success: true,
      report,
      usage: {
        used: currentUsage + 1,
        limit: tierLimits.monthlyReports,
        tier: userTier,
      },
    });
  } catch (error) {
    // Release lock on error
    if (userId) {
      releaseLock(userId);
    }

    logger.error('Report generation failed', {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });

    if (error instanceof SyntaxError) {
      return validationError('Invalid request body');
    }

    return internalError('Report generation failed. Please try again.');
  }
}
