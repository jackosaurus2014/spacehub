/**
 * Contact-form submissions must email the founder immediately (2026-09-10).
 * Before this, eleven real messages sat as `new` rows from May to September
 * with only the daily sentinel digest pointing at them.
 */
import fs from 'fs';
import path from 'path';

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf-8');

describe('contact form founder notification', () => {
  it('the route notifies after the row is created, without awaiting the send', () => {
    const route = read('src/app/api/contact/route.ts');
    expect(route).toMatch(/import \{ notifyFounderOfContact \} from '@\/lib\/founder-notify'/);
    expect(route).toMatch(/void notifyFounderOfContact\(\{ id: submission\.id, name, email, subject, message \}\)/);
    expect(route.indexOf('contactSubmission.create')).toBeLessThan(route.indexOf('void notifyFounderOfContact'));
  });
  it('the helper targets the correspondence mailbox with reply-to set to the sender and never throws', () => {
    const lib = read('src/lib/founder-notify.ts');
    expect(lib).toMatch(/to: correspondenceEmail\(\), replyTo: opts\.email/);
    expect(lib).toMatch(/catch \(error\) \{[\s\S]*return false;/);
  });
});
