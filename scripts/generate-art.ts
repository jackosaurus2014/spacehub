/**
 * Generate art assets for SpaceNexus using Google Gemini image generation.
 * Usage: npx tsx scripts/generate-art.ts --prompt "description" --output "path.png"
 *        npx tsx scripts/generate-art.ts --batch batch.json
 */
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

const API_KEY = process.env.GEMINI_API_KEY || '';
if (!API_KEY) { console.error('ERROR: Set GEMINI_API_KEY environment variable'); process.exit(1); }
const MODEL = 'gemini-2.5-flash-image'; // Nano Banana - Gemini Flash with image generation
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

// Valid values for generationConfig.imageConfig.aspectRatio per the Gemini
// image API (verified live 2026-08 — the API 400s on anything else).
const VALID_ASPECT_RATIOS = new Set([
  '1:1', '1:4', '1:8', '2:3', '3:2', '3:4', '4:1', '4:3', '4:5', '5:4', '8:1', '9:16', '16:9', '21:9',
]);

interface GenerateOptions {
  prompt: string;
  output: string;
  /** One of VALID_ASPECT_RATIOS. Nested correctly under generationConfig.imageConfig —
   *  a bare top-level `aspectRatio` key (the pre-2026-08-15 shape of this file) is
   *  silently ignored by the API, which is why every prior batch came out 1:1/1024². */
  aspectRatio?: string;
}

/** Retry an async op once on failure (per V6 spec: "retry once then skip and log"). */
async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    console.error(`  Retry after error on ${label}: ${err}`);
    await new Promise(r => setTimeout(r, 2000));
    try {
      return await fn();
    } catch (err2) {
      console.error(`  ERROR (final): ${label}: ${err2}`);
      return null;
    }
  }
}

async function generateImage({ prompt, output, aspectRatio }: GenerateOptions): Promise<boolean> {
  const stylePrefix = 'Digital art, dark space theme, deep navy/black background (#09090b to #1a1a2e), indigo (#6366f1) and cyan (#22d3ee) accent colors, clean modern aesthetic, no text overlays. ';

  if (aspectRatio && !VALID_ASPECT_RATIOS.has(aspectRatio)) {
    console.error(`  ERROR: invalid aspectRatio "${aspectRatio}" for ${path.basename(output)} — skipping`);
    return false;
  }

  const body = {
    contents: [{
      parts: [{ text: stylePrefix + prompt }]
    }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      ...(aspectRatio && { imageConfig: { aspectRatio } }),
    },
  };

  const result = await withRetry(async () => {
    console.log(`  Generating: ${path.basename(output)}...`);
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`HTTP ${res.status}: ${err.slice(0, 300)}`);
    }

    const data = await res.json();

    // Find inline image data in response
    for (const candidate of data.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        if (part.inlineData?.mimeType?.startsWith('image/')) {
          return Buffer.from(part.inlineData.data, 'base64');
        }
      }
    }

    throw new Error(`No image in response (keys: ${JSON.stringify(Object.keys(data))})`);
  }, path.basename(output));

  if (!result) return false;

  // The API returns PNG bytes even when we ask for image/webp — re-encode to
  // genuine WebP here so every consumer's `.webp` extension is honest (prior
  // versions of this script wrote the raw PNG buffer straight to a `.webp`
  // path, which happens to still decode in browsers via magic-byte sniffing
  // but is 3-5x larger on disk than a real WebP re-encode).
  try {
    const webpBuf = await sharp(result).webp({ quality: 82 }).toBuffer();
    const dir = path.dirname(output);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(output, webpBuf);
    console.log(`  OK: ${output} (${(webpBuf.length / 1024).toFixed(0)}KB)`);
    return true;
  } catch (err) {
    console.error(`  ERROR: webp re-encode failed for ${output}: ${err}`);
    return false;
  }
}

// ── CLI ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes('--batch')) {
  const batchFile = args[args.indexOf('--batch') + 1];
  const batch: GenerateOptions[] = JSON.parse(fs.readFileSync(batchFile, 'utf-8'));

  (async () => {
    let ok = 0;
    const failed: string[] = [];
    for (const item of batch) {
      const result = await generateImage(item);
      if (result) ok++; else failed.push(path.basename(item.output));
      // Rate limit: 1 request per 2 seconds
      await new Promise(r => setTimeout(r, 2000));
    }
    console.log(`\nDone: ${ok} generated, ${failed.length} failed`);
    if (failed.length) console.log(`Failed: ${failed.join(', ')}`);
  })();
} else {
  const promptIdx = args.indexOf('--prompt');
  const outputIdx = args.indexOf('--output');

  if (promptIdx === -1 || outputIdx === -1) {
    console.log('Usage: npx tsx scripts/generate-art.ts --prompt "description" --output "path.png"');
    console.log('       npx tsx scripts/generate-art.ts --batch batch.json');
    process.exit(1);
  }

  generateImage({
    prompt: args[promptIdx + 1],
    output: args[outputIdx + 1],
  });
}
