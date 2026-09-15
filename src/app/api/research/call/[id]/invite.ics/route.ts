import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notFoundError } from '@/lib/errors';
import { requireResearchAccess } from '@/lib/research-guard';
import { buildCallIcs, getCallById } from '@/lib/research-call';

export const dynamic = 'force-dynamic';

/**
 * The calendar invite for one briefing call.
 *
 * GATE: requireResearchAccess. The file carries the join URL, so it is served
 * only to a seat holder — never to an anonymous visitor, and never linked from
 * a public page.
 *
 * Returns 404 when the call has no date. There is no version of this file that
 * describes an unscheduled event.
 */
export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const session = await getServerSession(authOptions);
  const gate = await requireResearchAccess(session?.user?.id);
  if ('error' in gate) return gate.error;

  const call = await getCallById(id);
  if (!call) return notFoundError('No such call.');

  const ics = buildCallIcs(call);
  if (!ics) return notFoundError('That call has no scheduled date yet.');

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="spacenexus-research-call-${id}.ics"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
