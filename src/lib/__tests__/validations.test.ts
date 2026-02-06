import {
  emailSchema,
  passwordSchema,
  nameSchema,
  paginationSchema,
  contactFormSchema,
  featureRequestSchema,
  helpRequestSchema,
  newsletterSubscribeSchema,
  registerSchema,
  loginSchema,
  validateBody,
} from '../validations';

// ---------------------------------------------------------------------------
// emailSchema
// ---------------------------------------------------------------------------
describe('emailSchema', () => {
  it('accepts a valid email address', () => {
    const result = emailSchema.safeParse('user@example.com');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('user@example.com');
    }
  });

  it('normalizes email by lowercasing', () => {
    const result = emailSchema.safeParse('User@Example.COM');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('user@example.com');
    }
  });

  it('rejects an invalid email address', () => {
    const result = emailSchema.safeParse('not-an-email');
    expect(result.success).toBe(false);
  });

  it('rejects an empty string', () => {
    const result = emailSchema.safeParse('');
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// passwordSchema
// ---------------------------------------------------------------------------
describe('passwordSchema', () => {
  it('accepts a valid password with 6+ characters', () => {
    const result = passwordSchema.safeParse('secret');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('secret');
    }
  });

  it('rejects a password shorter than 6 characters', () => {
    const result = passwordSchema.safeParse('abc');
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain('Password must be at least 6 characters');
    }
  });

  it('rejects a password longer than 128 characters', () => {
    const result = passwordSchema.safeParse('a'.repeat(129));
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain('Password is too long');
    }
  });
});

// ---------------------------------------------------------------------------
// nameSchema
// ---------------------------------------------------------------------------
describe('nameSchema', () => {
  it('accepts a valid name', () => {
    const result = nameSchema.safeParse('Alice');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('Alice');
    }
  });

  it('rejects an empty string', () => {
    const result = nameSchema.safeParse('');
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain('Name is required');
    }
  });

  it('rejects a name longer than 100 characters', () => {
    const result = nameSchema.safeParse('a'.repeat(101));
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain('Name is too long');
    }
  });

  it('trims whitespace from a valid name', () => {
    const result = nameSchema.safeParse('  Bob  ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('Bob');
    }
  });
});

// ---------------------------------------------------------------------------
// paginationSchema
// ---------------------------------------------------------------------------
describe('paginationSchema', () => {
  it('uses defaults when no values are provided', () => {
    const result = paginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
      expect(result.data.offset).toBe(0);
    }
  });

  it('accepts custom values', () => {
    const result = paginationSchema.safeParse({ limit: '50', offset: '10' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
      expect(result.data.offset).toBe(10);
    }
  });

  it('caps limit at 100', () => {
    const result = paginationSchema.safeParse({ limit: '200' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(100);
    }
  });

  it('clamps negative offset to 0', () => {
    const result = paginationSchema.safeParse({ offset: '-5' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.offset).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// contactFormSchema
// ---------------------------------------------------------------------------
describe('contactFormSchema', () => {
  const validContact = {
    name: 'Alice',
    email: 'alice@example.com',
    subject: 'general' as const,
    message: 'This is a message that is long enough.',
  };

  it('accepts valid contact data', () => {
    const result = contactFormSchema.safeParse(validContact);
    expect(result.success).toBe(true);
  });

  it('rejects an invalid subject', () => {
    const result = contactFormSchema.safeParse({
      ...validContact,
      subject: 'invalid_subject',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a message that is too short', () => {
    const result = contactFormSchema.safeParse({
      ...validContact,
      message: 'Short',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain('Message must be at least 10 characters');
    }
  });
});

// ---------------------------------------------------------------------------
// featureRequestSchema
// ---------------------------------------------------------------------------
describe('featureRequestSchema', () => {
  const validFeature = {
    type: 'new_module' as const,
    title: 'A new feature title',
    details: 'This feature needs detailed description that is at least twenty characters.',
    email: 'dev@example.com',
  };

  it('accepts valid feature request data', () => {
    const result = featureRequestSchema.safeParse(validFeature);
    expect(result.success).toBe(true);
  });

  it('rejects an invalid type enum value', () => {
    const result = featureRequestSchema.safeParse({
      ...validFeature,
      type: 'bad_type',
    });
    expect(result.success).toBe(false);
  });

  it('rejects when required fields are missing', () => {
    const result = featureRequestSchema.safeParse({
      type: 'existing_module',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain('title');
      expect(paths).toContain('details');
      expect(paths).toContain('email');
    }
  });
});

// ---------------------------------------------------------------------------
// helpRequestSchema
// ---------------------------------------------------------------------------
describe('helpRequestSchema', () => {
  const validHelp = {
    subject: 'Need help with my account',
    details: 'I cannot access the dashboard since yesterday and I need to recover my data.',
    email: 'help@example.com',
  };

  it('accepts valid help request data', () => {
    const result = helpRequestSchema.safeParse(validHelp);
    expect(result.success).toBe(true);
  });

  it('rejects when required fields are missing', () => {
    const result = helpRequestSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain('subject');
      expect(paths).toContain('details');
      expect(paths).toContain('email');
    }
  });
});

// ---------------------------------------------------------------------------
// newsletterSubscribeSchema
// ---------------------------------------------------------------------------
describe('newsletterSubscribeSchema', () => {
  it('accepts email only', () => {
    const result = newsletterSubscribeSchema.safeParse({
      email: 'sub@example.com',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('sub@example.com');
      expect(result.data.name).toBeUndefined();
    }
  });

  it('accepts email with a name', () => {
    const result = newsletterSubscribeSchema.safeParse({
      email: 'sub@example.com',
      name: 'Subscriber',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Subscriber');
    }
  });

  it('rejects an invalid email', () => {
    const result = newsletterSubscribeSchema.safeParse({
      email: 'bad-email',
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// registerSchema
// ---------------------------------------------------------------------------
describe('registerSchema', () => {
  it('accepts matching passwords', () => {
    const result = registerSchema.safeParse({
      email: 'new@example.com',
      password: 'securepass',
      confirmPassword: 'securepass',
    });
    expect(result.success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = registerSchema.safeParse({
      email: 'new@example.com',
      password: 'securepass',
      confirmPassword: 'different',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain('Passwords do not match');
    }
  });
});

// ---------------------------------------------------------------------------
// loginSchema
// ---------------------------------------------------------------------------
describe('loginSchema', () => {
  it('accepts valid login data', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'mypassword',
    });
    expect(result.success).toBe(true);
  });

  it('rejects when password is missing (empty string)', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain('Password is required');
    }
  });
});

// ---------------------------------------------------------------------------
// validateBody
// ---------------------------------------------------------------------------
describe('validateBody', () => {
  it('returns structured errors on invalid data', () => {
    const result = validateBody(loginSchema, { email: 'bad', password: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toBeDefined();
      // At least one field should have an error array
      const keys = Object.keys(result.errors);
      expect(keys.length).toBeGreaterThan(0);
      for (const key of keys) {
        expect(Array.isArray(result.errors[key])).toBe(true);
      }
    }
  });

  it('returns parsed data on valid input', () => {
    const result = validateBody(loginSchema, {
      email: 'USER@Example.com',
      password: 'secret123',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
      expect(result.data.password).toBe('secret123');
    }
  });
});
