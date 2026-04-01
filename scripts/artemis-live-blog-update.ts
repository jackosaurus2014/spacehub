/**
 * Artemis II Live Blog Auto-Updater (Research-Based)
 *
 * 1. Fetches NASA's official live blog and Google News for latest status
 * 2. Synthesizes an accurate update based on real reported information
 * 3. Posts to SpaceNexus live blog with dedup check
 *
 * Run: npx tsx scripts/artemis-live-blog-update.ts
 */

const BLOG_API = 'https://spacenexus.us/api/live-blog';
const CRON_SECRET = process.env.CRON_SECRET || '';

// ── Research: Fetch real data from multiple sources ──

async function fetchNASALiveBlog(): Promise<string[]> {
  const updates: string[] = [];
  try {
    // NASA's official Artemis II live blog
    const res = await fetch('https://www.nasa.gov/blogs/missions/2026/04/01/live-artemis-ii-launch-day-updates/', {
      headers: { 'User-Agent': 'SpaceNexus/1.0 (news aggregator)' },
    });
    if (res.ok) {
      const html = await res.text();
      // Extract recent update text blocks (NASA uses <p> tags in blog posts)
      const paragraphs: string[] = [];
      let m: RegExpExecArray | null;
      const re = /<p[^>]*>(.*?)<\/p>/gi;
      while ((m = re.exec(html)) !== null) {
        const text = m[1].replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#8217;/g, "'").replace(/&#8216;/g, "'").replace(/&#8220;/g, '"').replace(/&#8221;/g, '"').replace(/&#8212;/g, ' — ').replace(/&#\d+;/g, '').replace(/\s+/g, ' ').trim();
        // Filter out boilerplate, headers, and non-substantive text
        const boilerplate = [
          'live updates for launch', 'will be published on this page',
          'all times are eastern', 'nasa\'s launch broadcast', 'airing on nasa+',
          'coverage is airing', 'amazon prime', 'share this',
          'sign up for', 'newsletter', 'cookie', 'subscribe',
          'privacy policy', 'terms of use', 'read more at',
        ];
        const isBoilerplate = boilerplate.some(bp => text.toLowerCase().includes(bp));
        if (text.length > 60 && text.length < 500 && !isBoilerplate) {
          paragraphs.push(text);
        }
      }
      // Take the 3 most recent substantial paragraphs
      updates.push(...paragraphs.slice(0, 3));
    }
  } catch { /* continue */ }
  return updates;
}

async function fetchNewsHeadlines(): Promise<string[]> {
  const headlines: string[] = [];
  try {
    const res = await fetch('https://news.google.com/rss/search?q=artemis+II+launch+today+2026&hl=en-US&gl=US&ceid=US:en');
    if (res.ok) {
      const text = await res.text();
      let m: RegExpExecArray | null;
      const re = /<title><!\[CDATA\[(.*?)\]\]><\/title>/g;
      while ((m = re.exec(text)) !== null) {
        if (m[1] && !m[1].includes('Google News') && headlines.length < 5) {
          headlines.push(m[1]);
        }
      }
    }
  } catch { /* continue */ }
  return headlines;
}

async function fetchLiveScienceBlog(): Promise<string[]> {
  const updates: string[] = [];
  try {
    const res = await fetch('https://www.livescience.com/space/live/artemis-ii-launch-wednesday-april-1', {
      headers: { 'User-Agent': 'SpaceNexus/1.0 (news aggregator)' },
    });
    if (res.ok) {
      const html = await res.text();
      const paragraphs: string[] = [];
      let m: RegExpExecArray | null;
      const re = /<p[^>]*>(.*?)<\/p>/gi;
      while ((m = re.exec(html)) !== null) {
        const text = m[1].replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#8217;/g, "'").replace(/&#8216;/g, "'").replace(/&#8220;/g, '"').replace(/&#8221;/g, '"').replace(/&#8212;/g, ' — ').replace(/&#\d+;/g, '').replace(/\s+/g, ' ').trim();
        if (text.length > 50 && text.length < 400 &&
            (text.toLowerCase().includes('artemis') || text.toLowerCase().includes('sls') ||
             text.toLowerCase().includes('orion') || text.toLowerCase().includes('crew') ||
             text.toLowerCase().includes('launch') || text.toLowerCase().includes('countdown'))) {
          paragraphs.push(text);
        }
      }
      updates.push(...paragraphs.slice(0, 2));
    }
  } catch { /* continue */ }
  return updates;
}

// ── Synthesize update from research ──

async function postUpdate(): Promise<void> {
  const now = new Date();
  const launchTime = new Date('2026-04-01T22:24:00Z');
  const diffMs = launchTime.getTime() - now.getTime();
  const hoursUntil = Math.round(diffMs / (1000 * 60 * 60) * 10) / 10;
  const minutesUntil = Math.round(diffMs / (1000 * 60));

  console.log(`\n🔍 Researching latest Artemis II status (T-${hoursUntil}h)...`);

  // Fetch from multiple sources
  const [nasaUpdates, headlines, liveSciUpdates] = await Promise.all([
    fetchNASALiveBlog(),
    fetchNewsHeadlines(),
    fetchLiveScienceBlog(),
  ]);

  console.log(`  NASA blog: ${nasaUpdates.length} updates`);
  console.log(`  News headlines: ${headlines.length} found`);
  console.log(`  Live Science: ${liveSciUpdates.length} updates`);

  // Pick the best source material
  const sourceUpdates = [...nasaUpdates, ...liveSciUpdates];
  const bestUpdate = sourceUpdates[0] || '';
  const topHeadline = headlines[0] || '';

  // Build the update
  let title: string;
  let body: string;
  let type: string = 'update';

  if (minutesUntil <= 0) {
    title = 'LIFTOFF — Artemis II Has Launched!';
    body = bestUpdate || 'The Space Launch System has lifted off from Pad 39B at Kennedy Space Center. Four astronauts are on their way to the Moon.';
    type = 'milestone';
  } else if (minutesUntil <= 10) {
    title = `T-${minutesUntil} Minutes — Final Countdown`;
    body = bestUpdate || 'We are in the final minutes before launch. The terminal countdown is underway.';
    type = 'countdown';
  } else if (minutesUntil <= 30) {
    title = `T-${minutesUntil} Minutes — Launch Imminent`;
    body = bestUpdate || `Launch is ${minutesUntil} minutes away. All eyes on Pad 39B.`;
    type = 'countdown';
  } else if (minutesUntil <= 60) {
    title = `T-${minutesUntil} Minutes to Launch`;
    body = bestUpdate || 'Less than one hour to launch. Final checks underway.';
    type = 'countdown';
  } else {
    // For updates more than 1 hour out, use research-based content
    const timeLabel = hoursUntil >= 1 ? `T-${hoursUntil.toFixed(1)} Hours` : `T-${minutesUntil} Minutes`;

    if (bestUpdate) {
      // Use actual reported information
      title = `${timeLabel} — Launch Update`;
      body = bestUpdate;
      if (topHeadline && !body.includes(topHeadline.slice(0, 30))) {
        body += ` In the news: ${topHeadline}`;
      }
    } else if (topHeadline) {
      // Fall back to headline
      title = `${timeLabel} — ${topHeadline.slice(0, 80)}`;
      body = `Latest from the countdown: ${topHeadline}. Launch window opens at 6:24 PM EDT from Pad 39B at Kennedy Space Center.`;
    } else {
      // Last resort — generic but accurate
      title = `${timeLabel} — Countdown Continues`;
      body = `The Artemis II countdown continues toward the 6:24 PM EDT launch window. Follow NASA's official coverage on NASA+ starting at 1 PM EDT for the latest status updates.`;
    }
    type = minutesUntil <= 120 ? 'countdown' : 'update';
  }

  // Dedup check
  try {
    const checkRes = await fetch(BLOG_API, {
      headers: { 'Origin': 'https://spacenexus.us', 'Referer': 'https://spacenexus.us/' },
    });
    if (checkRes.ok) {
      const existing = await checkRes.json();
      const lastTitle = existing?.entries?.[0]?.title;
      if (lastTitle === title) {
        console.log(`⏭️  Skipped duplicate: "${title}"`);
        return;
      }
      // Also skip if body is very similar to last entry
      const lastBody = existing?.entries?.[0]?.body || '';
      if (lastBody && body && lastBody.slice(0, 100) === body.slice(0, 100)) {
        console.log(`⏭️  Skipped similar content`);
        return;
      }
    }
  } catch { /* continue */ }

  // Post
  try {
    const res = await fetch(BLOG_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Origin': 'https://spacenexus.us',
        'Referer': 'https://spacenexus.us/',
      },
      body: JSON.stringify({ title, body: body.slice(0, 2000), type }),
    });

    if (res.ok) {
      console.log(`✅ Posted: "${title}"`);
      console.log(`   Body preview: ${body.slice(0, 120)}...`);
    } else {
      const err = await res.text();
      console.error(`❌ Failed (${res.status}): ${err.slice(0, 200)}`);
    }
  } catch (err) {
    console.error(`❌ Error: ${err}`);
  }
}

postUpdate();
