import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const PROJECT_ROOT = path.join(__dirname, '..');
const CONFIG_PATH = path.join(PROJECT_ROOT, '.nano-banana-config.json');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'public', 'apple-store');

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
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    }),
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
  console.log('=== Nano Banana Apple App Store Asset Generator ===');
  console.log(`Model: ${MODEL}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const results: GenerationResult[] = [];

  // ─── 1. App Icon (1024x1024, no alpha, no rounded corners) ───
  console.log('── 1. APP ICON (1024x1024) ──');
  const iconResult = await generateAndResize(
    `Design a professional app icon for "SpaceNexus" space industry intelligence platform.
    CRITICAL REQUIREMENTS:
    - Square format, completely fill the square
    - NO rounded corners (Apple applies rounding automatically)
    - NO transparency or alpha channel — solid background everywhere
    - Dark navy blue background (#0f172a)
    - Stylized "SN" monogram with orbital ring design
    - Glowing cyan (#06b6d4) and purple (#7c3aed) accents
    - Minimalist, premium, high-tech look
    - No text other than the SN initials
    - Professional corporate feel (B2B SaaS product)
    Think Bloomberg Terminal meets NASA.`,
    'App Icon (1024x1024)',
    1024, 1024,
    'nb-app-icon-1024x1024.png'
  );
  if (iconResult) results.push(iconResult);

  await new Promise(r => setTimeout(r, 2000));

  // ─── 2. iPhone Screenshots (1320x2868 — iPhone 16 Pro Max) ───
  console.log('\n── 2. iPHONE SCREENSHOTS (1320x2868) ──');

  const iphonePrompts = [
    {
      name: 'iPhone - Home Screen',
      filename: 'nb-iphone-screenshot-1.png',
      prompt: `Create a realistic iPhone 16 Pro Max app screenshot for "SpaceNexus" space industry platform.
      The screen should show a dark-themed mobile app home screen with:
      - iPhone Dynamic Island at the top of the screen
      - Top navigation bar with SpaceNexus logo and user avatar
      - Hero text: "Built for Space Industry Professionals"
      - Grid of 6 module cards: "Launch Tracking", "Market Intel", "News Feed", "Satellite Ops", "Compliance", "Mission Planning"
      - Each card has a glowing icon and one-line description
      - Bottom tab bar with 4 icons: Home, Intelligence, Tools, Profile
      - Dark navy (#0f172a) background, white text, cyan (#06b6d4) and purple (#7c3aed) accents
      - Modern iOS app design with SF Pro typography
      Portrait orientation, tall iPhone aspect ratio. Realistic mobile app interface.`,
    },
    {
      name: 'iPhone - Live Launch',
      filename: 'nb-iphone-screenshot-2.png',
      prompt: `Create a realistic iPhone 16 Pro Max screenshot of a "Live Launch Dashboard" in a space industry app.
      Show:
      - iPhone Dynamic Island at top
      - Header: "Live Launch Dashboard" with rocket icon
      - Large countdown timer: "T-01:28:45" in glowing cyan
      - Mission card: "Falcon 9 | Starlink Group 12-5" with SpaceX badge
      - Launch site: "Kennedy Space Center, FL" with map pin
      - Status indicators: "GO" in green, weather "Clear"
      - Live video placeholder showing Earth from space
      - "Upcoming Launches" section below with 2 more entries
      - Bottom tab bar
      - Dark navy (#0f172a) background, iOS native styling
      Portrait tall iPhone format. Realistic mobile app.`,
    },
    {
      name: 'iPhone - News Feed',
      filename: 'nb-iphone-screenshot-3.png',
      prompt: `Create a realistic iPhone 16 Pro Max screenshot of "Space News" feed in a space intelligence app.
      Show:
      - iPhone Dynamic Island at top
      - Header: "Space News" with search and filter icons
      - Horizontal category chips: All, Launches, Satellites, Defense, Earnings, Policy
      - 4 news article cards with:
        - Thumbnail images on the left
        - Headlines in white bold text
        - Source name and "2h ago" timestamp
        - Color-coded category pill badges
      - Headlines about space topics: SpaceX, satellite deployments, space policy
      - Bottom tab bar
      - Dark navy (#0f172a) background, clean card design with subtle slate-800 borders
      Portrait tall iPhone format. iOS native styling.`,
    },
    {
      name: 'iPhone - Market Intelligence',
      filename: 'nb-iphone-screenshot-4.png',
      prompt: `Create a realistic iPhone 16 Pro Max screenshot of "Market Intelligence" in a space industry platform.
      Show:
      - iPhone Dynamic Island at top
      - Header: "Space Market Intel"
      - Summary stat cards in a row: "119 Companies", "26 Public", "$924B Market Cap"
      - Stock ticker cards for space companies:
        - RTX Corporation: $196.74 (+0.5%) with green mini sparkline
        - Lockheed Martin: $602.76 (+1.2%) with green mini sparkline
        - Boeing: $235.95 (-0.3%) with red mini sparkline
      - "Sector Performance" section with horizontal bar chart
      - Bottom tab bar
      - Dark navy (#0f172a) background, green for gains, red for losses
      - Clean financial dashboard UI, iOS native style
      Portrait tall iPhone format.`,
    },
    {
      name: 'iPhone - Company Profile',
      filename: 'nb-iphone-screenshot-5.png',
      prompt: `Create a realistic iPhone 16 Pro Max screenshot of a company profile page in a space intelligence app.
      Show:
      - iPhone Dynamic Island at top
      - Company header: "SpaceX" with logo and blue verification checkmark
      - Tier badge: "Tier 1 - Major" in purple
      - Info row: Founded 2002 | 13,000+ employees | Hawthorne, CA
      - Tab bar: Overview | Financials | Assets | News
      - Overview content:
        - Brief description paragraph
        - Tag pills: "Launch Provider", "Satellite Mfg", "Space Station"
        - Key metrics: 250+ launches, 6000+ Starlink sats
        - "Recent News" section with 2 headlines
      - Bottom tab bar
      - Dark navy (#0f172a) background, professional corporate feel
      Portrait tall iPhone format, iOS native styling.`,
    },
    {
      name: 'iPhone - Marketplace',
      filename: 'nb-iphone-screenshot-6.png',
      prompt: `Create a realistic iPhone 16 Pro Max screenshot of "Space Marketplace" in a space industry platform.
      Show:
      - iPhone Dynamic Island at top
      - Header: "Space Marketplace" with search bar below
      - Category grid (3x2): "Launch Services", "Satellite Parts", "Ground Stations", "Analytics", "Engineering", "Insurance"
      - Each category has a glowing icon and listing count
      - "Featured Listings" section with 2 cards:
        - "Rideshare Launch Slots - Q3 2026" by Rocket Lab, "$1.2M/slot"
        - "Ka-Band Ground Station" by KSAT, "Contact for pricing"
      - Each listing card has verification badge and match score
      - Bottom tab bar
      - Dark navy (#0f172a) background, purple and cyan accents
      Portrait tall iPhone format, iOS native styling.`,
    },
  ];

  for (let i = 0; i < iphonePrompts.length; i++) {
    const p = iphonePrompts[i];
    const result = await generateAndResize(p.prompt, p.name, 1320, 2868, p.filename);
    if (result) results.push(result);
    if (i < iphonePrompts.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // ─── 3. iPad Pro 13" Screenshots (2064x2752 portrait) ───
  console.log('\n── 3. iPAD SCREENSHOTS (2064x2752) ──');

  const ipadPrompts = [
    {
      name: 'iPad - Dashboard',
      filename: 'nb-ipad-screenshot-1.png',
      prompt: `Create a realistic iPad Pro 13-inch app screenshot for "SpaceNexus" space industry intelligence platform.
      Portrait orientation iPad view showing a rich dashboard with:
      - Top navigation: SpaceNexus logo, search bar, user avatar
      - Hero section: "Built for Space Industry Professionals" with descriptive subtitle
      - 3-column grid of module cards below the hero: Launch Tracking, Market Intel, News, Satellite Ops, Compliance, Mission Planning, Marketplace, Company Intel, Space Weather
      - Each module card has an icon, title, and one-line description
      - Bottom widget row: Next Launch countdown, Market snapshot, Latest headline
      - Dark navy (#0f172a) background with subtle gradient
      - Spacious iPad layout utilizing full width
      - Professional, data-dense feel like Bloomberg for space
      Portrait 3:4 aspect ratio, realistic iPad app interface with iPadOS styling.`,
    },
    {
      name: 'iPad - Split View',
      filename: 'nb-ipad-screenshot-2.png',
      prompt: `Create a realistic iPad Pro 13-inch screenshot showing a split-panel space news and market intelligence view.
      Portrait orientation iPad with:
      - Top navigation bar with SpaceNexus branding and tabs
      - Main area split into two panels:
        - Left panel (55%): News feed with category filter bar, article cards showing headlines, thumbnails, timestamps, and source badges
        - Right panel (45%): Market sidebar with stock tickers, mini sparkline charts, market cap data, and sector performance
      - 5-6 news article cards in the left panel
      - 4-5 stock entries in the right panel with green/red indicators
      - Color-coded news categories: red (breaking), orange (launches), purple (defense)
      - Dark navy (#0f172a) background, clean panel borders
      Portrait 3:4 aspect ratio, realistic iPad app interface.`,
    },
  ];

  for (let i = 0; i < ipadPrompts.length; i++) {
    const p = ipadPrompts[i];
    const result = await generateAndResize(p.prompt, p.name, 2064, 2752, p.filename);
    if (result) results.push(result);
    if (i < ipadPrompts.length - 1) {
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
  console.log('All files saved to: public/apple-store/');

  const total = 1 + iphonePrompts.length + ipadPrompts.length;
  const failed = total - results.length;
  if (failed > 0) {
    console.log(`\nWARNING: ${failed} image(s) failed to generate. Check errors above.`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
