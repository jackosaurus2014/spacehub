# Stripe Payment Integration Setup

## Required Environment Variables

Add the following to your `.env` (or Railway environment):

```env
# Stripe API Keys (from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Stripe Webhook Secret (from webhook endpoint config)
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (from Products > Pricing in Stripe Dashboard)
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...
STRIPE_PRICE_ENTERPRISE_YEARLY=price_...

# App URL (used for checkout success/cancel redirects)
NEXT_PUBLIC_APP_URL=https://spacenexus.com
```

## Stripe Dashboard Setup

### 1. Create Products

Go to **Stripe Dashboard > Products** and create two products:

1. **Professional Plan**
   - Monthly price: $9.99/month (recurring)
   - Yearly price: $99.00/year (recurring)

2. **Enterprise Plan**
   - Monthly price: $29.99/month (recurring)
   - Yearly price: $250.00/year (recurring)

Copy each price ID (starts with `price_`) into the corresponding env var.

### 2. Configure Webhook Endpoint

Go to **Stripe Dashboard > Developers > Webhooks** and add an endpoint:

- **Endpoint URL**: `https://your-domain.com/api/stripe/webhooks`
- **Events to listen for**:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

Copy the **Signing Secret** (starts with `whsec_`) into `STRIPE_WEBHOOK_SECRET`.

### 3. Configure Customer Portal

Go to **Stripe Dashboard > Settings > Billing > Customer Portal** and enable:

- Invoice history
- Subscription cancellation
- Subscription plan switching
- Payment method update

## Testing with Stripe CLI

### Install Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows (via scoop)
scoop install stripe
```

### Forward Webhooks to Local Dev Server

```bash
# Login to Stripe CLI
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/stripe/webhooks

# Note the webhook signing secret it outputs and set it as STRIPE_WEBHOOK_SECRET
```

### Test Card Numbers

| Card Number          | Scenario            |
|---------------------|---------------------|
| `4242 4242 4242 4242` | Successful payment  |
| `4000 0000 0000 3220` | 3D Secure required  |
| `4000 0000 0000 9995` | Payment declined    |
| `4000 0000 0000 0341` | Attaching fails     |

Use any future expiry date, any 3-digit CVC, and any billing ZIP.

### Trigger Test Events

```bash
# Trigger a test checkout completed event
stripe trigger checkout.session.completed

# Trigger a payment failure
stripe trigger invoice.payment_failed

# Trigger a subscription cancellation
stripe trigger customer.subscription.deleted
```

## Architecture Overview

### API Routes

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/stripe/checkout` | POST | Required | Creates a Stripe Checkout Session |
| `/api/stripe/portal` | POST | Required | Creates a Stripe Billing Portal session |
| `/api/stripe/webhooks` | POST | None (signature verified) | Handles Stripe webhook events |
| `/api/subscription` | GET | Optional | Returns current subscription status |
| `/api/subscription` | POST | Required | Handles trial starts, checkout/portal redirects |

### Webhook Event Flow

1. **`checkout.session.completed`**: User completes checkout. Updates `stripeCustomerId`, `stripeSubscriptionId`, `subscriptionTier`, `subscriptionStatus`, `subscriptionStartDate`. Clears trial fields. Sends confirmation email.

2. **`customer.subscription.updated`**: Subscription changes (upgrade, downgrade, status). Updates tier and status accordingly.

3. **`customer.subscription.deleted`**: Subscription fully canceled. Downgrades user to free tier.

4. **`invoice.payment_succeeded`**: Logs successful payment for monitoring.

5. **`invoice.payment_failed`**: Sets `subscriptionStatus` to `past_due`. Sends payment recovery email via Resend.

### Key Files

- `src/lib/stripe.ts` - Stripe client, price ID mapping, status helpers
- `src/lib/stripe-helpers.ts` - Email templates for payment events
- `src/app/api/stripe/checkout/route.ts` - Checkout session creation
- `src/app/api/stripe/portal/route.ts` - Billing portal session creation
- `src/app/api/stripe/webhooks/route.ts` - Webhook event handler
- `src/app/pricing/page.tsx` - Frontend pricing page with Stripe integration
- `src/lib/validations.ts` - `stripeCheckoutSchema` for input validation
