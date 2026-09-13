// SpaceNexus AM — web archive reads (2026-09-12). Backs /brief/am (last 30
// issues) and /brief/am/[date]. Only issues that actually went out (status
// 'sent') are public; withheld drafts stay on the ledger for the founder.

import { unstable_cache } from 'next/cache';
import prisma from '@/lib/db';
import type { MorningBriefIssue } from './types';

export const ARCHIVE_REVALIDATE_SECONDS = 1800;
export const ARCHIVE_INDEX_SIZE = 30;

export interface ArchiveSummary {
  date: string;
  subject: string;
  preheader: string;
  storyCount: number;
}

export interface ArchiveIssue {
  date: string;
  subject: string;
  preheader: string;
  issue: MorningBriefIssue;
  sentAt: string;
  prev: string | null;
  next: string | null;
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseIssue(raw: string | null): MorningBriefIssue | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as MorningBriefIssue;
    return Array.isArray(parsed?.stories) ? parsed : null;
  } catch {
    return null;
  }
}

/** Newest first, sent issues only, capped at ARCHIVE_INDEX_SIZE. */
export const listArchiveIssues = unstable_cache(async (): Promise<ArchiveSummary[]> => {
  try {
    const rows = await prisma.morningBrief.findMany({
      where: { status: 'sent', issue: { not: null } },
      orderBy: { date: 'desc' },
      take: ARCHIVE_INDEX_SIZE,
      select: { date: true, subject: true, preheader: true, issue: true },
    });
    return rows.map((r) => ({
      date: r.date,
      subject: r.subject ?? `SpaceNexus AM, ${r.date}`,
      preheader: r.preheader ?? '',
      storyCount: parseIssue(r.issue)?.stories.length ?? 0,
    }));
  } catch {
    return [];
  }
}, ['morning-brief-archive-index'], { revalidate: ARCHIVE_REVALIDATE_SECONDS });

export async function getArchiveIssue(date: string): Promise<ArchiveIssue | null> {
  if (!DATE_RE.test(date)) return null;
  try {
    const row = await prisma.morningBrief.findUnique({
      where: { date },
      select: { date: true, status: true, subject: true, preheader: true, issue: true, updatedAt: true },
    });
    if (!row || row.status !== 'sent') return null;
    const issue = parseIssue(row.issue);
    if (!issue) return null;
    const [prev, next] = await Promise.all([
      prisma.morningBrief.findFirst({ where: { status: 'sent', issue: { not: null }, date: { lt: date } }, orderBy: { date: 'desc' }, select: { date: true } }),
      prisma.morningBrief.findFirst({ where: { status: 'sent', issue: { not: null }, date: { gt: date } }, orderBy: { date: 'asc' }, select: { date: true } }),
    ]);
    return {
      date: row.date,
      subject: row.subject ?? issue.subject,
      preheader: row.preheader ?? issue.preheader,
      issue,
      sentAt: row.updatedAt.toISOString(),
      prev: prev?.date ?? null,
      next: next?.date ?? null,
    };
  } catch {
    return null;
  }
}

/** Dates for the sitemap (sent issues, newest first, capped). */
export async function listArchiveDates(limit = ARCHIVE_INDEX_SIZE): Promise<Array<{ date: string; updatedAt: Date }>> {
  const rows = await prisma.morningBrief.findMany({
    where: { status: 'sent', issue: { not: null } },
    orderBy: { date: 'desc' },
    take: limit,
    select: { date: true, updatedAt: true },
  });
  return rows;
}

export function fmtIssueDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}
