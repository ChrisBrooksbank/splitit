/**
 * Generate PWA icons from SVG template.
 * Usage: node scripts/generate-icons.mjs
 * Requires: sharp (installed as devDep or via npx)
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

// Modern, clean bill-split icon
// Receipt shape with a diagonal split line and two-tone halves
function makeSvg(size, maskable = false) {
  const padding = maskable ? size * 0.1 : 0
  const s = size - padding * 2
  const ox = padding
  const oy = padding

  // Scale helper
  const p = (frac) => frac * s

  // Receipt dimensions (centered)
  const rw = p(0.52)
  const rh = p(0.68)
  const rx = ox + (s - rw) / 2
  const ry = oy + (s - rh) / 2
  const corner = p(0.03)

  // Zigzag bottom for receipt
  const zigCount = 6
  const zigH = p(0.025)
  const zigW = rw / zigCount
  let zigPath = ''
  for (let i = 0; i < zigCount; i++) {
    const x1 = rx + i * zigW + zigW / 2
    const y1 = ry + rh + zigH
    const x2 = rx + (i + 1) * zigW
    const y2 = ry + rh
    zigPath += `L${x1},${y1} L${x2},${y2} `
  }

  // Split line (diagonal slash through the receipt)
  const splitX1 = rx + rw * 0.35
  const splitY1 = ry + rh * 0.15
  const splitX2 = rx + rw * 0.65
  const splitY2 = ry + rh * 0.85

  // Line items on receipt (left side - short horizontal lines)
  const lines = []
  for (let i = 0; i < 4; i++) {
    const ly = ry + rh * (0.22 + i * 0.145)
    const lx = rx + rw * 0.18
    const lw = rw * 0.64
    lines.push({ x: lx, y: ly, w: lw })
  }

  // Background color
  const bgColor = maskable ? '#4F46E5' : 'transparent'

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${maskable ? `<rect width="${size}" height="${size}" fill="${bgColor}" rx="0"/>` : ''}

  <!-- Background circle (non-maskable only) -->
  ${!maskable ? `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#4F46E5"/>` : ''}

  <!-- Receipt shadow -->
  <rect x="${rx + p(0.015)}" y="${ry + p(0.02)}" width="${rw}" height="${rh}" rx="${corner}" fill="rgba(0,0,0,0.15)"/>

  <!-- Receipt body -->
  <path d="M${rx + corner},${ry} L${rx + rw - corner},${ry}
           Q${rx + rw},${ry} ${rx + rw},${ry + corner}
           L${rx + rw},${ry + rh} ${zigPath}
           L${rx},${ry + rh}
           L${rx},${ry + corner}
           Q${rx},${ry} ${rx + corner},${ry} Z"
        fill="white"/>

  <!-- Receipt lines -->
  ${lines
    .map(
      (l, i) =>
        `<rect x="${l.x}" y="${l.y}" width="${l.w * (i === 3 ? 0.45 : 0.7 + Math.random() * 0.3)}" height="${p(0.022)}" rx="${p(0.011)}" fill="${i < 2 ? '#C7D2FE' : '#E0E7FF'}"/>`
    )
    .join('\n  ')}

  <!-- Dotted line above total -->
  <line x1="${rx + rw * 0.15}" y1="${ry + rh * 0.73}" x2="${rx + rw * 0.85}" y2="${ry + rh * 0.73}"
        stroke="#C7D2FE" stroke-width="${p(0.012)}" stroke-dasharray="${p(0.02)} ${p(0.015)}"/>

  <!-- Total line (bolder) -->
  <rect x="${rx + rw * 0.4}" y="${ry + rh * 0.79}" width="${rw * 0.42}" height="${p(0.028)}" rx="${p(0.014)}" fill="#4F46E5"/>

  <!-- Split symbol: two arrows pointing apart -->
  <g transform="translate(${rx + rw * 0.78}, ${ry + rh * 0.08})">
    <!-- Scissors / split icon -->
    <circle cx="0" cy="0" r="${p(0.065)}" fill="#4F46E5"/>
    <line x1="${-p(0.03)}" y1="${-p(0.02)}" x2="${p(0.03)}" y2="${p(0.02)}" stroke="white" stroke-width="${p(0.014)}" stroke-linecap="round"/>
    <line x1="${p(0.03)}" y1="${-p(0.02)}" x2="${-p(0.03)}" y2="${p(0.02)}" stroke="white" stroke-width="${p(0.014)}" stroke-linecap="round"/>
  </g>
</svg>`
}

// Write SVGs first (for reference)
writeFileSync(join(outDir, 'icon.svg'), makeSvg(512, false))
writeFileSync(join(outDir, 'icon-maskable.svg'), makeSvg(512, true))

// Convert to PNGs using sharp
try {
  const sharp = (await import('sharp')).default

  const variants = [
    { name: 'icon-192.png', size: 192, maskable: false },
    { name: 'icon-512.png', size: 512, maskable: false },
    { name: 'icon-maskable.png', size: 512, maskable: true },
    { name: 'apple-touch-icon.png', size: 180, maskable: false },
  ]

  for (const v of variants) {
    const svg = makeSvg(v.size, v.maskable)
    await sharp(Buffer.from(svg)).png().toFile(join(outDir, v.name))
    console.log(`✓ ${v.name} (${v.size}x${v.size})`)
  }

  // Also generate favicon as 32x32 PNG (browsers accept png favicons)
  const favSvg = makeSvg(32, false)
  await sharp(Buffer.from(favSvg))
    .png()
    .toFile(join(__dirname, '..', 'public', 'favicon.png'))
  console.log('✓ favicon.png (32x32)')

  console.log('\nDone! Icons generated in public/icons/')
} catch (e) {
  console.log('SVGs written. Install sharp to auto-convert to PNG:')
  console.log('  npm i -D sharp && node scripts/generate-icons.mjs')
  console.log('\nOr open the SVGs in a browser and export as PNG manually.')
}
