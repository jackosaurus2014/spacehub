import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const PROJECT_ROOT = path.join(__dirname, '..');
const CONFIG_PATH = path.join(PROJECT_ROOT, '.nano-banana-config.json');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'public', 'play-store');

// Load API key from config
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
const API_KEY = config.geminiApiKey;
const MODEL = 'gemini-2.5-flash-image';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

interface GenerationResult {
  name: string;
  outputPath: string;
  width: number;
  height: number;
}

async function generateImage(prompt: string, name: string): Promise<Buffer | null> {
  console.log(`\n  Generating: ${name}...`);
  console.log(`  Prompt: "${prompt.substring(0, 100)}..."`);

  const response = await fetch(`${API_URL}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`  ERROR (${response.status}): ${errorText.substring(0, 200)}`);
    return null;
  }

  const data = await response.json();

  if (!data.candidates?.[0]?.content?.parts) {
    console.error('  ERROR: No content in response');
    console.error('  Response:', JSON.stringify(data).substring(0, 300));
    return null;
  }

  for (const part of data.candidates[0].content.parts) {
    if (part.inlineData) {
      const buffer = Buffer.from(part.inlineData.data, 'base64');
      console.log(`  Success! Raw image: ${(buffer.length / 1024).toFixed(0)} KB`);
      return buffer;
    }
  }

  console.error('  ERROR: No image data in response parts');
  return null;
}

async function generateAndResize(
  prompt: string,
  name: string,
  width: number,
  height: number,
  filename: string
): Promise<GenerationResult | null> {
  const buffer = await generateImage(prompt, name);
  if (!buffer) return null;

  const outputPath = path.join(OUTPUT_DIR, filename);

  await sharp(buffer)
    .resize(width, height, { fit: 'cover', position: 'centre' })
    .flatten({ background: '#0f172a' })
    .png()
    .toFile(outputPath);

  const stats = fs.statSync(outputPath);
  console.log(`  Saved: ${filename} (${width}x${height}, ${(stats.size / 1024).toFixed(0)} KB)`);

  return { name, outputPath, width, height };
}

async function main() {
  console.log('=== Nano Banana (Gemini AI) Play Store Asset Generator ===');
  console.log(`Model: ${MODEL}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const results: GenerationResult[] = [];

  // ─── 1. App Icon (512x512) ───
  console.log('── 1. APP ICON ──');
  const iconResult = await generateAndResize(
    `Design a professional, modern app icon for "SpaceNexus", a space industry intelligence platform.
    The icon should feature:
    - A stylized "SN" monogram or a nexus/hub symbol combining space elements
    - Dark navy blue background (#0f172a)
    - Glowing cyan and purple accents (#06b6d4 and #7c3aed)
    - Subtle space elements like orbital rings, stars, or satellite paths
    - Clean, minimalist design suitable for small mobile screens
    - No text other than possibly "SN" initials
    - Square format, app icon style with rounded corners
    - Professional, corporate feel (B2B SaaS product)
    Make it look premium and high-tech. Think Bloomberg Terminal meets NASA.`,
    'App Icon',
    512, 512,
    'nb-app-icon-512x512.png'
  );
  if (iconResult) results.push(iconResult);

  // ─── 2. Feature Graphic (1024x500) ───
  console.log('\n── 2. FEATURE GRAPHIC ──');
  const featureResult = await generateAndResize(
    `Design a Google Play Store feature graphic banner for "SpaceNexus" - The Space Industry Intelligence Platform.
    Specifications:
    - Dimensions: wide banner format (roughly 2:1 aspect ratio)
    - Dark navy space background with subtle star field
    - "SpaceNexus" title text prominently displayed in modern sans-serif font, white or silver
    - Tagline beneath: "Space Industry Intelligence Platform"
    - Visual elements: subtle satellite orbits, data visualization lines, rocket silhouettes, Earth curve
    - Glowing cyan (#06b6d4) and purple (#7c3aed) accent colors
    - Professional, sleek, not cartoonish
    - Should feel like a premium B2B analytics/intelligence platform
    - Clean composition, not cluttered`,
    'Feature Graphic',
    1024, 500,
    'nb-feature-graphic-1024x500.png'
  );
  if (featureResult) results.push(featureResult);

  // ─── 3. Phone Screenshots (1080x1920) ───
  console.log('\n── 3. PHONE SCREENSHOTS ──');

  const phonePrompts = [
    {
      name: 'Hero / Home Screen',
      filename: 'nb-phone-screenshot-1.png',
      prompt: `Create a realistic mobile app screenshot mockup for "SpaceNexus" space industry platform.
      Show a dark-themed mobile app home screen with:
      - Top navigation bar with "SpaceNexus" logo
      - Hero section saying "Built for Space Industry Professionals"
      - Grid of 6 feature cards: "Launch Tracking", "Market Intel", "News Feed", "Satellite Ops", "Compliance", "Mission Planning"
      - Each card has a small icon and brief description
      - Dark navy (#0f172a) background, white text, cyan and purple accent colors
      - Modern UI design, clean typography
      - Realistic mobile app interface, not a website
      Portrait orientation, 9:16 aspect ratio.`
    },
    {
      name: 'Live Launch Dashboard',
      filename: 'nb-phone-screenshot-2.png',
      prompt: `Create a realistic mobile app screenshot for a "Live Launch Tracking" dashboard in a space industry app.
      Show a dark-themed mobile screen with:
      - Header: "Live Launch Dashboard" with a rocket icon
      - A countdown timer showing "T-01:28:45" in large glowing text
      - Mission info card: "Falcon 9 | Starlink Group 12-5" with SpaceX logo
      - Launch site: "Kennedy Space Center, FL"
      - Live video player placeholder with a globe/Earth view
      - Status badges: "GO" in green
      - Active Streams sidebar showing 3 upcoming launches with thumbnails
      - Dark navy background (#0f172a), cyan (#06b6d4) accents, modern UI
      Portrait orientation, 9:16 aspect ratio, realistic mobile app interface.`
    },
    {
      name: 'Space News Feed',
      filename: 'nb-phone-screenshot-3.png',
      prompt: `Create a realistic mobile app screenshot for a "Space News" feed in a space industry intelligence app.
      Show a dark-themed mobile screen with:
      - Header: "Space News" with category filter chips (All, Launches, Satellites, Defense, Earnings, M&A)
      - 4-5 news article cards in a masonry/card layout, each with:
        - Small thumbnail image
        - Headline text in white
        - Source name and timestamp
        - Color-coded category badge (Breaking = red, Launches = orange, Defense = purple)
      - Headlines about real topics: SpaceX launches, satellite deployments, space policy
      - Dark navy background (#0f172a), clean card design with subtle borders
      Portrait orientation, 9:16 aspect ratio, realistic mobile app interface.`
    },
    {
      name: 'Market Intelligence',
      filename: 'nb-phone-screenshot-4.png',
      prompt: `Create a realistic mobile app screenshot for "Market Intelligence" in a space industry platform.
      Show a dark-themed mobile screen with:
      - Header: "Space Market Intel"
      - Summary stats row: "119 Companies", "26 Public", "$924B Market Cap"
      - Live stock ticker cards for space companies showing:
        - RTX Corporation: $196.74 (+0.5%)
        - Lockheed Martin: $602.76 (+1.2%)
        - Boeing: $235.95 (-0.3%)
      - Each card has a mini sparkline chart in green/red
      - Section: "Publicly-Traded Space Companies" list below
      - Dark navy background (#0f172a), green for positive, red for negative
      - Clean financial dashboard UI style
      Portrait orientation, 9:16 aspect ratio, realistic mobile app interface.`
    },
    {
      name: 'Company Intelligence',
      filename: 'nb-phone-screenshot-5.png',
      prompt: `Create a realistic mobile app screenshot for a "Company Profile" page in a space industry intelligence app.
      Show a dark-themed mobile screen with:
      - Company header: "SpaceX" with a large logo, verification badge
      - Tier badge: "Tier 1 - Major"
      - Quick stats: Founded 2002, Employees 13,000+, HQ: Hawthorne, CA
      - Tab bar: Overview | Financials | Assets | News | Events
      - Overview tab showing:
        - Brief description paragraph
        - Tags: "Launch Provider", "Satellite Manufacturer", "Space Station"
        - Key metrics cards: 250+ launches, 6000+ Starlink satellites
        - Recent news section with 2 headlines
      - Dark navy background (#0f172a), professional corporate feel
      Portrait orientation, 9:16 aspect ratio, realistic mobile app interface.`
    },
    {
      name: 'Marketplace',
      filename: 'nb-phone-screenshot-6.png',
      prompt: `Create a realistic mobile app screenshot for a "Space Marketplace" in a space industry platform.
      Show a dark-themed mobile screen with:
      - Header: "Space Marketplace" with search bar
      - Category grid showing: "Launch Services", "Satellite Components", "Ground Stations", "Data & Analytics", "Engineering Services", "Insurance"
      - Each category has an icon and listing count
      - Featured listing cards below:
        - "Rideshare Launch Slots - Q3 2026" by Rocket Lab, price: "$1.2M/slot"
        - "Ka-Band Ground Station Network" by KSAT, "Contact for pricing"
      - Each card has a verification badge and match score percentage
      - Dark navy (#0f172a) background, purple (#7c3aed) and cyan accents
      Portrait orientation, 9:16 aspect ratio, realistic mobile app interface.`
    },
  ];

  for (let i = 0; i < phonePrompts.length; i++) {
    const p = phonePrompts[i];
    const result = await generateAndResize(
      p.prompt, p.name, 1080, 1920, p.filename
    );
    if (result) results.push(result);
    // Brief pause between API calls to avoid rate limiting
    if (i < phonePrompts.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // ─── 4. 10-inch Tablet Screenshots (2560x1600 landscape) ───
  console.log('\n── 4. TABLET SCREENSHOTS ──');

  const tabletPrompts = [
    {
      name: 'Tablet - Dashboard',
      filename: 'nb-tablet-screenshot-1.png',
      prompt: `Create a realistic tablet app screenshot for "SpaceNexus" space industry intelligence platform.
      Landscape orientation tablet view showing a rich dashboard with:
      - Top nav bar: SpaceNexus logo, menu items (Explore, Intelligence, Business, Tools, Pricing)
      - Hero: "Built for Space Industry Professionals" with 6 persona cards below
      - Bottom widget row: "Next Launch" countdown, "Top Performer" stock ticker, "Latest News" headline, "Space Weather" status
      - Dark navy space-themed background (#0f172a) with subtle Earth/satellite imagery
      - Spacious layout utilizing full tablet width
      - Professional, data-rich feel like Bloomberg Terminal for space
      Landscape 16:10 aspect ratio, realistic tablet app interface.`
    },
    {
      name: 'Tablet - News & Market',
      filename: 'nb-tablet-screenshot-2.png',
      prompt: `Create a realistic tablet app screenshot showing a split-view space news and market intelligence dashboard.
      Landscape tablet view with:
      - Left panel (60%): News feed with category filter bar and article cards in 2-column masonry layout
      - Right panel (40%): Market intelligence sidebar with stock tickers, market cap, and mini charts
      - Top navigation bar with SpaceNexus branding
      - Dark navy (#0f172a) background, article cards with subtle borders
      - Color-coded news categories (red for breaking, orange for launches, purple for defense)
      - Green/red stock indicators
      - Professional, information-dense but organized layout
      Landscape 16:10 aspect ratio, realistic tablet app interface.`
    },
  ];

  for (let i = 0; i < tabletPrompts.length; i++) {
    const p = tabletPrompts[i];
    const result = await generateAndResize(
      p.prompt, p.name, 2560, 1600, p.filename
    );
    if (result) results.push(result);
    if (i < tabletPrompts.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // ─── Summary ───
  console.log('\n\n=== GENERATION COMPLETE ===');
  console.log(`Successfully generated: ${results.length} assets`);
  console.log('');
  results.forEach(r => {
    console.log(`  ${r.width}x${r.height}  ${path.basename(r.outputPath)}  (${r.name})`);
  });
  console.log('');
  console.log('All files saved to: public/play-store/');
  console.log('Files are prefixed with "nb-" (Nano Banana generated)');

  const failed = (1 + 1 + phonePrompts.length + tabletPrompts.length) - results.length;
  if (failed > 0) {
    console.log(`\nWARNING: ${failed} image(s) failed to generate. Check errors above.`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
