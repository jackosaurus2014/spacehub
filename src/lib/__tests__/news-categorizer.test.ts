import { categorizeArticle, isSpaceRelevant } from '../news-fetcher';

describe('categorizeArticle', () => {
  it('categorizes launch-related articles', () => {
    expect(categorizeArticle('SpaceX Falcon 9 Launch', '')).toBe('launches');
    expect(categorizeArticle('Rocket Lab Electron liftoff', '')).toBe('launches');
    expect(categorizeArticle('', 'A new Starship rocket test')).toBe('launches');
  });

  it('categorizes mission-related articles', () => {
    expect(categorizeArticle('Artemis Moon Mission Update', '')).toBe('missions');
    expect(categorizeArticle('Mars Rover Discovers Water', '')).toBe('missions');
    expect(categorizeArticle('', 'The lunar exploration probe deployed')).toBe('missions');
  });

  it('categorizes company-related articles', () => {
    expect(categorizeArticle('SpaceX Announces New Contract', '')).toBe('companies');
    expect(categorizeArticle('Blue Origin Progress Update', '')).toBe('companies');
    expect(categorizeArticle('Boeing Quarterly Results', '')).toBe('companies');
  });

  it('categorizes satellite articles', () => {
    expect(categorizeArticle('Starlink Constellation Expansion', '')).toBe('satellites');
    expect(categorizeArticle('New Earth Observation Satellite', '')).toBe('satellites');
  });

  it('categorizes defense articles', () => {
    expect(categorizeArticle('Space Force Awards Contract', '')).toBe('defense');
    expect(categorizeArticle('', 'Department of Defense space strategy')).toBe('defense');
  });

  it('categorizes earnings and financial articles', () => {
    expect(categorizeArticle('Q4 Earnings Report Released', '')).toBe('earnings');
    expect(categorizeArticle('', 'The company announced revenue growth')).toBe('earnings');
  });

  it('categorizes mergers and acquisitions', () => {
    expect(categorizeArticle('Major Acquisition in Space Sector', '')).toBe('mergers');
    expect(categorizeArticle('', 'Companies announce merger deal')).toBe('mergers');
  });

  it('categorizes development/tech articles', () => {
    expect(categorizeArticle('New Engine Prototype Tested', '')).toBe('development');
    expect(categorizeArticle('', 'Ion thruster technology innovation')).toBe('development');
  });

  it('categorizes policy articles', () => {
    expect(categorizeArticle('FAA Announces New Regulation', '')).toBe('policy');
    expect(categorizeArticle('Congress Budget Vote on NASA', '')).toBe('policy');
  });

  it('categorizes debris articles', () => {
    expect(categorizeArticle('Space Debris Collision Risk Rising', '')).toBe('debris');
    expect(categorizeArticle('', 'Active debris removal program planned')).toBe('debris');
  });

  it('defaults to missions for unrecognized content', () => {
    expect(categorizeArticle('Something Completely Different', 'No keywords here')).toBe('missions');
  });

  it('is case-insensitive', () => {
    expect(categorizeArticle('SPACEX FALCON 9 LAUNCH', '')).toBe('launches');
    expect(categorizeArticle('space force contract award', '')).toBe('defense');
  });

  it('uses combined title and summary for matching', () => {
    // Title has no keywords, but summary does
    expect(categorizeArticle('Update Today', 'The SpaceX team confirmed')).toBe('companies');
  });
});

describe('isSpaceRelevant', () => {
  it('accepts articles with clear space vocabulary', () => {
    expect(isSpaceRelevant('SpaceX Falcon 9 Launch', '')).toBe(true);
    expect(isSpaceRelevant('Artemis Moon Mission Update', '')).toBe(true);
    expect(isSpaceRelevant('New Earth Observation Satellite', '')).toBe(true);
    expect(isSpaceRelevant('', 'NASA astronauts return from the ISS')).toBe(true);
    expect(isSpaceRelevant('Space Force Awards Contract', '')).toBe(true);
  });

  it('rejects the HSBC-style off-topic false positive', () => {
    // Regression test: this exact shape of story (banking/financial-crime
    // coverage with generic "profit"/"financial"/"investor" vocabulary)
    // previously slipped through and was mis-categorized as "Earnings"
    // because those words are also earnings-category keywords.
    expect(
      isSpaceRelevant(
        'HSBC fined over drug cartel money laundering scheme',
        'The bank reported a drop in profit as investors reacted to the financial penalty and quarterly regulatory scrutiny'
      )
    ).toBe(false);
  });

  it('rejects generic business/tech stories with no space content', () => {
    expect(isSpaceRelevant('Tech company reports quarterly earnings', 'Revenue and profit both grew year over year')).toBe(false);
    expect(isSpaceRelevant('Congress debates new budget bill', 'Lawmakers discussed government spending and administration priorities')).toBe(false);
  });

  it('accepts space-relevant business stories using non-generic keywords', () => {
    // "SpaceX" and "satellite" are space-specific signals that survive the
    // generic-term denylist even though the story is business-flavored.
    expect(isSpaceRelevant('SpaceX raises new funding round', 'The satellite company confirmed its latest valuation')).toBe(true);
  });

  it('is case-insensitive and checks combined title+summary', () => {
    expect(isSpaceRelevant('ORBITAL DEBRIS RISK RISING', '')).toBe(true);
    expect(isSpaceRelevant('Update Today', 'The lunar rover made progress')).toBe(true);
  });
});
