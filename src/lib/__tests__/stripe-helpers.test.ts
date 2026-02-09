/**
 * @jest-environment node
 */

import {
  generatePaymentFailedEmail,
  generateSubscriptionConfirmEmail,
} from '../stripe-helpers';

// ---------------------------------------------------------------------------
// generatePaymentFailedEmail
// ---------------------------------------------------------------------------
describe('generatePaymentFailedEmail', () => {
  const result = generatePaymentFailedEmail('Alice Johnson', 2999);

  it('returns an object with subject, html, and text', () => {
    expect(result).toHaveProperty('subject');
    expect(result).toHaveProperty('html');
    expect(result).toHaveProperty('text');
  });

  it('has the correct subject line', () => {
    expect(result.subject).toBe('SpaceNexus - Payment Failed: Action Required');
  });

  it('html contains the user name (HTML-escaped)', () => {
    expect(result.html).toContain('Alice Johnson');
  });

  it('formats the amount correctly (cents to dollars)', () => {
    // 2999 cents = $29.99
    expect(result.html).toContain('$29.99');
    expect(result.text).toContain('$29.99');
  });

  it('html contains required HTML structure tags', () => {
    expect(result.html).toContain('<!DOCTYPE html>');
    expect(result.html).toContain('<html>');
    expect(result.html).toContain('<body');
    expect(result.html).toContain('</body>');
    expect(result.html).toContain('</html>');
  });

  it('text version contains the user name', () => {
    expect(result.text).toContain('Alice Johnson');
  });

  it('html contains a link to update payment method', () => {
    expect(result.html).toContain('/pricing');
    expect(result.html).toContain('Update Payment Method');
  });

  it('escapes HTML special characters in names', () => {
    const xssResult = generatePaymentFailedEmail('<script>alert("xss")</script>', 1000);
    expect(xssResult.html).not.toContain('<script>');
    expect(xssResult.html).toContain('&lt;script&gt;');
  });
});

// ---------------------------------------------------------------------------
// generateSubscriptionConfirmEmail
// ---------------------------------------------------------------------------
describe('generateSubscriptionConfirmEmail', () => {
  it('returns an object with subject, html, and text', () => {
    const result = generateSubscriptionConfirmEmail('Bob Smith', 'pro', 4999);
    expect(result).toHaveProperty('subject');
    expect(result).toHaveProperty('html');
    expect(result).toHaveProperty('text');
  });

  it('capitalizes the tier name in the subject for pro', () => {
    const result = generateSubscriptionConfirmEmail('Bob', 'pro', 4999);
    expect(result.subject).toBe('Welcome to SpaceNexus Pro!');
  });

  it('capitalizes the tier name in the subject for enterprise', () => {
    const result = generateSubscriptionConfirmEmail('Bob', 'enterprise', 9999);
    expect(result.subject).toBe('Welcome to SpaceNexus Enterprise!');
  });

  it('formats the amount correctly (cents to dollars)', () => {
    const result = generateSubscriptionConfirmEmail('Carol', 'pro', 4999);
    expect(result.html).toContain('$49.99');
    expect(result.text).toContain('$49.99');
  });

  it('html contains the capitalized tier display name', () => {
    const result = generateSubscriptionConfirmEmail('Dave', 'enterprise', 9999);
    expect(result.html).toContain('Enterprise');
  });

  it('html contains required HTML structure tags', () => {
    const result = generateSubscriptionConfirmEmail('Eve', 'pro', 4999);
    expect(result.html).toContain('<!DOCTYPE html>');
    expect(result.html).toContain('<html>');
    expect(result.html).toContain('<body');
    expect(result.html).toContain('</body>');
    expect(result.html).toContain('</html>');
  });

  it('html contains a link to the dashboard', () => {
    const result = generateSubscriptionConfirmEmail('Frank', 'pro', 4999);
    expect(result.html).toContain('/mission-control');
    expect(result.html).toContain('Go to Dashboard');
  });

  it('text version contains the tier and amount', () => {
    const result = generateSubscriptionConfirmEmail('Grace', 'pro', 2500);
    expect(result.text).toContain('Pro');
    expect(result.text).toContain('$25.00');
  });

  it('escapes HTML special characters in names', () => {
    const result = generateSubscriptionConfirmEmail('O\'Brien & Co', 'pro', 4999);
    expect(result.html).toContain('O&#39;Brien &amp; Co');
    expect(result.html).not.toContain("O'Brien & Co");
  });
});
