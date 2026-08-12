// Company-profile claim outreach email template.
//
// Used by scripts/claim-outreach.ts to invite profiled companies to claim
// their SpaceNexus company profile. Tone: brief, professional, zero hype.
//
// CAN-SPAM NOTE FOR JAY: bulk commercial email legally requires a valid
// physical postal address in the message body. Replace the placeholder
// below (PHYSICAL_ADDRESS) with SpaceNexus LLC's real mailing address
// (a registered agent or PO box is acceptable) BEFORE any batch send.
const PHYSICAL_ADDRESS = '[PHYSICAL MAILING ADDRESS REQUIRED — SpaceNexus LLC, street address, city, state, ZIP]';

const SITE_URL = 'https://spacenexus.us';

export interface ClaimOutreachParams {
  companyName: string;
  slug: string;
}

export interface ClaimOutreachEmail {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function generateClaimOutreachEmail({ companyName, slug }: ClaimOutreachParams): ClaimOutreachEmail {
  const profileUrl = `${SITE_URL}/company-profiles/${encodeURIComponent(slug)}`;
  const subject = `Your ${companyName} profile on SpaceNexus`;

  const text = `Hello,

SpaceNexus maintains a profile of ${companyName} at:
${profileUrl}

It is viewed by space-industry professionals and investors researching the sector.

You're welcome to claim the profile — it's free. Claiming lets you keep the facts current, add jobs and company updates, and respond to coverage. It takes about 2 minutes: visit the profile page above and select "Claim This Profile."

If you'd rather not hear from us, just reply to this email and we'll remove your profile or never email you again — whichever you prefer.

Jay Griffiths
Founder, SpaceNexus
${SITE_URL}

--
This email was sent by SpaceNexus LLC, ${PHYSICAL_ADDRESS}.
To opt out of future emails, reply with "unsubscribe" and we will not contact you again.`;

  const safeName = escapeHtml(companyName);
  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;background-color:#ffffff;color:#1a1a1a;font-size:15px;line-height:1.6;">
    <p>Hello,</p>
    <p>SpaceNexus maintains a profile of <strong>${safeName}</strong> at
      <a href="${profileUrl}" style="color:#0f62fe;">${profileUrl}</a>.
      It is viewed by space-industry professionals and investors researching the sector.</p>
    <p>You're welcome to claim the profile — it's free. Claiming lets you keep the facts current,
      add jobs and company updates, and respond to coverage. It takes about 2 minutes:
      visit the profile page and select &ldquo;Claim This Profile.&rdquo;</p>
    <p style="margin:24px 0;">
      <a href="${profileUrl}" style="display:inline-block;padding:10px 20px;background-color:#111111;color:#ffffff;text-decoration:none;border-radius:4px;">View and claim your profile</a>
    </p>
    <p>If you'd rather not hear from us, just reply to this email and we'll remove your profile
      or never email you again — whichever you prefer.</p>
    <p style="margin-top:28px;">Jay Griffiths<br/>
      Founder, SpaceNexus<br/>
      <a href="${SITE_URL}" style="color:#0f62fe;">spacenexus.us</a></p>
    <hr style="border:none;border-top:1px solid #e0e0e0;margin:28px 0 16px;"/>
    <p style="font-size:12px;color:#6b6b6b;">
      This email was sent by SpaceNexus LLC, ${escapeHtml(PHYSICAL_ADDRESS)}.<br/>
      To opt out of future emails, reply with &ldquo;unsubscribe&rdquo; and we will not contact you again.
    </p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}
