# Employer portal review — 2026-09-10

Honest evaluation of `/hire` + `/hire/dashboard` as shipped on the morning of
9/10 (commit 091474f8), against what a company paying $125–$199 per listing
expects, and what was changed the same day in response.

## Verdict before the changes

**Solid, fast MVP. Not AAA.** The mechanics were right — post, pay, edit,
pause, renew, remove all worked first time in a real browser — but the
experience was thinner than Space Careers, ClearanceJobs or a Greenhouse
job-board page in five specific ways:

| Question | Before | Gap |
|---|---|---|
| Easy to post? | One long form, plain-text description, sign-in wall at the bottom | No "save and come back"; no preview; description is a bare textarea |
| Easy to edit / remove? | Yes — inline editor, Pause/Resume, Remove/Delete draft | Worked well. Only missing: duplicate a past listing |
| Promote for money, easily? | Featured only at post time or on renewal | **A live standard listing could not be upgraded** — the most natural upsell was blocked by the API ("already live") |
| Feels like a product a paying customer gets? | Single card per listing on a page that still showed the site's Quick Start panel, the 14-day trial banner and the cookie bar | No summary numbers, no company header, site chrome cluttering the portal |
| What happens with candidates? | Nothing — apply clicks went to the employer's own link | No on-site applications, so no applicant list, no email, no CSV |

## Team accounts vs a company account

Companies at the size that buys single postings (5–500 people) post through
one or two people. A team-invite system with roles is expected from an ATS
(Greenhouse, Lever) and from LinkedIn Recruiter seats, not from a job board.
What they *do* expect is that a colleague can pick up a listing when the
poster is away.

**Decision:** keep one login per person, no invites yet, but make ownership
follow the **company profile**. A posting is manageable by the account that
created it and by whoever has claimed the linked company profile on
`/company-profiles`. That gives a small hiring team shared access with zero
new UI, and the claim flow already exists. Revisit invites/roles when a
company has three or more distinct posting accounts (watch
`postedByUserId` cardinality per `companyProfileId` in the admin panel).

## What applicant tracking should do here

A full ATS (pipeline stages, interview scheduling, scorecards, EEO reports)
is a different product and would compete with tools the employer already
uses. What a job board can usefully own:

1. Let the candidate apply without leaving, so the employer gets the whole
   funnel on SpaceNexus and the candidate is not bounced to a Workday login.
2. Deliver each application to the hiring contact's inbox immediately.
3. Keep a list in the portal with a light status (new / reviewed / contacted
   / not a fit), a private note, and a CSV export so the employer can move
   the data into whatever they use.
4. Never store résumé files: a résumé *link* (Drive, Dropbox, personal site)
   keeps the candidate in control of their document and keeps us out of PII
   file storage. Revisit uploads only if employers ask for them.

That is what was built (`applyMode = 'spacenexus'`). Employers who already
have an ATS keep `'link'` mode and lose nothing.

## Shipped the same day

- Apply-mode chooser on the post form and in the portal editor.
- On-site application form + employer email + applicants panel + CSV.
- Upgrade to featured for live standard listings (keeps the later expiry).
- Summary strip, expiring-soon notice, Duplicate, Save-draft-pay-later.
- Site onboarding chrome (Quick Start, trial banner) hidden on the portal.
- Company-profile-scoped ownership.
- Expiry reminder emails (3 days before, and on expiry).

## Still open (ranked)

1. **Rich-text description** (bold, bullets). Employers paste from Word;
   the board renders plain text with preserved line breaks. A minimal
   Markdown-to-HTML pass with sanitisation is the cheap fix.
2. **Preview before paying.** Render the job page from the form state in a
   modal.
3. **Company header on the portal** (logo, claimed status, link to edit the
   profile) — the profile card at the bottom does the job today but it is
   not where the eye goes.
4. **Invoices.** Stripe's receipt is emailed; a "download invoice" link per
   payment needs the Stripe invoice object or a generated PDF.
5. **Team invites** — only when the cardinality signal above shows demand.
6. **Applicant email replies from inside the portal** — a mailto is enough
   for now.
