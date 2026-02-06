import { contactFormSchema, validateBody } from '../validations';

describe('Contact Form Validation', () => {
  const validData = {
    name: 'John Doe',
    email: 'john@example.com',
    subject: 'general',
    message: 'This is a test message that is long enough.',
  };

  it('accepts valid contact form data', () => {
    const result = validateBody(contactFormSchema, validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('John Doe');
      expect(result.data.email).toBe('john@example.com');
      expect(result.data.subject).toBe('general');
    }
  });

  it('trims whitespace from name and message', () => {
    const result = validateBody(contactFormSchema, {
      ...validData,
      name: '  Jane Doe  ',
      message: '  This is a test message with spaces.  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Jane Doe');
      expect(result.data.message).toBe('This is a test message with spaces.');
    }
  });

  it('lowercases email', () => {
    const result = validateBody(contactFormSchema, {
      ...validData,
      email: 'John@Example.COM',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('john@example.com');
    }
  });

  it('rejects missing name', () => {
    const result = validateBody(contactFormSchema, {
      ...validData,
      name: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.name).toBeDefined();
    }
  });

  it('rejects invalid email', () => {
    const result = validateBody(contactFormSchema, {
      ...validData,
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.email).toBeDefined();
    }
  });

  it('rejects invalid subject', () => {
    const result = validateBody(contactFormSchema, {
      ...validData,
      subject: 'invalid-subject',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.subject).toBeDefined();
    }
  });

  it('accepts all valid subjects', () => {
    for (const subject of ['general', 'technical', 'billing', 'partnership']) {
      const result = validateBody(contactFormSchema, { ...validData, subject });
      expect(result.success).toBe(true);
    }
  });

  it('rejects message under 10 characters', () => {
    const result = validateBody(contactFormSchema, {
      ...validData,
      message: 'short',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.message).toBeDefined();
    }
  });

  it('rejects message over 5000 characters', () => {
    const result = validateBody(contactFormSchema, {
      ...validData,
      message: 'x'.repeat(5001),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.message).toBeDefined();
    }
  });

  it('rejects completely missing fields', () => {
    const result = validateBody(contactFormSchema, {});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.keys(result.errors).length).toBeGreaterThan(0);
    }
  });
});
