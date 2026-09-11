import { FOUNDER_EMAIL } from '@/lib/constants';

/**
 * Where operational email goes (Jay, 2026-09-10):
 *  - alertEmail(): things that are BROKEN or involve MONEY — stale crons,
 *    sentinel failures, paid job postings, first applicants. ALERT_EMAIL env
 *    (Jay's personal inbox), falling back to the owner mailbox.
 *  - correspondenceEmail(): things PEOPLE sent — contact form, feedback,
 *    reachout digests, advertiser/company/service requests. ADMIN_EMAIL (the
 *    owner@ mailbox), falling back to the founder Gmail.
 * The Monday CEO brief and compliance Q&A keep their own deliberate targets.
 */
export function alertEmail(): string {
  return process.env.ALERT_EMAIL || process.env.ADMIN_EMAIL || FOUNDER_EMAIL;
}

export function correspondenceEmail(): string {
  return process.env.ADMIN_EMAIL || FOUNDER_EMAIL;
}
