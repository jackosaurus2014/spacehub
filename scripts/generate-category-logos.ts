import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const PROJECT_ROOT = path.join(__dirname, '..');
const CONFIG_PATH = path.join(PROJECT_ROOT, '.nano-banana-config.json');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'public', 'logos');

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
const API_KEY = config.geminiApiKey;
const MODEL = 'gemini-2.5-flash-image';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const LOGO_SIZE = 256;

interface LogoDefinition {
  filename: string;
  description: string;
}

const STYLE_SUFFIX = 'Dark navy background (#0f172a), cyan (#06b6d4) and white accent colors. Clean vector-style, no text, centered composition, suitable for small icon display.';

// Mission Control Event Types (6 logos)
const EVENT_LOGOS: LogoDefinition[] = [
  {
    filename: 'logo-event-launch.png',
    description: 'Rocket launch — ascending rocket with flame trail',
  },
  {
    filename: 'logo-event-crewed.png',
    description: 'Crewed mission — astronaut helmet silhouette',
  },
  {
    filename: 'logo-event-moon.png',
    description: 'Lunar event — crescent moon with surface detail',
  },
  {
    filename: 'logo-event-mars.png',
    description: 'Mars event — red planet with atmosphere',
  },
  {
    filename: 'logo-event-station.png',
    description: 'Station event — space station in orbit',
  },
  {
    filename: 'logo-event-satellite.png',
    description: 'Satellite event — satellite with solar panels',
  },
];

// News Categories (10 logos)
const NEWS_LOGOS: LogoDefinition[] = [
  {
    filename: 'logo-news-launches.png',
    description: 'Rocket on launchpad',
  },
  {
    filename: 'logo-news-missions.png',
    description: 'Spacecraft in deep space',
  },
  {
    filename: 'logo-news-companies.png',
    description: 'Corporate building with satellite dish',
  },
  {
    filename: 'logo-news-satellites.png',
    description: 'Satellite in orbit over Earth',
  },
  {
    filename: 'logo-news-defense.png',
    description: 'Shield with star emblem',
  },
  {
    filename: 'logo-news-earnings.png',
    description: 'Chart with upward arrow',
  },
  {
    filename: 'logo-news-mergers.png',
    description: 'Two orbits merging and intersecting',
  },
  {
    filename: 'logo-news-development.png',
    description: 'Gear and wrench with rocket',
  },
  {
    filename: 'logo-news-policy.png',
    description: 'Scroll document with gavel',
  },
  {
    filename: 'logo-news-debris.png',
    description: 'Debris field in orbit',
  },
];

// Blog Topics (6 logos)
const BLOG_LOGOS: LogoDefinition[] = [
  {
    filename: 'logo-blog-space-law.png',
    description: 'Scales of justice with stars',
  },
  {
    filename: 'logo-blog-investment.png',
    description: 'Rocket with dollar sign trail',
  },
  {
    filename: 'logo-blog-policy.png',
    description: 'Globe with governance symbol',
  },
  {
    filename: 'logo-blog-technology.png',
    description: 'Circuit board with rocket chip',
  },
  {
    filename: 'logo-blog-business.png',
    description: 'Briefcase with satellite antenna',
  },
  {
    filename: 'logo-blog-exploration.png',
    description: 'Telescope pointed at stars',
  },
];

function buildPrompt(description: string): string {
  return `Professional, minimalist icon/logo for ${description}. ${STYLE_SUFFIX}`;
}

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

async function processGroup(groupName: string, logos: LogoDefinition[]): Promise<number> {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  ${groupName} (${logos.length} logos)`);
  console.log('='.repeat(50));

  let successCount = 0;

  for (let i = 0; i < logos.length; i++) {
    const logo = logos[i];
    const prompt = buildPrompt(logo.description);

    console.log(`\n-- [${i + 1}/${logos.length}] ${logo.filename} --`);

    const buffer = await generateImage(prompt, logo.filename);
    if (buffer) {
      const outputPath = path.join(OUTPUT_DIR, logo.filename);

      await sharp(buffer)
        .resize(LOGO_SIZE, LOGO_SIZE, { fit: 'cover', position: 'centre' })
        .flatten({ background: '#0f172a' })
        .png({ quality: 95, compressionLevel: 9 })
        .toFile(outputPath);

      const stats = fs.statSync(outputPath);
      console.log(`  Saved: ${logo.filename} (${LOGO_SIZE}x${LOGO_SIZE}, ${(stats.size / 1024).toFixed(0)} KB)`);
      successCount++;
    } else {
      console.error(`  FAILED: ${logo.filename}`);
    }

    // Rate limit pause between API calls
    if (i < logos.length - 1) {
      const delay = 3000 + Math.random() * 1000; // 3-4 seconds
      console.log(`  Waiting ${(delay / 1000).toFixed(1)}s before next generation...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  return successCount;
}

async function main() {
  console.log('=== NanoBanana Category Logo Generator ===');
  console.log(`Model: ${MODEL}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Target: ${LOGO_SIZE}x${LOGO_SIZE}`);

  const totalLogos = EVENT_LOGOS.length + NEWS_LOGOS.length + BLOG_LOGOS.length;
  console.log(`Total logos to generate: ${totalLogos}`);

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
  }

  let totalSuccess = 0;

  // Generate Mission Control Event Type logos
  const eventSuccess = await processGroup('Mission Control Event Types', EVENT_LOGOS);
  totalSuccess += eventSuccess;

  // Pause between groups
  console.log('\n  Pausing 4s between groups...');
  await new Promise(r => setTimeout(r, 4000));

  // Generate News Category logos
  const newsSuccess = await processGroup('News Categories', NEWS_LOGOS);
  totalSuccess += newsSuccess;

  // Pause between groups
  console.log('\n  Pausing 4s between groups...');
  await new Promise(r => setTimeout(r, 4000));

  // Generate Blog Topic logos
  const blogSuccess = await processGroup('Blog Topics', BLOG_LOGOS);
  totalSuccess += blogSuccess;

  // Summary
  console.log(`\n${'='.repeat(50)}`);
  console.log('  GENERATION COMPLETE');
  console.log('='.repeat(50));
  console.log(`\nResults: ${totalSuccess}/${totalLogos} logos generated successfully`);
  console.log(`  Event types: ${eventSuccess}/${EVENT_LOGOS.length}`);
  console.log(`  News categories: ${newsSuccess}/${NEWS_LOGOS.length}`);
  console.log(`  Blog topics: ${blogSuccess}/${BLOG_LOGOS.length}`);
  console.log(`\nOutput directory: ${OUTPUT_DIR}`);

  if (totalSuccess < totalLogos) {
    console.warn(`\nWARNING: ${totalLogos - totalSuccess} logo(s) failed to generate.`);
    console.warn('Re-run the script to retry failed logos (existing files will be overwritten).');
  }

  if (totalSuccess === 0) {
    console.error('\nFATAL: No logos were generated successfully!');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
