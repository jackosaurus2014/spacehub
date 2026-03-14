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
  console.log(`\n  Generating: ${name}...`);

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
    console.error(`  ERROR (${response.status}): ${errorText.substring(0, 300)}`);
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

  console.error('  ERROR: No image data in response');
  return null;
}

async function saveVariation(buffer: Buffer, filename: string): Promise<void> {
  const outputPath = path.join(OUTPUT_DIR, filename);
  await sharp(buffer)
    .resize(OG_WIDTH, OG_HEIGHT, { fit: 'cover', position: 'centre' })
    .flatten({ background: '#0f172a' })
    .png({ quality: 95, compressionLevel: 9 })
    .toFile(outputPath);
  const stats = fs.statSync(outputPath);
  console.log(`  Saved: ${filename} (${OG_WIDTH}x${OG_HEIGHT}, ${(stats.size / 1024).toFixed(0)} KB)`);
}

async function main() {
  console.log('=== Nano Banana OG Image — Variation 1 & 3 Regen ===\n');

  // ── Variation 1: Cinematic Space Command Center (refined) ──
  console.log('── VARIATION A: Cinematic Space Command Center ──');
  const buf1 = await generateImage(
    `Create a breathtaking, ultra-premium cinematic banner image for "SpaceNexus" — a space industry intelligence platform. Wide 1200x630 landscape format.

Scene: A futuristic holographic space command center floating above Earth in low orbit. The scene is viewed from inside a sleek observation deck looking out into space.

Key elements:
- Multiple floating holographic screens showing: satellite constellation maps, rocket launch trajectories with glowing arcs, real-time stock market charts, news feed tickers, and orbital path diagrams
- The holographic displays emit soft cyan (#06b6d4) and violet (#7c3aed) light that illuminates the scene
- "SpaceNexus" title in large, bold, futuristic sans-serif typography — crisp white letters with a subtle cyan glow/bloom effect, clearly legible
- Subtitle "Space Industry Intelligence Platform" in smaller elegant text below
- Earth's curved horizon visible in the lower portion with a stunning blue atmospheric glow
- Stars and distant galaxies in the deep space background
- Thin orbital ring lines tracing satellite paths
- Subtle volumetric light rays and lens flare for cinematic drama
- Data particle streams flowing between the holographic displays
- Color palette: deep navy/black base, electric cyan, rich purple, white accents, warm amber Earth glow
- Photorealistic CGI rendering quality, cinematic depth of field
- NO people, NO faces, NO photographs of real objects
- Premium, awe-inspiring composition that makes you want to click
- Text must be sharp and clearly readable against the background`,
    'Command Center v2'
  );
  if (buf1) await saveVariation(buf1, 'nb-og-choice-A.png');

  console.log('\n  Waiting 4s...');
  await new Promise(r => setTimeout(r, 4000));

  // ── Variation 3: Orbital Intelligence (refined) ──
  console.log('\n── VARIATION B: Orbital Intelligence Dashboard ──');
  const buf3 = await generateImage(
    `Design a stunning, professional wide banner image (1200x630 landscape) for "SpaceNexus" — The Space Industry Intelligence Platform. This will be used as a social media preview image so it must be visually striking and have clearly readable text.

Scene composition:
- Left side: Beautiful view of planet Earth from orbit, showing the curve of the planet with a luminous blue atmospheric edge and city lights glowing on the night side
- Center/Right: A large, sleek, translucent holographic dashboard floating in space, displaying:
  - Orbital paths with glowing satellite dots
  - A rocket launch arc trajectory
  - Mini data charts and graphs
  - A world map with data overlay
  - Connection lines between nodes (representing the "nexus")
- The word "SpaceNexus" in large, bold, clean modern typography (like Inter or Helvetica bold) — pure white text with a very subtle outer glow, positioned prominently in the upper-center area
- Below the title: "Space Industry Intelligence Platform" in a lighter weight, slightly smaller
- Visual style: dark cinematic sci-fi with volumetric god rays coming from behind Earth
- Key colors: deep space navy/black (#0f172a) background, electric cyan (#06b6d4) for UI elements and accents, violet/purple (#7c3aed) for secondary accents, warm amber/gold for Earth's sunrise edge
- Floating light particles suggesting data streams moving through space
- Ultra-polished, AAA quality digital art / CGI rendering
- NO people, NO faces — purely technological and space imagery
- Clean composition with breathing room — not cluttered
- The overall mood should feel like: "the future of space industry is here"`,
    'Orbital Intelligence v2'
  );
  if (buf3) await saveVariation(buf3, 'nb-og-choice-B.png');

  console.log('\n\n=== DONE ===');
  console.log('Generated images:');
  console.log('  A) nb-og-choice-A.png — Cinematic Command Center');
  console.log('  B) nb-og-choice-B.png — Orbital Intelligence Dashboard');
  console.log('\nReview both, then to set your choice as the active OG image:');
  console.log('  cp public/nb-og-choice-X.png public/og-image.png');
  console.log('  cp public/nb-og-choice-X.png public/twitter-image.png');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
