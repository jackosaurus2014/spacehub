/**
 * One-time thank-you note to our first active subscriber.
 * Run: railway run npx tsx scripts/send-subscriber-thankyou.ts
 */
export {};


const TO = 'jaybookbinder@gmail.com';

const TEXT = `Hi Jay,

A quick personal note from SpaceNexus.

You're our earliest active subscriber, and I wanted to say thank you — support like yours is what keeps this project moving.

Some good news that comes with it: we've consolidated to a single Professional plan, and your subscription now includes everything the old higher-priced Enterprise tier offered — full API access with docs and an interactive explorer, the regulatory and compliance suite, patent and procurement intelligence (SAM.gov/SBIR), custom dashboards, webhook integrations, and priority support. Same $19.99/month you've been paying. Nothing to do on your end; it's already unlocked on your account.

We also just launched a weekly "State of the Space Economy" data brief, generated from our live tracking of news, funding rounds, launches, and hiring:
https://spacenexus.us/ai-insights/state-of-the-space-economy-2026-08-12

If there's anything you wish SpaceNexus did better — or a feature you'd love to see — just reply to this email. It comes straight to me.

Thanks again for being here from the start.

Jay Griffiths
SpaceNexus
https://spacenexus.us`;

const HTML = TEXT
  .split('\n\n')
  .map((p) =>
    `<p style="margin:0 0 16px;line-height:1.6;color:#1a1a1a;font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;">${p
      .replace(/\n/g, '<br/>')
      .replace(
        /(https:\/\/spacenexus\.us[^\s<]*)/g,
        '<a href="$1" style="color:#4f46e5;">$1</a>'
      )}</p>`
  )
  .join('');

async function main() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY not in env — run via `railway run`');
  const { Resend } = await import('resend');
  const resend = new Resend(key);

  const from = process.env.NEWSLETTER_FROM_EMAIL || 'SpaceNexus <newsletter@spacenexus.us>';
  const replyTo = process.env.ADMIN_EMAIL;

  const { data, error } = await resend.emails.send({
    from,
    to: TO,
    ...(replyTo ? { replyTo } : {}),
    subject: 'Thank you — your SpaceNexus plan just got bigger',
    text: TEXT,
    html: `<div style="max-width:560px;margin:0 auto;padding:24px;">${HTML}</div>`,
  });

  if (error) throw new Error(error.message);
  console.log(`sent to ${TO}: ${data?.id}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
