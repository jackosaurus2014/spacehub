/**
 * Create the fixed-price weekly-brief sponsorship Products/Prices in Stripe.
 * Idempotent: checks for each price by lookup key before creating anything.
 * Dynamic campaign budgets use inline price_data and need no setup.
 *
 * Run: railway run npx tsx scripts/setup-ad-billing-stripe.ts
 */
import Stripe from 'stripe';
import { SPONSORSHIP_PRODUCTS } from '../src/lib/ads/ad-billing';

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not in env — run via `railway run`');
  const stripe = new Stripe(key, { typescript: true });

  for (const [option, product] of Object.entries(SPONSORSHIP_PRODUCTS)) {
    const existing = await stripe.prices.list({
      lookup_keys: [product.lookupKey],
      limit: 1,
    });

    if (existing.data.length > 0) {
      const price = existing.data[0];
      console.log(
        `${option}: already exists — price ${price.id} (${(price.unit_amount || 0) / 100} ${price.currency}) active=${price.active}`
      );
      continue;
    }

    const stripeProduct = await stripe.products.create({
      name: product.productName,
      description: product.description,
      metadata: { module: 'ad-billing', sponsorshipOption: option },
    });

    const price = await stripe.prices.create({
      product: stripeProduct.id,
      currency: 'usd',
      unit_amount: product.amountCents,
      lookup_key: product.lookupKey,
      metadata: { module: 'ad-billing', sponsorshipOption: option },
    });

    console.log(
      `${option}: created product ${stripeProduct.id} + price ${price.id} ($${product.amountCents / 100}, lookup_key=${product.lookupKey})`
    );
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
