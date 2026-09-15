import Link from 'next/link';
import { latestPeriod, periodLabel, RELEASE_STATUS_LABEL } from '@/lib/research-releases';
import type { ReleaseDueState } from '@/lib/research-releases';

/**
 * The release calendar, rendered.
 *
 * Shared by /releases (the franchise hub) and /reports (the reports hub) so the
 * two cannot drift apart about what is published and what is late.
 *
 * The status column is the load-bearing part: a franchise that quietly stops
 * publishing is worse than one that never started, so an edition past its due
 * date reads OVERDUE here, in public, with the number of days.
 */
export default function ReleaseCalendarTable({ calendar }: { calendar: ReleaseDueState[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="min-w-full border-collapse text-sm">
        <caption className="sr-only">
          SpaceNexus recurring releases, their cadence, latest edition and publication status.
        </caption>
        <thead>
          <tr className="text-left text-slate-400 bg-white/[0.03]">
            <th scope="col" className="py-2.5 px-3 font-medium">
              Release
            </th>
            <th scope="col" className="py-2.5 px-3 font-medium whitespace-nowrap">
              Cadence
            </th>
            <th scope="col" className="py-2.5 px-3 font-medium whitespace-nowrap">
              Latest edition
            </th>
            <th scope="col" className="py-2.5 px-3 font-medium whitespace-nowrap">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {calendar.map((state) => {
            const period = latestPeriod(state.release);
            return (
              <tr key={state.release.id} className="border-t border-white/[0.07] align-top">
                <th scope="row" className="py-3 px-3 text-left font-normal">
                  <Link
                    href={state.release.href(period)}
                    className="text-white font-medium hover:text-cyan-300"
                  >
                    {state.release.title}
                  </Link>
                  <span className="block text-slate-400 mt-1 leading-relaxed max-w-xl">
                    {state.release.summary}
                  </span>
                </th>
                <td className="py-3 px-3 text-slate-300 capitalize whitespace-nowrap">
                  {state.release.cadence}
                </td>
                <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                  {periodLabel(state.release.cadence, period)}
                </td>
                <td className="py-3 px-3 whitespace-nowrap">
                  {/* Never colour alone: the word says it, the colour reinforces it. */}
                  <span
                    className={
                      state.status === 'overdue' ? 'text-amber-300 font-medium' : 'text-slate-400'
                    }
                  >
                    {RELEASE_STATUS_LABEL[state.status]}
                    {state.status === 'overdue' && ` · ${state.daysLate}d late`}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
