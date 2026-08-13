// Job alert processing — the retention loop for the /space-talent jobs board.
//
// Users can save a job search (SavedSearch.searchType = 'space_jobs') from the
// Jobs tab on /space-talent with alertEnabled=true. This module re-runs each
// active job alert against SpaceJobPosting, emails the user when new ACTIVE
// jobs match, and records the attempt.
//
// Model choices (no Prisma schema changes were made — see CLAUDE.md):
//  - SavedSearch: reused exactly as the existing 'global_search' saved-search
//    alert flow uses it (see src/app/api/cron/saved-searches-digest/route.ts).
//    `searchType` is a free-form String column (not a DB enum), so
//    'space_jobs' is a new value alongside the existing
//    'company_directory' / 'marketplace_listings' / 'marketplace_rfqs'
//    "legacy module" rows. `query` (top-level column) holds the free-text
//    search term; `filters` (Json) holds category / seniorityLevel / remoteOk
//    plus a `lastAlertRunAt` cursor — namespaced separately from the
//    `lastRunAt` key the global-search flow uses in the same column, so the
//    two features never stomp each other's bookkeeping when both happen to
//    read/write the same SavedSearch row family.
//  - AlertDelivery: used to record each send attempt (channel='email',
//    source='job_alert', status sent/failed). AlertDelivery.alertRuleId is
//    nullable and userId/channel/status/title/message/data are generic, so
//    this fits without an AlertRule row (AlertRule is a different, richer
//    subsystem — keyword/price/regulatory triggers — not a natural fit for a
//    saved job search). SavedSearchMatch was NOT used: it has a hard foreign
//    key to ProcurementOpportunity, so it cannot reference SpaceJobPosting
//    rows at all.
//  - Idempotency: rather than diffing an ID list (as the global-search flow
//    does), each alert stores a `lastAlertRunAt` cursor in `filters` and only
//    matches SpaceJobPosting rows with `createdAt >= cursor`. `createdAt` is
//    set once on insert and is never touched by the ATS upsert's `update`
//    clause (confirmed in src/lib/fetchers/ats-jobs-fetcher.ts), so it is a
//    reliable, monotonic "new to us" signal — more reliable than `postedDate`,
//    which some source ATS boards backdate. The cursor advances on every run
//    (even with zero matches) so a run is never repeated.

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { generateJobAlertEmail, type JobAlertMatch } from '@/lib/newsletter/email-templates';

export const JOB_ALERT_SEARCH_TYPE = 'space_jobs';
const MAX_JOBS_PER_EMAIL = 20;
// Safety cap on how many rows we pull per search before slicing to the email
// cap — keeps a single very-broad alert (e.g. no filters at all) from pulling
// an unbounded result set.
const MAX_JOBS_QUERY = 300;

interface JobAlertFilters {
  category?: string;
  seniorityLevel?: string;
  remoteOk?: boolean;
  lastAlertRunAt: string | null;
}

function readJobAlertFilters(filters: unknown): JobAlertFilters {
  const blob = filters && typeof filters === 'object' ? (filters as Record<string, unknown>) : {};
  return {
    category: typeof blob.category === 'string' && blob.category ? blob.category : undefined,
    seniorityLevel:
      typeof blob.seniorityLevel === 'string' && blob.seniorityLevel ? blob.seniorityLevel : undefined,
    remoteOk: typeof blob.remoteOk === 'boolean' ? blob.remoteOk : undefined,
    lastAlertRunAt: typeof blob.lastAlertRunAt === 'string' ? blob.lastAlertRunAt : null,
  };
}

export interface ProcessJobAlertsResult {
  searchesProcessed: number;
  alertsSent: number;
  emailsSkipped: number; // RESEND_API_KEY not configured
  totalNewJobMatches: number;
  errors: number;
}

/**
 * Re-run every enabled space_jobs saved search and email users whose search
 * has new matching ACTIVE job postings since the search's last run.
 *
 * @param options.dryRun - When true, computes matches and would-be emails but
 *   never calls Resend and never writes to the database. Used by tests.
 */
export async function processJobAlerts(options?: { dryRun?: boolean }): Promise<ProcessJobAlertsResult> {
  const dryRun = options?.dryRun ?? false;
  const now = new Date();

  const result: ProcessJobAlertsResult = {
    searchesProcessed: 0,
    alertsSent: 0,
    emailsSkipped: 0,
    totalNewJobMatches: 0,
    errors: 0,
  };

  const searches = await prisma.savedSearch.findMany({
    where: { searchType: JOB_ALERT_SEARCH_TYPE, alertEnabled: true },
    orderBy: { updatedAt: 'asc' },
  });

  if (searches.length === 0) {
    return result;
  }

  const resendKey = process.env.RESEND_API_KEY;
  let resend: import('resend').Resend | null = null;
  if (!dryRun && resendKey) {
    const { Resend } = await import('resend');
    resend = new Resend(resendKey);
  }
  const fromAddress = process.env.NEWSLETTER_FROM_EMAIL || 'SpaceNexus <noreply@spacenexus.us>';

  const userIds = Array.from(new Set(searches.map((s) => s.userId)));
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, name: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  for (const search of searches) {
    result.searchesProcessed++;

    try {
      const meta = readJobAlertFilters(search.filters);
      const since = meta.lastAlertRunAt ? new Date(meta.lastAlertRunAt) : search.createdAt;

      const where: Record<string, unknown> = {
        isActive: true,
        createdAt: { gte: since },
      };
      if (meta.category) where.category = meta.category;
      if (meta.seniorityLevel) where.seniorityLevel = meta.seniorityLevel;
      if (meta.remoteOk) where.remoteOk = true;
      if (search.query && search.query.trim()) {
        const q = search.query.trim();
        where.OR = [
          { title: { contains: q, mode: 'insensitive' } },
          { company: { contains: q, mode: 'insensitive' } },
          { location: { contains: q, mode: 'insensitive' } },
          { specialization: { contains: q, mode: 'insensitive' } },
        ];
      }

      const matches = await prisma.spaceJobPosting.findMany({
        where,
        select: {
          id: true,
          title: true,
          company: true,
          location: true,
          remoteOk: true,
          category: true,
          seniorityLevel: true,
          salaryMin: true,
          salaryMax: true,
        },
        orderBy: { createdAt: 'asc' },
        take: MAX_JOBS_QUERY,
      });

      // Advance the cursor unconditionally so a run is never repeated,
      // whether or not it produced matches.
      if (!dryRun) {
        const newFilters: Record<string, unknown> = {
          ...(search.filters && typeof search.filters === 'object'
            ? (search.filters as Record<string, unknown>)
            : {}),
          lastAlertRunAt: now.toISOString(),
        };
        await prisma.savedSearch.update({
          where: { id: search.id },
          data: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            filters: newFilters as any,
          },
        });
      }

      if (matches.length === 0) {
        continue;
      }

      result.totalNewJobMatches += matches.length;

      const user = userById.get(search.userId);
      if (!user) {
        logger.warn('job-alerts: user not found for saved search', {
          searchId: search.id,
          userId: search.userId,
        });
        continue;
      }

      const emailJobs: JobAlertMatch[] = matches.slice(0, MAX_JOBS_PER_EMAIL);
      const overflowCount = matches.length - emailJobs.length;

      const { html, text, subject } = generateJobAlertEmail(
        { name: user.name, email: user.email },
        { searchId: search.id, searchName: search.name },
        emailJobs,
        overflowCount
      );

      if (dryRun) {
        result.alertsSent++;
        continue;
      }

      const deliveryBase = {
        userId: user.id,
        channel: 'email',
        title: subject,
        message: `${matches.length} new job posting${matches.length === 1 ? '' : 's'} matched "${search.name}"`,
        data: {
          searchId: search.id,
          jobIds: matches.map((m) => m.id),
          totalMatches: matches.length,
        } as Record<string, unknown>,
        source: 'job_alert',
      };

      if (!resend) {
        result.emailsSkipped++;
        logger.warn('job-alerts: RESEND_API_KEY not configured, skipping send', { searchId: search.id });
        await prisma.alertDelivery.create({
          data: {
            ...deliveryBase,
            status: 'failed',
            failReason: 'RESEND_API_KEY not configured',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: deliveryBase.data as any,
          },
        });
        continue;
      }

      try {
        await resend.emails.send({ from: fromAddress, to: user.email, subject, html, text });
        result.alertsSent++;
        await prisma.alertDelivery.create({
          data: {
            ...deliveryBase,
            status: 'sent',
            sentAt: now,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: deliveryBase.data as any,
          },
        });
        logger.info('job-alerts: email sent', { searchId: search.id, userId: user.id, matches: matches.length });
      } catch (sendErr) {
        result.errors++;
        logger.error('job-alerts: failed to send email', {
          searchId: search.id,
          error: sendErr instanceof Error ? sendErr.message : String(sendErr),
        });
        await prisma.alertDelivery.create({
          data: {
            ...deliveryBase,
            status: 'failed',
            failReason: sendErr instanceof Error ? sendErr.message : String(sendErr),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: deliveryBase.data as any,
          },
        });
      }
    } catch (err) {
      result.errors++;
      logger.error('job-alerts: per-search failure', {
        searchId: search.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  logger.info('Job alerts processing complete', { ...result });
  return result;
}
