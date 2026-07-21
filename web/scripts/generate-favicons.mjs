// Generates the full favicon set from the Solar Maps logo.
//
// The source logo is landscape (399x225), so each icon is fit onto a SQUARE
// canvas with `fit: contain` (no distortion) rather than stretched. Most icons
// keep a transparent background; the Apple touch icon uses a solid white
// background because iOS renders transparency as black.
//
// Run with:  npm run gen-favicons
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFile } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const source = join(publicDir, 'Solar Maps logo.png');

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

// Resize the source into a square `size`x`size` PNG buffer, letterboxed onto
// the given background so the wide logo is never distorted.
async function squarePng(size, background) {
  return sharp(source)
    .resize(size, size, { fit: 'contain', background })
    .png()
    .toBuffer();
}

async function main() {
  // PNG icons written straight to disk (transparent padding).
  const pngTargets = [
    { file: 'favicon-16x16.png', size: 16, bg: TRANSPARENT },
    { file: 'favicon-32x32.png', size: 32, bg: TRANSPARENT },
    { file: 'android-chrome-192x192.png', size: 192, bg: TRANSPARENT },
    { file: 'android-chrome-512x512.png', size: 512, bg: TRANSPARENT },
    // iOS shows transparency as black -> use a white background.
    { file: 'apple-touch-icon.png', size: 180, bg: WHITE },
  ];

  for (const t of pngTargets) {
    const buf = await squarePng(t.size, t.bg);
    await writeFile(join(publicDir, t.file), buf);
    console.log(`  ✓ ${t.file} (${t.size}x${t.size})`);
  }

  // Multi-resolution favicon.ico built from 16/32/48 PNG buffers.
  const icoSizes = [16, 32, 48];
  const icoBuffers = await Promise.all(icoSizes.map((s) => squarePng(s, TRANSPARENT)));
  const ico = await pngToIco(icoBuffers);
  await writeFile(join(publicDir, 'favicon.ico'), ico);
  console.log(`  ✓ favicon.ico (${icoSizes.join(', ')})`);

  console.log('Favicon set generated from Solar Maps logo.');
}

main().catch((err) => {
  console.error('Favicon generation failed:', err);
  process.exit(1);
});
