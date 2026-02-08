import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const SOURCE = path.join(__dirname, '..', 'public', 'spacenexus-logo.png');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'icons');

const BACKGROUND_COLOR = '#0f172a';

// Standard icon sizes for PWA, Android, and iOS
const STANDARD_SIZES = [48, 72, 96, 128, 144, 152, 192, 256, 384, 512, 1024];

// Maskable icons need extra padding (safe zone is 80% of the icon)
const MASKABLE_SIZES = [192, 512];

// Apple-specific sizes
const APPLE_SIZES = [120, 152, 167, 180, 1024];

// Favicon sizes
const FAVICON_SIZES = [16, 32];

async function generateIcons() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('Generating standard icons...');
  for (const size of STANDARD_SIZES) {
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
    console.log(`  Generated: icon-${size}x${size}.png (${(stats.size / 1024).toFixed(1)} KB)`);
  }

  console.log('\nGenerating maskable icons (with safe zone padding)...');
  for (const size of MASKABLE_SIZES) {
    const outputPath = path.join(OUTPUT_DIR, `maskable-${size}x${size}.png`);
    // For maskable icons, the logo should fit within the 80% safe zone
    const logoSize = Math.round(size * 0.6); // 60% of the icon so it fits well within 80% safe zone

    // Create logo resized to safe zone
    const logo = await sharp(SOURCE)
      .resize(logoSize, logoSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    // Composite onto background
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: BACKGROUND_COLOR,
      },
    })
      .composite([
        {
          input: logo,
          gravity: 'centre',
        },
      ])
      .png()
      .toFile(outputPath);

    const stats = fs.statSync(outputPath);
    console.log(`  Generated: maskable-${size}x${size}.png (${(stats.size / 1024).toFixed(1)} KB)`);
  }

  console.log('\nGenerating Apple touch icons...');
  const publicDir = path.join(__dirname, '..', 'public');
  for (const size of APPLE_SIZES) {
    const filename = size === 180 ? 'apple-touch-icon.png' : `apple-touch-icon-${size}x${size}.png`;
    const outputPath = path.join(publicDir, filename);

    await sharp(SOURCE)
      .resize(size, size, {
        fit: 'contain',
        background: BACKGROUND_COLOR,
      })
      .flatten({ background: BACKGROUND_COLOR })
      .png()
      .toFile(outputPath);

    const stats = fs.statSync(outputPath);
    console.log(`  Generated: ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);
  }

  console.log('\nGenerating favicon PNGs...');
  for (const size of FAVICON_SIZES) {
    const outputPath = path.join(publicDir, `favicon-${size}x${size}.png`);

    await sharp(SOURCE)
      .resize(size, size, {
        fit: 'contain',
        background: BACKGROUND_COLOR,
      })
      .flatten({ background: BACKGROUND_COLOR })
      .png()
      .toFile(outputPath);

    const stats = fs.statSync(outputPath);
    console.log(`  Generated: favicon-${size}x${size}.png (${(stats.size / 1024).toFixed(1)} KB)`);
  }

  // Generate Google Play feature graphic (1024x500)
  console.log('\nGenerating Google Play Store feature graphic...');
  const featureGraphicPath = path.join(OUTPUT_DIR, 'feature-graphic-1024x500.png');
  const featureLogo = await sharp(SOURCE)
    .resize(300, 300, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 1024,
      height: 500,
      channels: 4,
      background: BACKGROUND_COLOR,
    },
  })
    .composite([
      {
        input: featureLogo,
        gravity: 'centre',
      },
    ])
    .png()
    .toFile(featureGraphicPath);

  const featureStats = fs.statSync(featureGraphicPath);
  console.log(`  Generated: feature-graphic-1024x500.png (${(featureStats.size / 1024).toFixed(1)} KB)`);

  console.log('\n--- Summary ---');
  console.log(`Standard icons: ${STANDARD_SIZES.length} sizes (${STANDARD_SIZES.join(', ')})`);
  console.log(`Maskable icons: ${MASKABLE_SIZES.length} sizes (${MASKABLE_SIZES.join(', ')})`);
  console.log(`Apple touch icons: ${APPLE_SIZES.length} sizes`);
  console.log(`Favicon PNGs: ${FAVICON_SIZES.length} sizes`);
  console.log(`Feature graphic: 1024x500`);
  console.log(`\nTotal: ${STANDARD_SIZES.length + MASKABLE_SIZES.length + APPLE_SIZES.length + FAVICON_SIZES.length + 1} files`);
  console.log('\nIcon generation complete!');
  console.log('\nNOTE: You still need to create:');
  console.log('  - public/screenshots/ directory with app screenshots for store listings');
  console.log('  - favicon.ico (use realfavicongenerator.net or similar tool)');
}

generateIcons().catch((err) => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
