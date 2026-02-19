import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const LOGO_PATH = path.join(__dirname, '..', 'public', 'spacenexus-logo.png');
const OUTPUT_DIR = path.join(__dirname, '..', 'public');

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const BG_COLOR = '#0f172a'; // slate-900

async function generateOgImage() {
  console.log('Generating OpenGraph image (1200x630)...');

  // Resize logo to fit nicely in the center
  const logoSize = 200;
  const logo = await sharp(LOGO_PATH)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Create the OG image with SVG text overlay composited with the logo
  const svgOverlay = `
    <svg width="${OG_WIDTH}" height="${OG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#1e293b;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#0f172a;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#06b6d4;stop-opacity:0" />
          <stop offset="50%" style="stop-color:#06b6d4;stop-opacity:0.6" />
          <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:0" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="35%" r="40%">
          <stop offset="0%" style="stop-color:#06b6d4;stop-opacity:0.15" />
          <stop offset="100%" style="stop-color:#06b6d4;stop-opacity:0" />
        </radialGradient>
      </defs>

      <!-- Background -->
      <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#bg)" />

      <!-- Subtle glow behind logo -->
      <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#glow)" />

      <!-- Top accent line -->
      <rect x="0" y="0" width="${OG_WIDTH}" height="3" fill="url(#accent)" />

      <!-- Stars (decorative dots) -->
      <circle cx="100" cy="80" r="1.5" fill="white" opacity="0.3" />
      <circle cx="250" cy="150" r="1" fill="white" opacity="0.2" />
      <circle cx="400" cy="60" r="1.2" fill="white" opacity="0.25" />
      <circle cx="800" cy="100" r="1.5" fill="white" opacity="0.3" />
      <circle cx="950" cy="200" r="1" fill="white" opacity="0.2" />
      <circle cx="1100" cy="80" r="1.2" fill="white" opacity="0.25" />
      <circle cx="150" cy="500" r="1" fill="white" opacity="0.2" />
      <circle cx="350" cy="550" r="1.5" fill="white" opacity="0.15" />
      <circle cx="1050" cy="520" r="1" fill="white" opacity="0.2" />
      <circle cx="700" cy="580" r="1.2" fill="white" opacity="0.15" />

      <!-- Site name -->
      <text x="${OG_WIDTH / 2}" y="380" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="56" fill="white" letter-spacing="2">SpaceNexus</text>

      <!-- Tagline -->
      <text x="${OG_WIDTH / 2}" y="430" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="400" font-size="24" fill="#94a3b8" letter-spacing="1">Space Industry Intelligence Platform</text>

      <!-- Feature pills -->
      <rect x="230" y="470" width="140" height="32" rx="16" fill="#06b6d4" fill-opacity="0.15" stroke="#06b6d4" stroke-opacity="0.3" stroke-width="1" />
      <text x="300" y="491" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#06b6d4">Launch Tracker</text>

      <rect x="390" y="470" width="140" height="32" rx="16" fill="#8b5cf6" fill-opacity="0.15" stroke="#8b5cf6" stroke-opacity="0.3" stroke-width="1" />
      <text x="460" y="491" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#8b5cf6">Market Intel</text>

      <rect x="550" y="470" width="140" height="32" rx="16" fill="#06b6d4" fill-opacity="0.15" stroke="#06b6d4" stroke-opacity="0.3" stroke-width="1" />
      <text x="620" y="491" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#06b6d4">Satellite Ops</text>

      <rect x="710" y="470" width="140" height="32" rx="16" fill="#8b5cf6" fill-opacity="0.15" stroke="#8b5cf6" stroke-opacity="0.3" stroke-width="1" />
      <text x="780" y="491" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#8b5cf6">Marketplace</text>

      <!-- URL -->
      <text x="${OG_WIDTH / 2}" y="560" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="#64748b">spacenexus.us</text>

      <!-- Bottom accent line -->
      <rect x="0" y="${OG_HEIGHT - 3}" width="${OG_WIDTH}" height="3" fill="url(#accent)" />
    </svg>
  `;

  // Create the base image from SVG
  const baseImage = await sharp(Buffer.from(svgOverlay))
    .png()
    .toBuffer();

  // Composite the logo on top
  const logoTop = 130;
  const logoLeft = Math.round((OG_WIDTH - logoSize) / 2);

  const outputPath = path.join(OUTPUT_DIR, 'og-image.png');
  await sharp(baseImage)
    .composite([
      {
        input: logo,
        top: logoTop,
        left: logoLeft,
      },
    ])
    .png({ quality: 90, compressionLevel: 9 })
    .toFile(outputPath);

  const stats = fs.statSync(outputPath);
  console.log(`Generated: og-image.png (${(stats.size / 1024).toFixed(1)} KB)`);

  // Also create a Twitter-optimized version (same dimensions, Twitter uses summary_large_image)
  const twitterPath = path.join(OUTPUT_DIR, 'twitter-image.png');
  fs.copyFileSync(outputPath, twitterPath);
  console.log(`Generated: twitter-image.png (copy of og-image.png)`);

  console.log('\nDone! OpenGraph and Twitter images are ready.');
}

generateOgImage().catch((err) => {
  console.error('Failed to generate OG image:', err);
  process.exit(1);
});
