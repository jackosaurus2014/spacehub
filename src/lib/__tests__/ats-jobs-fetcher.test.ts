import {
  classifyCategory,
  deriveSeniority,
  parseRemote,
  mapEmploymentType,
  detectClearance,
  ATS_BOARDS,
} from '../fetchers/ats-jobs-fetcher';

describe('classifyCategory', () => {
  it('classifies legal roles', () => {
    expect(classifyCategory('Legal', 'Corporate Counsel')).toBe('legal');
    expect(classifyCategory(null, 'Export Control Specialist')).toBe('legal');
    expect(classifyCategory('Regulatory Affairs', 'Analyst')).toBe('legal');
  });

  it('classifies research roles', () => {
    expect(classifyCategory('R&D', 'Materials Engineer')).toBe('research');
    expect(classifyCategory(null, 'Research Scientist, Optics')).toBe('research');
  });

  it('classifies manufacturing roles', () => {
    expect(classifyCategory('Production', 'Build Reliability Engineer')).toBe('manufacturing');
    expect(classifyCategory(null, 'CNC Machinist II')).toBe('manufacturing');
    expect(classifyCategory('Manufacturing', 'Weld Technician')).toBe('manufacturing');
  });

  it('classifies operations roles', () => {
    expect(classifyCategory('Mission Operations', 'Flight Controller')).toBe('operations');
    expect(classifyCategory(null, 'Supply Chain Planner')).toBe('operations');
  });

  it('classifies business roles', () => {
    expect(classifyCategory('Sales', 'Enterprise Account Manager')).toBe('business');
    expect(classifyCategory('Finance', 'Staff Accountant')).toBe('business');
    expect(classifyCategory(null, 'Technical Recruiter')).toBe('business');
  });

  it('defaults to engineering', () => {
    expect(classifyCategory('Avionics', 'Flight Software Engineer')).toBe('engineering');
    expect(classifyCategory(null, 'Propulsion Development Engineer')).toBe('engineering');
    expect(classifyCategory(undefined, '')).toBe('engineering');
  });
});

describe('deriveSeniority', () => {
  it('maps intern/associate/junior to entry', () => {
    expect(deriveSeniority('Propulsion Intern (Fall 2026)')).toBe('entry');
    expect(deriveSeniority('Associate Engineer, Structures')).toBe('entry');
    expect(deriveSeniority('Junior Software Developer')).toBe('entry');
  });

  it('maps senior to senior', () => {
    expect(deriveSeniority('Senior Avionics Engineer')).toBe('senior');
    expect(deriveSeniority('Sr. GNC Engineer')).toBe('senior');
  });

  it('maps staff/principal/lead to lead', () => {
    expect(deriveSeniority('Staff Software Engineer')).toBe('lead');
    expect(deriveSeniority('Principal Propulsion Engineer')).toBe('lead');
    expect(deriveSeniority('Manufacturing Lead')).toBe('lead');
  });

  it('maps director, vp, and chief levels', () => {
    expect(deriveSeniority('Director of Launch Operations')).toBe('director');
    expect(deriveSeniority('VP of Engineering')).toBe('vp');
    expect(deriveSeniority('Vice President, Sales')).toBe('vp');
    expect(deriveSeniority('Chief Revenue Officer')).toBe('c_suite');
  });

  it('prefers the highest matching level (chief over senior)', () => {
    expect(deriveSeniority('Senior Vice President')).toBe('vp');
    expect(deriveSeniority('Chief of Staff')).toBe('c_suite');
  });

  it('defaults to mid', () => {
    expect(deriveSeniority('Avionics Engineer II')).toBe('mid');
    expect(deriveSeniority('')).toBe('mid');
  });
});

describe('parseRemote', () => {
  it('greenhouse: location contains remote', () => {
    expect(parseRemote('greenhouse', { location: 'Remote - USA' })).toBe(true);
    expect(parseRemote('greenhouse', { location: 'Hawthorne, CA' })).toBe(false);
    expect(parseRemote('greenhouse', { location: null })).toBe(false);
  });

  it('lever: workplaceType === remote', () => {
    expect(parseRemote('lever', { workplaceType: 'remote' })).toBe(true);
    expect(parseRemote('lever', { workplaceType: 'Remote' })).toBe(true);
    expect(parseRemote('lever', { workplaceType: 'on-site' })).toBe(false);
    expect(parseRemote('lever', {})).toBe(false);
  });

  it('ashby: isRemote boolean', () => {
    expect(parseRemote('ashby', { isRemote: true })).toBe(true);
    expect(parseRemote('ashby', { isRemote: false })).toBe(false);
    expect(parseRemote('ashby', {})).toBe(false);
  });
});

describe('mapEmploymentType', () => {
  it('normalizes full-time variants', () => {
    expect(mapEmploymentType('Full-time')).toBe('full_time');
    expect(mapEmploymentType('FullTime')).toBe('full_time');
    expect(mapEmploymentType('full time')).toBe('full_time');
  });

  it('normalizes part-time, contract, and internship variants', () => {
    expect(mapEmploymentType('Part-time')).toBe('part_time');
    expect(mapEmploymentType('PartTime')).toBe('part_time');
    expect(mapEmploymentType('Contract')).toBe('contract');
    expect(mapEmploymentType('Temporary')).toBe('contract');
    expect(mapEmploymentType('Intern')).toBe('internship');
    expect(mapEmploymentType('Internship')).toBe('internship');
  });

  it('returns null for unknown or missing values', () => {
    expect(mapEmploymentType('Volunteer')).toBeNull();
    expect(mapEmploymentType(null)).toBeNull();
    expect(mapEmploymentType(undefined)).toBeNull();
    expect(mapEmploymentType('')).toBeNull();
  });
});

describe('detectClearance', () => {
  it('detects clearance keywords', () => {
    expect(detectClearance('Active TS/SCI required')).toBe(true);
    expect(detectClearance('Must be able to obtain a security clearance')).toBe(true);
    expect(detectClearance('Top Secret eligibility preferred')).toBe(true);
    expect(detectClearance('Secret clearance a plus')).toBe(true);
  });

  it('returns false when no clearance keywords present', () => {
    expect(detectClearance('Design rocket engines all day')).toBe(false);
    expect(detectClearance('')).toBe(false);
    expect(detectClearance(null)).toBe(false);
    expect(detectClearance(undefined)).toBe(false);
  });

  it('does not match secretary/secretion substrings', () => {
    expect(detectClearance('Executive Secretary to the CEO')).toBe(false);
  });
});

describe('ATS_BOARDS config', () => {
  it('has unique provider:token pairs', () => {
    const keys = ATS_BOARDS.map((b) => `${b.provider}:${b.token}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('only uses supported providers', () => {
    for (const board of ATS_BOARDS) {
      expect(['greenhouse', 'lever', 'ashby']).toContain(board.provider);
    }
  });

  it('includes the expected 16 boards', () => {
    expect(ATS_BOARDS).toHaveLength(16);
    expect(ATS_BOARDS.filter((b) => b.provider === 'greenhouse')).toHaveLength(14);
    expect(ATS_BOARDS.filter((b) => b.provider === 'lever')).toHaveLength(1);
    expect(ATS_BOARDS.filter((b) => b.provider === 'ashby')).toHaveLength(1);
  });
});
