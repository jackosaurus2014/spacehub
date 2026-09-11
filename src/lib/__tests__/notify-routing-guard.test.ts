/**
 * Operational email routing (Jay, 2026-09-10): broken things and money →
 * ALERT_EMAIL (personal inbox); things people sent → ADMIN_EMAIL (owner@).
 */
import fs from 'fs';
import path from 'path';

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf-8');

describe('notify routing', () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; jest.resetModules(); });
  it('alerts prefer ALERT_EMAIL, correspondence prefers ADMIN_EMAIL, both fall back', async () => {
    process.env.ALERT_EMAIL = 'alerts@example.com'; process.env.ADMIN_EMAIL = 'owner@example.com';
    let m = await import('../notify-routing');
    expect(m.alertEmail()).toBe('alerts@example.com'); expect(m.correspondenceEmail()).toBe('owner@example.com');
    delete process.env.ALERT_EMAIL; jest.resetModules(); m = await import('../notify-routing');
    expect(m.alertEmail()).toBe('owner@example.com');
    delete process.env.ADMIN_EMAIL; jest.resetModules(); m = await import('../notify-routing');
    expect(m.alertEmail()).toBe(m.correspondenceEmail());
  });
  it('senders use the right lane', () => {
    for (const rel of ['src/lib/freshness-alerts.ts', 'src/lib/employer-email.ts']) expect(read(rel)).toContain('alertEmail()');
    for (const rel of ['src/lib/founder-notify.ts', 'src/lib/feedback.ts', 'src/lib/reachout-sentinel.ts']) { const s = read(rel); expect(s).toContain('correspondenceEmail()'); expect(s).not.toMatch(/to: FOUNDER_EMAIL/); }
    // deliberate exceptions keep their targets
    expect(read('src/lib/ceo-brief.ts')).toContain('FOUNDER_EMAIL');
  });
});
