/** Optimize the oversized logo: shrink in place + create the /logo.png the Organization schema needs. */
import sharp from 'sharp';
import fs from 'fs';

async function main() {
  const src = 'public/spacenexus-logo.png';
  const before = fs.statSync(src).size;
  const meta = await sharp(src).metadata();
  console.log(`before: ${(before / 1024 / 1024).toFixed(2)} MB, ${meta.width}x${meta.height}`);

  // In-place replacement: cap width at 1200px, high-effort palette PNG
  const resized = await sharp(src)
    .resize({ width: Math.min(1200, meta.width || 1200) })
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toBuffer();
  fs.writeFileSync(src, resized);
  console.log(`after:  ${(resized.length / 1024).toFixed(0)} KB`);

  // Schema logo: 600px wide standalone file at the URL StructuredData cites
  const logo = await sharp(resized)
    .resize({ width: 600 })
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toBuffer();
  fs.writeFileSync('public/logo.png', logo);
  console.log(`logo.png: ${(logo.length / 1024).toFixed(0)} KB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
