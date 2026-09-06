import { unstable_cache } from 'next/cache';
import prisma from '@/lib/db';

// Launch calendar (2026-09-06, roadmap Tier 2 #11). The launch-schedule
// guide — ~27k impressions a month — showed a hand-typed month grid that
// read "Flown / 25-30 expected" for every month. This is the live version:
// how many orbital launches actually flew each month of the year, how many
// are on the manifest for the months ahead, and the next thirty days as a
// list a reader can click into. Same universe as launch-cadence.ts, stated
// so the two never disagree on-page:
//
// - "Flown": lifted off — status completed or failed, with a rocket named.
//   Scrubs and stand-downs are not launches.
// - "Scheduled": a future launchDate that is not scrubbed. Manifests move;
//   the slip ledger (launch-slips.ts) is the record of how much.

export interface CalendarMonth {
  month: number; // 1-12
  label: string; // 'Jan'
  flown: number;
  failed: number;
  scheduled: number; // future rows only; 0 for past months
  isPast: boolean;
  isCurrent: boolean;
}

export interface CalendarLaunch {
  id: string;
  name: string;
  mission: string | null;
  launchDate: string; // ISO
  status: string;
  rocket: string | null;
  agency: string | null;
  location: string | null;
}

export interface LaunchCalendar {
  asOf: string;
  year: number;
  months: CalendarMonth[];
  flownYearToDate: number;
  scheduledRestOfYear: number;
  next30Days: CalendarLaunch[];
  /** The soonest scheduled launch — the honest "email me about the next one" target. */
  nextLaunch: CalendarLaunch | null;
  /** 0-based month of the last scheduled launch we hold, or null when the
   *  manifest holds nothing ahead. The upstream feed only carries roughly the
   *  next three months, so a month past this is "not loaded yet", not "zero
   *  launches" — the page must say which. */
  horizonMonth: number | null;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The feed names launches "Rocket | Payload" and uses "Unknown Payload" when
 *  the payload is not public, which reads badly in a sentence ("email me
 *  about Long March 2D | Unknown Payload"). Drop the placeholder and, when
 *  nothing is left, fall back to the rocket. */
export function launchDisplayName(name: string, rocket?: string | null): string {
  const cleaned = name.replace(/\s*\|\s*unknown payload\s*$/i, '').trim();
  if (cleaned && !/^unknown payload$/i.test(cleaned)) return cleaned;
  return rocket ? `${rocket} launch` : name;
}

export const getLaunchCalendar = unstable_cache(async (): Promise<LaunchCalendar | null> => {
  try {
    const now = new Date();
    const year = now.getUTCFullYear();
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const endOfYear = new Date(Date.UTC(year + 1, 0, 1));
    const in30 = new Date(now.getTime() + 30 * 86_400_000);

    const rows = await prisma.spaceEvent.findMany({
      where: { rocket: { not: null }, launchDate: { gte: startOfYear, lt: endOfYear } },
      select: { id: true, name: true, mission: true, launchDate: true, status: true, rocket: true, agency: true, location: true },
      orderBy: { launchDate: 'asc' },
    });

    const months: CalendarMonth[] = MONTH_LABELS.map((label, i) => ({
      month: i + 1, label, flown: 0, failed: 0, scheduled: 0,
      isPast: i < now.getUTCMonth(), isCurrent: i === now.getUTCMonth(),
    }));
    const next30: CalendarLaunch[] = [];
    let flownYtd = 0;
    let scheduledRest = 0;

    for (const r of rows) {
      const d = r.launchDate!;
      const m = months[d.getUTCMonth()];
      const flown = r.status === 'completed' || r.status === 'failed';
      if (d.getTime() <= now.getTime()) {
        if (flown) { m.flown++; flownYtd++; if (r.status === 'failed') m.failed++; }
      } else if (r.status !== 'scrubbed') {
        m.scheduled++; scheduledRest++;
        if (d.getTime() <= in30.getTime()) {
          next30.push({
            id: r.id, name: r.name, mission: r.mission, launchDate: d.toISOString(), status: r.status,
            rocket: r.rocket, agency: r.agency, location: r.location,
          });
        }
      }
    }

    const lastScheduled = rows.filter((r) => r.launchDate!.getTime() > now.getTime() && r.status !== 'scrubbed').pop();
    return {
      asOf: now.toISOString(),
      year,
      months,
      flownYearToDate: flownYtd,
      scheduledRestOfYear: scheduledRest,
      next30Days: next30.slice(0, 40),
      nextLaunch: next30[0] ?? null,
      horizonMonth: lastScheduled ? lastScheduled.launchDate!.getUTCMonth() : null,
    };
  } catch {
    return null;
  }
}, ['launch-calendar'], { revalidate: 600 });
