import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const PROJECT_ROOT = path.join(__dirname, '..');
const CONFIG_PATH = path.join(PROJECT_ROOT, '.nano-banana-config.json');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'public');

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
const API_KEY = config.geminiApiKey;
const MODEL = 'gemini-2.5-flash-image';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

async function generateImage(prompt: string, name: string): Promise<Buffer | null> {
  console.log(`  Generating: ${name}...`);

  const response = await fetch(`${API_URL}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
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
    return null;
  }

  for (const part of data.candidates[0].content.parts) {
    if (part.inlineData) {
      const buffer = Buffer.from(part.inlineData.data, 'base64');
      console.log(`  Success! Raw: ${(buffer.length / 1024).toFixed(0)} KB`);
      return buffer;
    }
  }
  console.error('  ERROR: No image data');
  return null;
}

async function saveOgImage(buffer: Buffer, filename: string): Promise<boolean> {
  const outputPath = path.join(OUTPUT_DIR, filename);
  await sharp(buffer)
    .resize(OG_WIDTH, OG_HEIGHT, { fit: 'cover', position: 'attention' })
    .flatten({ background: '#0f172a' })
    .png({ quality: 95, compressionLevel: 9 })
    .toFile(outputPath);
  const stats = fs.statSync(outputPath);
  console.log(`  Saved: ${filename} (${(stats.size / 1024).toFixed(0)} KB)\n`);
  return true;
}

// Each page gets a tailored OG image with consistent SpaceNexus branding
const STYLE_NOTES = `
STYLE RULES FOR ALL IMAGES:
- Wide landscape format 1200x630 (approximately 2:1 ratio)
- Dark navy/space background (#0f172a base color)
- Accent colors: electric cyan (#06b6d4) and violet (#7c3aed)
- Include "SpaceNexus" text in the VERTICAL CENTER in bold white futuristic font
- Include a descriptive subtitle below the title
- Leave 15%+ padding on all edges so text isn't clipped
- NO people, NO faces, NO photographs
- Photorealistic CGI / digital art style
- Premium, professional aesthetic
`;

const pages = [
  {
    name: 'Space News',
    filename: 'og-news.png',
    prompt: `${STYLE_NOTES}
Create a banner for the "Space News" section of SpaceNexus.
Title text: "Space News" (large, centered)
Subtitle: "Breaking Space Industry Updates"
Visual elements: Multiple floating translucent news cards/headlines arranged in a dynamic cascade, holographic news ticker ribbons, satellite dish receiving signals, data streams, RSS feed icons. A faint globe in the background with connection lines showing global news coverage. Urgent/breaking feel with subtle red accent highlights alongside the cyan/violet palette.`
  },
  {
    name: 'Marketplace',
    filename: 'og-marketplace.png',
    prompt: `${STYLE_NOTES}
Create a banner for the "Space Marketplace" section of SpaceNexus.
Title text: "Space Marketplace" (large, centered)
Subtitle: "B2B Products & Services for Space"
Visual elements: A futuristic digital marketplace/bazaar in space — floating product cards showing rocket components, satellite parts, ground station icons. Connection lines between buyers and sellers. A central nexus point where transactions converge. Holographic shopping/commerce interface elements. Professional B2B feel, not consumer retail. Rocket silhouettes and satellite imagery integrated.`
  },
  {
    name: 'Company Profiles',
    filename: 'og-companies.png',
    prompt: `${STYLE_NOTES}
Create a banner for the "Company Directory" section of SpaceNexus.
Title text: "Space Company Directory" (large, centered)
Subtitle: "200+ Aerospace Company Profiles"
Visual elements: A constellation/network graph of interconnected company nodes — each node is a glowing orb representing a company, with lines connecting related companies. Larger nodes for major players, smaller for startups. Corporate building silhouettes and rocket/satellite icons at key nodes. Data cards floating with company metrics. The network pattern suggests the vast interconnected space industry ecosystem.`
  },
  {
    name: 'Satellite Tracker',
    filename: 'og-satellites.png',
    prompt: `${STYLE_NOTES}
Create a banner for the "Satellite Operations" section of SpaceNexus.
Title text: "Satellite Operations" (large, centered)
Subtitle: "Track 19,000+ Objects in Orbit"
Visual elements: A stunning view of Earth from space with hundreds of glowing orbital paths tracing around it — LEO, MEO, GEO orbits visible as distinct bands. Individual satellite dots glowing along the paths. A holographic control panel overlay showing orbit parameters and telemetry data. Constellation patterns (like Starlink grids) visible. The scene should feel like a god-view of all human activity in orbit.`
  },
  {
    name: 'Market Intelligence',
    filename: 'og-market-intel.png',
    prompt: `${STYLE_NOTES}
Create a banner for the "Market Intelligence" section of SpaceNexus.
Title text: "Space Market Intelligence" (large, centered)
Subtitle: "Data-Driven Space Economy Insights"
Visual elements: A sophisticated financial dashboard floating in space — stock charts with glowing green/red candlesticks, market cap pie charts, trend line graphs, company comparison matrices. Bloomberg Terminal aesthetic meets space theme. Holographic data visualizations showing the $1.8 trillion space economy. Numbers and metrics floating. Professional finance/analytics feel.`
  },
  {
    name: 'Mission Planning',
    filename: 'og-mission-planning.png',
    prompt: `${STYLE_NOTES}
Create a banner for the "Mission Planning" section of SpaceNexus.
Title text: "Mission Planning" (large, centered)
Subtitle: "Launch Cost Estimation & Analysis"
Visual elements: A holographic mission planning table showing a rocket trajectory from Earth to orbit — with Hohmann transfer ellipses, delta-v calculations floating as holographic text, cost breakdown panels. A rocket on a launch pad in the background with countdown elements. Engineering blueprints and technical diagrams as translucent overlays. Mission timeline with checkpoints. Professional aerospace engineering aesthetic.`
  },
  {
    name: 'Space Tourism',
    filename: 'og-tourism.png',
    prompt: `${STYLE_NOTES}
Create a banner for the "Space Tourism" section of SpaceNexus.
Title text: "Space Tourism" (large, centered)
Subtitle: "Compare Commercial Space Experiences"
Visual elements: A luxury space tourism scene — a sleek space capsule with large windows showing Earth below, comfortable passenger seats visible inside, the curvature of Earth with sunrise light. Multiple vehicle silhouettes (capsule, spaceplane, space station) floating as comparison options. Stars and the Milky Way visible. Aspirational, premium travel aesthetic — like a luxury travel brochure for space. Warmer tones mixed with the cyan/violet palette.`
  },
  {
    name: 'Space Environment',
    filename: 'og-space-environment.png',
    prompt: `${STYLE_NOTES}
Create a banner for the "Space Environment" section of SpaceNexus.
Title text: "Space Environment" (large, centered)
Subtitle: "Solar Weather, Debris & Operations"
Visual elements: The Sun on one side emitting dramatic solar flares and coronal mass ejections with orange/yellow plasma streams reaching toward Earth. Earth's magnetosphere visible as protective shield lines deflecting solar wind. Space debris fragments scattered in orbit shown as small glowing dots. Aurora borealis visible on Earth's poles. Real-time monitoring dashboard elements overlaid. Dramatic, powerful scene showing space weather forces.`
  },
];

async function main() {
  console.log('=== Nano Banana — Page-Specific OG Images ===');
  console.log(`Model: ${MODEL}`);
  console.log(`Generating ${pages.length} images...\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    console.log(`── ${i + 1}/${pages.length}: ${page.name} ──`);

    const buffer = await generateImage(page.prompt, page.name);
    if (buffer) {
      await saveOgImage(buffer, page.filename);
      success++;
    } else {
      failed++;
    }

    // Rate limit pause between generations
    if (i < pages.length - 1) {
      console.log('  Waiting 3s...\n');
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  console.log('\n=== COMPLETE ===');
  console.log(`Generated: ${success}/${pages.length} images`);
  if (failed > 0) console.log(`Failed: ${failed} (check errors above)`);
  console.log('\nFiles created in public/:');
  pages.forEach(p => console.log(`  ${p.filename} → ${p.name}`));
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
