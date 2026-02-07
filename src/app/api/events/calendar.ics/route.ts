import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { internalError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * Escape special characters for iCalendar text fields.
 * Per RFC 5545, commas, semicolons, and backslashes must be escaped,
 * and newlines must be converted to literal \n.
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n/g, '\\n')
    .replace(/\r/g, '\\n')
    .replace(/\n/g, '\\n');
}

/**
 * Format a Date object to iCalendar datetime format: YYYYMMDDTHHMMSSZ
 */
function formatICalDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * GET /api/events/calendar.ics
 *
 * Returns upcoming space events as an iCalendar (.ics) file suitable
 * for importing into Google Calendar, Apple Calendar, Outlook, etc.
 */
export async function GET() {
  try {
    const now = new Date();

    const events = await prisma.spaceEvent.findMany({
      where: {
        launchDate: { gte: now },
      },
      orderBy: { launchDate: 'asc' },
      take: 100,
    });

    const vevents = events
      .map((event) => {
        // Use launchDate as the start time; skip events without one
        if (!event.launchDate) return null;

        const dtstart = formatICalDate(event.launchDate);

        // Use windowEnd if available, otherwise default to 1 hour after start
        const endDate = event.windowEnd
          ? event.windowEnd
          : new Date(event.launchDate.getTime() + 60 * 60 * 1000);
        const dtend = formatICalDate(endDate);

        // Build a rich description from available fields
        const descriptionParts: string[] = [];
        if (event.description) {
          descriptionParts.push(event.description);
        }
        if (event.agency) {
          descriptionParts.push(`Agency: ${event.agency}`);
        }
        if (event.rocket) {
          descriptionParts.push(`Rocket: ${event.rocket}`);
        }
        if (event.mission) {
          descriptionParts.push(`Mission: ${event.mission}`);
        }
        if (event.type) {
          descriptionParts.push(`Type: ${event.type}`);
        }
        if (event.status) {
          descriptionParts.push(`Status: ${event.status}`);
        }
        if (event.infoUrl) {
          descriptionParts.push(`More info: ${event.infoUrl}`);
        }

        const description = descriptionParts.length > 0
          ? escapeICalText(descriptionParts.join('\n'))
          : '';

        const summary = escapeICalText(event.name);
        const location = event.location ? escapeICalText(event.location) : '';
        const uid = `${event.id}@spacenexus.com`;

        const lines = [
          'BEGIN:VEVENT',
          `DTSTART:${dtstart}`,
          `DTEND:${dtend}`,
          `SUMMARY:${summary}`,
        ];

        if (description) {
          lines.push(`DESCRIPTION:${description}`);
        }
        if (location) {
          lines.push(`LOCATION:${location}`);
        }

        lines.push(`UID:${uid}`);
        lines.push(`DTSTAMP:${formatICalDate(now)}`);
        lines.push('END:VEVENT');

        return lines.join('\r\n');
      })
      .filter(Boolean);

    const calendar = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SpaceNexus//Space Events//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:SpaceNexus Events',
      ...vevents,
      'END:VCALENDAR',
    ].join('\r\n');

    return new NextResponse(calendar, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="spacenexus-events.ics"',
      },
    });
  } catch (error) {
    console.error('Error generating calendar export:', error);
    return internalError('Failed to generate calendar export');
  }
}
