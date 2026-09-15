/**
 * @jest-environment node
 */

/**
 * The quarterly briefing call — the guards that keep an unscheduled event from
 * becoming an advertised one.
 *
 * THE RULE: an unscheduled call is the ABSENCE of a row. There is no
 * placeholder, no "TBD" date and no "coming soon". researchCallCapability()
 * returns a bullet for /research only while a scheduled call exists, so the
 * marketing claim appears exactly when the product does — the pricing-truth
 * rule (src/lib/research.ts) applied to an event.
 *
 * The .ics is pinned too: a calendar file is the one artefact that leaves our
 * site and lands in somebody's calendar, so a malformed or unescaped one is a
 * support ticket we cannot see.
 */

import fs from 'fs';
import path from 'path';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    researchCall: { findFirst: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    researchCallRegistration: { findUnique: jest.fn(), upsert: jest.fn(), count: jest.fn() },
  },
}));

import {
  buildCallIcs,
  formatCallTime,
  researchCallCapability,
  type ResearchCallRecord,
} from '../research-call';
import { RESEARCH_CAPABILITIES } from '../research';

const SCHEDULED: ResearchCallRecord = {
  id: 'call_1',
  status: 'scheduled',
  title: 'SpaceNexus Research briefing — Q3 2026',
  periodLabel: 'Q3 2026',
  scheduledAt: '2026-10-15T15:00:00.000Z',
  durationMinutes: 45,
  joinUrl: 'https://meet.example.com/spacenexus-q3',
  agenda: ['Funding by sector', 'Launch cadence, and what the slip ledger shows'],
  recordingUrl: null,
  slidesUrl: null,
  summary: null,
  heldAt: null,
};

// ---------------------------------------------------------------------------
// 1. Nothing advertises a call that has not been scheduled
// ---------------------------------------------------------------------------

describe('the call is never advertised before it is scheduled', () => {
  it('offers no capability bullet when no call exists', () => {
    expect(researchCallCapability(null)).toBeNull();
  });

  it('offers no capability bullet for a call with no date', () => {
    expect(researchCallCapability({ ...SCHEDULED, scheduledAt: null })).toBeNull();
  });

  it('offers one the moment a call has a real date, naming that date', () => {
    const cap = researchCallCapability(SCHEDULED)!;
    expect(cap).not.toBeNull();
    expect(cap.id).toBe('briefing-call');
    expect(cap.detail).toContain('October 15, 2026');
    expect(cap.enforcedBy).toBe('src/app/api/research/call/register/route.ts');
  });

  it('the file it names exists and calls the server-side guard', () => {
    const cap = researchCallCapability(SCHEDULED)!;
    const full = path.join(process.cwd(), cap.enforcedBy);
    expect(fs.existsSync(full)).toBe(true);
    expect(fs.readFileSync(full, 'utf-8')).toContain('requireResearchAccess');
  });

  it('is NOT a member of the static advertised list — that is the whole point', () => {
    // A static entry would advertise a quarterly call from the moment the
    // array was written, which is a promise nobody had made.
    for (const cap of RESEARCH_CAPABILITIES) {
      expect(cap.id).not.toBe('briefing-call');
      expect(cap.label.toLowerCase()).not.toContain('call');
      expect(cap.detail.toLowerCase()).not.toContain('briefing call');
    }
  });

  it('the call page states the unscheduled case plainly and promises no date', () => {
    const page = fs.readFileSync(
      path.join(process.cwd(), 'src/app/research/call/page.tsx'),
      'utf-8'
    );
    expect(page).toContain('No call is scheduled');
    // No hedged promise of a date anywhere on the page.
    expect(page).not.toMatch(/coming soon/i);
    expect(page).not.toMatch(/\bTBD\b/);
    expect(page).not.toMatch(/every quarter starting/i);
  });

  it('only the admin route can bring a call into existence', () => {
    const admin = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/admin/research-call/route.ts'),
      'utf-8'
    );
    expect(admin).toContain('researchCall.create');
    expect(admin).toContain('isAdmin');

    // The registration route must never create one.
    const register = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/research/call/register/route.ts'),
      'utf-8'
    );
    expect(register).not.toContain('researchCall.create');
  });
});

// ---------------------------------------------------------------------------
// 2. The calendar invite
// ---------------------------------------------------------------------------

describe('the calendar invite', () => {
  it('refuses to describe an event with no date', () => {
    expect(buildCallIcs({ ...SCHEDULED, scheduledAt: null })).toBeNull();
  });

  it('is a well-formed VCALENDAR with CRLF line endings', () => {
    const ics = buildCallIcs(SCHEDULED, new Date('2026-09-14T00:00:00Z'))!;
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics).toContain('\r\n');
    expect(ics.split('\r\n').every((l) => !l.endsWith('\r'))).toBe(true);
  });

  it('stamps start and end in UTC, honouring the duration', () => {
    const ics = buildCallIcs(SCHEDULED, new Date('2026-09-14T00:00:00Z'))!;
    expect(ics).toContain('DTSTART:20261015T150000Z');
    expect(ics).toContain('DTEND:20261015T154500Z');
    expect(ics).toContain('DTSTAMP:20260914T000000Z');
  });

  it('gives the event a stable UID so a re-download updates rather than duplicates', () => {
    const a = buildCallIcs(SCHEDULED, new Date('2026-09-14T00:00:00Z'))!;
    const b = buildCallIcs(SCHEDULED, new Date('2026-09-20T00:00:00Z'))!;
    expect(a).toContain('UID:research-call-call_1@spacenexus.us');
    expect(b).toContain('UID:research-call-call_1@spacenexus.us');
  });

  it('escapes the characters that would break a calendar parser', () => {
    const ics = buildCallIcs(
      {
        ...SCHEDULED,
        title: 'Briefing; Q3, 2026 \\ notes',
        agenda: ['Line one\nline two'],
      },
      new Date('2026-09-14T00:00:00Z')
    )!;
    expect(ics).toContain('SUMMARY:Briefing\\; Q3\\, 2026 \\\\ notes');
    // Unfold first: RFC 5545 breaks long lines with CRLF + a leading space, so
    // the escaped newline can land either side of a fold.
    const unfolded = ics.replace(/\r\n /g, '');
    expect(unfolded).toContain('\\nline two');
  });

  it('folds long lines at 75 octets, which Outlook enforces', () => {
    const ics = buildCallIcs(
      { ...SCHEDULED, agenda: ['x'.repeat(400)] },
      new Date('2026-09-14T00:00:00Z')
    )!;
    for (const line of ics.split('\r\n')) {
      expect(line.length).toBeLessThanOrEqual(76);
    }
  });

  it('carries the join URL, which is why it is served only behind the gate', () => {
    const ics = buildCallIcs(SCHEDULED, new Date('2026-09-14T00:00:00Z'))!;
    expect(ics).toContain(SCHEDULED.joinUrl!);
    const route = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/research/call/[id]/invite.ics/route.ts'),
      'utf-8'
    );
    expect(route).toContain('requireResearchAccess');
  });
});

// ---------------------------------------------------------------------------
// 3. Times are stated, never guessed
// ---------------------------------------------------------------------------

describe('call times', () => {
  it('always names the timezone rather than leaving the reader to guess', () => {
    const formatted = formatCallTime('2026-10-15T15:00:00.000Z');
    expect(formatted).toContain('UTC');
    expect(formatted).toContain('October 15, 2026');
    expect(formatted).toContain('15:00');
  });
});
