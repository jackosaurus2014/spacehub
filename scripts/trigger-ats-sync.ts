/** Trigger the ATS job sync on production. Run: railway run npx tsx scripts/trigger-ats-sync.ts */
export {};

async function main() {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error('CRON_SECRET not in env — run via `railway run`');

  console.log('Triggering ATS job sync (16 boards, may take a couple of minutes)...');
  const res = await fetch('https://spacenexus.us/api/refresh?type=ats-jobs', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(9 * 60 * 1000),
  });
  const body = await res.json();
  console.log(`HTTP ${res.status}`);
  console.log(JSON.stringify(body, null, 2).slice(0, 2000));
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
