import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const SOURCE = path.join(__dirname, '..', 'public', 'spacenexus-logo.png');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'icons');

const SIZES = [192, 512];
const BACKGROUND_COLOR = '#0f172a';

async function generateIcons() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (const size of SIZES) {
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);

    await sharp(SOURCE)
      .resize(size, size, {
        fit: 'contain',
        background: BACKGROUND_COLOR,
      })
      .flatten({ background: BACKGROUND_COLOR })
      .png()
      .toFile(outputPath);

    const stats = fs.statSync(outputPath);
    console.log(`Generated: icon-${size}x${size}.png (${(stats.size / 1024).toFixed(1)} KB)`);
  }

  console.log('Icon generation complete!');
}

generateIcons().catch((err) => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
