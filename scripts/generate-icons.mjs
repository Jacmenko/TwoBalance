// Generates placeholder PNG icons with no dependencies (two overlapping circles on green).
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

function png(size, { rounded, scale }) {
  const bg = [5, 150, 105]
  const raw = Buffer.alloc((size * 4 + 1) * size)
  const r = size * 0.2 * scale
  const cy = size / 2
  const c1 = size / 2 - r * 0.6
  const c2 = size / 2 + r * 0.6
  const corner = size * 0.22
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < size; x++) {
      let px = [0, 0, 0, 0]
      let inside = true
      if (rounded) {
        const dx = Math.max(corner - x, 0, x - (size - 1 - corner))
        const dy = Math.max(corner - y, 0, y - (size - 1 - corner))
        inside = dx * dx + dy * dy <= corner * corner
      }
      if (inside) {
        px = [...bg, 255]
        const in1 = (x - c1) ** 2 + (y - cy) ** 2 <= r * r
        const in2 = (x - c2) ** 2 + (y - cy) ** 2 <= r * r
        if (in1) px = [255, 255, 255, 255]
        else if (in2) px = [209, 250, 229, 255]
      }
      raw.set(px, row + 1 + x * 4)
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync('public/icons', { recursive: true })
writeFileSync('public/icons/icon-192.png', png(192, { rounded: true, scale: 1 }))
writeFileSync('public/icons/icon-512.png', png(512, { rounded: true, scale: 1 }))
// Maskable: full-bleed background, artwork kept inside the central safe zone.
writeFileSync('public/icons/icon-maskable-512.png', png(512, { rounded: false, scale: 0.8 }))
// iOS applies its own rounding, so use a full-bleed square.
writeFileSync('public/icons/apple-touch-icon.png', png(180, { rounded: false, scale: 1 }))
console.log('icons written')
