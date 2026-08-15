/**
 * @jest-environment node
 */
import {
  isLikelyPersonName,
  isLikelyTitle,
  isLikelyOrg,
  isKnownOrgName,
  isIndustryKeywordOrg,
  isEligibleExecMoveArticle,
  extractMovesFromText,
} from '../fetchers/executive-moves-fetcher';

describe('isLikelyPersonName', () => {
  // Exact garbage examples pulled from the 156 garbled prod rows.
  const mustReject = [
    'a Soviet lieutenant colonel',
    'The Italians',
    'The most secretive facility of the Cold War is',
    'Mars is usually',
  ];

  it.each(mustReject)('rejects garbled fragment: %s', (name) => {
    expect(isLikelyPersonName(name)).toBe(false);
  });

  it.each([
    'Bill Nelson',
    'Jared Isaacman',
    'Derek Tournear',
    'Elon Musk',
    "Mary-Jane O'Brien",
    'J. Robert Oppenheimer',
    'Jean-Luc Picard',
  ])('accepts plausible person name: %s', (name) => {
    expect(isLikelyPersonName(name)).toBe(true);
  });

  it('rejects null/undefined/empty', () => {
    expect(isLikelyPersonName(null)).toBe(false);
    expect(isLikelyPersonName(undefined)).toBe(false);
    expect(isLikelyPersonName('')).toBe(false);
    expect(isLikelyPersonName('   ')).toBe(false);
  });

  it('rejects single-word names (below token minimum)', () => {
    expect(isLikelyPersonName('Musk')).toBe(false);
  });

  it('rejects names with more than 4 tokens', () => {
    expect(isLikelyPersonName('John Jacob Jingleheimer Schmidt Junior')).toBe(false);
  });

  it('rejects names >= 40 characters', () => {
    expect(isLikelyPersonName('Bartholomew Alexander Montgomery Fitzgerald')).toBe(false);
  });

  it('rejects names containing digits', () => {
    expect(isLikelyPersonName('John Smith2')).toBe(false);
  });

  it('rejects lowercase tokens', () => {
    expect(isLikelyPersonName('john smith')).toBe(false);
  });

  it('rejects names starting with an article', () => {
    expect(isLikelyPersonName('The Boeing')).toBe(false);
  });

  it('rejects sentence fragments with stopwords mid-string', () => {
    expect(isLikelyPersonName('Company Was Founded')).toBe(false);
    expect(isLikelyPersonName('Rocket That Launched')).toBe(false);
  });
});

describe('isLikelyTitle', () => {
  it.each([
    'CEO',
    'Chief Executive Officer',
    'Director of Engineering',
    'Head of Mission Operations',
    'Vice President of Business Development',
    'NASA Administrator',
    'Chairman',
    'Board Member',
  ])('accepts plausible title: %s', (title) => {
    expect(isLikelyTitle(title)).toBe(true);
  });

  it('rejects strings with no role keyword', () => {
    expect(isLikelyTitle('Rocket Scientist Extraordinaire')).toBe(false);
    expect(isLikelyTitle('Senior Engineer')).toBe(false);
  });

  it('rejects sentence fragments even if a role keyword appears', () => {
    expect(isLikelyTitle('is the head of the agency that oversees launches')).toBe(false);
    expect(isLikelyTitle('was named director according to reports')).toBe(false);
  });

  it('rejects strings >= 60 characters', () => {
    expect(isLikelyTitle('Chief ' + 'Executive '.repeat(6) + 'Officer')).toBe(false);
  });

  it('rejects null/undefined/empty', () => {
    expect(isLikelyTitle(null)).toBe(false);
    expect(isLikelyTitle(undefined)).toBe(false);
    expect(isLikelyTitle('')).toBe(false);
  });
});

describe('isLikelyOrg', () => {
  it.each([
    'SpaceX',
    'Blue Origin',
    'NASA',
    'Rocket Lab USA',
    'The Boeing Company',
    'Space Systems Command',
  ])('accepts plausible org name: %s', (org) => {
    expect(isLikelyOrg(org)).toBe(true);
  });

  it('rejects the full historical sentence fragment', () => {
    expect(isLikelyOrg('The most secretive facility of the Cold War is')).toBe(false);
  });

  it('rejects strings with sentence-indicator verbs', () => {
    expect(isLikelyOrg('Boeing was reportedly considering')).toBe(false);
  });

  it('rejects strings not starting with a capital letter or digit', () => {
    expect(isLikelyOrg('the agency')).toBe(false);
  });

  it('rejects strings ending in sentence punctuation', () => {
    expect(isLikelyOrg('Example Corp.')).toBe(false);
  });

  it('rejects strings >= 60 characters or > 8 words', () => {
    expect(isLikelyOrg('A '.repeat(9) + 'Corporation')).toBe(false);
  });

  it('rejects null/undefined/empty', () => {
    expect(isLikelyOrg(null)).toBe(false);
    expect(isLikelyOrg(undefined)).toBe(false);
    expect(isLikelyOrg('')).toBe(false);
  });
});

describe('isKnownOrgName', () => {
  const known = new Set(['spacex', 'blue origin', 'rocket lab']);

  it('matches exact normalized names', () => {
    expect(isKnownOrgName('SpaceX', known)).toBe(true);
    expect(isKnownOrgName('Blue Origin', known)).toBe(true);
  });

  it('matches via substring containment for longer candidates', () => {
    expect(isKnownOrgName('Rocket Lab USA', known)).toBe(true);
  });

  it('does not match unrelated names', () => {
    expect(isKnownOrgName('Acme Widgets', known)).toBe(false);
  });

  it('does not falsely match on trivially short substrings', () => {
    const shortKnown = new Set(['co']);
    expect(isKnownOrgName('Rocket Lab Corporation', shortKnown)).toBe(false);
  });

  it('handles null/empty input', () => {
    expect(isKnownOrgName(null, known)).toBe(false);
    expect(isKnownOrgName('', known)).toBe(false);
  });
});

describe('isIndustryKeywordOrg', () => {
  it('matches known industry keywords', () => {
    expect(isIndustryKeywordOrg('Orbital Dynamics Systems')).toBe(true);
    expect(isIndustryKeywordOrg('NASA')).toBe(true);
  });

  it('does not match unrelated org names', () => {
    expect(isIndustryKeywordOrg('Acme Widgets')).toBe(false);
  });
});

describe('isEligibleExecMoveArticle', () => {
  it('accepts headlines with an appointment keyword', () => {
    expect(isEligibleExecMoveArticle('Jane Smith Named CEO of ExampleSpace')).toBe(true);
    expect(isEligibleExecMoveArticle('ExampleSpace Appoints New CTO')).toBe(true);
  });

  it('rejects headlines with no exec keyword', () => {
    expect(isEligibleExecMoveArticle('SpaceX Launches Falcon 9 from Cape Canaveral')).toBe(false);
  });

  it('rejects historical/feature headlines even with a keyword present', () => {
    expect(isEligibleExecMoveArticle('The Secret History of the Cold War Space Race Directors')).toBe(false);
    expect(isEligibleExecMoveArticle('Remembering Apollo\'s Flight Directors, 50 Years Later')).toBe(false);
    expect(isEligibleExecMoveArticle('Anniversary: The President Who Named NASA')).toBe(false);
  });

  it('rejects null/empty titles', () => {
    expect(isEligibleExecMoveArticle(null)).toBe(false);
    expect(isEligibleExecMoveArticle('')).toBe(false);
  });
});

describe('extractMovesFromText', () => {
  it('extracts a valid "appointed" move', () => {
    const moves = extractMovesFromText(
      'Jane Smith Named CEO of ExampleSpace, Replacing Former Chief',
      'The move was announced Monday.',
      'Test Source',
      'https://example.com/article',
    );
    expect(moves.length).toBeGreaterThan(0);
    const move = moves[0];
    expect(move.personName).toBe('Jane Smith');
    expect(move.toTitle).toBe('CEO');
    expect(move.toCompany).toBe('ExampleSpace');
    expect(move.moveType).toBe('appointed');
  });

  it('correctly maps title/company (not swapped) for the "joins ... as" pattern', () => {
    const moves = extractMovesFromText(
      'John Doe Joins ExampleSpace as Chief Technology Officer, Effective Immediately',
      'The appointment follows a board vote.',
      'Test Source',
      'https://example.com/article2',
    );
    expect(moves.length).toBeGreaterThan(0);
    const move = moves[0];
    expect(move.personName).toBe('John Doe');
    // Before the fix, these were swapped: toTitle held the company and
    // toCompany held the title for this pattern.
    expect(move.toTitle).toBe('Chief Technology Officer');
    expect(move.toCompany).toBe('ExampleSpace');
  });

  it('does not extract a move from the garbled Cold War historical fragment', () => {
    const moves = extractMovesFromText(
      'The Secret History of the Cold War Space Program',
      'The most secretive facility of the Cold War is a Soviet lieutenant colonel\'s former post. Mars is usually the next stop for retired officers, The Italians say.',
      'Test Source',
      'https://example.com/article3',
    );
    expect(moves).toEqual([]);
  });

  it('sets verified true when the company matches a known name', () => {
    const knownNames = new Set(['examplespace']);
    const moves = extractMovesFromText(
      'Jane Smith Named CEO of ExampleSpace, Replacing Former Chief',
      'The move was announced Monday.',
      'Test Source',
      'https://example.com/article4',
      knownNames,
    );
    expect(moves[0].verified).toBe(true);
  });

  it('sets verified false when the company does not match a known name', () => {
    const moves = extractMovesFromText(
      'Jane Smith Named CEO of ExampleSpace, Replacing Former Chief',
      'The move was announced Monday.',
      'Test Source',
      'https://example.com/article5',
      new Set(['some-other-company']),
    );
    expect(moves[0].verified).toBe(false);
  });

  it('returns no moves when no exec keyword is present', () => {
    const moves = extractMovesFromText(
      'SpaceX Launches Falcon 9 from Cape Canaveral',
      'The rocket lifted off on schedule.',
      'Test Source',
      'https://example.com/article6',
    );
    expect(moves).toEqual([]);
  });
});
