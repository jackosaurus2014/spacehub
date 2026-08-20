import { categorizeArticle, isSpaceRelevant, stripFeedBoilerplate } from '../news-fetcher';

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

describe('stripFeedBoilerplate', () => {
  it('removes the WordPress syndication trailer', () => {
    expect(
      stripFeedBoilerplate('Plants scream in chemistry.\nThe post Freshly mown lawn appeared first on Space Daily.')
    ).toBe('Plants scream in chemistry.');
  });

  it('removes other common feed footers', () => {
    expect(stripFeedBoilerplate('Body copy. Read more at Example News.')).toBe('Body copy.');
    expect(stripFeedBoilerplate('Body copy. This article was originally published on Example News.')).toBe('Body copy.');
  });

  it('leaves ordinary prose untouched', () => {
    expect(stripFeedBoilerplate('Rocket Lab launched its ninth satellite for iQPS.')).toBe(
      'Rocket Lab launched its ninth satellite for iQPS.'
    );
    expect(stripFeedBoilerplate('')).toBe('');
  });
});

describe('isSpaceRelevant — SpaceDaily general-science filler (2026-08-20 defect)', () => {
  // SpaceDaily appends "The post <title> appeared first on Space Daily." to
  // every item. The outlet name contains the substring "space", which made
  // the guard match on EVERY item — a no-op for the feed that most needs it.
  const boilerplate = (title: string) => `The post ${title} appeared first on Space Daily.`;

  const LAWN =
    'The smell of a freshly mown lawn is one of the most loved scents there is, and it is also the grass ' +
    'releasing an emergency chemical within seconds of being cut — some of it aimed at insects.';
  const RAVENS =
    'We tend to think complex planning is a primate specialty, but a 2017 study found ravens outplanned ' +
    'chimpanzees, orangutans and bonobos at a trading task.';

  it('BEFORE-style check: the outlet name alone used to satisfy the guard', () => {
    // Without the source name / boilerplate stripping, "Space Daily" matches.
    expect(isSpaceRelevant('', 'appeared first on Space Daily.'.replace('appeared first on ', ''))).toBe(true);
  });

  it('blocks the mown-grass chemistry filler', () => {
    expect(
      isSpaceRelevant(
        LAWN,
        `What you experience as nature's most comforting aroma is actually a distress signal—plants screaming for help in the language of chemistry.\n${boilerplate(LAWN)}`,
        'SpaceDaily'
      )
    ).toBe(false);
  });

  it('blocks the raven-cognition filler', () => {
    expect(
      isSpaceRelevant(
        RAVENS,
        `A raven's brain is walnut-sized, yet these birds outthink our closest relatives at planning for future rewards.\n${boilerplate(RAVENS)}`,
        'SpaceDaily'
      )
    ).toBe(false);
  });

  it('blocks the rest of the recurring filler verticals', () => {
    const filler: Array<[string, string]> = [
      ['Thought of the day from Stoic philosopher Marcus Aurelius: "Men exist for the sake of one another"', ''],
      ['An octopus was filmed carrying two halves of a coconut shell across the seafloor', 'Portable armour on the seabed.'],
      ['Elephants in Kenya can distinguish between the voices of two local groups', 'They react with fear to Maasai men.'],
      ['Retirement can feel less like freedom than disappearance', 'Researchers who study life after work found losing a job role hurts.'],
      ['Finland has more saunas than cars', 'About 3.3 million in a country of 5.5 million people.'],
    ];
    for (const [title, summary] of filler) {
      expect(isSpaceRelevant(title, `${summary}\n${boilerplate(title)}`, 'SpaceDaily')).toBe(false);
    }
  });

  it('KEEPS legitimate astronomy, planetary science, launch and industry stories', () => {
    const keepers: Array<[string, string]> = [
      ['How Gas Filaments and Interfilaments Feed Star Formation in Monoceros R2', ''],
      ['Mars Express orbiter captures detailed new video', ''],
      ['Rocket Lab launches 9th satellite for iQPS', ''],
      ['Astronomers traced three stars flung out of the Large Magellanic Cloud', 'Used like cosmic breadcrumbs.'],
      ['The James Webb Space Telescope has found an object from just 660 million years after the Big Bang', ''],
      ['SpaceX pushed its Starlink constellation past 11,000 satellites in orbit', ''],
      ['Space Force opens its own recruiting squadron', ''],
    ];
    for (const [title, summary] of keepers) {
      expect(isSpaceRelevant(title, `${summary}\n${boilerplate(title)}`, 'SpaceDaily')).toBe(true);
    }
  });

  it('KEEPS solar-system stories whose only signal is a body name (word-boundary tier)', () => {
    // These were the over-blocking risk when the boilerplate hole was closed:
    // no industry or astronomy vocabulary, just the world being written about.
    const planetary: Array<[string, string]> = [
      ['Every methane rainstorm on Titan may be performing a primitive chemistry experiment', 'A 2025 study found a plausible route.'],
      ['Fifty kilometres above Venus, pressure and temperature become surprisingly Earth-like', 'Breathable air could keep a habitat aloft.'],
      ["Parts of Uranus's atmosphere fall to minus 224 degrees Celsius", 'Neptune sits a billion kilometres farther out.'],
      ["Neptune's largest moon Triton travels around its planet backwards", ''],
      ['Pluto has blue skies and floating water-ice mountains', ''],
      ['93 percent of the disc slides into the dark inner shadow on the night of August 27', 'A near-total eclipse.'],
    ];
    for (const [title, summary] of planetary) {
      expect(isSpaceRelevant(title, summary, 'SpaceDaily')).toBe(true);
    }
  });

  it('does not let a body name inside a longer word satisfy the guard', () => {
    // 'titan' must not match inside "titanium" ("aerospace" would legitimately
    // pass via the existing 'space' substring, so it is kept out of this case).
    expect(isSpaceRelevant('Titanium mining output rose sharply in Australia', 'Metal prices rose.', 'SpaceDaily')).toBe(false);
    expect(isSpaceRelevant('Many assume honeymoon came from a month of honey wine', 'An etymology story.', 'SpaceDaily')).toBe(false);
    expect(isSpaceRelevant('Marshland restoration in the Netherlands', 'The Dutch gave rivers more room.', 'SpaceDaily')).toBe(false);
  });
});
