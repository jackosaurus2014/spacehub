/**
 * Jobs board + employer postings guard (2026-09-10).
 *
 * The board on /jobs, the salary band on every role, and the paid employer
 * posting flow are wired across six files; this pins the seams that would
 * fail silently: the webhook branch, featured-first ordering, expiry
 * filtering, the plan constant, and the salary estimator's behaviour.
 */
import fs from 'fs';
import path from 'path';
import { salaryBandFor, matchSalaryRole, formatBand } from '../salary-estimate';
import { JOB_POSTING_PLANS, JOB_POSTING_PAYMENT_KIND, getJobPostingPlan } from '../job-posting-plans';

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf-8');

describe('salary estimate', () => {
  it('uses the posting range when present', () => {
    const b = salaryBandFor({ title: 'Anything', salaryMin: 120000, salaryMax: 160000, salaryMedian: 140000 });
    expect(b).toEqual({ min: 120000, max: 160000, median: 140000, source: 'posting' });
  });
  it('estimates a propulsion engineer from the curated dataset, adjusted for seniority', () => {
    const mid = salaryBandFor({ title: 'Propulsion Engineer', category: 'engineering', seniorityLevel: 'mid', location: 'Hawthorne, CA' });
    const senior = salaryBandFor({ title: 'Senior Propulsion Engineer', category: 'engineering', seniorityLevel: 'senior', location: 'Hawthorne, CA' });
    expect(mid?.source).toBe('estimate');
    expect(mid?.basis).toMatch(/Propulsion/);
    expect(senior!.min).toBeGreaterThanOrEqual(mid!.min);
    expect(mid!.min % 5000).toBe(0);
    expect(formatBand(mid!)).toMatch(/^\$\d+k–\$\d+k$/);
  });
  it('returns null rather than a guess for an unmatchable title', () => {
    expect(matchSalaryRole('Barista')).toBeNull();
    expect(salaryBandFor({ title: 'Barista' })).toBeNull();
  });
});

describe('employer postings', () => {
  it('plans are priced and the constant is shared', () => {
    expect(JOB_POSTING_PLANS.map((p) => p.id)).toEqual(['standard', 'featured']);
    expect(getJobPostingPlan('featured')?.featured).toBe(true);
    expect(JOB_POSTING_PAYMENT_KIND).toBe('job_posting');
  });
  it('the Stripe webhook activates a paid posting', () => {
    const wh = read('src/app/api/stripe/webhooks/route.ts');
    expect(wh).toMatch(/session\.metadata\?\.kind === JOB_POSTING_PAYMENT_KIND/);
    expect(wh).toMatch(/async function handleJobPostingCompleted/);
    expect(wh).toMatch(/isActive: true,\s*postedDate: now,\s*paidAt: now,/);
  });
  it('the board pins featured rows and hides expired ones', () => {
    const api = read('src/app/api/jobs/search/route.ts');
    expect(api).toMatch(/\{ featured: 'desc' \}, \{ postedDate: 'desc' \}/);
    expect(api).toMatch(/expiresAt: \{ gt: new Date\(\) \}/);
    const schema = read('prisma/schema.prisma');
    for (const f of ['featured', 'featuredUntil', 'expiresAt', 'paidAt', 'postedByUserId', 'viewCount', 'applyClicks']) expect(schema).toMatch(new RegExp(`\\n  ${f}\\s`));
  });
  it('the posting route creates inactive rows and the job page counts views', () => {
    const post = read('src/app/api/jobs/post/route.ts');
    expect(post).toMatch(/isActive: false/);
    expect(post).toMatch(/mode: 'payment'/);
    const actions = read('src/components/jobs/JobActions.tsx');
    expect(actions).toMatch(/event: 'view'/);
    expect(actions).toMatch(/event: 'apply'/);
  });
});

describe('employer portal', () => {
  it('owner-only edit/remove routes and the pay-now/renew checkout exist', () => {
    const edit = read('src/app/api/jobs/[id]/route.ts');
    expect(edit).toMatch(/export async function PATCH/);
    expect(edit).toMatch(/export async function DELETE/);
    expect(edit).toMatch(/import \{ ownedJobPosting \} from '@\/lib\/job-posting-server'/);
    const checkout = read('src/app/api/jobs/[id]/checkout/route.ts');
    expect(checkout).toMatch(/renewal: row\.paidAt \? '1' : '0'/);
    const wh = read('src/app/api/stripe/webhooks/route.ts');
    expect(wh).toMatch(/existing\.paidAt && existing\.stripeSessionId === session\.id\) return;/);
    const portal = read('src/app/hire/dashboard/EmployerPortal.tsx');
    for (const action of ['Pause', 'Resume', 'Pay now', 'Renew as', 'Delete draft', 'Save changes', 'Upgrade to featured', 'Duplicate', 'Download CSV']) expect(portal).toContain(action);
  });
  it('ownership is shared with whoever claimed the company profile', () => {
    const lib = read('src/lib/job-posting-server.ts');
    expect(lib).toMatch(/companyProfile: \{ claimedByUserId: userId \}/);
    expect(read('src/app/api/jobs/mine/route.ts')).toMatch(/employerOwnsWhere\(session\.user\.id\)/);
    expect(read('src/app/api/jobs/[id]/route.ts')).toMatch(/ownedJobPosting\(id, session\.user\.id\)/);
    // prisma must not leak into the lib that client components import
    expect(read('src/lib/job-posting-plans.ts')).not.toMatch(/@\/lib\/db/);
  });
  it('a live standard listing can be upgraded to featured and keeps the later expiry', () => {
    const checkout = read('src/app/api/jobs/[id]/checkout/route.ts');
    expect(checkout).toMatch(/const upgrade = livePaid && plan\.featured && !currentlyFeatured/);
    expect(checkout).toMatch(/upgrade: upgrade \? '1' : '0'/);
    const wh = read('src/app/api/stripe/webhooks/route.ts');
    expect(wh).toMatch(/session\.metadata\?\.upgrade === '1'/);
    expect(wh).toMatch(/expiryNoticeAt: null/);
  });
  it('the portal is clean of the site onboarding chrome and the expiry cron is scheduled', () => {
    expect(read('src/components/onboarding/QuickStartGuide.tsx')).toMatch(/startsWith\('\/hire\/dashboard'\)/);
    expect(read('src/components/billing/TrialCountdownBanner.tsx')).toMatch(/startsWith\('\/hire\/dashboard'\)/);
    expect(read('src/lib/cron-scheduler.ts')).toMatch(/path: '\/api\/cron\/job-posting-expiry'/);
    const cron = read('src/app/api/cron/job-posting-expiry/route.ts');
    expect(cron).toMatch(/expiryNoticeAt: null, expiresAt: \{ gt: now, lte: in3d \}/);
    expect(cron).toMatch(/expiredNoticeAt: null, expiresAt: \{ gt: dayAgo, lte: now \}/);
  });
});

describe('founder notifications', () => {
  it('paid/upgraded/renewed postings and first applicants email the founder without blocking', () => {
    const wh = read('src/app/api/stripe/webhooks/route.ts');
    expect(wh).toMatch(/void notifyFounderOfPostingEvent\(\{ event: session\.metadata\?\.upgrade === '1' \? 'upgraded' : session\.metadata\?\.renewal === '1' \? 'renewed' : 'paid'/);
    const apply = read('src/app/api/jobs/[id]/apply/route.ts');
    expect(apply).toMatch(/if \(priorCount === 1\) void notifyFounderOfPostingEvent\(\{ event: 'first_applicant'/);
    expect(read('src/lib/employer-email.ts')).toMatch(/send\(alertEmail\(\), subject, html/); // money events go to the alerts inbox (notify-routing.ts)
  });
});

describe('applicant tracking', () => {
  it('schema, apply route, applicants route and job page are wired', () => {
    const schema = read('prisma/schema.prisma');
    expect(schema).toMatch(/\nmodel JobApplication \{/);
    expect(schema).toMatch(/\n  applyMode\s+String\s+@default\("link"\)/);
    const apply = read('src/app/api/jobs/[id]/apply/route.ts');
    expect(apply).toMatch(/job\.applyMode !== 'spacenexus'\) return notFoundError/);
    expect(apply).toMatch(/if \(b\.website\) return NextResponse\.json/); // honeypot
    expect(apply).toMatch(/sendNewApplicationEmail/);
    const applicants = read('src/app/api/jobs/[id]/applicants/route.ts');
    expect(applicants).toMatch(/format'\) === 'csv'/);
    expect(applicants).toMatch(/ownedJobPosting\(id, session\.user\.id\)/);
    const page = read('src/app/space-talent/job/[id]/page.tsx');
    expect(page).toMatch(/onSite && <ApplyForm jobId=\{job\.id\}/);
    expect(read('src/components/jobs/PostJobForm.tsx')).toMatch(/Collect applications on SpaceNexus/);
    expect(read('src/app/api/jobs/post/route.ts')).toMatch(/if \(b\.draft\)/);
  });
});
