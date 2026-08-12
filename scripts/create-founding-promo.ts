/**
 * Create the Founding Member promotion in Stripe (idempotent):
 * 50% off Pro for 12 months, limited to the first 50 redemptions.
 * Code: FOUNDER50. Run: railway run npx tsx scripts/create-founding-promo.ts
 */
import Stripe from 'stripe';

const CODE = 'FOUNDER50';

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not in env — run via `railway run`');
  const stripe = new Stripe(key, { typescript: true });

  const existing = await stripe.promotionCodes.list({ code: CODE, limit: 1 });
  if (existing.data.length > 0) {
    const pc = existing.data[0];
    console.log(
      `already exists: ${pc.code} active=${pc.active} redeemed=${pc.times_redeemed}/${pc.max_redemptions}`
    );
    return;
  }

  const coupon = await stripe.coupons.create({
    name: 'Founding Member — 50% off for 12 months',
    percent_off: 50,
    duration: 'repeating',
    duration_in_months: 12,
  });

  const promo = await stripe.promotionCodes.create({
    coupon: coupon.id,
    code: CODE,
    max_redemptions: 50,
  });

  console.log(`created coupon ${coupon.id} + promotion code ${promo.code} (max ${promo.max_redemptions})`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
