export async function register() {
  // Only start cron jobs on the Node.js server runtime (not Edge, not client)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Delay startup to ensure the HTTP server is accepting connections
    setTimeout(async () => {
      const { startCronJobs } = await import('./lib/cron-scheduler');
      startCronJobs();
    }, 15_000);
  }
}
