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

async function main() {
  console.log('=== Nano Banana OG Image — Final Command Center ===\n');

  // Generate 2 attempts with refined prompt to ensure text isn't clipped
  const prompt = `Create a breathtaking, ultra-premium cinematic banner image for "SpaceNexus" — a space industry intelligence platform.

CRITICAL LAYOUT REQUIREMENTS:
- The image MUST be in wide landscape format, approximately 1200x630 pixels (roughly 2:1 aspect ratio)
- The title "SpaceNexus" must be positioned in the VERTICAL CENTER of the image — not near the top edge, not near the bottom edge, but centered
- Leave generous padding/margins on ALL sides — at least 15% from every edge
- The subtitle goes directly below the title, also vertically centered

Scene: A futuristic holographic space command center floating above Earth in low orbit.

Key elements:
- Multiple floating holographic screens arranged in a semicircle around the center, showing: satellite constellation maps, rocket launch trajectories with glowing arcs, real-time data charts, orbital path diagrams
- The holographic displays emit soft cyan (#06b6d4) and violet (#7c3aed) light
- "SpaceNexus" title in large, bold, futuristic sans-serif typography — crisp white letters with a subtle cyan glow/bloom effect, CENTERED both horizontally and vertically in the composition
- Subtitle "Space Industry Intelligence Platform" in smaller elegant text directly below the title
- Earth's curved horizon visible in the lower portion with a beautiful blue atmospheric glow
- Stars and deep space in the background
- Thin orbital ring lines and satellite paths
- Subtle volumetric light rays and cinematic lens flare
- Data particle streams flowing between the holographic displays
- Color palette: deep navy/black (#0f172a) base, electric cyan, rich purple, white text, warm amber Earth glow
- Photorealistic CGI quality, cinematic depth of field
- NO people, NO faces
- The text MUST be fully visible with clear space around it — do NOT place text near any edge of the image`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    console.log(`── Attempt ${attempt} ──`);
    const buffer = await generateImage(prompt, `Command Center Final v${attempt}`);
    if (buffer) {
      // Get the raw image dimensions first
      const metadata = await sharp(buffer).metadata();
      console.log(`  Raw dimensions: ${metadata.width}x${metadata.height}`);

      const filename = `nb-og-final-${attempt}.png`;
      const outputPath = path.join(OUTPUT_DIR, filename);

      // Use 'entropy' position to intelligently crop around the most interesting area
      // This tends to preserve text and focal points better than center crop
      await sharp(buffer)
        .resize(OG_WIDTH, OG_HEIGHT, { fit: 'cover', position: 'attention' })
        .flatten({ background: '#0f172a' })
        .png({ quality: 95, compressionLevel: 9 })
        .toFile(outputPath);

      const stats = fs.statSync(outputPath);
      console.log(`  Saved: ${filename} (${OG_WIDTH}x${OG_HEIGHT}, ${(stats.size / 1024).toFixed(0)} KB)`);
    }

    if (attempt < 2) {
      console.log('  Waiting 4s...');
      await new Promise(r => setTimeout(r, 4000));
    }
  }

  console.log('\n=== DONE ===');
  console.log('Review nb-og-final-1.png and nb-og-final-2.png');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
