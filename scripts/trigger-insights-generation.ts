/**
 * Trigger a production AI-insights generation session.
 * Run: railway run npx tsx scripts/trigger-insights-generation.ts
 */
export {};

async function main() {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error('CRON_SECRET not in env — run via `railway run`');

  console.log('Triggering generation (this takes a few minutes)...');
  const res = await fetch('https://spacenexus.us/api/ai-insights/generate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(9 * 60 * 1000),
  });
  const body = await res.json();
  console.log(`HTTP ${res.status}`);
  console.log(JSON.stringify(body, null, 2).slice(0, 3000));
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
