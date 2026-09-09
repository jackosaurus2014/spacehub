/**
 * Trial parity guard (2026-09-08).
 *
 * The site advertises one Professional trial, TRIAL_DAYS long, with no card.
 * Registration auto-starts it, the pricing page can start it for accounts
 * that never had one, and Stripe checkout must honour whatever is left of it
 * so nobody is charged before the trial they were promised has ended. Every
 * one of those places used to carry its own number (3, 14, 14) and checkout
 * granted Stripe's trial only to accounts with no trial fields at all —
 * which, once signup auto-started a trial, was nobody.
 */
import fs from 'fs';
import path from 'path';
import { TRIAL_DAYS } from '../subscription';
import { SUBSCRIPTION_PLANS } from '@/types';

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf-8');

describe('trial parity with Stripe', () => {
  it('registration and the start-trial action both use TRIAL_DAYS', () => {
    const register = read('src/app/api/auth/register/route.ts');
    expect(register).toMatch(/trialEnd\.getDate\(\) \+ TRIAL_DAYS/);
    expect(register).not.toMatch(/getDate\(\) \+ \d+\)/);

    const subscription = read('src/app/api/subscription/route.ts');
    expect(subscription).toMatch(/TRIAL_DAYS \* 24 \* 60 \* 60 \* 1000/);
    expect(subscription).not.toMatch(/\b14 \* 24 \* 60 \* 60 \* 1000/);
  });

  it('checkout carries an active site trial into Stripe and never hardcodes the trial length', () => {
    const checkout = read('src/app/api/stripe/checkout/route.ts');
    expect(checkout).toMatch(/trial_end: Math\.floor\(trialEndMs \/ 1000\)/);
    expect(checkout).toMatch(/trial_period_days: TRIAL_DAYS/);
    expect(checkout).not.toMatch(/trial_period_days: \d+/);
    // the one-trial marker is read, not just the active-trial fields
    expect(checkout).toMatch(/user\.trialStartDate !== null/);
  });

  it('trial expiry keeps trialStartDate so a second free trial cannot be started', () => {
    const subscription = read('src/app/api/subscription/route.ts');
    const expiry = subscription.slice(subscription.indexOf('Trial has expired'), subscription.indexOf('Trial has expired') + 500);
    expect(expiry).toMatch(/trialTier: null/);
    expect(expiry).not.toMatch(/trialStartDate: null/);
  });

  it('the plan card advertises the same trial length', () => {
    const pro = SUBSCRIPTION_PLANS.find((plan) => plan.id === 'pro');
    expect(pro?.trialDays).toBe(TRIAL_DAYS);
    const pricing = read('src/app/pricing/page.tsx');
    expect(pricing).not.toMatch(/14-Day|14-day/);
  });
});
