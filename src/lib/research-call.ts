/**
 * The quarterly briefing call — infrastructure only.
 *
 * The competitor's strongest retention device is a quarterly market-trends
 * call, and it is strong precisely because a human hosts it. We can build the
 * scheduling, the registration, the calendar invite and the archive; we cannot
 * build the host. So this module schedules NOTHING on its own.
 *
 * THE RULE THAT SHAPES EVERY FUNCTION HERE
 * ----------------------------------------
 * An unscheduled call is the ABSENCE of a ResearchCall row. There is no
 * placeholder row, no "TBD" date, no "coming soon" copy anywhere in this
 * subsystem, and researchCallCapability() returns null until a real scheduled
 * row exists — so /research literally cannot advertise a call the founder has
 * not scheduled. That is the pricing-truth rule (src/lib/research.ts) applied
 * to an event: the site promises only what the code can deliver, and here the
 * code can deliver only what is in the database.
 *
 * WHAT THE FOUNDER MUST SUPPLY
 * ----------------------------
 *   1. A date and time (UTC) and a join URL — POST /api/admin/research-call.
 *   2. The host. Nobody else can do this part.
 *   3. After the call: a recording URL and/or slides URL, which is what turns
 *      the row into an archive entry.
 * Everything else — registration, the .ics invite, the attendee list, the
 * archive page — is already built and waits for step 1.
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { RESEARCH_PLAN, type ResearchAccess, type ResearchCapability } from '@/lib/research';

export interface ResearchCallRecord {
  id: string;
  status: string;
  title: string;
  periodLabel: string | null;
  /** ISO, or null. Null means nothing about timing may be rendered. */
  scheduledAt: string | null;
  durationMinutes: number;
  /** Never rendered to a non-registered visitor. */
  joinUrl: string | null;
  agenda: string[];
  recordingUrl: string | null;
  slidesUrl: string | null;
  summary: string | null;
  heldAt: string | null;
}

const SELECT = {
  id: true,
  status: true,
  title: true,
  periodLabel: true,
  scheduledAt: true,
  durationMinutes: true,
  joinUrl: true,
  agenda: true,
  recordingUrl: true,
  slidesUrl: true,
  summary: true,
  heldAt: true,
} as const;

function toRecord(row: {
  id: string;
  status: string;
  title: string;
  periodLabel: string | null;
  scheduledAt: Date | null;
  durationMinutes: number;
  joinUrl: string | null;
  agenda: unknown;
  recordingUrl: string | null;
  slidesUrl: string | null;
  summary: string | null;
  heldAt: Date | null;
}): ResearchCallRecord {
  return {
    id: row.id,
    status: row.status,
    title: row.title,
    periodLabel: row.periodLabel,
    scheduledAt: row.scheduledAt ? row.scheduledAt.toISOString() : null,
    durationMinutes: row.durationMinutes,
    joinUrl: row.joinUrl,
    agenda: Array.isArray(row.agenda) ? (row.agenda as string[]) : [],
    recordingUrl: row.recordingUrl,
    slidesUrl: row.slidesUrl,
    summary: row.summary,
    heldAt: row.heldAt ? row.heldAt.toISOString() : null,
  };
}

/**
 * The next call, or null.
 *
 * Null is the normal state and the page must render it as "no call is
 * scheduled" — never as "soon", "shortly" or a guessed quarter.
 */
export async function getScheduledCall(now: Date = new Date()): Promise<ResearchCallRecord | null> {
  try {
    const row = await prisma.researchCall.findFirst({
      where: {
        status: 'scheduled',
        canceledAt: null,
        scheduledAt: { gte: new Date(now.getTime() - 3 * 60 * 60 * 1000) },
      },
      orderBy: { scheduledAt: 'asc' },
      select: SELECT,
    });
    return row ? toRecord(row) : null;
  } catch (error) {
    logger.error('Scheduled call read failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Calls that have happened AND left something behind. A held call with no
 * recording, slides or summary is not an archive entry — it is a date nobody
 * can use — so it is not listed.
 */
export async function listArchivedCalls(take = 12): Promise<ResearchCallRecord[]> {
  try {
    const rows = await prisma.researchCall.findMany({
      where: {
        status: 'held',
        OR: [
          { recordingUrl: { not: null } },
          { slidesUrl: { not: null } },
          { summary: { not: null } },
        ],
      },
      orderBy: [{ heldAt: 'desc' }, { scheduledAt: 'desc' }],
      take,
      select: SELECT,
    });
    return rows.map(toRecord);
  } catch (error) {
    logger.error('Call archive read failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

export async function getCallById(id: string): Promise<ResearchCallRecord | null> {
  try {
    const row = await prisma.researchCall.findUnique({ where: { id }, select: SELECT });
    return row ? toRecord(row) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export interface CallRegistration {
  id: string;
  callId: string;
  userId: string;
  email: string;
  name: string | null;
  question: string | null;
  createdAt: string;
}

export async function getRegistration(
  callId: string,
  userId: string
): Promise<CallRegistration | null> {
  try {
    const row = await prisma.researchCallRegistration.findUnique({
      where: { callId_userId: { callId, userId } },
      select: {
        id: true,
        callId: true,
        userId: true,
        email: true,
        name: true,
        question: true,
        canceledAt: true,
        createdAt: true,
      },
    });
    if (!row || row.canceledAt) return null;
    return {
      id: row.id,
      callId: row.callId,
      userId: row.userId,
      email: row.email,
      name: row.name,
      question: row.question,
      createdAt: row.createdAt.toISOString(),
    };
  } catch (error) {
    logger.error('Call registration read failed', {
      callId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Register a Research seat holder. `access` comes from the route's
 * requireResearchAccess gate, so ownerUserId is recorded from the authorization
 * that actually happened rather than from anything the client sent.
 */
export async function registerForCall(params: {
  callId: string;
  userId: string;
  access: ResearchAccess;
  email: string;
  name?: string | null;
  question?: string | null;
}): Promise<CallRegistration | null> {
  const question = (params.question ?? '').trim().slice(0, 1000) || null;
  const name = (params.name ?? '').trim().slice(0, 200) || null;
  try {
    const row = await prisma.researchCallRegistration.upsert({
      where: { callId_userId: { callId: params.callId, userId: params.userId } },
      update: {
        email: params.email,
        name,
        question,
        ownerUserId: params.access.ownerUserId,
        canceledAt: null,
      },
      create: {
        callId: params.callId,
        userId: params.userId,
        ownerUserId: params.access.ownerUserId,
        email: params.email,
        name,
        question,
      },
      select: {
        id: true,
        callId: true,
        userId: true,
        email: true,
        name: true,
        question: true,
        createdAt: true,
      },
    });
    return { ...row, createdAt: row.createdAt.toISOString() };
  } catch (error) {
    logger.error('Call registration write failed', {
      callId: params.callId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function cancelRegistration(callId: string, userId: string): Promise<boolean> {
  try {
    await prisma.researchCallRegistration.updateMany({
      where: { callId, userId, canceledAt: null },
      data: { canceledAt: new Date() },
    });
    return true;
  } catch (error) {
    logger.error('Call registration cancel failed', {
      callId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function countRegistrations(callId: string): Promise<number> {
  try {
    return await prisma.researchCallRegistration.count({
      where: { callId, canceledAt: null },
    });
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// The calendar invite
// ---------------------------------------------------------------------------

function icsEscape(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function icsStamp(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
}

/** RFC 5545 line folding at 75 octets, which Outlook actually enforces. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  if (rest.length) parts.push(` ${rest}`);
  return parts.join('\r\n');
}

/**
 * A VCALENDAR for one scheduled call. Returns null when the call has no date —
 * an invite to an unscheduled event is exactly the promise this subsystem
 * refuses to make.
 *
 * The join URL is included in the body, so this file is only ever served to a
 * registered subscriber behind requireResearchAccess.
 */
export function buildCallIcs(call: ResearchCallRecord, now: Date = new Date()): string | null {
  if (!call.scheduledAt) return null;
  const start = new Date(call.scheduledAt);
  const end = new Date(start.getTime() + call.durationMinutes * 60_000);

  const descriptionParts = [
    call.periodLabel ? `${call.title} — ${call.periodLabel}.` : call.title,
    call.agenda.length ? `Agenda: ${call.agenda.join(' / ')}` : '',
    call.joinUrl ? `Join: ${call.joinUrl}` : '',
    'Every figure discussed is computed from SpaceNexus data. Registration: https://spacenexus.us/research/call',
  ].filter(Boolean);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SpaceNexus//Research Briefing Call//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:research-call-${call.id}@spacenexus.us`,
    `DTSTAMP:${icsStamp(now)}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${icsEscape(call.title)}`,
    `DESCRIPTION:${icsEscape(descriptionParts.join('\n'))}`,
    call.joinUrl ? `URL:${icsEscape(call.joinUrl)}` : 'URL:https://spacenexus.us/research/call',
    call.joinUrl ? `LOCATION:${icsEscape(call.joinUrl)}` : 'LOCATION:Online',
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:SpaceNexus Research briefing call starts in 15 minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

// ---------------------------------------------------------------------------
// The advertised capability — present only when a call actually exists
// ---------------------------------------------------------------------------

/**
 * The Research capability row for the call, or null.
 *
 * This is deliberately NOT a member of RESEARCH_CAPABILITIES. That array is
 * static and would advertise a quarterly call from the moment it was written,
 * which is a promise nobody had made. Instead /research composes its bullet
 * list from RESEARCH_CAPABILITIES plus whatever this returns, so the claim
 * appears exactly when a scheduled call exists and disappears the moment it
 * does not. Self-enforcing pricing truth: there is no const for a human to
 * forget to flip.
 */
export function researchCallCapability(
  call: ResearchCallRecord | null
): ResearchCapability | null {
  if (!call || !call.scheduledAt) return null;
  const when = new Date(call.scheduledAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return {
    id: 'briefing-call',
    label: 'Live briefing call',
    detail: `${call.title} on ${when}, hosted live for seat holders, with a calendar invite and the recording and slides archived afterwards. Included for all ${RESEARCH_PLAN.totalSeats} seats.`,
    accessFlag: 'hasQuarterlyReport',
    enforcedBy: 'src/app/api/research/call/register/route.ts',
  };
}

/** Human date for the page, UTC, never localised to a guessed timezone. */
export function formatCallTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })}, ${d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  })} UTC`;
}
