/**
 * Generate art assets for SpaceNexus using Google Gemini image generation.
 * Usage: npx tsx scripts/generate-art.ts --prompt "description" --output "path.png"
 *        npx tsx scripts/generate-art.ts --batch batch.json
 */
import * as fs from 'fs';
import * as path from 'path';

const API_KEY = process.env.GEMINI_API_KEY || '';
if (!API_KEY) { console.error('ERROR: Set GEMINI_API_KEY environment variable'); process.exit(1); }
const MODEL = 'gemini-2.5-flash-image'; // Nano Banana - Gemini Flash with image generation
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

interface GenerateOptions {
  prompt: string;
  output: string;
  aspectRatio?: string;
}

async function generateImage({ prompt, output, aspectRatio }: GenerateOptions): Promise<boolean> {
  const stylePrefix = 'Digital art, dark space theme, deep navy/black background (#09090b to #1a1a2e), indigo (#6366f1) and cyan (#22d3ee) accent colors, clean modern aesthetic, no text overlays. ';

  const body = {
    contents: [{
      parts: [{ text: stylePrefix + prompt }]
    }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      ...(aspectRatio && { aspectRatio }),
    },
  };

  try {
    console.log(`  Generating: ${path.basename(output)}...`);
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`  ERROR (${res.status}): ${err.slice(0, 200)}`);
      return false;
    }

    const data = await res.json();

    // Find inline image data in response
    for (const candidate of data.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        if (part.inlineData?.mimeType?.startsWith('image/')) {
          const buf = Buffer.from(part.inlineData.data, 'base64');
          const dir = path.dirname(output);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(output, buf);
          console.log(`  OK: ${output} (${(buf.length / 1024).toFixed(0)}KB)`);
          return true;
        }
      }
    }

    console.error(`  ERROR: No image in response`);
    console.error(`  Response keys: ${JSON.stringify(Object.keys(data))}`);
    return false;
  } catch (err) {
    console.error(`  ERROR: ${err}`);
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
    let fail = 0;
    for (const item of batch) {
      const result = await generateImage(item);
      if (result) ok++; else fail++;
      // Rate limit: 1 request per 2 seconds
      await new Promise(r => setTimeout(r, 2000));
    }
    console.log(`\nDone: ${ok} generated, ${fail} failed`);
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
