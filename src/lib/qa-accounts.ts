/**
 * QA accounts (2026-09-12). Automated probes exercise the live site and the
 * live Space Tycoon world with real, signed-in, disposable accounts so that
 * server-side flows (research, construction, purchases, cloud save) get
 * verified end to end instead of by unit test alone.
 *
 * Contract:
 * - A QA account's email ends with QA_EMAIL_DOMAIN. Nothing else marks it.
 * - Every public or competitive Space Tycoon listing excludes QA profiles
 *   (leaderboards, rivals, espionage targets, mentors, league standings,
 *   economic snapshots, weekly report mail) via `notQaProfile`.
 * - Registration never emails a QA address (the domain does not exist;
 *   a bounce would only hurt sender reputation).
 * - Probes delete their account when they finish; the daily `qa-sweep` cron
 *   removes any QA account older than QA_SWEEP_MAX_AGE_HOURS that a crashed
 *   run left behind, so the world never keeps a stray QA corporation.
 */
import type { Prisma } from '@prisma/client';

export const QA_EMAIL_DOMAIN = '@spacenexus.internal';
export const QA_SWEEP_MAX_AGE_HOURS = 24;

export function isQaEmail(email: string | null | undefined): boolean {
  return typeof email === 'string' && email.toLowerCase().endsWith(QA_EMAIL_DOMAIN);
}

/** Where-fragment for GameProfile queries: excludes profiles owned by QA accounts. */
export const notQaProfile: Prisma.GameProfileWhereInput = {
  user: { email: { not: { endsWith: QA_EMAIL_DOMAIN } } },
};

/** Where-fragment for User queries. */
export const notQaUser: Prisma.UserWhereInput = {
  email: { not: { endsWith: QA_EMAIL_DOMAIN } },
};

/** Modules a probe may report under; anything else is rejected by /api/qa/report. */
export const QA_REPORT_MODULES = ['qa-smoke', 'qa-tycoon', 'qa-phone'] as const;
export type QaReportModule = (typeof QA_REPORT_MODULES)[number];
