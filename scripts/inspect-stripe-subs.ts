/**
 * Read-only: list all live subscriptions with price labels.
 * Run with Railway env: railway run npx tsx scripts/inspect-stripe-subs.ts
 */
import Stripe from 'stripe';

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not in env — run via `railway run`');
  const stripe = new Stripe(key, { typescript: true });

  const priceLabels: Record<string, string> = {
    [process.env.STRIPE_PRICE_PRO_MONTHLY || '']: 'PRO_MONTHLY',
    [process.env.STRIPE_PRICE_PRO_YEARLY || '']: 'PRO_YEARLY',
    [process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || '']: 'ENTERPRISE_MONTHLY',
    [process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || '']: 'ENTERPRISE_YEARLY',
  };

  const subs = await stripe.subscriptions.list({ status: 'all', limit: 100, expand: ['data.customer'] });
  console.log(`total subscriptions: ${subs.data.length}`);
  for (const sub of subs.data) {
    const item = sub.items.data[0];
    const price = item?.price;
    const customer = sub.customer as Stripe.Customer;
    console.log(
      JSON.stringify({
        subId: sub.id,
        customerEmail: typeof customer === 'object' && 'email' in customer ? customer.email : String(sub.customer),
        status: sub.status,
        priceId: price?.id,
        priceLabel: priceLabels[price?.id || ''] || 'UNKNOWN',
        amount: price?.unit_amount,
        interval: price?.recurring?.interval,
        currentPeriodEnd: item?.current_period_end
          ? new Date(item.current_period_end * 1000).toISOString()
          : null,
        itemId: item?.id,
      })
    );
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
