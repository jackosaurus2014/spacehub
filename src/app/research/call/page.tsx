import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getResearchAvailability, resolveResearchAccess } from '@/lib/research';
import {
  formatCallTime,
  getRegistration,
  getScheduledCall,
  listArchivedCalls,
} from '@/lib/research-call';
import { RESEARCH_RELEASES, latestPeriod } from '@/lib/research-releases';
import CallRegistrationClient from './CallRegistrationClient';

// The briefing-call page. force-dynamic: it reads the scheduled call and the
// caller's own authorization at request time.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'SpaceNexus Research — briefing call',
  description:
    'The live briefing call for SpaceNexus Research seat holders: the schedule, registration, the calendar invite and the archive of past calls.',
  // Never indexed: the page is for seat holders, and with no call scheduled
  // there is nothing here anyone should find in a search result.
  robots: { index: false, follow: false },
};

export default async function ResearchCallPage() {
  // Availability first. With RESEARCH_TIER_ENABLED off there is no product to
  // describe; middleware already redirects /research/*, and this is the
  // defence in depth behind it.
  if (!getResearchAvailability().available) redirect('/pricing');

  const session = await getServerSession(authOptions);
  const access = await resolveResearchAccess(session?.user?.id);

  const [call, archive] = await Promise.all([getScheduledCall(), listArchivedCalls(12)]);
  const registration =
    access.ok && call ? await getRegistration(call.id, session!.user!.id) : null;

  return (
    <div className="min-h-screen bg-slate-950">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6" aria-label="Breadcrumb">
          <Link href="/research" className="hover:text-white/80">
            SpaceNexus Research
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-400">Briefing call</span>
        </nav>

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400 mb-3">
          Seat holders
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">The briefing call</h1>
        <p className="text-slate-300 text-lg">
          A live walk through the quarter&rsquo;s releases with the person who builds them &mdash; what the
          numbers did, what the coverage limits mean in practice, and questions from the room.
        </p>

        {/* ---------------------------------------------------------------
            THE HONEST STATE. With no scheduled call this page says exactly
            that. It does not say "soon", it does not name a quarter, and it
            does not open a waiting list — a date nobody has committed to is a
            promise the site will not make.
        ---------------------------------------------------------------- */}
        {!call ? (
          <section aria-labelledby="unscheduled" className="mt-10">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 id="unscheduled" className="text-xl font-bold text-white mb-2">
                No call is scheduled
              </h2>
              <p className="text-slate-300 leading-relaxed">
                There is no date on the calendar right now, so there is nothing to register for. When a call
                is scheduled, this page shows the date and time in UTC, the agenda, a registration button and
                a calendar invite &mdash; and every seat holder gets an email.
              </p>
              <p className="text-sm text-slate-400 leading-relaxed mt-4">
                We would rather leave this page empty than advertise a date nobody has committed to hosting.
                Until then, everything the call would cover is already published and dated: the{' '}
                {RESEARCH_RELEASES.length} recurring releases on{' '}
                <Link href="/releases" className="text-cyan-400 underline hover:text-cyan-300">
                  the release calendar
                </Link>{' '}
                and the quarterly sector report in{' '}
                <Link href="/research/workspace" className="text-cyan-400 underline hover:text-cyan-300">
                  your workspace
                </Link>
                .
              </p>
            </div>
          </section>
        ) : (
          <section aria-labelledby="scheduled" className="mt-10">
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/[0.05] p-6">
              <h2 id="scheduled" className="text-xl font-bold text-white mb-1">
                {call.title}
              </h2>
              {call.periodLabel && (
                <p className="text-sm text-cyan-300 mb-3">Covering {call.periodLabel}</p>
              )}
              <p className="text-white text-lg font-semibold">
                <time dateTime={call.scheduledAt!}>{formatCallTime(call.scheduledAt!)}</time>
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {call.durationMinutes} minutes. Times are stated in UTC so nobody has to guess which timezone
                we meant.
              </p>

              {call.agenda.length > 0 && (
                <>
                  <h3 className="text-sm uppercase tracking-[0.12em] text-slate-400 font-semibold mt-6 mb-2">
                    Agenda
                  </h3>
                  <ul className="space-y-1.5">
                    {call.agenda.map((item) => (
                      <li key={item} className="text-sm text-slate-300 flex gap-2 leading-relaxed">
                        <span aria-hidden="true" className="text-slate-600">
                          &bull;
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="mt-6">
              {access.ok ? (
                <CallRegistrationClient
                  callId={call.id}
                  initiallyRegistered={!!registration}
                  inviteUrl={`/api/research/call/${call.id}/invite.ics`}
                />
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-white font-semibold mb-1">Registration is for seat holders</p>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    The call is included with a SpaceNexus Research seat.{' '}
                    <Link href="/research" className="text-cyan-400 underline hover:text-cyan-300">
                      What a seat covers
                    </Link>
                    .
                  </p>
                </div>
              )}
            </div>

            {registration && call.joinUrl && (
              <p className="text-sm text-slate-400 mt-4">
                Joining link:{' '}
                <a href={call.joinUrl} className="text-cyan-400 underline hover:text-cyan-300">
                  {call.joinUrl}
                </a>
              </p>
            )}
          </section>
        )}

        {/* --------------------------- Archive --------------------------- */}
        <section aria-labelledby="archive" className="mt-14">
          <h2 id="archive" className="text-xl font-bold text-white mb-3">
            Past calls
          </h2>
          {archive.length === 0 ? (
            <p className="text-sm text-slate-400 rounded-xl border border-white/10 bg-white/[0.02] p-4 leading-relaxed">
              No calls have been held yet. Recordings, slides and a written summary are archived here after
              each one, so a seat holder who could not attend loses nothing.
            </p>
          ) : (
            <ul className="space-y-4">
              {archive.map((c) => (
                <li key={c.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                  <h3 className="text-white font-semibold">{c.title}</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    {c.heldAt ? (
                      <time dateTime={c.heldAt}>{c.heldAt.slice(0, 10)}</time>
                    ) : c.scheduledAt ? (
                      <time dateTime={c.scheduledAt}>{c.scheduledAt.slice(0, 10)}</time>
                    ) : (
                      'Date not recorded'
                    )}
                    {c.periodLabel ? ` · ${c.periodLabel}` : ''}
                  </p>
                  {c.summary && (
                    <p className="text-sm text-slate-300 mt-3 leading-relaxed">{c.summary}</p>
                  )}
                  <div className="flex flex-wrap gap-4 mt-3 text-sm">
                    {c.recordingUrl && (
                      <a href={c.recordingUrl} className="text-cyan-400 underline hover:text-cyan-300">
                        Recording
                      </a>
                    )}
                    {c.slidesUrl && (
                      <a href={c.slidesUrl} className="text-cyan-400 underline hover:text-cyan-300">
                        Slides
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="what-else" className="mt-14">
          <h2 id="what-else" className="text-xl font-bold text-white mb-3">
            What gets discussed
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            The recurring releases, in the state they are in that quarter. Nothing discussed on a call is a
            figure you cannot already check yourself &mdash; each release states its method and its coverage
            limits, and every number is computed from our own rows.
          </p>
          <ul className="mt-4 space-y-2">
            {RESEARCH_RELEASES.map((r) => (
              <li key={r.id} className="text-sm">
                <Link href={r.href(latestPeriod(r))} className="text-cyan-400 hover:text-cyan-300">
                  {r.title}
                </Link>
                <span className="text-slate-500"> &middot; {r.cadence}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
