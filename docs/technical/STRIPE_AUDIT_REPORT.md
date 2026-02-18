# Stripe Payment Integration Audit Report

**Date**: February 8, 2026
**Auditor**: Claude Opus 4.6
**Codebase Version**: 0.8.0 (branch: dev)

---

## 1. Implementation Status

### Core Components

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| Stripe client init | `src/lib/stripe.ts` | Complete | Lazy init, avoids build-time errors |
| Price ID mapping | `src/lib/stripe.ts` | Needs Setup | Env vars must be set with real Stripe price IDs |
| Status mapping | `src/lib/stripe.ts` | Complete | All Stripe statuses mapped to internal states |
| Checkout session | `src/app/api/stripe/checkout/route.ts` | Complete | Auth, validation, customer creation, trial logic |
| Billing portal | `src/app/api/stripe/portal/route.ts` | Complete | Auth check, customer ID verification |
| Webhook handler | `src/app/api/stripe/webhooks/route.ts` | Complete | Signature verification, 5 event types handled |
| Subscription API | `src/app/api/subscription/route.ts` | Complete | GET (status), POST (trials, checkout proxy, portal proxy) |
| Pricing page UI | `src/app/pricing/page.tsx` | Complete | Toggle yearly/monthly, trial CTAs, manage subscription |
| Zod validation | `src/lib/validations.ts` | Complete | `stripeCheckoutSchema` validates tier + interval |
| Prisma schema | `prisma/schema.prisma` | Complete | All fields present with proper unique constraints |
| Subscription context | `src/components/SubscriptionProvider.tsx` | Complete | Client-side tier/trial state management |
| Feature access control | `src/lib/subscription.ts` | Complete | Module gating + feature flags per tier |
| Premium gating UI | `src/components/PremiumGate.tsx` | Complete | Blurred preview, upgrade prompts, trial banners |
| Email templates | `src/lib/stripe-helpers.ts` | Complete | Payment failed + subscription confirmation |
| Setup documentation | `docs/STRIPE_SETUP.md` | Complete | Env vars, products, webhooks, CLI testing |
| Stripe npm package | `package.json` | Complete | `stripe@^17.7.0` installed |

### Summary
- **13 of 16 components**: Complete
- **3 of 16 components**: Needs Setup (env vars / Stripe Dashboard configuration)
- **0 components**: Missing or Broken

---

## 2. Environment Variables Required

All environment variables must be set in `.env` (local dev) and Railway (production).

| Variable | Description | Where to Get | Required |
|----------|-------------|--------------|----------|
| `STRIPE_SECRET_KEY` | Server-side API key | Stripe Dashboard > Developers > API Keys | Yes |
| `STRIPE_PUBLISHABLE_KEY` | Client-side key (listed in `STRIPE_SETUP.md` but not used in code) | Stripe Dashboard > Developers > API Keys | No (currently unused) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for webhook verification | Stripe Dashboard > Developers > Webhooks > Endpoint > Signing Secret | Yes |
| `STRIPE_PRICE_PRO_MONTHLY` | Price ID for Pro Monthly plan | Stripe Dashboard > Products > Pro > Monthly Price | Yes |
| `STRIPE_PRICE_PRO_YEARLY` | Price ID for Pro Yearly plan | Stripe Dashboard > Products > Pro > Yearly Price | Yes |
| `STRIPE_PRICE_ENTERPRISE_MONTHLY` | Price ID for Enterprise Monthly plan | Stripe Dashboard > Products > Enterprise > Monthly Price | Yes |
| `STRIPE_PRICE_ENTERPRISE_YEARLY` | Price ID for Enterprise Yearly plan | Stripe Dashboard > Products > Enterprise > Yearly Price | Yes |
| `NEXT_PUBLIC_APP_URL` | App base URL for redirects | Your domain (e.g., `https://spacenexus.us`) | Yes |
| `RESEND_API_KEY` | For sending payment emails (optional but recommended) | Resend Dashboard > API Keys | Recommended |
| `NEWSLETTER_FROM_EMAIL` | Sender email for payment notifications | Your verified Resend domain | Recommended |

**Current status in `.env`**: No STRIPE-related variables are currently set in the `.env` file.

---

## 3. Stripe Dashboard Configuration Required

### Step 1: Create Products and Prices

In **Stripe Dashboard > Products**, create two products:

**Product 1: Professional Plan**
- Name: `Professional`
- Monthly Price: `$9.99/month` (recurring) -- copy the `price_xxx` ID to `STRIPE_PRICE_PRO_MONTHLY`
- Yearly Price: `$99.00/year` (recurring) -- copy the `price_xxx` ID to `STRIPE_PRICE_PRO_YEARLY`

**Product 2: Enterprise Plan**
- Name: `Enterprise`
- Monthly Price: `$29.99/month` (recurring) -- copy the `price_xxx` ID to `STRIPE_PRICE_ENTERPRISE_MONTHLY`
- Yearly Price: `$250.00/year` (recurring) -- copy the `price_xxx` ID to `STRIPE_PRICE_ENTERPRISE_YEARLY`

These prices must match the values in `SUBSCRIPTION_PLANS` (`src/types/index.ts`):
- Pro: $9.99/month, $99/year
- Enterprise: $29.99/month, $250/year

### Step 2: Configure Webhook Endpoint

In **Stripe Dashboard > Developers > Webhooks**:

1. Click **Add Endpoint**
2. Endpoint URL: `https://your-domain.com/api/stripe/webhooks`
3. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the **Signing Secret** (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`

### Step 3: Configure Customer Portal

In **Stripe Dashboard > Settings > Billing > Customer Portal**:

Enable the following features:
- Invoice history
- Subscription cancellation (set to cancel at period end)
- Subscription plan switching (between Pro and Enterprise)
- Payment method update
- Billing address collection (optional)

**Important**: The customer portal MUST be explicitly configured in Stripe or the `/api/stripe/portal` endpoint will fail with a Stripe error.

### Step 4: Test Mode vs Live Mode

- Start with **Test Mode** (toggle in top-right of Stripe Dashboard)
- Test keys start with `sk_test_` and `pk_test_`
- Live keys start with `sk_live_` and `pk_live_`
- You need **separate webhook endpoints** for test and live modes
- When going live, replace all test keys with live keys in your Railway environment

---

## 4. Code Quality Review

### 4.1 Strengths

**Stripe Client (`src/lib/stripe.ts`)**
- Lazy initialization pattern avoids build-time crashes when env vars are missing -- this is correct for Next.js builds on CI/CD where secrets are not available.
- `priceIdToTier()` provides clean reverse mapping from Stripe price IDs back to internal tier names.
- `mapSubscriptionStatus()` properly collapses all Stripe statuses (including `paused`, `incomplete`, `incomplete_expired`) into the three internal states.

**Checkout Route (`src/app/api/stripe/checkout/route.ts`)**
- Authentication is properly enforced before any Stripe operations.
- Input validation uses Zod schema (`stripeCheckoutSchema`).
- Customer creation is idempotent -- reuses existing `stripeCustomerId` if present.
- Trial logic is smart: only grants 3-day trial to users who have never had a trial.
- `allow_promotion_codes: true` enables discount codes.
- Metadata includes `userId` and `tier` on both the session and subscription for traceability.
- Structured logging with the `logger` utility.

**Webhook Handler (`src/app/api/stripe/webhooks/route.ts`)**
- Proper signature verification using `constructEvent()`.
- Raw body is read with `req.text()` (correct for signature verification).
- All five critical webhook events are handled.
- Returns HTTP 200 even on processing errors to prevent Stripe retries (with error logging).
- Dual-lookup strategy in `handleSubscriptionUpdated` and `handleSubscriptionDeleted`: tries `userId` from metadata first, falls back to `stripeCustomerId` lookup.
- Payment failure handler sends recovery email via Resend.
- Checkout completion handler sends confirmation email.

**Prisma Schema**
- `stripeCustomerId` and `stripeSubscriptionId` both have `@unique` constraints -- prevents duplicate customer/subscription records.
- Trial fields (`trialTier`, `trialStartDate`, `trialEndDate`) are separate from subscription fields -- clean separation of concerns.

**Frontend (`src/app/pricing/page.tsx`)**
- Handles success/cancel URL parameters from Stripe redirect.
- Shows different UI states: current plan, trialing, upgrade CTA, manage subscription.
- Direct call to `/api/stripe/checkout` (bypasses the proxy in `/api/subscription`).
- Loading states on all buttons to prevent double-clicks.

### 4.2 Bugs and Issues

**BUG 1 (Critical): CSRF Middleware Blocks Stripe Webhooks**

The middleware at `src/middleware.ts` applies CSRF protection (Origin/Referer check) to ALL `/api/*` POST requests. The only exemptions are:
- `/api/auth/*` (line 163)
- `/api/v1/*` (line 168)

**Stripe webhook requests to `/api/stripe/webhooks` will be rejected with a 403 Forbidden** because:
1. Stripe sends webhooks as POST requests from Stripe's servers
2. Stripe does NOT send an `Origin` or `Referer` header
3. The `checkCsrf()` function returns `false` when both headers are absent (line 202)

**Fix**: Add an exemption for `/api/stripe/webhooks` in the `checkCsrf()` function:
```typescript
// Skip CSRF check for Stripe webhooks (signature-verified separately)
if (pathname.startsWith('/api/stripe/webhooks')) {
  return true;
}
```

**BUG 2 (Minor): Backward Compat Export is Misleading**

In `src/lib/stripe.ts` (line 23):
```typescript
export const stripe = null as unknown as Stripe; // DO NOT use directly; call getStripe()
```
This exports a typed `null` that will crash at runtime if any code accidentally imports `stripe` instead of calling `getStripe()`. While the comment warns against it, this is error-prone. A runtime check or deprecation warning would be safer.

**BUG 3 (Minor): Subscription POST Route Self-Fetches**

In `src/app/api/subscription/route.ts` (lines 123-136 and 140-152), the `create-checkout` and `create-portal` actions make HTTP `fetch()` calls to the same server's `/api/stripe/checkout` and `/api/stripe/portal` endpoints. This creates:
- An unnecessary internal HTTP round-trip
- Potential CSRF issues (the forwarded `cookie` header may not pass the Origin check in middleware)
- Potential issues in serverless environments where the server may not be able to call itself

These proxy actions appear to be unused since the pricing page (`src/app/pricing/page.tsx`) calls `/api/stripe/checkout` and `/api/stripe/portal` directly (lines 265 and 296). The proxy code in the subscription route is dead code.

**BUG 4 (Low): Amount on Trials in Checkout Confirmation**

When `handleCheckoutCompleted` sends a confirmation email, it uses `session.amount_total` (line 173). For a checkout that starts with a trial period, `amount_total` will be `0` because nothing was charged at checkout time. The email would say "Your first charge of $0.00 has been processed" which is misleading for trial subscriptions.

**BUG 5 (Low): `stripeCustomerId` Lookup for `findUnique`**

In `handleSubscriptionUpdated` (line 218) and `handleSubscriptionDeleted` (line 283), the fallback lookup uses:
```typescript
prisma.user.findUnique({ where: { stripeCustomerId: customerId } })
```
This works because `stripeCustomerId` has a `@unique` constraint in the Prisma schema. This is correct.

### 4.3 TypeScript Issues

- **Line 236 in webhooks/route.ts**: `Record<string, unknown>` for `updateData` loses type safety. Using a typed Prisma update payload would be better, though this works at runtime.
- **No type errors**: The code compiles correctly with the project's TypeScript configuration.

### 4.4 Security Considerations

**Good Practices**:
- Webhook signature verification is implemented correctly
- Raw body (`req.text()`) used for signature verification, not parsed JSON
- Secret key is server-only (`STRIPE_SECRET_KEY`, no `NEXT_PUBLIC_` prefix)
- `escapeHtml()` is used in email templates for user-provided data (XSS prevention)
- Authentication is enforced on checkout and portal routes
- Sensitive data is not logged (no card details, only IDs and amounts)
- Rate limiting applies to all API routes

**Concerns**:
- **CSRF bypass needed for webhooks** (Bug 1 above) -- this is the most critical security/functionality issue
- `STRIPE_PUBLISHABLE_KEY` is documented in `STRIPE_SETUP.md` but never used in code -- this is fine since checkout is handled server-side via Stripe Hosted Checkout (no client-side Stripe.js needed)
- The webhook endpoint returns error details in JSON responses that Stripe can see, but these are generic enough to not leak sensitive info

### 4.5 Edge Cases Not Handled

1. **Subscription downgrade proration**: When a user switches from Enterprise to Pro, Stripe handles proration but the webhook handler does not differentiate between upgrades and downgrades for notification purposes.

2. **Multiple subscriptions**: The code assumes one subscription per user. If a user somehow gets multiple Stripe subscriptions, only the latest one's data will be stored.

3. **Customer deletion in Stripe**: No handler for `customer.deleted` event. If an admin deletes a customer in Stripe Dashboard, the local `stripeCustomerId` will become orphaned.

4. **Subscription pause**: The `paused` status in `mapSubscriptionStatus` maps to `canceled`, which could be confusing if subscription pausing is enabled in the Customer Portal.

5. **Webhook replay/idempotency**: No deduplication of webhook events. If Stripe retries a webhook (e.g., for `checkout.session.completed`), the handler will re-run the database update. While this is technically safe (idempotent update), the confirmation email would be sent again.

6. **Currency handling**: Prices in `SUBSCRIPTION_PLANS` are hardcoded in USD. The Stripe integration does not enforce currency and would accept any currency configured in the Stripe Dashboard.

---

## 5. Testing Checklist

### Prerequisites
- [ ] Stripe account created
- [ ] Test mode enabled in Stripe Dashboard
- [ ] Products and prices created in Stripe
- [ ] All STRIPE_* env vars set in `.env`
- [ ] CSRF exemption added for `/api/stripe/webhooks` in middleware
- [ ] Stripe CLI installed and logged in
- [ ] Webhook forwarding active: `stripe listen --forward-to localhost:3000/api/stripe/webhooks`

### Functional Tests

- [ ] **New subscription checkout (Pro Monthly)**
  1. Log in as a free-tier user
  2. Go to `/pricing`
  3. Click "Subscribe Now" on Professional plan (Monthly)
  4. Verify redirect to Stripe Checkout
  5. Complete payment with test card `4242 4242 4242 4242`
  6. Verify redirect back to `/pricing?success=true`
  7. Verify toast shows "Subscription activated!"
  8. Verify DB: `subscriptionTier='pro'`, `subscriptionStatus='active'`, `stripeCustomerId` set, `stripeSubscriptionId` set
  9. Verify confirmation email received

- [ ] **New subscription checkout (Enterprise Yearly)**
  1. Repeat above with Enterprise plan, Yearly toggle
  2. Verify correct price charged

- [ ] **3-day free trial (no credit card)**
  1. Log in as a new free-tier user (never had a trial)
  2. Go to `/pricing`
  3. Click "Start 3-Day Free Trial" on Professional plan
  4. Verify DB: `trialTier='pro'`, `trialStartDate` set, `trialEndDate` = now + 3 days
  5. Verify premium features are unlocked
  6. Verify trial banner shows in premium-gated content

- [ ] **Trial-to-paid conversion**
  1. While trial is active, click "Subscribe Now" on the same plan
  2. Complete Stripe Checkout
  3. Verify DB: `trialTier=null`, `trialStartDate=null`, `trialEndDate=null`, `subscriptionTier='pro'`
  4. Verify no duplicate trial is granted on the Stripe checkout (trial_period_days should be undefined since user already had a trial)

- [ ] **Plan upgrade (Pro to Enterprise)**
  1. As a Pro subscriber, click "Subscribe Now" on Enterprise
  2. Complete checkout
  3. Verify DB: `subscriptionTier='enterprise'`
  4. Verify Stripe shows the subscription was updated (or a new one created)

- [ ] **Subscription cancellation**
  1. As a paid subscriber, click "Manage Subscription"
  2. Verify redirect to Stripe Customer Portal
  3. Cancel the subscription in the portal
  4. Verify `customer.subscription.updated` webhook fires (status changes)
  5. After period ends, verify `customer.subscription.deleted` webhook fires
  6. Verify DB: `subscriptionTier='free'`, `subscriptionStatus='canceled'`, `stripeSubscriptionId=null`

- [ ] **Failed payment handling**
  1. Use test card `4000 0000 0000 9995` (will decline)
  2. Or trigger: `stripe trigger invoice.payment_failed`
  3. Verify DB: `subscriptionStatus='past_due'`
  4. Verify payment failed email sent via Resend

- [ ] **Customer portal access**
  1. As a paid subscriber, click "Manage Subscription"
  2. Verify redirect to Stripe-hosted billing portal
  3. Verify you can view invoices, update payment method, cancel

- [ ] **Webhook event processing**
  1. Run: `stripe trigger checkout.session.completed`
  2. Run: `stripe trigger customer.subscription.updated`
  3. Run: `stripe trigger customer.subscription.deleted`
  4. Run: `stripe trigger invoice.payment_succeeded`
  5. Run: `stripe trigger invoice.payment_failed`
  6. Verify each event is logged correctly in server output
  7. Note: `stripe trigger` events have synthetic data that won't match real users, so DB updates may log warnings. That is expected.

- [ ] **Checkout cancellation**
  1. Start checkout but click browser back or close the tab
  2. Return to `/pricing?canceled=true`
  3. Verify toast shows "Checkout was canceled."
  4. Verify no DB changes

- [ ] **Unauthenticated access**
  1. While logged out, try to click "Subscribe Now"
  2. Verify toast: "Please sign in to subscribe."
  3. While logged out, POST to `/api/stripe/checkout` directly
  4. Verify 401 response

- [ ] **Promotion codes**
  1. Create a promotion code in Stripe Dashboard
  2. Start checkout and enter the code on the Stripe Checkout page
  3. Verify discount is applied

---

## 6. What the Developer Needs to Do

### Phase 1: Stripe Account Setup

1. **Create a Stripe account** at https://dashboard.stripe.com/register (or log in to existing)

2. **Create Products and Prices** in Stripe Dashboard:
   - Professional Plan: $9.99/month and $99.00/year
   - Enterprise Plan: $29.99/month and $250.00/year
   - Copy all four `price_xxx` IDs

3. **Add a Webhook Endpoint**:
   - URL: `https://your-production-domain.com/api/stripe/webhooks`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
   - Copy the `whsec_xxx` signing secret

4. **Configure Customer Portal**:
   - Enable: invoice history, cancellation, plan switching, payment method updates

### Phase 2: Fix Critical Bug

5. **Add CSRF exemption for Stripe webhooks** in `src/middleware.ts`:
   Add the following before the CSRF check runs, inside the `checkCsrf()` function, after the existing `/api/v1/*` exemption:
   ```typescript
   // Skip CSRF check for Stripe webhooks (signature-verified separately)
   if (pathname.startsWith('/api/stripe/webhooks')) {
     return true;
   }
   ```
   **This is mandatory. Without this fix, ALL webhook events from Stripe will be rejected with 403 Forbidden, and subscriptions will never activate.**

### Phase 3: Set Environment Variables

6. **Set environment variables** in both `.env` (local) and Railway:
   ```
   STRIPE_SECRET_KEY=sk_test_xxx
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   STRIPE_PRICE_PRO_MONTHLY=price_xxx
   STRIPE_PRICE_PRO_YEARLY=price_xxx
   STRIPE_PRICE_ENTERPRISE_MONTHLY=price_xxx
   STRIPE_PRICE_ENTERPRISE_YEARLY=price_xxx
   NEXT_PUBLIC_APP_URL=https://spacenexus.us
   ```
   Also ensure `RESEND_API_KEY` and `NEWSLETTER_FROM_EMAIL` are set for payment notification emails.

### Phase 4: Local Testing with Stripe CLI

7. **Install Stripe CLI**:
   ```
   scoop install stripe   # Windows
   ```

8. **Login and forward webhooks**:
   ```
   stripe login
   stripe listen --forward-to localhost:3000/api/stripe/webhooks
   ```
   Use the `whsec_xxx` secret from the CLI output as your local `STRIPE_WEBHOOK_SECRET`.

9. **Run through the Testing Checklist** in Section 5 above.

### Phase 5: Go Live

10. **Switch to Live Mode** in Stripe Dashboard:
    - Create the same products/prices in Live mode
    - Add a new webhook endpoint with the production URL
    - Copy all live keys and replace test keys in Railway env vars

11. **Verify production webhook delivery**:
    - After the first real checkout, check Stripe Dashboard > Developers > Webhooks for successful delivery
    - Check Railway logs for webhook processing

12. **Set up Stripe alerting**:
    - Enable email notifications in Stripe Dashboard > Settings > Team and Security
    - Monitor for failed payments, disputes, and other critical events

---

## 7. Recommendations

### High Priority

1. **Fix the CSRF middleware webhook exemption** (Bug 1) -- this is a blocker for the entire payment flow working in production.

2. **Remove or refactor the self-fetch proxy code** in `src/app/api/subscription/route.ts` (lines 122-152). The `create-checkout` and `create-portal` actions make internal HTTP calls to the same server, which is fragile, and the pricing page already calls the Stripe endpoints directly. Either remove the proxy entirely or refactor to call the checkout/portal logic directly as function imports.

3. **Add webhook idempotency**: Store processed webhook event IDs (e.g., in a `ProcessedStripeEvent` table or in-memory cache) to prevent duplicate processing. This prevents duplicate emails on webhook retries.

4. **Handle trial checkout email correctly**: When a checkout completes with a trial (amount = $0), either skip the confirmation email or adjust the wording to say "Your trial has started" instead of "Your first charge of $0.00 has been processed."

### Medium Priority

5. **Add Stripe-specific rate limiting**: The webhook endpoint currently uses the general 100/min rate limit. Stripe can send bursts of events (e.g., when testing). Consider a higher limit or dedicated rate limit for `/api/stripe/webhooks`.

6. **Add a `customer.subscription.trial_will_end` handler**: Stripe sends this event 3 days before a trial ends. This would allow sending a "Your trial is ending soon" email to encourage conversion.

7. **Add database indexes for Stripe lookups**: While `stripeCustomerId` already has a `@unique` constraint (which creates an index), consider verifying that queries on `subscriptionStatus` (e.g., for admin dashboards) have indexes.

8. **Remove the `stripe` backward compat export**: The `null as unknown as Stripe` export in `src/lib/stripe.ts` is a footgun. Remove it and update any code that might reference it to use `getStripe()`.

9. **Add subscription upgrade/downgrade logic**: Currently, clicking "Subscribe Now" on a different plan creates a new checkout session. For existing subscribers, it would be better to use Stripe's subscription update API to switch plans with proration, rather than creating a new subscription.

### Low Priority

10. **Add a PaymentHistory component**: Build a page or modal that shows the user their past invoices by querying the Stripe API.

11. **Add refund handling**: Implement a `charge.refunded` webhook handler to update the user's access if a refund is issued.

12. **Consider adding Stripe.js for PCI compliance optimization**: While Stripe Hosted Checkout is fully PCI compliant, if you ever need custom payment forms, you would need `@stripe/stripe-js` and `@stripe/react-stripe-js`.

13. **Add admin dashboard for subscription management**: A Stripe-connected admin view showing subscriber counts, MRR (monthly recurring revenue), churn rate, and the ability to grant/revoke subscriptions manually.

14. **Add graceful degradation period for past_due**: Currently, when a payment fails, the status becomes `past_due` but the user retains their tier. Consider implementing a grace period (e.g., 7 days) after which the user is automatically downgraded if the payment is not resolved.

---

## Appendix: File Reference

| File | Path |
|------|------|
| Stripe client | `src/lib/stripe.ts` |
| Email templates | `src/lib/stripe-helpers.ts` |
| Checkout API | `src/app/api/stripe/checkout/route.ts` |
| Portal API | `src/app/api/stripe/portal/route.ts` |
| Webhook handler | `src/app/api/stripe/webhooks/route.ts` |
| Subscription API | `src/app/api/subscription/route.ts` |
| Pricing page | `src/app/pricing/page.tsx` |
| Validation schemas | `src/lib/validations.ts` |
| Prisma schema | `prisma/schema.prisma` |
| Setup docs | `docs/STRIPE_SETUP.md` |
| Subscription provider | `src/components/SubscriptionProvider.tsx` |
| Feature access | `src/lib/subscription.ts` |
| Premium gate | `src/components/PremiumGate.tsx` |
| Types/Plans | `src/types/index.ts` |
| Middleware (CSRF) | `src/middleware.ts` |
