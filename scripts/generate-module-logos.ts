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

// Satellite Purposes (7 logos)
const SATELLITE_LOGOS: LogoDefinition[] = [
  {
    filename: 'logo-sat-station.png',
    description: 'Space station icon — orbital station with solar panel wings',
  },
  {
    filename: 'logo-sat-comms.png',
    description: 'Communications satellite — satellite with large dish antenna transmitting signal waves',
  },
  {
    filename: 'logo-sat-navigation.png',
    description: 'Navigation/GPS satellite — satellite with signal beams pointing down to globe',
  },
  {
    filename: 'logo-sat-weather.png',
    description: 'Weather monitoring satellite — satellite scanning Earth with cloud patterns below',
  },
  {
    filename: 'logo-sat-earth-obs.png',
    description: 'Earth observation satellite — satellite with camera lens focused on terrain below',
  },
  {
    filename: 'logo-sat-research.png',
    description: 'Research satellite — satellite with scientific instruments and data streams',
  },
  {
    filename: 'logo-sat-defense.png',
    description: 'Defense/reconnaissance satellite — satellite with shield emblem and scanning beam',
  },
];

// Compliance Categories (4 logos)
const COMPLIANCE_LOGOS: LogoDefinition[] = [
  {
    filename: 'logo-compliance-export.png',
    description: 'Export controls — padlock with directional arrows representing trade restrictions',
  },
  {
    filename: 'logo-compliance-rules.png',
    description: 'Proposed rules — scroll document with gavel representing pending regulations',
  },
  {
    filename: 'logo-compliance-legal.png',
    description: 'Legal resources — scales of justice with star accents',
  },
  {
    filename: 'logo-compliance-filings.png',
    description: 'Regulatory filings — stack of official documents with checkmark seal',
  },
];

// Space Environment (3 logos)
const ENVIRONMENT_LOGOS: LogoDefinition[] = [
  {
    filename: 'logo-env-weather.png',
    description: 'Solar weather — sun with flares and coronal mass ejection',
  },
  {
    filename: 'logo-env-debris.png',
    description: 'Space debris — orbital fragments and broken satellite pieces around Earth',
  },
  {
    filename: 'logo-env-operations.png',
    description: 'Space operations — mission control console with multiple monitoring screens',
  },
];

// Business/Market (4 logos)
const MARKET_LOGOS: LogoDefinition[] = [
  {
    filename: 'logo-market-funding.png',
    description: 'Funding/investment — rocket ascending with dollar sign trail',
  },
  {
    filename: 'logo-market-mining.png',
    description: 'Space mining — asteroid with pickaxe and mineral deposits',
  },
  {
    filename: 'logo-market-insurance.png',
    description: 'Space insurance — protective shield with rocket silhouette inside',
  },
  {
    filename: 'logo-market-patents.png',
    description: 'Patents/IP — lightbulb with satellite orbiting around it',
  },
];

// Workforce (3 logos)
const WORKFORCE_LOGOS: LogoDefinition[] = [
  {
    filename: 'logo-workforce-jobs.png',
    description: 'Job postings — clipboard with star badge representing space career opportunities',
  },
  {
    filename: 'logo-workforce-trends.png',
    description: 'Workforce trends — group of people silhouettes with upward graph line',
  },
  {
    filename: 'logo-workforce-salary.png',
    description: 'Salary benchmarks — bar chart with currency symbols showing compensation data',
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
  console.log('=== NanoBanana Module Logo Generator ===');
  console.log(`Model: ${MODEL}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Target: ${LOGO_SIZE}x${LOGO_SIZE}`);

  const allGroups = [
    { name: 'Satellite Purposes', logos: SATELLITE_LOGOS },
    { name: 'Compliance Categories', logos: COMPLIANCE_LOGOS },
    { name: 'Space Environment', logos: ENVIRONMENT_LOGOS },
    { name: 'Business/Market', logos: MARKET_LOGOS },
    { name: 'Workforce', logos: WORKFORCE_LOGOS },
  ];

  const totalLogos = allGroups.reduce((sum, g) => sum + g.logos.length, 0);
  console.log(`Total logos to generate: ${totalLogos}`);

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
  }

  let totalSuccess = 0;
  const results: { name: string; success: number; total: number }[] = [];

  for (let g = 0; g < allGroups.length; g++) {
    const group = allGroups[g];
    const groupSuccess = await processGroup(group.name, group.logos);
    totalSuccess += groupSuccess;
    results.push({ name: group.name, success: groupSuccess, total: group.logos.length });

    // Pause between groups
    if (g < allGroups.length - 1) {
      console.log('\n  Pausing 4s between groups...');
      await new Promise(r => setTimeout(r, 4000));
    }
  }

  // Summary
  console.log(`\n${'='.repeat(50)}`);
  console.log('  GENERATION COMPLETE');
  console.log('='.repeat(50));
  console.log(`\nResults: ${totalSuccess}/${totalLogos} logos generated successfully`);
  for (const r of results) {
    console.log(`  ${r.name}: ${r.success}/${r.total}`);
  }
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
