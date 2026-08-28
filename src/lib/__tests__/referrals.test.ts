/**
 * @jest-environment node
 */
const mockFindUnique = jest.fn();
const mockCount = jest.fn();
const mockTx = jest.fn();
const mockUpdate = jest.fn();
const mockCreate = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    gameProfile: { findUnique: (...a: unknown[]) => mockFindUnique(...a), update: (...a: unknown[]) => mockUpdate(...a), count: (...a: unknown[]) => mockCount(...a) },
    gameMentorship: { create: (...a: unknown[]) => mockCreate(...a), count: (...a: unknown[]) => mockCount(...a) },
    $transaction: (...a: unknown[]) => mockTx(...a),
  },
}));
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

import { attachReferral, inviteUrl } from '@/lib/game/referrals';
import { MAX_MENTEES_PER_MENTOR } from '@/lib/game/constants';

describe('attachReferral', () => {
  beforeEach(() => { mockFindUnique.mockReset(); mockTx.mockReset(); mockTx.mockResolvedValue([]); mockUpdate.mockReturnValue('u'); mockCreate.mockReturnValue('c'); });

  const me = { id: 'new', referredByProfileId: null };
  const referrer = (active: number) => ({ id: 'ref', _count: { mentorshipsAsMentor: active } });

  it('ignores self-referral and missing referrer', async () => {
    expect(await attachReferral('new', 'new')).toMatchObject({ attached: false });
    expect(await attachReferral('new', null)).toMatchObject({ attached: false });
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('opens an ACTIVE mentorship when the referrer has a free slot', async () => {
    mockFindUnique.mockResolvedValueOnce(me).mockResolvedValueOnce(referrer(0));
    const r = await attachReferral('new', 'ref');
    expect(r).toEqual({ attached: true, mentorship: 'active' });
    expect(mockCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ mentorProfileId: 'ref', menteeProfileId: 'new', status: 'active' }) });
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'new' }, data: { referredByProfileId: 'ref' } });
  });

  it('falls back to PENDING when the referrer is at capacity', async () => {
    mockFindUnique.mockResolvedValueOnce(me).mockResolvedValueOnce(referrer(MAX_MENTEES_PER_MENTOR));
    expect(await attachReferral('new', 'ref')).toEqual({ attached: true, mentorship: 'pending' });
  });

  it('is idempotent: a profile already attributed is left alone', async () => {
    mockFindUnique.mockResolvedValueOnce({ id: 'new', referredByProfileId: 'someone' }).mockResolvedValueOnce(referrer(0));
    expect(await attachReferral('new', 'ref')).toMatchObject({ attached: false, reason: 'already attributed' });
    expect(mockTx).not.toHaveBeenCalled();
  });

  it('never throws — onboarding must not depend on it', async () => {
    mockFindUnique.mockRejectedValue(new Error('db down'));
    expect(await attachReferral('new', 'ref')).toMatchObject({ attached: false, reason: 'error' });
  });

  it('builds the invite url', () => {
    expect(inviteUrl('abc 1')).toBe('https://spacenexus.us/space-tycoon?ref=abc%201');
  });
});
