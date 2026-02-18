# Email Nurture Sequence

A 7-email automated nurture sequence for converting free SpaceNexus users to paid Pro/Enterprise subscribers. Emails are sent over 21 days following user registration.

## Sequence Overview

| # | Day | Email Type      | Purpose                              | CTA                         |
|---|-----|-----------------|--------------------------------------|-----------------------------|
| 1 | 1   | Welcome         | Warm welcome, quick-start guide      | Explore Your Dashboard      |
| 2 | 3   | Did You Know    | Highlight premium features           | See Premium Features        |
| 3 | 5   | Social Proof    | Industry stats, testimonial          | See What Others Are Tracking|
| 4 | 7   | AI Spotlight    | Feature spotlight on AI Insights     | Try AI Insights             |
| 5 | 10  | Case Study      | ROI-focused success story            | Read Full Case Study        |
| 6 | 14  | Trial Offer     | Direct 3-day free trial offer        | Start Free Trial            |
| 7 | 21  | Final Nudge     | 20% discount code (SPACE20)          | Claim Your Discount         |

## Subject Line A/B Variants

Each email includes two subject line variants for A/B testing:

### Day 1 - Welcome
- **A:** `Welcome to SpaceNexus, {name}! 3 things to try right now`
- **B:** `{name}, your space intelligence dashboard is ready`
- **Preview:** Your space industry dashboard is ready. Here are 3 things to try first.

### Day 3 - Did You Know
- **A:** `Did you know? Real-time alerts most free users miss`
- **B:** `{name}, unlock real-time space industry alerts`
- **Preview:** Pro users get real-time alerts on launches, contracts, and orbital events.

### Day 5 - Social Proof
- **A:** `Join 500+ space professionals using SpaceNexus`
- **B:** `How data-driven teams are winning in the space economy`
- **Preview:** 500+ space professionals rely on SpaceNexus for critical decision-making.

### Day 7 - AI Spotlight
- **A:** `AI Insights: Your space industry research assistant`
- **B:** `{name}, save hours with AI-powered space analysis`
- **Preview:** AI Insights analyzes trends, contracts, and market data so you don't have to.

### Day 10 - Case Study
- **A:** `How one team saved 40+ hours/month with SpaceNexus`
- **B:** `$360/year vs $50K+ in value -- the SpaceNexus ROI`
- **Preview:** A satellite operator cut 40+ hours of manual tracking per month with SpaceNexus Pro.

### Day 14 - Trial Offer
- **A:** `Your 3-day Pro trial is waiting, {name}`
- **B:** `Try SpaceNexus Pro free for 3 days -- no card required`
- **Preview:** Unlock all Pro features free for 3 days. No credit card required.

### Day 21 - Final Nudge
- **A:** `Last chance: 20% off SpaceNexus Pro (code SPACE20)`
- **B:** `{name}, a special offer before we close the door`
- **Preview:** Get 20% off SpaceNexus Pro with code SPACE20. Limited time offer.

## Email Content Descriptions

### Day 1: Welcome + Quick Value Demo
Warm welcome with 3 quick things to try: live news feed, Mission Control launch countdown, and market data. Gets users to their first value moment fast.

### Day 3: "Did You Know?" - Premium Feature Highlight
Highlights real-time alert capabilities that Pro users get. Shows the gap between free (10 articles/day) and Pro (unlimited, custom alerts, data export, ad-free).

### Day 5: Social Proof / Industry Stats
Positions SpaceNexus alongside 500+ space professionals. Includes a testimonial quote and a stat about 37% faster decision-making with integrated data platforms.

### Day 7: AI Spotlight
Showcases the AI Insights feature with a concrete example analysis (LEO launch cost trends). Emphasizes time savings of 10+ hours/week for Enterprise users.

### Day 10: Case Study
Before/after scenario of a satellite operator saving 40+ hours/month. Frames the ROI clearly: $9.99/mo vs $50K+ in productivity value.

### Day 14: Trial Offer
Direct conversion email. Lists the top 5 Pro features being missed and offers a free 3-day trial with no credit card required.

### Day 21: Final Nudge
Last email in the sequence. Offers a 20% discount code (SPACE20) bringing Pro down to $7.99/mo. Uses urgency without being aggressive.

## How the Cron Job Works

### Endpoint
`POST /api/nurture/process`

### Authentication
Protected by `CRON_SECRET` Bearer token (same as other cron endpoints).

```
Authorization: Bearer <CRON_SECRET>
```

### Processing Logic
1. For each of the 7 nurture steps, the endpoint calculates the target registration date (today minus N days).
2. It finds users who:
   - Registered within that 24-hour window
   - Are still on the free tier (no paid subscription or active trial)
   - Have not already received that specific nurture email
   - Have not unsubscribed from marketing (via newsletter subscription)
3. Sends the appropriate email via Resend.
4. Logs the send in the `NurtureEmailLog` table (unique constraint on userId + emailType prevents duplicates).

### Scheduling
Configure a cron job to call this endpoint once daily (recommended: early morning in your primary user timezone).

Example with Railway cron or external scheduler:
```bash
curl -X POST https://your-app.railway.app/api/nurture/process \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Response Format
```json
{
  "success": true,
  "totalSent": 5,
  "totalFailed": 0,
  "results": [
    { "emailType": "welcome", "sent": 2, "failed": 0, "errors": [] },
    { "emailType": "did_you_know", "sent": 3, "failed": 0, "errors": [] },
    { "emailType": "social_proof", "sent": 0, "failed": 0, "errors": [] },
    ...
  ],
  "timestamp": "2026-02-08T10:00:00.000Z"
}
```

## Database Model

The `NurtureEmailLog` model tracks which nurture emails have been sent to each user:

```prisma
model NurtureEmailLog {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  emailType String   // "welcome", "did_you_know", "social_proof", "ai_spotlight", "case_study", "trial_offer", "final_nudge"
  sentAt    DateTime @default(now())

  @@unique([userId, emailType])
  @@index([userId])
  @@index([emailType])
}
```

The `@@unique([userId, emailType])` constraint ensures each user receives each email at most once, even if the cron job runs multiple times.

## How to Modify or Add Emails

### Modifying an existing email
Edit the corresponding `generateNurture*Email()` function in `src/lib/newsletter/email-templates.ts`. Each function returns `{ subject, subjectB, previewText, html, text }`.

### Adding a new email to the sequence
1. Add a new generator function in `src/lib/newsletter/email-templates.ts` following the existing pattern.
2. Add the new step to the `NURTURE_SEQUENCE` array in `src/app/api/nurture/process/route.ts` with the appropriate `day`, `emailType`, and `generator`.
3. Add the new `emailType` string as a valid value in the comment on the Prisma model (for documentation purposes).
4. No schema migration is needed -- the `emailType` field is a free-form string.

### Implementing A/B testing
Each email returns both `subject` (variant A) and `subjectB` (variant B). To implement A/B testing:
1. In the `processNurtureStep` function, randomly select between `subject` and `subjectB` for each user.
2. Store the variant in an additional column on `NurtureEmailLog`.
3. Track open rates per variant to determine the winner.

## File Locations

| File | Purpose |
|------|---------|
| `src/lib/newsletter/email-templates.ts` | Nurture email template generators |
| `src/app/api/nurture/process/route.ts` | Cron endpoint for processing the sequence |
| `prisma/schema.prisma` | NurtureEmailLog model definition |
| `docs/EMAIL_NURTURE_SEQUENCE.md` | This documentation |
