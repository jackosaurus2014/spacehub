/**
 * Deactivate legacy Enterprise prices in Stripe (no effect on any existing
 * subscription — none use them). Run: railway run npx tsx scripts/archive-enterprise-prices.ts
 */
import Stripe from 'stripe';

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not in env — run via `railway run`');
  const stripe = new Stripe(key, { typescript: true });

  const ids = [
    process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
    process.env.STRIPE_PRICE_ENTERPRISE_YEARLY,
  ].filter(Boolean) as string[];

  for (const id of ids) {
    try {
      const price = await stripe.prices.retrieve(id);
      if (!price.active) {
        console.log(`${id}: already inactive`);
        continue;
      }
      await stripe.prices.update(id, { active: false });
      console.log(`${id}: deactivated (${price.unit_amount} ${price.recurring?.interval})`);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes('default price')) {
        // Archive the whole product instead — deactivates it for checkout.
        const price = await stripe.prices.retrieve(id);
        const productId = typeof price.product === 'string' ? price.product : price.product.id;
        await stripe.products.update(productId, { active: false });
        console.log(`${id}: product ${productId} archived (price was its default)`);
      } else {
        console.log(`${id}: ${msg}`);
      }
    }
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
