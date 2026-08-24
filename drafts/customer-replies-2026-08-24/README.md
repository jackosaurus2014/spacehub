# Customer replies — founding-member billing failure

**Status: DRAFTS. Nothing has been sent. Outbound is gated on Jay.**

## What happened

The site advertised "12 founding spots left — $4.99/month for life". Stripe was
configured as FOUNDER50 = 50% off for 12 months ($9.99), and checkout only set
`allow_promotion_codes: true`, which shows an empty promo-code box and applies
nothing. Stripe recorded `times_redeemed: 0` — the discount was never once
granted. Two people wrote in. Neither got a reply.

## The two customers

| | Jay Bookbinder | Conner Murphy |
|---|---|---|
| Wrote in | 2026-05-10 | 2026-05-26 |
| Waited | 106 days | 89 days |
| Stripe customer | `cus_UUPFtyLPmbksm0` | `cus_UafMfcj75QV7WJ` |
| Subscribed? | **Yes — same day** (`sub_1TVQWKDZYwgQpvkLet45EBDC`) | No — could not complete |
| Charged | **4 × $19.99 = $79.96** | $0 |
| Promised price would have been | 4 × $4.99 = $19.96 | — |
| **Overcharged vs the advertisement** | **$60.00** | — |

Jay Bookbinder is currently the **only** active paying subscriber on the
platform. He asked, on day one, to be moved to the advertised price. He was
charged the full $19.99 four more times instead.

## Remedy options (Jay's decision — nothing actioned)

The drafts below assume **Option A**, which is what he actually asked for.

- **Option A (recommended):** refund the $60.00 difference and honour
  $4.99/month for life via a custom Stripe price. Costs $60 plus $15/month of
  list price against the one customer who believed the advertisement.
- **Option B:** full refund of $79.96, comp Pro for 12 months, then $19.99.
- **Option C:** full refund of $79.96 and cancel.

Note: the Founding Member offer is now withdrawn site-wide and FOUNDER50 is
deactivated in Stripe, so honouring $4.99 needs a **custom price object** — it
cannot be done with the old promo code.
