/**
 * @jest-environment node
 */
const mockDb = {
  companyProfile: { findUnique: jest.fn() },
  companyWatch: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  companyBriefDelivery: { findUnique: jest.fn(), create: jest.fn() },
  spaceJobPosting: { count: jest.fn(), findMany: jest.fn() },
  governmentContractAward: { findMany: jest.fn() },
  fundingRound: { findMany: jest.fn() },
  sECFiling: { findMany: jest.fn() },
  newsArticle: { findMany: jest.fn() },
};

// Lazy getter: jest.mock is hoisted above mockDb's initialization, so the
// factory must not touch it until the code under test actually calls prisma.
jest.mock('@/lib/db', () => ({ __esModule: true, get default() { return mockDb; } }));
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('@/lib/newsletter/email-service', () => ({ sendVerificationEmail: jest.fn(async () => ({ success: true })) }));

import { briefEmail, briefIsEmpty, createCompanyWatch, isoWeekKey, runCompanyBriefDeliveries, unsubscribeCompanyWatch, MAX_WATCHES_PER_EMAIL } from '@/lib/company-brief';
import type { CompanyBriefData } from '@/lib/company-brief';
import { _resetConfirmationCooldown } from '@/lib/launch-watch';

const NOW = new Date('2026-08-31T09:00:00Z'); // a Monday

const emptyData: CompanyBriefData = { jobs: { count: 0, titles: [] }, contracts: [], funding: [], filings: [], news: [] };

function resetAll() {
  _resetConfirmationCooldown();
  for (const model of Object.values(mockDb)) for (const fn of Object.values(model)) (fn as jest.Mock).mockReset();
  mockDb.companyBriefDelivery.create.mockResolvedValue({});
}

function mockEmptyCompanyData() {
  mockDb.spaceJobPosting.count.mockResolvedValue(0);
  mockDb.spaceJobPosting.findMany.mockResolvedValue([]);
  mockDb.governmentContractAward.findMany.mockResolvedValue([]);
  mockDb.fundingRound.findMany.mockResolvedValue([]);
  mockDb.sECFiling.findMany.mockResolvedValue([]);
  mockDb.newsArticle.findMany.mockResolvedValue([]);
}

const watchRow = (over: Record<string, unknown> = {}) => ({
  id: 'w1', email: 'a@b.c', unsubscribeToken: 'u'.padEnd(48, '0'), companyProfileId: 'c1',
  companyProfile: { name: 'Rocket Lab', slug: 'rocket-lab' }, ...over,
});

describe('isoWeekKey', () => {
  it('keys deliveries by ISO-8601 week', () => {
    expect(isoWeekKey(new Date('2026-08-31T09:00:00Z'))).toBe('2026-W36');
    expect(isoWeekKey(new Date('2026-09-06T23:59:59Z'))).toBe('2026-W36'); // same week's Sunday
    expect(isoWeekKey(new Date('2026-09-07T00:00:00Z'))).toBe('2026-W37'); // next Monday
    expect(isoWeekKey(new Date('2026-01-01T00:00:00Z'))).toBe('2026-W01');
    expect(isoWeekKey(new Date('2027-01-01T00:00:00Z'))).toBe('2026-W53'); // ISO year != calendar year
  });
});

describe('createCompanyWatch', () => {
  beforeEach(resetAll);

  it('creates a watch with two distinct 48-hex tokens and sends verification', async () => {
    mockDb.companyProfile.findUnique.mockResolvedValue({ id: 'c1', name: 'Rocket Lab' });
    mockDb.companyWatch.findUnique.mockResolvedValue(null);
    mockDb.companyWatch.count.mockResolvedValue(0);
    mockDb.companyWatch.create.mockImplementation(async ({ data }: { data: Record<string, string> }) => ({ id: 'w1', verified: false, verificationToken: data.verificationToken }));
    const r = await createCompanyWatch('A@B.c', { slug: 'rocket-lab' }, 'company-page');
    expect(r).toEqual({ ok: true, status: 'sent' });
    const data = mockDb.companyWatch.create.mock.calls[0][0].data;
    expect(data.email).toBe('a@b.c'); // normalized
    expect(data.verificationToken).toMatch(/^[a-f0-9]{48}$/);
    expect(data.unsubscribeToken).toMatch(/^[a-f0-9]{48}$/);
    expect(data.verificationToken).not.toBe(data.unsubscribeToken);
  });

  it('is enumeration-safe: verified watch reports already-verified without re-sending', async () => {
    mockDb.companyProfile.findUnique.mockResolvedValue({ id: 'c1', name: 'Rocket Lab' });
    mockDb.companyWatch.findUnique.mockResolvedValue({ id: 'w1', verified: true, verificationToken: 't', unsubscribedAt: null });
    const r = await createCompanyWatch('a@b.c', { companyProfileId: 'c1' }, 'company-page');
    expect(r).toEqual({ ok: true, status: 'already-verified' });
    expect(mockDb.companyWatch.create).not.toHaveBeenCalled();
  });

  it('caps active watches per email', async () => {
    mockDb.companyProfile.findUnique.mockResolvedValue({ id: 'c1', name: 'Rocket Lab' });
    mockDb.companyWatch.findUnique.mockResolvedValue(null);
    mockDb.companyWatch.count.mockResolvedValue(MAX_WATCHES_PER_EMAIL);
    const r = await createCompanyWatch('a@b.c', { companyProfileId: 'c1' }, 'company-page');
    expect(r).toEqual({ ok: false, status: 'limit' });
  });

  it('rejects an unknown company', async () => {
    mockDb.companyProfile.findUnique.mockResolvedValue(null);
    const r = await createCompanyWatch('a@b.c', { slug: 'nope' }, 'company-page');
    expect(r).toEqual({ ok: false, status: 'not-found' });
  });

  it('revives an unsubscribed row (blocked by the unique) but demands re-confirmation', async () => {
    mockDb.companyProfile.findUnique.mockResolvedValue({ id: 'c1', name: 'Rocket Lab' });
    mockDb.companyWatch.findUnique.mockResolvedValue({ id: 'w1', verified: true, verificationToken: 't', unsubscribedAt: new Date() });
    mockDb.companyWatch.count.mockResolvedValue(1);
    mockDb.companyWatch.update.mockResolvedValue({ id: 'w1', verified: false, verificationToken: 't' });
    const r = await createCompanyWatch('a@b.c', { companyProfileId: 'c1' }, 'company-page');
    expect(r).toEqual({ ok: true, status: 'sent' });
    expect(mockDb.companyWatch.update).toHaveBeenCalledWith(expect.objectContaining({ data: { unsubscribedAt: null, verified: false, verifiedAt: null } }));
  });
});

describe('briefEmail', () => {
  it('writes the subject, escapes HTML, and includes company page + unsubscribe links', () => {
    const data: CompanyBriefData = {
      jobs: { count: 3, titles: ['Propulsion <Lead>'] },
      contracts: [{ title: 'LSA award', agency: 'Space Force', value: 24_000_000, awardDate: new Date('2026-08-28') }],
      funding: [{ seriesLabel: 'Series C', amount: 1_500_000_000, date: new Date('2026-08-27'), leadInvestor: 'a16z' }],
      filings: [{ filingType: '8-K', filingDate: new Date('2026-08-26'), edgarUrl: 'https://sec.gov/x' }],
      news: [{ title: 'Neutron hop test', publishedAt: new Date('2026-08-25') }],
    };
    const mail = briefEmail({ name: 'Rocket Lab', slug: 'rocket-lab' }, data, 'tok');
    expect(mail.subject).toBe('Rocket Lab this week — SpaceNexus');
    expect(mail.text).toContain('/company-profiles/rocket-lab');
    expect(mail.text).toContain('/api/company-brief/unsubscribe?token=tok');
    expect(mail.text).toContain('3 new job postings');
    expect(mail.text).toContain('$24M');
    expect(mail.text).toContain('$1.5B');
    expect(mail.html).toContain('https://sec.gov/x');
    expect(mail.html).not.toContain('<Lead>');
  });

  it('briefIsEmpty is true only when every section is empty', () => {
    expect(briefIsEmpty(emptyData)).toBe(true);
    expect(briefIsEmpty({ ...emptyData, jobs: { count: 1, titles: ['x'] } })).toBe(false);
    expect(briefIsEmpty({ ...emptyData, news: [{ title: 'x', publishedAt: new Date() }] })).toBe(false);
  });
});

describe('runCompanyBriefDeliveries', () => {
  beforeEach(resetAll);

  it('sends one brief per verified watch and records the ISO-week delivery', async () => {
    mockDb.companyWatch.findMany.mockResolvedValue([watchRow()]);
    mockDb.companyBriefDelivery.findUnique.mockResolvedValue(null);
    mockEmptyCompanyData();
    mockDb.spaceJobPosting.count.mockResolvedValue(2);
    mockDb.spaceJobPosting.findMany.mockResolvedValue([{ title: 'Avionics Engineer' }]);
    const sent: string[] = [];
    const r = await runCompanyBriefDeliveries(NOW, async (to, subject) => { sent.push(`${to}:${subject}`); return true; });
    expect(r).toEqual({ watches: 1, companies: 1, sent: 1, quiet: 0, skipped: 0 });
    expect(sent).toEqual(['a@b.c:Rocket Lab this week — SpaceNexus']);
    expect(mockDb.companyBriefDelivery.create).toHaveBeenCalledWith({ data: { watchId: 'w1', periodKey: '2026-W36' } });
  });

  it('never repeats a delivery within the same ISO week', async () => {
    mockDb.companyWatch.findMany.mockResolvedValue([watchRow()]);
    mockDb.companyBriefDelivery.findUnique.mockResolvedValue({ id: 'already' });
    const r = await runCompanyBriefDeliveries(NOW, async () => true);
    expect(r).toEqual({ watches: 1, companies: 0, sent: 0, quiet: 0, skipped: 0 });
    expect(mockDb.spaceJobPosting.count).not.toHaveBeenCalled(); // brief never composed
    expect(mockDb.companyBriefDelivery.create).not.toHaveBeenCalled();
  });

  it('skips the send on an empty brief but still records the delivery (quiet weeks stay quiet)', async () => {
    mockDb.companyWatch.findMany.mockResolvedValue([watchRow()]);
    mockDb.companyBriefDelivery.findUnique.mockResolvedValue(null);
    mockEmptyCompanyData();
    const send = jest.fn(async () => true);
    const r = await runCompanyBriefDeliveries(NOW, send);
    expect(r).toEqual({ watches: 1, companies: 1, sent: 0, quiet: 1, skipped: 0 });
    expect(send).not.toHaveBeenCalled();
    expect(mockDb.companyBriefDelivery.create).toHaveBeenCalledWith({ data: { watchId: 'w1', periodKey: '2026-W36' } });
  });

  it('composes each company once and reuses it across watches', async () => {
    mockDb.companyWatch.findMany.mockResolvedValue([watchRow(), watchRow({ id: 'w2', email: 'z@b.c' })]);
    mockDb.companyBriefDelivery.findUnique.mockResolvedValue(null);
    mockEmptyCompanyData();
    mockDb.newsArticle.findMany.mockResolvedValue([{ title: 'Launch', publishedAt: NOW }]);
    const r = await runCompanyBriefDeliveries(NOW, async () => true);
    expect(r).toEqual({ watches: 2, companies: 1, sent: 2, quiet: 0, skipped: 0 });
    expect(mockDb.newsArticle.findMany).toHaveBeenCalledTimes(1);
  });

  it('does not record a delivery the provider rejected, so it retries next run', async () => {
    mockDb.companyWatch.findMany.mockResolvedValue([watchRow()]);
    mockDb.companyBriefDelivery.findUnique.mockResolvedValue(null);
    mockEmptyCompanyData();
    mockDb.spaceJobPosting.count.mockResolvedValue(1);
    const r = await runCompanyBriefDeliveries(NOW, async () => false);
    expect(r).toMatchObject({ sent: 0, skipped: 1 });
    expect(mockDb.companyBriefDelivery.create).not.toHaveBeenCalled();
  });
});

describe('unsubscribeCompanyWatch', () => {
  beforeEach(resetAll);

  it('removes one watch, or every watch for the address with all=true', async () => {
    mockDb.companyWatch.findUnique.mockResolvedValue({ id: 'w1', email: 'a@b.c' });
    mockDb.companyWatch.updateMany.mockResolvedValue({ count: 1 });
    expect(await unsubscribeCompanyWatch('tok')).toEqual({ ok: true, count: 1 });
    expect(mockDb.companyWatch.updateMany).toHaveBeenCalledWith({ where: { id: 'w1' }, data: { unsubscribedAt: expect.any(Date) } });

    mockDb.companyWatch.updateMany.mockResolvedValue({ count: 3 });
    expect(await unsubscribeCompanyWatch('tok', true)).toEqual({ ok: true, count: 3 });
    expect(mockDb.companyWatch.updateMany).toHaveBeenLastCalledWith({ where: { email: 'a@b.c', unsubscribedAt: null }, data: { unsubscribedAt: expect.any(Date) } });
  });

  it('reports nothing to stop for an unknown token', async () => {
    mockDb.companyWatch.findUnique.mockResolvedValue(null);
    expect(await unsubscribeCompanyWatch('tok', true)).toEqual({ ok: false, count: 0 });
    expect(mockDb.companyWatch.updateMany).not.toHaveBeenCalled();
  });
});
