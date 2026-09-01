/**
 * Registry of the opt-in email programs served by
 * POST /api/cron/email-programs?program=<id> (2026-09-01).
 *
 * Lives outside the route module because Next.js route files may only export
 * HTTP handlers and route-segment config.
 *
 *   markets-daily  weekdays 21:50 UTC  periodKey YYYY-MM-DD  flag marketsDaily
 *   hiring-index   3rd, 14:00 UTC      periodKey YYYY-MM (latest completed
 *                                      edition)              flag monthlyReports
 *   slip-report    3rd, 15:00 UTC      periodKey YYYY-MM     flag monthlyReports
 */

import { composeMarketsDaily, type ProgramEmail } from '@/lib/markets-daily-email';
import { composeHiringIndexReport, composeSlipReport } from '@/lib/monthly-reports-email';
import { latestEditionMonthKey } from '@/lib/hiring-index';

export type OptInFlag = 'marketsDaily' | 'monthlyReports';

export interface ProgramDef {
  flag: OptInFlag;
  periodKey: (now: Date) => string;
  compose: (now: Date) => Promise<ProgramEmail | null>;
}

export const EMAIL_PROGRAMS: Record<string, ProgramDef> = {
  'markets-daily': {
    flag: 'marketsDaily',
    periodKey: (now) => now.toISOString().slice(0, 10),
    compose: composeMarketsDaily,
  },
  'hiring-index': {
    flag: 'monthlyReports',
    periodKey: (now) => latestEditionMonthKey(now),
    compose: composeHiringIndexReport,
  },
  'slip-report': {
    flag: 'monthlyReports',
    periodKey: (now) => now.toISOString().slice(0, 7),
    compose: composeSlipReport,
  },
};
