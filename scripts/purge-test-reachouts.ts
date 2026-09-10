/**
 * Purge obvious TEST submissions from the inbound reachout channels
 * (2026-09-10). The reachout sentinel has reported 12 open entries for
 * months, the oldest 216 days, all left by QA runs ("Test Space Corp",
 * "@example.com", "test@test", "QA …"). Real reachouts are never touched:
 * a row is only a candidate when its name/company/email/subject matches
 * the test patterns below.
 *
 * Dry run (default) lists candidates; `--apply` deletes them.
 *   railway ssh -s spacehub -- npx tsx scripts/purge-test-reachouts.ts
 *   railway ssh -s spacehub -- npx tsx scripts/purge-test-reachouts.ts --apply
 */
import prisma from '../src/lib/db';

const APPLY = process.argv.includes('--apply');
const TEST_RE = /(^|\b)(test|qa|dummy|sample|example|asdf|foo|bar|lorem)(\b|$)|@example\.(com|org)|@test\.|@spacenexus\.internal|@mailinator\./i;

interface Channel { model: string; fields: string[]; label: string }
const CHANNELS: Channel[] = [
  { model: 'contactSubmission', label: 'Contact form', fields: ['name', 'email', 'subject', 'message'] },
  { model: 'feedbackSubmission', label: 'Feedback', fields: ['email', 'category', 'message'] },
  { model: 'helpRequest', label: 'Help requests', fields: ['email', 'subject', 'details'] },
  { model: 'featureRequest', label: 'Feature requests', fields: ['email', 'title', 'details'] },
  { model: 'companyAddRequest', label: 'Company add requests', fields: ['companyName', 'submitterEmail', 'website', 'description'] },
  { model: 'serviceProviderSubmission', label: 'Service provider submissions', fields: ['businessName', 'contactName', 'email', 'website', 'description'] },
  { model: 'meetingRequest', label: 'Meeting requests', fields: ['visitorName', 'visitorEmail', 'visitorCompany', 'message'] },
  { model: 'interestExpression', label: 'Interest expressions', fields: ['contactEmail', 'message'] },
  { model: 'contentReport', label: 'Content reports', fields: ['reason', 'description'] },
  // introductionRequest / partnershipRequest carry only user/company ids + message: no identity text to match, left alone.
];

function pick(row: Record<string, unknown>, fields: string[]): string {
  return fields.map((f) => (typeof row[f] === 'string' ? (row[f] as string) : '')).filter(Boolean).join(' | ');
}

async function main() {
  let total = 0;
  for (const ch of CHANNELS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const delegate = (prisma as any)[ch.model];
    if (!delegate) { console.log(`- ${ch.label}: model ${ch.model} not in client, skipped`); continue; }
    let rows: Record<string, unknown>[] = [];
    try { rows = await delegate.findMany({ orderBy: { createdAt: 'asc' } }); } catch (e) { console.log(`- ${ch.label}: read failed (${(e as Error).message.slice(0, 80)})`); continue; }
    const candidates = rows.filter((r) => {
      const present = ch.fields.filter((f) => typeof r[f] === 'string');
      const text = pick(r, present);
      // Name/company/email-type fields decide; a "test" inside a long real message does not.
      const identity = pick(r, present.filter((f) => !/message|description|details|reason/.test(f)));
      return TEST_RE.test(identity) || /@example\.|@spacenexus\.internal|@test\./i.test(text);
    });
    console.log(`- ${ch.label}: ${rows.length} rows, ${candidates.length} test candidates`);
    for (const c of candidates) console.log(`    ${String(c.id).slice(0, 12)}  ${String(c.createdAt).slice(0, 10)}  ${pick(c, ch.fields).slice(0, 110)}`);
    if (APPLY && candidates.length) {
      const res = await delegate.deleteMany({ where: { id: { in: candidates.map((c) => c.id) } } });
      console.log(`    deleted ${res.count}`);
    }
    total += candidates.length;
  }
  console.log(APPLY ? `Deleted ${total} test reachouts.` : `Dry run: ${total} test candidates. Re-run with --apply to delete.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
