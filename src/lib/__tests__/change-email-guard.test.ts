/**
 * Self-serve email change (2026-09-10). Pins the security properties:
 * password re-check, uniqueness, verification to the NEW address before
 * anything changes, notice to the OLD address, single-use expiring token,
 * and a re-login afterwards (the JWT carries the old email).
 */
import fs from 'fs';
import path from 'path';
import { changeEmailSchema } from '../validations';

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf-8');

describe('change email', () => {
  it('schema requires a valid email and the current password', () => {
    expect(changeEmailSchema.safeParse({ newEmail: 'not-an-email', password: 'x' }).success).toBe(false);
    expect(changeEmailSchema.safeParse({ newEmail: 'a@b.co', password: '' }).success).toBe(false);
    expect(changeEmailSchema.safeParse({ newEmail: ' A@B.co ', password: 'pw' }).success).toBe(true);
  });
  it('request route re-checks the password, refuses duplicates, and emails the new address first', () => {
    const r = read('src/app/api/account/change-email/route.ts');
    expect(r).toMatch(/bcrypt\.compare\(password, user\.password\)/);
    expect(r).toMatch(/email: \{ equals: email, mode: 'insensitive' \}/);
    expect(r).toMatch(/updateMany\(\{ where: \{ userId: user\.id, used: false \}, data: \{ used: true \} \}\)/); // one pending change at a time
    expect(r.indexOf('sendEmailChangeVerification')).toBeLessThan(r.indexOf('sendEmailChangeNotice'));
    expect(r).not.toMatch(/prisma\.user\.update/); // the request never changes the account
  });
  it('confirm route is token-only, single-use, expiring, re-checks uniqueness and sends the user to sign in again', () => {
    const c = read('src/app/api/account/change-email/confirm/route.ts');
    expect(c).toMatch(/if \(!row \|\| row\.used\) return back\('invalid'\)/);
    expect(c).toMatch(/row\.expiresAt\.getTime\(\) < Date\.now\(\)\) return back\('expired'\)/);
    expect(c).toMatch(/NOT: \{ id: row\.userId \}/);
    expect(c).toMatch(/data: \{ email: row\.newEmail, emailVerified: true \}/);
    expect(c).toMatch(/\/login\?emailChange=/);
  });
  it('schema has the token model and the UI is wired', () => {
    expect(read('prisma/schema.prisma')).toMatch(/\nmodel EmailChangeToken \{/);
    expect(read('src/app/account/page.tsx')).toContain('<ChangeEmailForm />');
    expect(read('src/app/login/page.tsx')).toContain('<EmailChangeBanner />');
  });
});
