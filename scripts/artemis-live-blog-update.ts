/**
 * Artemis II Live Blog Auto-Updater
 * Fetches latest Artemis news and posts an update to the live blog.
 * Run manually or via loop: npx tsx scripts/artemis-live-blog-update.ts
 */

const BLOG_API = 'https://spacenexus.us/api/live-blog';
const CRON_SECRET = process.env.CRON_SECRET || '';

interface NewsResult {
  title: string;
  snippet: string;
  url: string;
}

async function fetchLatestArtemisNews(): Promise<string> {
  // Use a simple Google News RSS approach or just summarize known status
  try {
    const res = await fetch('https://news.google.com/rss/search?q=artemis+II+launch+today&hl=en-US&gl=US&ceid=US:en');
    if (res.ok) {
      const text = await res.text();
      // Extract first 3 headlines from RSS
      const titles: string[] = [];
      let match: RegExpExecArray | null;
      const re = /<title><!\[CDATA\[(.*?)\]\]><\/title>/g;
      while ((match = re.exec(text)) !== null) {
        if (match[1] && !match[1].includes('Google News') && titles.length < 3) {
          titles.push(match[1]);
        }
      }
      if (titles.length > 0) {
        return titles.join('. ');
      }
    }
  } catch {
    // Fall back to generic status
  }
  return '';
}

async function postUpdate(): Promise<void> {
  const now = new Date();
  const launchTime = new Date('2026-04-01T22:24:00Z');
  const diffMs = launchTime.getTime() - now.getTime();
  const hoursUntil = Math.round(diffMs / (1000 * 60 * 60) * 10) / 10;
  const minutesUntil = Math.round(diffMs / (1000 * 60));

  // Determine update type based on time until launch
  let title: string;
  let body: string;
  let type: string = 'update';

  const newsContext = await fetchLatestArtemisNews();

  if (minutesUntil <= 0) {
    title = 'LIFTOFF — Artemis II Has Launched!';
    body = 'The Space Launch System has lifted off from Pad 39B at Kennedy Space Center, sending four astronauts on humanity\'s return to the Moon. Follow the mission as Orion heads toward lunar orbit.';
    type = 'milestone';
  } else if (minutesUntil <= 10) {
    title = `T-${minutesUntil} Minutes — Final Countdown`;
    body = `We are in the final minutes before launch. The launch director has given the GO. All systems are nominal. Artemis II is moments away from liftoff.`;
    type = 'countdown';
  } else if (minutesUntil <= 30) {
    title = `T-${minutesUntil} Minutes — Launch Imminent`;
    body = `Artemis II launch is ${minutesUntil} minutes away. The crew is secured in Orion, the access arm has retracted, and the terminal countdown is underway. All eyes on Pad 39B.`;
    type = 'countdown';
  } else if (minutesUntil <= 60) {
    title = `T-${minutesUntil} Minutes — Final Preparations`;
    body = `Less than one hour to launch. Ground teams are completing final checks. The crew access arm will retract shortly. Weather remains favorable.${newsContext ? ' ' + newsContext : ''}`;
    type = 'countdown';
  } else if (hoursUntil <= 2) {
    title = `T-${Math.round(minutesUntil)} Minutes — Crew Ingress Complete`;
    body = `The Artemis II crew is aboard Orion and strapped in. Communication checks are underway. The launch team is working through the final checklist items before terminal countdown begins.${newsContext ? ' Headlines: ' + newsContext : ''}`;
    type = 'update';
  } else if (hoursUntil <= 4) {
    title = `T-${hoursUntil.toFixed(1)} Hours — Crew Walkout and Suit-Up`;
    body = `The countdown continues toward the 6:24 PM EDT launch. The crew is suiting up in their Orion suits at the Neil Armstrong Operations & Checkout Building before heading to the pad. Fueling operations continue on schedule.${newsContext ? ' Latest: ' + newsContext : ''}`;
    type = 'update';
  } else if (hoursUntil <= 6) {
    title = `T-${hoursUntil.toFixed(1)} Hours — Fueling In Progress`;
    body = `SLS rocket fueling continues at Pad 39B. Liquid hydrogen and liquid oxygen are being loaded into the core stage and interim cryogenic propulsion stage tanks. All systems nominal. Launch weather remains 80% favorable.${newsContext ? ' In the news: ' + newsContext : ''}`;
    type = 'update';
  } else {
    title = `T-${hoursUntil.toFixed(1)} Hours — Countdown Update`;
    body = `The Artemis II countdown is progressing smoothly toward the 6:24 PM EDT launch window. NASA teams continue pre-launch preparations at Kennedy Space Center. Weather forecast holds at 80% favorable.${newsContext ? ' Latest headlines: ' + newsContext : ''}`;
    type = 'update';
  }

  // Check for duplicate — fetch latest entry and skip if title matches
  try {
    const checkRes = await fetch(`${BLOG_API}`, {
      headers: { 'Origin': 'https://spacenexus.us', 'Referer': 'https://spacenexus.us/' },
    });
    if (checkRes.ok) {
      const existing = await checkRes.json();
      const lastTitle = existing?.entries?.[0]?.title;
      if (lastTitle === title) {
        console.log(`⏭️  Skipped duplicate: "${title}"`);
        return;
      }
    }
  } catch { /* continue anyway */ }

  // Post to live blog
  try {
    const res = await fetch(BLOG_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Origin': 'https://spacenexus.us',
        'Referer': 'https://spacenexus.us/',
      },
      body: JSON.stringify({ title, body, type }),
    });

    if (res.ok) {
      console.log(`✅ Posted: "${title}"`);
    } else {
      const err = await res.text();
      console.error(`❌ Failed (${res.status}): ${err.slice(0, 200)}`);
    }
  } catch (err) {
    console.error(`❌ Error: ${err}`);
  }
}

postUpdate();
