/**
 * @jest-environment node
 */
/**
 * Insight duplicate detection — calibrated against the real 2026-08 incident:
 * the generator covered the LandSpace Zhuque-3 landing on three consecutive
 * days under three different headlines, and two of the three were approved
 * because no warning existed anywhere. These are the actual titles.
 */
import {
  distinctiveTokens,
  titlesCoverSameStory,
  findLikelyDuplicate,
  buildRecentCoverageBlock,
} from '../insight-dedupe';

const ZHUQUE_1 = "China's LandSpace Sticks the Landing: Zhuque-3's Second Flight Ends America's Reusable Rocket Monopoly";
const ZHUQUE_2 = "China's Reusability Breakthrough: LandSpace Lands ZhuQue-3, Ending SpaceX's Solo Run on Commercial Booster Recovery";
const ZHUQUE_3 = "Landspace's Zhuque-3 Landing Puts China on SpaceX's Reusability Timeline — With a Lunar Landing Days Behind It";

// Real same-period headlines that are NOT the Zhuque story.
const UNRELATED = [
  'NSPM-17: Trump\'s 1,000-Launch Mandate Rewrites America\'s Launch Regulation',
  'The In-Space Servicing Industry\'s First Real Test Fails to Stick',
  'State of the Space Economy — Week of 2026-08-24',
  'NASA Roman Space Telescope Passes Flight Readiness Review Ahead of Falcon Heavy Launch',
  'Starcloud Announces $250M Series A Extension',
];

describe('titlesCoverSameStory — the incident titles', () => {
  it.each([
    [ZHUQUE_1, ZHUQUE_2],
    [ZHUQUE_1, ZHUQUE_3],
    [ZHUQUE_2, ZHUQUE_3],
  ])('flags every pair of the three Zhuque headlines', (a, b) => {
    expect(titlesCoverSameStory(a, b).duplicate).toBe(true);
  });

  it.each(UNRELATED.flatMap((u) => [ZHUQUE_1, ZHUQUE_2, ZHUQUE_3].map((z) => [z, u])))(
    'does not flag a Zhuque headline against unrelated coverage',
    (a, b) => {
      expect(titlesCoverSameStory(a as string, b as string).duplicate).toBe(false);
    },
  );

  it('does not flag unrelated headlines against each other', () => {
    for (let i = 0; i < UNRELATED.length; i++) {
      for (let j = i + 1; j < UNRELATED.length; j++) {
        expect(titlesCoverSameStory(UNRELATED[i], UNRELATED[j]).duplicate).toBe(false);
      }
    }
  });
});

describe('findLikelyDuplicate', () => {
  const recent = [
    { title: ZHUQUE_3, slug: 'zhuque-keeper', status: 'published' },
    { title: UNRELATED[0], slug: 'nspm', status: 'published' },
    { title: ZHUQUE_1, slug: 'zhuque-rejected', status: 'rejected' },
  ];

  it('finds the covering insight and reports the shared tokens', () => {
    const hit = findLikelyDuplicate(ZHUQUE_2, recent);
    expect(hit).not.toBeNull();
    expect(hit!.sharedTokens.length).toBeGreaterThanOrEqual(2);
  });

  it('a REJECTED insight still suppresses re-coverage — the editor killed that story', () => {
    const hit = findLikelyDuplicate(ZHUQUE_2, [recent[2]]);
    expect(hit).not.toBeNull();
    expect(hit!.status).toBe('rejected');
  });

  it('returns null when nothing recent covers the story', () => {
    expect(findLikelyDuplicate('Rocket Lab Neutron Reaches the Pad for First Static Fire', recent.slice(1, 2))).toBeNull();
  });
});

describe('buildRecentCoverageBlock', () => {
  it('is empty when nothing is recent — no prompt noise', () => {
    expect(buildRecentCoverageBlock([])).toBe('');
  });

  it('lists titles under an explicit do-not-repeat instruction', () => {
    const block = buildRecentCoverageBlock([{ title: ZHUQUE_3, slug: 'x', status: 'published' }]);
    expect(block).toContain('do NOT write about these again');
    expect(block).toContain(ZHUQUE_3);
  });
});

describe('distinctiveTokens', () => {
  it('keeps proper nouns and drops headline filler', () => {
    const t = distinctiveTokens(ZHUQUE_2);
    expect(t.has('landspace')).toBe(true);
    expect(t.has('zhuque')).toBe(true);
    expect(t.has('breakthrough')).toBe(false); // stoplisted filler
    expect(t.has('the')).toBe(false);
  });
});
