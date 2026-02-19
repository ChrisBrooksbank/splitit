import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const iconsDir = resolve(root, 'public/icons')

const iconSvg = readFileSync(resolve(iconsDir, 'icon.svg'))
const maskableSvg = readFileSync(resolve(iconsDir, 'icon-maskable.svg'))

async function generate() {
  await sharp(iconSvg).resize(512, 512).png().toFile(resolve(iconsDir, 'icon-512.png'))
  console.log('done icon-512.png')

  await sharp(iconSvg).resize(192, 192).png().toFile(resolve(iconsDir, 'icon-192.png'))
  console.log('done icon-192.png')

  await sharp(maskableSvg).resize(512, 512).png().toFile(resolve(iconsDir, 'icon-maskable.png'))
  console.log('done icon-maskable.png')

  await sharp(maskableSvg).resize(180, 180).png().toFile(resolve(iconsDir, 'apple-touch-icon.png'))
  console.log('done apple-touch-icon.png')

  await sharp(iconSvg).resize(48, 48).png().toFile(resolve(root, 'public/favicon.png'))
  console.log('done favicon.png')

  // favicon.ico: minimal ICO wrapping a 32x32 PNG
  const favicon32 = await sharp(iconSvg).resize(32, 32).png().toBuffer()
  const headerSize = 6
  const dirEntrySize = 16
  const dataOffset = headerSize + dirEntrySize
  const header = Buffer.alloc(headerSize)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(1, 4)
  const dirEntry = Buffer.alloc(dirEntrySize)
  dirEntry.writeUInt8(32, 0)
  dirEntry.writeUInt8(32, 1)
  dirEntry.writeUInt8(0, 2)
  dirEntry.writeUInt8(0, 3)
  dirEntry.writeUInt16LE(1, 4)
  dirEntry.writeUInt16LE(32, 6)
  dirEntry.writeUInt32LE(favicon32.length, 8)
  dirEntry.writeUInt32LE(dataOffset, 12)
  writeFileSync(resolve(root, 'public/favicon.ico'), Buffer.concat([header, dirEntry, favicon32]))
  console.log('done favicon.ico')

  console.log('\nAll icons generated!')
}

generate().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
