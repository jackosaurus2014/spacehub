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
  console.log(`  Prompt: "${prompt.substring(0, 120)}..."`);

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

async function main() {
  console.log('=== Nano Banana OG Image Generator ===');
  console.log(`Model: ${MODEL}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Target: ${OG_WIDTH}x${OG_HEIGHT}\n`);

  // Generate 3 variations, pick the best
  const prompts = [
    {
      name: 'Cinematic Space Command Center',
      prompt: `Create a stunning, cinematic banner image for "SpaceNexus" - a space industry intelligence platform. The image should be exactly in wide 1200x630 landscape banner format.

Design a dramatic scene showing:
- A futuristic holographic command center floating in space with Earth visible below
- Multiple translucent holographic displays showing satellite orbits, rocket trajectories, market data charts, and news feeds
- The text "SpaceNexus" rendered in large, elegant, futuristic typography — glowing white/silver letters with a subtle cyan light bloom
- Below the title: "Space Industry Intelligence Platform" in smaller, clean text
- A central glowing nexus/hub point where data streams converge, emanating cyan (#06b6d4) and purple (#7c3aed) light rays
- Background: deep space with stars, nebula wisps in dark navy/indigo tones
- Foreground elements: subtle orbital ring paths, data particle streams
- Overall palette: dark navy (#0f172a) base, with cyan, purple, and white accents
- Photorealistic lighting and reflections, cinematic depth of field
- Premium, professional feel — think sci-fi movie poster meets Bloomberg Terminal
- DO NOT include any people or faces
- The overall composition should be balanced and suitable as a social media preview image`
    },
    {
      name: 'Data Nexus Hub',
      prompt: `Create a visually stunning wide banner (1200x630 landscape format) for "SpaceNexus" space intelligence platform.

The design should show:
- A dark, elegant space scene with Earth's curved horizon at the bottom glowing with atmospheric blue light
- Above Earth: a constellation network of glowing nodes connected by thin luminous lines, forming a neural-network/nexus pattern
- The nexus pattern converges at a central bright point emanating cyan (#06b6d4) and violet (#7c3aed) energy
- Satellites, space stations, and rocket silhouettes subtly integrated along the orbital paths
- The title "SpaceNexus" in bold, modern, geometric sans-serif font — white with a faint glow
- Subtitle "Space Industry Intelligence Platform" in lighter weight below
- Small floating holographic UI elements: a stock chart, a satellite icon, a rocket trajectory, a news ticker — all translucent and futuristic
- Color palette: deep space black/navy base, with bright cyan and purple accents, white text
- High-end, polished aesthetic — cinematic quality, not cartoonish
- Subtle lens flare from the nexus point
- NO people, NO faces, NO photographs — pure digital art / CGI style
- Wide landscape composition optimized for social media link previews`
    },
    {
      name: 'Orbital Intelligence',
      prompt: `Design an epic, wide-format banner image (1200x630 landscape) for "SpaceNexus" - The Space Industry Intelligence Platform.

Scene composition:
- Split perspective: looking down at Earth from low orbit on the left, transitioning into deep space on the right
- A massive translucent holographic dashboard overlay in the center, showing:
  - Orbital paths with glowing dots (satellites)
  - A rocket launch trajectory arc
  - Mini chart/graph elements
  - Geographic heat map on Earth's surface
- The word "SpaceNexus" in large, premium typography — clean white letters with a subtle neon cyan edge glow
- Below: "Space Industry Intelligence Platform" in a lighter font
- Visual style: dark cinematic sci-fi with volumetric lighting
- Key colors: background deep navy/black (#0f172a), accents in electric cyan (#06b6d4), violet (#7c3aed), and warm amber for Earth's atmosphere
- Particle effects: tiny floating light particles suggesting data streams
- A subtle grid overlay suggesting high-tech analysis
- Extremely polished, AAA quality CGI rendering style
- NO people, NO faces — purely technological/space imagery
- The image should look incredible as a LinkedIn or Twitter link preview card`
    }
  ];

  const results: { name: string; buffer: Buffer; path: string }[] = [];

  for (let i = 0; i < prompts.length; i++) {
    const p = prompts[i];
    console.log(`\n── Variation ${i + 1}/${prompts.length}: ${p.name} ──`);

    const buffer = await generateImage(p.prompt, p.name);
    if (buffer) {
      const filename = `nb-og-variation-${i + 1}.png`;
      const outputPath = path.join(OUTPUT_DIR, filename);

      await sharp(buffer)
        .resize(OG_WIDTH, OG_HEIGHT, { fit: 'cover', position: 'centre' })
        .flatten({ background: '#0f172a' })
        .png({ quality: 95, compressionLevel: 9 })
        .toFile(outputPath);

      const stats = fs.statSync(outputPath);
      console.log(`  Saved: ${filename} (${OG_WIDTH}x${OG_HEIGHT}, ${(stats.size / 1024).toFixed(0)} KB)`);

      results.push({ name: p.name, buffer, path: outputPath });
    }

    // Rate limit pause
    if (i < prompts.length - 1) {
      console.log('  Waiting 3s before next generation...');
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  if (results.length === 0) {
    console.error('\nFATAL: No images were generated successfully!');
    process.exit(1);
  }

  // Use the first successful result as the default OG image
  const best = results[0];
  const ogPath = path.join(OUTPUT_DIR, 'og-image.png');
  const twitterPath = path.join(OUTPUT_DIR, 'twitter-image.png');

  fs.copyFileSync(best.path, ogPath);
  fs.copyFileSync(best.path, twitterPath);

  const finalStats = fs.statSync(ogPath);
  console.log(`\n=== GENERATION COMPLETE ===`);
  console.log(`Generated ${results.length} variation(s):`);
  results.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.name} → nb-og-variation-${i + 1}.png`);
  });
  console.log(`\nActive OG image: og-image.png (${(finalStats.size / 1024).toFixed(0)} KB)`);
  console.log(`Active Twitter image: twitter-image.png (copy)`);
  console.log(`\nTo switch to a different variation:`);
  console.log(`  cp public/nb-og-variation-N.png public/og-image.png`);
  console.log(`  cp public/nb-og-variation-N.png public/twitter-image.png`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
