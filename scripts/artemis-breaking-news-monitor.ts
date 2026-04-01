/**
 * Artemis II Breaking News Monitor
 * Checks every 5 minutes for significant launch-affecting news.
 * Only posts if something critical is detected (delay, scrub, hold, accident, weather change).
 */

const MONITOR_BLOG_API = 'https://spacenexus.us/api/live-blog';
const MONITOR_CRON_SECRET = process.env.CRON_SECRET || '';

// Only trigger on genuinely significant events — NOT routine countdown text
const BREAKING_KEYWORDS = [
  // Negative / delays
  'scrubbed', 'scrub today', 'launch delayed', 'launch has been delayed',
  'hold in the countdown', 'abort', 'postponed', 'cancelled',
  'weather no-go', 'anomaly detected', 'technical issue identified',
  'accident', 'emergency on pad', 'evacuated', 'lightning strike near pad',
  'hydrogen leak detected', 'standing down', 'recycled the countdown',
  'waved off', 'slipped to april', 'new launch date', 'rescheduled to',
  // Positive milestones
  'go for launch', 'all systems are go', 'poll is go',
  'crew ingress has begun', 'crew ingress complete',
  'closeout crew has departed', 'arm has retracted', 'arm retracted',
  'terminal count has begun', 'terminal countdown',
  'we have liftoff', 'has launched', 'has lifted off',
];

let lastAlertHash = '';

async function checkForBreakingNews(): Promise<void> {
  console.log(`\n🔎 [${new Date().toLocaleTimeString()}] Scanning for breaking Artemis II news...`);

  const findings: string[] = [];

  // Check NASA live blog
  try {
    const res = await fetch('https://www.nasa.gov/blogs/missions/2026/04/01/live-artemis-ii-launch-day-updates/', {
      headers: { 'User-Agent': 'SpaceNexus/1.0' },
    });
    if (res.ok) {
      const html = await res.text();
      let m: RegExpExecArray | null;
      const re = /<p[^>]*>(.*?)<\/p>/gi;
      while ((m = re.exec(html)) !== null) {
        const text = m[1].replace(/<[^>]*>/g, '').trim().toLowerCase();
        if (text.length > 50 && text.length < 400) {
          for (const kw of BREAKING_KEYWORDS) {
            if (text.includes(kw.toLowerCase())) {
              // Extra check: make sure this is a substantive update, not boilerplate
              const boilerplate = ['live updates for', 'will be published', 'all times are', 'provides astronauts', 'this weather update'];
              const isBoilerplate = boilerplate.some(bp => text.includes(bp));
              if (!isBoilerplate) {
                findings.push(m[1].replace(/<[^>]*>/g, '').trim());
              }
              break;
            }
          }
        }
      }
    }
  } catch { /* continue */ }

  if (findings.length === 0) {
    console.log('   ✅ No breaking news detected. Countdown nominal.');
    return;
  }

  // Deduplicate — hash first finding to avoid repeating
  const hash = findings[0].slice(0, 80);
  if (hash === lastAlertHash) {
    console.log('   ⏭️  Already reported this update.');
    return;
  }
  lastAlertHash = hash;

  // Determine severity
  const combined = findings.join(' ').toLowerCase();
  const isNegative = ['scrub', 'delay', 'hold', 'abort', 'postpone', 'cancel', 'anomaly', 'issue', 'problem', 'accident', 'emergency', 'leak', 'stand down', 'wave off', 'no-go'].some(kw => combined.includes(kw));
  const isPositive = ['go for launch', 'all clear', 'resume', 'poll is go', 'liftoff', 'we have liftoff', 'ignition'].some(kw => combined.includes(kw));
  const isMilestone = ['crew ingress', 'close out', 'arm retract', 'terminal count'].some(kw => combined.includes(kw));

  let title: string;
  let type: string;

  if (isNegative) {
    title = '⚠️ BREAKING: ' + findings[0].slice(0, 100);
    type = 'alert';
  } else if (combined.includes('liftoff') || combined.includes('we have liftoff') || combined.includes('ignition')) {
    title = '🚀 LIFTOFF — Artemis II Has Launched!';
    type = 'milestone';
  } else if (isPositive) {
    title = '✅ ' + findings[0].slice(0, 120);
    type = 'milestone';
  } else if (isMilestone) {
    title = '📡 ' + findings[0].slice(0, 120);
    type = 'milestone';
  } else {
    title = findings[0].slice(0, 140);
    type = 'update';
  }

  const body = findings.slice(0, 3).join(' ').slice(0, 2000);

  console.log(`   🚨 BREAKING NEWS DETECTED: ${title.slice(0, 80)}`);

  // Post to live blog
  try {
    const res = await fetch(MONITOR_BLOG_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MONITOR_CRON_SECRET}`,
        'Origin': 'https://spacenexus.us',
        'Referer': 'https://spacenexus.us/',
      },
      body: JSON.stringify({ title: title.replace(/<[^>]*>/g, ''), body: body.replace(/<[^>]*>/g, ''), type }),
    });

    if (res.ok) {
      console.log(`   ✅ Posted breaking update!`);
    } else {
      console.error(`   ❌ Failed to post: ${res.status}`);
    }
  } catch (err) {
    console.error(`   ❌ Error: ${err}`);
  }
}

checkForBreakingNews();
