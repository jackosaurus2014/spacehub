import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const ICONS_DIR = path.join(PUBLIC_DIR, 'icons');
const OUTPUT_DIR = path.join(PUBLIC_DIR, 'play-store');
const LOGO_PATH = path.join(PUBLIC_DIR, 'spacenexus-logo.png');

const BRAND_COLOR = '#0f172a';       // Dark navy background
const ACCENT_COLOR = '#7c3aed';      // Purple accent
const ACCENT_SECONDARY = '#06b6d4';  // Cyan accent
const TEXT_COLOR = '#ffffff';

// Best screenshots showing different app features
const PHONE_SCREENSHOTS = [
  { file: 'Screenshot 2026-02-09 160533.png', caption: 'Space Industry Intelligence Hub' },
  { file: 'Screenshot 2026-02-07 195157.png', caption: 'Live Launch Tracking' },
  { file: 'Screenshot 2026-02-09 152527.png', caption: 'Real-Time Space News' },
  { file: 'Screenshot 2026-02-08 200008.png', caption: 'Market Intelligence & Stocks' },
  { file: 'Screenshot 2026-02-04 235015.png', caption: 'Space Economy Analytics' },
  { file: 'Screenshot 2026-02-04 234152.png', caption: 'Mission Control Dashboard' },
];

// Phone screenshot dimensions (9:16 portrait)
const PHONE_WIDTH = 1080;
const PHONE_HEIGHT = 1920;

// 7-inch tablet dimensions
const TABLET7_WIDTH = 1080;
const TABLET7_HEIGHT = 1920;

// 10-inch tablet dimensions (landscape works better for desktop screenshots)
const TABLET10_WIDTH = 2560;
const TABLET10_HEIGHT = 1600;

function createSvgText(text: string, fontSize: number, width: number, color: string = TEXT_COLOR, fontWeight: string = 'bold'): Buffer {
  // Escape XML special characters
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `<svg width="${width}" height="${Math.round(fontSize * 1.6)}" xmlns="http://www.w3.org/2000/svg">
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
      font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" fill="${color}">
      ${escaped}
    </text>
  </svg>`;
  return Buffer.from(svg);
}

function createGradientBar(width: number, height: number): Buffer {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:${ACCENT_COLOR};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${ACCENT_SECONDARY};stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#grad)" rx="${height / 2}" />
  </svg>`;
  return Buffer.from(svg);
}

function createRoundedMask(width: number, height: number, radius: number): Buffer {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="white"/>
  </svg>`;
  return Buffer.from(svg);
}

async function generateAppIcon() {
  console.log('1. Generating Play Store app icon (512x512, no alpha)...');
  const iconPath = path.join(ICONS_DIR, 'icon-512x512.png');
  const outputPath = path.join(OUTPUT_DIR, 'app-icon-512x512.png');

  await sharp(iconPath)
    .flatten({ background: BRAND_COLOR })
    .resize(512, 512)
    .png()
    .toFile(outputPath);

  const stats = fs.statSync(outputPath);
  console.log(`   -> app-icon-512x512.png (${(stats.size / 1024).toFixed(1)} KB)`);
}

async function generateFeatureGraphic() {
  console.log('\n2. Generating feature graphic (1024x500)...');
  const outputPath = path.join(OUTPUT_DIR, 'feature-graphic-1024x500.png');

  // Create the logo sized to fit nicely
  const logo = await sharp(LOGO_PATH)
    .resize(580, 280, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Tagline text
  const tagline = createSvgText(
    'The Space Industry Intelligence Platform',
    28, 1024, '#cbd5e1', 'normal'
  );

  // Gradient accent bar
  const gradientBar = createGradientBar(300, 4);

  // Compose feature graphic
  await sharp({
    create: {
      width: 1024,
      height: 500,
      channels: 4,
      background: BRAND_COLOR,
    },
  })
    .composite([
      { input: logo, top: 60, left: 222 },
      { input: gradientBar, top: 370, left: 362 },
      { input: tagline, top: 390, left: 0 },
    ])
    .flatten({ background: BRAND_COLOR })
    .png()
    .toFile(outputPath);

  const stats = fs.statSync(outputPath);
  console.log(`   -> feature-graphic-1024x500.png (${(stats.size / 1024).toFixed(1)} KB)`);
}

async function generatePhoneScreenshot(
  screenshotFile: string,
  caption: string,
  index: number
) {
  const inputPath = path.join(PUBLIC_DIR, screenshotFile);
  const outputPath = path.join(OUTPUT_DIR, `phone-screenshot-${index + 1}.png`);

  // Header area: 280px, Content area: rest minus footer, Footer: 80px
  const headerHeight = 300;
  const footerHeight = 80;
  const contentHeight = PHONE_HEIGHT - headerHeight - footerHeight;
  const contentWidth = PHONE_WIDTH - 60; // 30px padding each side
  const cornerRadius = 16;

  // Get source screenshot metadata
  const meta = await sharp(inputPath).metadata();
  const srcWidth = meta.width!;
  const srcHeight = meta.height!;

  // Resize screenshot to fit content area, maintaining aspect ratio
  // For landscape desktop screenshots going into portrait phone, we crop to a taller portion
  const targetAspect = contentWidth / contentHeight;
  const srcAspect = srcWidth / srcHeight;

  let resizedScreenshot: Buffer;
  if (srcAspect > targetAspect) {
    // Source is wider - crop width to fit
    const cropWidth = Math.round(srcHeight * targetAspect);
    const cropLeft = Math.round((srcWidth - cropWidth) / 2);
    resizedScreenshot = await sharp(inputPath)
      .extract({ left: cropLeft, top: 0, width: cropWidth, height: srcHeight })
      .resize(contentWidth, contentHeight, { fit: 'fill' })
      .png()
      .toBuffer();
  } else {
    // Source is taller or same - crop height
    resizedScreenshot = await sharp(inputPath)
      .resize(contentWidth, contentHeight, { fit: 'cover', position: 'top' })
      .png()
      .toBuffer();
  }

  // Round the corners of the screenshot
  const mask = createRoundedMask(contentWidth, contentHeight, cornerRadius);
  resizedScreenshot = await sharp(resizedScreenshot)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // Create small logo for header
  const smallLogo = await sharp(LOGO_PATH)
    .resize(200, 100, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Caption text
  const captionText = createSvgText(caption, 36, PHONE_WIDTH, TEXT_COLOR, 'bold');

  // "SpaceNexus" subtitle
  const subtitle = createSvgText('SpaceNexus.com', 22, PHONE_WIDTH, '#94a3b8', 'normal');

  // Gradient accent bar
  const gradientBar = createGradientBar(120, 4);

  // Compose the phone screenshot
  await sharp({
    create: {
      width: PHONE_WIDTH,
      height: PHONE_HEIGHT,
      channels: 4,
      background: BRAND_COLOR,
    },
  })
    .composite([
      // Small logo centered at top
      { input: smallLogo, top: 40, left: Math.round((PHONE_WIDTH - 200) / 2) },
      // Gradient bar under logo
      { input: gradientBar, top: 155, left: Math.round((PHONE_WIDTH - 120) / 2) },
      // Caption text
      { input: captionText, top: 175, left: 0 },
      // Subtitle
      { input: subtitle, top: 230, left: 0 },
      // Screenshot content with rounded corners
      { input: resizedScreenshot, top: headerHeight, left: 30 },
    ])
    .flatten({ background: BRAND_COLOR })
    .png()
    .toFile(outputPath);

  const stats = fs.statSync(outputPath);
  console.log(`   -> phone-screenshot-${index + 1}.png - "${caption}" (${(stats.size / 1024).toFixed(1)} KB)`);
}

async function generateTabletScreenshot(
  screenshotFile: string,
  caption: string,
  index: number,
  width: number,
  height: number,
  prefix: string
) {
  const inputPath = path.join(PUBLIC_DIR, screenshotFile);
  const outputPath = path.join(OUTPUT_DIR, `${prefix}-screenshot-${index + 1}.png`);

  const headerHeight = Math.round(height * 0.14);
  const footerHeight = Math.round(height * 0.03);
  const padding = Math.round(width * 0.03);
  const contentWidth = width - padding * 2;
  const contentHeight = height - headerHeight - footerHeight;
  const cornerRadius = 20;

  // Resize screenshot to fill content area
  let resizedScreenshot = await sharp(inputPath)
    .resize(contentWidth, contentHeight, { fit: 'cover', position: 'top' })
    .png()
    .toBuffer();

  // Round corners
  const mask = createRoundedMask(contentWidth, contentHeight, cornerRadius);
  resizedScreenshot = await sharp(resizedScreenshot)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // Logo
  const logoSize = Math.round(width * 0.18);
  const logoHeight = Math.round(logoSize * 0.5);
  const smallLogo = await sharp(LOGO_PATH)
    .resize(logoSize, logoHeight, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Caption
  const fontSize = Math.round(width * 0.025);
  const captionText = createSvgText(caption, fontSize, width, TEXT_COLOR, 'bold');

  // Gradient bar
  const barWidth = Math.round(width * 0.1);
  const gradientBar = createGradientBar(barWidth, 4);

  await sharp({
    create: { width, height, channels: 4, background: BRAND_COLOR },
  })
    .composite([
      { input: smallLogo, top: Math.round(headerHeight * 0.15), left: Math.round((width - logoSize) / 2) },
      { input: gradientBar, top: Math.round(headerHeight * 0.6), left: Math.round((width - barWidth) / 2) },
      { input: captionText, top: Math.round(headerHeight * 0.68), left: 0 },
      { input: resizedScreenshot, top: headerHeight, left: padding },
    ])
    .flatten({ background: BRAND_COLOR })
    .png()
    .toFile(outputPath);

  const stats = fs.statSync(outputPath);
  console.log(`   -> ${prefix}-screenshot-${index + 1}.png - "${caption}" (${(stats.size / 1024).toFixed(1)} KB)`);
}

async function main() {
  console.log('=== Google Play Store Asset Generator ===\n');

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Verify source files exist
  for (const ss of PHONE_SCREENSHOTS) {
    const p = path.join(PUBLIC_DIR, ss.file);
    if (!fs.existsSync(p)) {
      console.error(`Missing screenshot: ${ss.file}`);
      process.exit(1);
    }
  }

  // 1. App Icon
  await generateAppIcon();

  // 2. Feature Graphic
  await generateFeatureGraphic();

  // 3. Phone Screenshots (1080x1920)
  console.log(`\n3. Generating ${PHONE_SCREENSHOTS.length} phone screenshots (${PHONE_WIDTH}x${PHONE_HEIGHT})...`);
  for (let i = 0; i < PHONE_SCREENSHOTS.length; i++) {
    await generatePhoneScreenshot(PHONE_SCREENSHOTS[i].file, PHONE_SCREENSHOTS[i].caption, i);
  }

  // 4. 7-inch Tablet Screenshots (1080x1920 portrait)
  const tabletScreenshots = PHONE_SCREENSHOTS.slice(0, 4); // First 4 for tablets
  console.log(`\n4. Generating ${tabletScreenshots.length} 7-inch tablet screenshots (${TABLET7_WIDTH}x${TABLET7_HEIGHT})...`);
  for (let i = 0; i < tabletScreenshots.length; i++) {
    await generateTabletScreenshot(
      tabletScreenshots[i].file, tabletScreenshots[i].caption, i,
      TABLET7_WIDTH, TABLET7_HEIGHT, 'tablet7'
    );
  }

  // 5. 10-inch Tablet Screenshots (2560x1600 landscape)
  console.log(`\n5. Generating ${tabletScreenshots.length} 10-inch tablet screenshots (${TABLET10_WIDTH}x${TABLET10_HEIGHT})...`);
  for (let i = 0; i < tabletScreenshots.length; i++) {
    await generateTabletScreenshot(
      tabletScreenshots[i].file, tabletScreenshots[i].caption, i,
      TABLET10_WIDTH, TABLET10_HEIGHT, 'tablet10'
    );
  }

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log('');
  console.log('Files generated:');
  console.log('  1x App Icon (512x512, no alpha)');
  console.log('  1x Feature Graphic (1024x500)');
  console.log(`  ${PHONE_SCREENSHOTS.length}x Phone Screenshots (1080x1920)`);
  console.log(`  ${tabletScreenshots.length}x 7-inch Tablet Screenshots (1080x1920)`);
  console.log(`  ${tabletScreenshots.length}x 10-inch Tablet Screenshots (2560x1600)`);
  console.log(`  Total: ${1 + 1 + PHONE_SCREENSHOTS.length + tabletScreenshots.length * 2} files`);
  console.log('');
  console.log('Google Play Console upload locations:');
  console.log('  Store settings > Store listing > App icon -> app-icon-512x512.png');
  console.log('  Store settings > Store listing > Feature graphic -> feature-graphic-1024x500.png');
  console.log('  Store settings > Store listing > Phone screenshots -> phone-screenshot-*.png');
  console.log('  Store settings > Store listing > 7-inch tablet screenshots -> tablet7-screenshot-*.png');
  console.log('  Store settings > Store listing > 10-inch tablet screenshots -> tablet10-screenshot-*.png');
}

main().catch((err) => {
  console.error('Failed to generate Play Store assets:', err);
  process.exit(1);
});
