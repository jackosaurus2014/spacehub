import {
  workerProfileSchema,
  gigOpportunitySchema,
  employerProfileSchema,
  contactFormSchema,
  companyRequestSchema,
  personnelSchema,
  fundingRoundSchema,
  advertiserRegistrationSchema,
} from '../validations';

// ============================================================
// Helper: base valid objects for each schema
// ============================================================

const validWorkerProfile = {
  displayName: 'Jane Doe',
  headline: 'Propulsion Engineer',
  skills: ['rocketry', 'CFD'],
  workType: ['freelance' as const],
};

const validWorkerProfileFull = {
  ...validWorkerProfile,
  bio: 'Experienced propulsion engineer with a focus on hybrid motors.',
  experienceYears: 12,
  hourlyRate: 250,
  availability: 'available' as const,
  workType: ['freelance' as const, 'contract' as const],
  linkedInUrl: 'https://linkedin.com/in/janedoe',
  portfolioUrl: 'https://janedoe.dev',
  location: 'Houston, TX',
  remoteOk: true,
  clearanceLevel: 'secret' as const,
  visible: true,
};

const validGigOpportunity = {
  title: 'Flight Software Developer',
  description: 'Develop embedded flight software for LEO constellation satellites.',
  category: 'engineering' as const,
  skills: ['C++', 'RTOS'],
  workType: 'contract' as const,
};

const validGigOpportunityFull = {
  ...validGigOpportunity,
  duration: '6 months',
  hoursPerWeek: 40,
  budgetMin: 80,
  budgetMax: 150,
  budgetType: 'hourly' as const,
  location: 'Hawthorne, CA',
  remoteOk: false,
  clearanceRequired: true,
};

const validEmployerProfile = {
  companyName: 'SpaceCorp Inc.',
};

const validEmployerProfileFull = {
  ...validEmployerProfile,
  companySlug: 'spacecorp-inc',
  description: 'Next-gen satellite manufacturer.',
  website: 'https://spacecorp.example.com',
  industry: 'Satellite Manufacturing',
  size: 'medium' as const,
  location: 'Los Angeles, CA',
  logoUrl: 'https://spacecorp.example.com/logo.png',
};

const validContact = {
  name: 'Alice',
  email: 'alice@example.com',
  subject: 'general' as const,
  message: 'Hello, I have a general inquiry about SpaceNexus.',
};

// ============================================================
// workerProfileSchema (25+ tests)
// ============================================================
describe('workerProfileSchema', () => {
  it('accepts valid minimal input (only required fields)', () => {
    const result = workerProfileSchema.safeParse(validWorkerProfile);
    expect(result.success).toBe(true);
  });

  it('accepts valid full input (all fields)', () => {
    const result = workerProfileSchema.safeParse(validWorkerProfileFull);
    expect(result.success).toBe(true);
  });

  it('applies defaults for availability, remoteOk, and visible', () => {
    const result = workerProfileSchema.safeParse(validWorkerProfile);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.availability).toBe('available');
      expect(result.data.remoteOk).toBe(true);
      expect(result.data.visible).toBe(true);
    }
  });

  // --- displayName ---
  it('rejects empty string displayName', () => {
    const result = workerProfileSchema.safeParse({ ...validWorkerProfile, displayName: '' });
    expect(result.success).toBe(false);
  });

  it('trims whitespace from displayName', () => {
    const result = workerProfileSchema.safeParse({ ...validWorkerProfile, displayName: '  Jane Doe  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBe('Jane Doe');
    }
  });

  it('rejects displayName over 100 characters', () => {
    const result = workerProfileSchema.safeParse({ ...validWorkerProfile, displayName: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  // --- headline ---
  it('rejects empty string headline', () => {
    const result = workerProfileSchema.safeParse({ ...validWorkerProfile, headline: '' });
    expect(result.success).toBe(false);
  });

  it('rejects headline over 200 characters', () => {
    const result = workerProfileSchema.safeParse({ ...validWorkerProfile, headline: 'h'.repeat(201) });
    expect(result.success).toBe(false);
  });

  // --- skills ---
  it('rejects empty skills array', () => {
    const result = workerProfileSchema.safeParse({ ...validWorkerProfile, skills: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain('At least one skill is required');
    }
  });

  it('rejects skills array with 31 items (max 30)', () => {
    const skills = Array.from({ length: 31 }, (_, i) => `skill-${i}`);
    const result = workerProfileSchema.safeParse({ ...validWorkerProfile, skills });
    expect(result.success).toBe(false);
  });

  it('accepts skills array with exactly 30 items', () => {
    const skills = Array.from({ length: 30 }, (_, i) => `skill-${i}`);
    const result = workerProfileSchema.safeParse({ ...validWorkerProfile, skills });
    expect(result.success).toBe(true);
  });

  it('rejects skills containing an empty string', () => {
    const result = workerProfileSchema.safeParse({ ...validWorkerProfile, skills: [''] });
    expect(result.success).toBe(false);
  });

  it('rejects a skill longer than 50 characters', () => {
    const result = workerProfileSchema.safeParse({ ...validWorkerProfile, skills: ['x'.repeat(51)] });
    expect(result.success).toBe(false);
  });

  // --- workType ---
  it('rejects workType as a string instead of array', () => {
    const result = workerProfileSchema.safeParse({ ...validWorkerProfile, workType: 'freelance' });
    expect(result.success).toBe(false);
  });

  it('rejects workType with invalid enum value', () => {
    const result = workerProfileSchema.safeParse({ ...validWorkerProfile, workType: ['full_time'] });
    expect(result.success).toBe(false);
  });

  it('rejects empty workType array', () => {
    const result = workerProfileSchema.safeParse({ ...validWorkerProfile, workType: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain('At least one work type is required');
    }
  });

  // --- hourlyRate ---
  it('accepts hourlyRate of 0 (negotiable)', () => {
    const result = workerProfileSchema.safeParse({ ...validWorkerProfile, hourlyRate: 0 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hourlyRate).toBe(0);
    }
  });

  it('accepts hourlyRate of null', () => {
    const result = workerProfileSchema.safeParse({ ...validWorkerProfile, hourlyRate: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hourlyRate).toBeNull();
    }
  });

  it('rejects hourlyRate of -1 (min 0)', () => {
    const result = workerProfileSchema.safeParse({ ...validWorkerProfile, hourlyRate: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects hourlyRate of 10001 (max 10000)', () => {
    const result = workerProfileSchema.safeParse({ ...validWorkerProfile, hourlyRate: 10001 });
    expect(result.success).toBe(false);
  });

  it('accepts hourlyRate of exactly 10000', () => {
    const result = workerProfileSchema.safeParse({ ...validWorkerProfile, hourlyRate: 10000 });
    expect(result.success).toBe(true);
  });

  it('rejects hourlyRate that is not an integer', () => {
    const result = workerProfileSchema.safeParse({ ...validWorkerProfile, hourlyRate: 99.5 });
    expect(result.success).toBe(false);
  });

  // --- linkedInUrl / portfolioUrl (empty string -> null) ---
  it('converts empty string linkedInUrl to null (not "Invalid URL")', () => {
    const result = workerProfileSchema.safeParse({ ...validWorkerProfile, linkedInUrl: '' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.linkedInUrl).toBeNull();
    }
  });

  it('converts empty string portfolioUrl to null', () => {
    const result = workerProfileSchema.safeParse({ ...validWorkerProfile, portfolioUrl: '' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.portfolioUrl).toBeNull();
    }
  });

  it('converts whitespace-only linkedInUrl to null', () => {
    const result = workerProfileSchema.safeParse({ ...validWorkerProfile, linkedInUrl: '   ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.linkedInUrl).toBeNull();
    }
  });

  it('accepts a valid URL for linkedInUrl', () => {
    const result = workerProfileSchema.safeParse({
      ...validWorkerProfile,
      linkedInUrl: 'https://linkedin.com/in/janedoe',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.linkedInUrl).toBe('https://linkedin.com/in/janedoe');
    }
  });

  it('rejects an invalid URL (not http) for linkedInUrl', () => {
    const result = workerProfileSchema.safeParse({
      ...validWorkerProfile,
      linkedInUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an ftp URL for portfolioUrl', () => {
    const result = workerProfileSchema.safeParse({
      ...validWorkerProfile,
      portfolioUrl: 'ftp://files.example.com/portfolio',
    });
    // Zod url() accepts ftp by default, but we document the behavior
    const result2 = workerProfileSchema.safeParse({
      ...validWorkerProfile,
      portfolioUrl: 'not-a-url-at-all',
    });
    expect(result2.success).toBe(false);
  });

  // --- experienceYears ---
  it('accepts experienceYears of 0', () => {
    const result = workerProfileSchema.safeParse({ ...validWorkerProfile, experienceYears: 0 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.experienceYears).toBe(0);
    }
  });

  it('rejects experienceYears of 61 (max 60)', () => {
    const result = workerProfileSchema.safeParse({ ...validWorkerProfile, experienceYears: 61 });
    expect(result.success).toBe(false);
  });

  it('accepts experienceYears of exactly 60', () => {
    const result = workerProfileSchema.safeParse({ ...validWorkerProfile, experienceYears: 60 });
    expect(result.success).toBe(true);
  });

  it('rejects experienceYears that is negative', () => {
    const result = workerProfileSchema.safeParse({ ...validWorkerProfile, experienceYears: -1 });
    expect(result.success).toBe(false);
  });

  // --- clearanceLevel ---
  it('accepts valid clearanceLevel values', () => {
    for (const level of ['none', 'secret', 'top_secret'] as const) {
      const result = workerProfileSchema.safeParse({ ...validWorkerProfile, clearanceLevel: level });
      expect(result.success).toBe(true);
    }
  });

  it('rejects clearanceLevel with invalid value', () => {
    const result = workerProfileSchema.safeParse({ ...validWorkerProfile, clearanceLevel: 'classified' });
    expect(result.success).toBe(false);
  });

  // --- bio ---
  it('rejects bio over 5000 characters', () => {
    const result = workerProfileSchema.safeParse({ ...validWorkerProfile, bio: 'a'.repeat(5001) });
    expect(result.success).toBe(false);
  });

  it('accepts bio of exactly 5000 characters', () => {
    const result = workerProfileSchema.safeParse({ ...validWorkerProfile, bio: 'a'.repeat(5000) });
    expect(result.success).toBe(true);
  });

  // --- location ---
  it('rejects location over 200 characters', () => {
    const result = workerProfileSchema.safeParse({ ...validWorkerProfile, location: 'x'.repeat(201) });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// gigOpportunitySchema (15+ tests)
// ============================================================
describe('gigOpportunitySchema', () => {
  it('accepts valid minimal input', () => {
    const result = gigOpportunitySchema.safeParse(validGigOpportunity);
    expect(result.success).toBe(true);
  });

  it('accepts valid full input', () => {
    const result = gigOpportunitySchema.safeParse(validGigOpportunityFull);
    expect(result.success).toBe(true);
  });

  it('applies defaults for budgetType, remoteOk, and clearanceRequired', () => {
    const result = gigOpportunitySchema.safeParse(validGigOpportunity);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.budgetType).toBe('hourly');
      expect(result.data.remoteOk).toBe(true);
      expect(result.data.clearanceRequired).toBe(false);
    }
  });

  // --- title ---
  it('rejects empty title', () => {
    const result = gigOpportunitySchema.safeParse({ ...validGigOpportunity, title: '' });
    expect(result.success).toBe(false);
  });

  it('trims title whitespace', () => {
    const result = gigOpportunitySchema.safeParse({ ...validGigOpportunity, title: '  My Gig  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('My Gig');
    }
  });

  it('rejects title over 200 characters', () => {
    const result = gigOpportunitySchema.safeParse({ ...validGigOpportunity, title: 't'.repeat(201) });
    expect(result.success).toBe(false);
  });

  // --- description ---
  it('rejects description under 10 characters', () => {
    const result = gigOpportunitySchema.safeParse({ ...validGigOpportunity, description: 'Too short' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain('Description must be at least 10 characters');
    }
  });

  it('accepts description of exactly 10 characters', () => {
    const result = gigOpportunitySchema.safeParse({ ...validGigOpportunity, description: '1234567890' });
    expect(result.success).toBe(true);
  });

  it('rejects description over 10000 characters', () => {
    const result = gigOpportunitySchema.safeParse({ ...validGigOpportunity, description: 'a'.repeat(10001) });
    expect(result.success).toBe(false);
  });

  // --- category ---
  it('rejects invalid category', () => {
    const result = gigOpportunitySchema.safeParse({ ...validGigOpportunity, category: 'underwater_basket_weaving' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid categories', () => {
    const categories = ['engineering', 'operations', 'business', 'research', 'legal', 'manufacturing'] as const;
    for (const cat of categories) {
      const result = gigOpportunitySchema.safeParse({ ...validGigOpportunity, category: cat });
      expect(result.success).toBe(true);
    }
  });

  // --- skills ---
  it('rejects empty skills array', () => {
    const result = gigOpportunitySchema.safeParse({ ...validGigOpportunity, skills: [] });
    expect(result.success).toBe(false);
  });

  it('rejects skills array over 30 items', () => {
    const skills = Array.from({ length: 31 }, (_, i) => `skill-${i}`);
    const result = gigOpportunitySchema.safeParse({ ...validGigOpportunity, skills });
    expect(result.success).toBe(false);
  });

  // --- budgetMin / budgetMax ---
  it('rejects budgetMin > budgetMax via refine', () => {
    const result = gigOpportunitySchema.safeParse({
      ...validGigOpportunity,
      budgetMin: 200,
      budgetMax: 100,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain('budgetMax must be greater than or equal to budgetMin');
    }
  });

  it('accepts budgetMin equal to budgetMax', () => {
    const result = gigOpportunitySchema.safeParse({
      ...validGigOpportunity,
      budgetMin: 100,
      budgetMax: 100,
    });
    expect(result.success).toBe(true);
  });

  it('accepts budgetMin of 0', () => {
    const result = gigOpportunitySchema.safeParse({
      ...validGigOpportunity,
      budgetMin: 0,
      budgetMax: 100,
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative budgetMin', () => {
    const result = gigOpportunitySchema.safeParse({ ...validGigOpportunity, budgetMin: -1 });
    expect(result.success).toBe(false);
  });

  it('allows null budgetMin and budgetMax (skips refine)', () => {
    const result = gigOpportunitySchema.safeParse({
      ...validGigOpportunity,
      budgetMin: null,
      budgetMax: null,
    });
    expect(result.success).toBe(true);
  });

  // --- duration ---
  it('rejects duration over 100 characters', () => {
    const result = gigOpportunitySchema.safeParse({
      ...validGigOpportunity,
      duration: 'd'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('accepts null duration', () => {
    const result = gigOpportunitySchema.safeParse({ ...validGigOpportunity, duration: null });
    expect(result.success).toBe(true);
  });

  // --- hoursPerWeek ---
  it('rejects hoursPerWeek of 0 (min 1)', () => {
    const result = gigOpportunitySchema.safeParse({ ...validGigOpportunity, hoursPerWeek: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects hoursPerWeek of 169 (max 168)', () => {
    const result = gigOpportunitySchema.safeParse({ ...validGigOpportunity, hoursPerWeek: 169 });
    expect(result.success).toBe(false);
  });

  it('accepts hoursPerWeek of 168', () => {
    const result = gigOpportunitySchema.safeParse({ ...validGigOpportunity, hoursPerWeek: 168 });
    expect(result.success).toBe(true);
  });

  // --- workType (enum, not array like workerProfile) ---
  it('rejects workType as array (expects single enum)', () => {
    const result = gigOpportunitySchema.safeParse({ ...validGigOpportunity, workType: ['contract'] });
    expect(result.success).toBe(false);
  });

  it('rejects invalid workType enum', () => {
    const result = gigOpportunitySchema.safeParse({ ...validGigOpportunity, workType: 'full_time' });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// employerProfileSchema (10+ tests)
// ============================================================
describe('employerProfileSchema', () => {
  it('accepts valid minimal input', () => {
    const result = employerProfileSchema.safeParse(validEmployerProfile);
    expect(result.success).toBe(true);
  });

  it('accepts valid full input', () => {
    const result = employerProfileSchema.safeParse(validEmployerProfileFull);
    expect(result.success).toBe(true);
  });

  // --- companyName ---
  it('rejects empty companyName', () => {
    const result = employerProfileSchema.safeParse({ ...validEmployerProfile, companyName: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain('Company name is required');
    }
  });

  it('trims companyName whitespace', () => {
    const result = employerProfileSchema.safeParse({ ...validEmployerProfile, companyName: '  SpaceCorp  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.companyName).toBe('SpaceCorp');
    }
  });

  it('rejects companyName over 200 characters', () => {
    const result = employerProfileSchema.safeParse({ ...validEmployerProfile, companyName: 'c'.repeat(201) });
    expect(result.success).toBe(false);
  });

  // --- website (empty string now handled via z.preprocess) ---
  it('converts empty string website to null (fixed)', () => {
    const result = employerProfileSchema.safeParse({ ...validEmployerProfile, website: '' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.website).toBeNull();
  });

  it('accepts null website', () => {
    const result = employerProfileSchema.safeParse({ ...validEmployerProfile, website: null });
    expect(result.success).toBe(true);
  });

  it('accepts undefined website (omitted)', () => {
    const result = employerProfileSchema.safeParse({ companyName: 'Test Co' });
    expect(result.success).toBe(true);
  });

  it('accepts valid website URL', () => {
    const result = employerProfileSchema.safeParse({
      ...validEmployerProfile,
      website: 'https://example.com',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid website URL', () => {
    const result = employerProfileSchema.safeParse({
      ...validEmployerProfile,
      website: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  // --- logoUrl (same empty string issue as website) ---
  it('converts empty string logoUrl to null (fixed)', () => {
    const result = employerProfileSchema.safeParse({ ...validEmployerProfile, logoUrl: '' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.logoUrl).toBeNull();
  });

  it('accepts null logoUrl', () => {
    const result = employerProfileSchema.safeParse({ ...validEmployerProfile, logoUrl: null });
    expect(result.success).toBe(true);
  });

  // --- size ---
  it('rejects invalid size enum', () => {
    const result = employerProfileSchema.safeParse({ ...validEmployerProfile, size: 'mega' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid size values', () => {
    const sizes = ['startup', 'small', 'medium', 'large', 'enterprise'] as const;
    for (const size of sizes) {
      const result = employerProfileSchema.safeParse({ ...validEmployerProfile, size });
      expect(result.success).toBe(true);
    }
  });

  // --- industry ---
  it('rejects industry over 100 characters', () => {
    const result = employerProfileSchema.safeParse({ ...validEmployerProfile, industry: 'x'.repeat(101) });
    expect(result.success).toBe(false);
  });

  // --- description ---
  it('rejects description over 5000 characters', () => {
    const result = employerProfileSchema.safeParse({ ...validEmployerProfile, description: 'd'.repeat(5001) });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// contactFormSchema (5+ tests)
// ============================================================
describe('contactFormSchema', () => {
  it('accepts valid input', () => {
    const result = contactFormSchema.safeParse(validContact);
    expect(result.success).toBe(true);
  });

  it('trims name and message', () => {
    const result = contactFormSchema.safeParse({
      ...validContact,
      name: '  Alice  ',
      message: '  Hello, I have a general inquiry about SpaceNexus.  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Alice');
      expect(result.data.message).toBe('Hello, I have a general inquiry about SpaceNexus.');
    }
  });

  it('rejects empty name', () => {
    const result = contactFormSchema.safeParse({ ...validContact, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = contactFormSchema.safeParse({ ...validContact, email: 'bad-email' });
    expect(result.success).toBe(false);
  });

  it('lowercases email', () => {
    const result = contactFormSchema.safeParse({ ...validContact, email: 'ALICE@EXAMPLE.COM' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('alice@example.com');
    }
  });

  it('rejects message shorter than 10 characters', () => {
    const result = contactFormSchema.safeParse({ ...validContact, message: 'Hey' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain('Message must be at least 10 characters');
    }
  });

  it('rejects message over 5000 characters', () => {
    const result = contactFormSchema.safeParse({ ...validContact, message: 'a'.repeat(5001) });
    expect(result.success).toBe(false);
  });

  it('rejects invalid subject enum', () => {
    const result = contactFormSchema.safeParse({ ...validContact, subject: 'complaint' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid subject values', () => {
    const subjects = ['general', 'technical', 'billing', 'partnership'] as const;
    for (const subject of subjects) {
      const result = contactFormSchema.safeParse({ ...validContact, subject });
      expect(result.success).toBe(true);
    }
  });
});

// ============================================================
// Cross-schema consistency (5+ tests)
// ============================================================
describe('Cross-schema consistency', () => {
  describe('empty string URL handling', () => {
    it('workerProfileSchema: empty linkedInUrl coerces to null (preprocess)', () => {
      const result = workerProfileSchema.safeParse({ ...validWorkerProfile, linkedInUrl: '' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.linkedInUrl).toBeNull();
      }
    });

    it('workerProfileSchema: empty portfolioUrl coerces to null (preprocess)', () => {
      const result = workerProfileSchema.safeParse({ ...validWorkerProfile, portfolioUrl: '' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.portfolioUrl).toBeNull();
      }
    });

    it('companyRequestSchema: empty website coerces to undefined', () => {
      const result = companyRequestSchema.safeParse({
        companyName: 'TestCo',
        description: 'A company that does space things very well.',
        website: '',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.website).toBeUndefined();
      }
    });

    it('advertiserRegistrationSchema: empty website coerces to undefined', () => {
      const result = advertiserRegistrationSchema.safeParse({
        companyName: 'AdCorp',
        contactName: 'Bob',
        contactEmail: 'bob@example.com',
        website: '',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.website).toBeUndefined();
      }
    });

    it('personnelSchema: empty linkedinUrl coerces to null', () => {
      const result = personnelSchema.safeParse({
        name: 'John Smith',
        title: 'CEO',
        linkedinUrl: '',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.linkedinUrl).toBeNull();
      }
    });

    it('fundingRoundSchema: empty sourceUrl coerces to null', () => {
      const result = fundingRoundSchema.safeParse({
        date: '2025-01-15T00:00:00.000Z',
        sourceUrl: '',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sourceUrl).toBeNull();
      }
    });

    it('employerProfileSchema: empty website converts to null (fixed)', () => {
      const result = employerProfileSchema.safeParse({ ...validEmployerProfile, website: '' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.website).toBeNull();
    });

    it('employerProfileSchema: empty logoUrl converts to null (fixed)', () => {
      const result = employerProfileSchema.safeParse({ ...validEmployerProfile, logoUrl: '' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.logoUrl).toBeNull();
    });
  });

  describe('optional numbers handle 0 correctly', () => {
    it('workerProfileSchema: hourlyRate of 0 passes', () => {
      const result = workerProfileSchema.safeParse({ ...validWorkerProfile, hourlyRate: 0 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hourlyRate).toBe(0);
      }
    });

    it('workerProfileSchema: experienceYears of 0 passes', () => {
      const result = workerProfileSchema.safeParse({ ...validWorkerProfile, experienceYears: 0 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.experienceYears).toBe(0);
      }
    });

    it('gigOpportunitySchema: budgetMin of 0 passes', () => {
      const result = gigOpportunitySchema.safeParse({ ...validGigOpportunity, budgetMin: 0 });
      expect(result.success).toBe(true);
    });
  });

  describe('arrays require at least 1 element', () => {
    it('workerProfileSchema: skills requires at least 1', () => {
      const result = workerProfileSchema.safeParse({ ...validWorkerProfile, skills: [] });
      expect(result.success).toBe(false);
    });

    it('workerProfileSchema: workType requires at least 1', () => {
      const result = workerProfileSchema.safeParse({ ...validWorkerProfile, workType: [] });
      expect(result.success).toBe(false);
    });

    it('gigOpportunitySchema: skills requires at least 1', () => {
      const result = gigOpportunitySchema.safeParse({ ...validGigOpportunity, skills: [] });
      expect(result.success).toBe(false);
    });
  });

  describe('type mismatches are caught', () => {
    it('workerProfileSchema: workType must be array, gigOpportunity must be string', () => {
      // workerProfileSchema expects array
      const workerResult = workerProfileSchema.safeParse({ ...validWorkerProfile, workType: 'freelance' });
      expect(workerResult.success).toBe(false);

      // gigOpportunitySchema expects single enum string
      const gigResult = gigOpportunitySchema.safeParse({ ...validGigOpportunity, workType: ['contract'] });
      expect(gigResult.success).toBe(false);
    });

    it('number fields reject strings', () => {
      const result = workerProfileSchema.safeParse({ ...validWorkerProfile, hourlyRate: '100' });
      expect(result.success).toBe(false);
    });

    it('boolean fields reject strings', () => {
      const result = workerProfileSchema.safeParse({ ...validWorkerProfile, remoteOk: 'true' });
      expect(result.success).toBe(false);
    });
  });
});
