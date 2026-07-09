#!/usr/bin/env node
// Generates the extension icons (icons/icon-{16,32,48,128}.png) from code — no
// external image tools, so it regenerates anywhere Node runs. The mark is the
// extension's job in miniature: a shared screen with a two-tile participant strip
// beside it, white on DSFR blue. Run: node make-icons.mjs

import zlib from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
mkdirSync(join(here, 'icons'), { recursive: true })

const BLUE = [0, 0, 145]      // #000091 — DSFR / La Suite blue
const WHITE = [255, 255, 255]
const SS = 4                   // supersampling factor for anti-aliasing

// Shapes in a 0..1 unit square: background, screen, two participant tiles.
const BG = { x0: 0, y0: 0, x1: 1, y1: 1, r: 0.22 }
const SHAPES = [
  { x0: 0.12, y0: 0.30, x1: 0.58, y1: 0.70, r: 0.05 }, // screen
  { x0: 0.64, y0: 0.30, x1: 0.88, y1: 0.475, r: 0.04 }, // tile 1
  { x0: 0.64, y0: 0.525, x1: 0.88, y1: 0.70, r: 0.04 }, // tile 2
]

// Signed-distance test for a rounded rectangle (<= 0 means inside).
function insideRR(px, py, s) {
  const hw = (s.x1 - s.x0) / 2, hh = (s.y1 - s.y0) / 2
  const cx = (s.x0 + s.x1) / 2, cy = (s.y0 + s.y1) / 2
  const qx = Math.abs(px - cx) - (hw - s.r)
  const qy = Math.abs(py - cy) - (hh - s.r)
  const d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - s.r
  return d <= 0
}

function render(size) {
  const out = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = (x + (sx + 0.5) / SS) / size
          const py = (y + (sy + 0.5) / SS) / size
          let cr = 0, cg = 0, cb = 0, ca = 0
          if (insideRR(px, py, BG)) { [cr, cg, cb] = BLUE; ca = 255 }
          if (SHAPES.some((s) => insideRR(px, py, s))) { [cr, cg, cb] = WHITE; ca = 255 }
          r += cr; g += cg; b += cb; a += ca
        }
      }
      const n = SS * SS, i = (y * size + x) * 4
      out[i] = Math.round(r / n); out[i + 1] = Math.round(g / n)
      out[i + 2] = Math.round(b / n); out[i + 3] = Math.round(a / n)
    }
  }
  return out
}

// --- Minimal PNG encoder (RGBA, no filtering) ---
const CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const typeData = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(typeData))
  return Buffer.concat([len, typeData, crc])
}
function encodePNG(size, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6 // 8-bit, RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // filter: None
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [16, 32, 48, 128]) {
  writeFileSync(join(here, 'icons', `icon-${size}.png`), encodePNG(size, render(size)))
}
console.log('Wrote icons/icon-{16,32,48,128}.png')
