// Company-profile claim outreach campaign tool.
//
// Modes (via argv):
//   npx tsx scripts/claim-outreach.ts --list            Print the campaign plan (default; sends nothing)
//   npx tsx scripts/claim-outreach.ts --preview <slug>  Print the rendered email for one company (sends nothing)
//   npx tsx scripts/claim-outreach.ts --send-batch <n>  SEND real email to the first n companies that have a
//                                                       recorded contactEmail, via Resend, 1 email / 2 seconds.
//                                                       Refuses to run unless CONFIRM_OUTREACH=yes is set.
//
// IMPORTANT: CompanyProfile.contactEmail is only populated when a company
// claims its profile (see src/app/api/company-profiles/[slug]/claim/route.ts),
// so unclaimed companies — the actual outreach targets — will typically have
// no recorded email. Use --list to see who is emailable today; contact
// discovery for the rest is a manual follow-up step (do NOT scrape emails).

import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';
import { generateClaimOutreachEmail } from '../src/lib/newsletter/claim-outreach-template';

const prisma = new PrismaClient();

const FROM_EMAIL = process.env.OUTREACH_FROM_EMAIL || 'Jay Griffiths at SpaceNexus <newsletter@spacenexus.us>';
const SEND_DELAY_MS = 2000; // 1 email / 2 seconds

interface CompanyRow {
  slug: string;
  name: string;
  website: string | null;
  tier: number;
  contactEmail: string | null;
  claimedByUserId: string | null;
}

async function fetchCompanies(): Promise<CompanyRow[]> {
  return prisma.companyProfile.findMany({
    select: {
      slug: true,
      name: true,
      website: true,
      tier: true,
      contactEmail: true,
      claimedByUserId: true,
    },
    orderBy: [{ tier: 'asc' }, { name: 'asc' }],
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function listCampaignPlan(): Promise<void> {
  const companies = await fetchCompanies();
  const withEmail = companies.filter((c) => !!c.contactEmail);
  const withoutEmail = companies.filter((c) => !c.contactEmail);
  const alreadyClaimed = companies.filter((c) => !!c.claimedByUserId);

  console.log('=== SpaceNexus company-profile claim outreach — campaign plan ===\n');
  console.log(`Total company profiles:            ${companies.length}`);
  console.log(`With recorded contact email:       ${withEmail.length}  (emailable today)`);
  console.log(`WITHOUT recorded contact email:    ${withoutEmail.length}  (contact discovery needed)`);
  console.log(`Already claimed (skip in outreach): ${alreadyClaimed.length}\n`);

  console.log('NOTE: CompanyProfile.contactEmail is only set when a company claims its');
  console.log('profile, so unclaimed targets generally have no email on record. No emails');
  console.log('are guessed or scraped by this tool — discover contacts manually.\n');

  if (withEmail.length > 0) {
    console.log('--- Companies WITH a recorded contact email ---');
    for (const c of withEmail) {
      const claimedFlag = c.claimedByUserId ? ' [ALREADY CLAIMED — exclude]' : '';
      console.log(`  T${c.tier}  ${c.slug}  |  ${c.name}  |  ${c.contactEmail}${claimedFlag}`);
    }
    console.log('');
  }

  console.log('--- Companies WITHOUT a recorded contact email (name | slug | website | tier) ---');
  for (const c of withoutEmail) {
    console.log(`  T${c.tier}  ${c.name}  |  ${c.slug}  |  ${c.website || '(no website on record)'}`);
  }

  console.log('\nNext steps:');
  console.log('  1. Discover contact emails for the companies above (manual research — no scraping).');
  console.log('  2. Preview the email:   npx tsx scripts/claim-outreach.ts --preview <slug>');
  console.log('  3. Send (guarded):      CONFIRM_OUTREACH=yes npx tsx scripts/claim-outreach.ts --send-batch <n>');
}

async function previewEmail(slug: string): Promise<void> {
  const company = await prisma.companyProfile.findUnique({
    where: { slug },
    select: { slug: true, name: true, contactEmail: true },
  });
  if (!company) {
    console.error(`No CompanyProfile found with slug "${slug}"`);
    process.exitCode = 1;
    return;
  }

  const email = generateClaimOutreachEmail({ companyName: company.name, slug: company.slug });
  console.log('=== Preview (nothing sent) ===\n');
  console.log(`To:      ${company.contactEmail || '(no contact email on record)'}`);
  console.log(`From:    ${FROM_EMAIL}`);
  console.log(`Subject: ${email.subject}\n`);
  console.log('--- text ---\n');
  console.log(email.text);
  console.log('\n--- html ---\n');
  console.log(email.html);
}

async function sendBatch(n: number): Promise<void> {
  console.log('*** WARNING: --send-batch sends REAL email to EXTERNAL company contacts. ***\n');

  if (process.env.CONFIRM_OUTREACH !== 'yes') {
    console.error('Refusing to send: set CONFIRM_OUTREACH=yes to confirm you intend to send real');
    console.error('external email. Example:');
    console.error('  CONFIRM_OUTREACH=yes npx tsx scripts/claim-outreach.ts --send-batch 5');
    process.exitCode = 1;
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('Refusing to send: RESEND_API_KEY environment variable is not set.');
    process.exitCode = 1;
    return;
  }

  if (!Number.isInteger(n) || n <= 0) {
    console.error(`Invalid batch size "${n}". Pass a positive integer, e.g. --send-batch 5`);
    process.exitCode = 1;
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const companies = await fetchCompanies();
  // Only companies with a recorded contact email, and skip already-claimed
  // profiles — no point inviting a company to claim what it already owns.
  const targets = companies.filter((c) => !!c.contactEmail && !c.claimedByUserId).slice(0, n);

  if (targets.length === 0) {
    console.log('No unclaimed companies with a recorded contact email — nothing to send.');
    return;
  }

  console.log(`Sending to ${targets.length} compan${targets.length === 1 ? 'y' : 'ies'} at 1 email / ${SEND_DELAY_MS / 1000}s...\n`);

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < targets.length; i++) {
    const c = targets[i];
    const email = generateClaimOutreachEmail({ companyName: c.name, slug: c.slug });
    try {
      const result = await resend.emails.send({
        from: FROM_EMAIL,
        to: c.contactEmail as string,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
      if (result.error) {
        failed++;
        console.error(`  [${i + 1}/${targets.length}] FAILED  ${c.slug} -> ${c.contactEmail}: ${result.error.message}`);
      } else {
        sent++;
        console.log(`  [${i + 1}/${targets.length}] SENT    ${c.slug} -> ${c.contactEmail} (id: ${result.data?.id ?? 'unknown'})`);
      }
    } catch (err) {
      failed++;
      console.error(`  [${i + 1}/${targets.length}] FAILED  ${c.slug} -> ${c.contactEmail}: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (i < targets.length - 1) {
      await sleep(SEND_DELAY_MS);
    }
  }

  console.log(`\nDone. Sent: ${sent}, Failed: ${failed}.`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const mode = args[0] || '--list';

  try {
    if (mode === '--list') {
      await listCampaignPlan();
    } else if (mode === '--preview') {
      const slug = args[1];
      if (!slug) {
        console.error('Usage: npx tsx scripts/claim-outreach.ts --preview <slug>');
        process.exitCode = 1;
        return;
      }
      await previewEmail(slug);
    } else if (mode === '--send-batch') {
      const n = Number(args[1]);
      await sendBatch(n);
    } else {
      console.error(`Unknown mode "${mode}". Use --list, --preview <slug>, or --send-batch <n>.`);
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
