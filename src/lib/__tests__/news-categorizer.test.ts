import { categorizeArticle } from '../news-fetcher';

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
