import { describe, it, expect } from 'vitest'
import {
  toGrayscale,
  contrastStretch,
  computeOtsuThreshold,
  otsuBinarize,
} from '../../src/services/ocr/imagePreprocessor'

// ---------------------------------------------------------------------------
// Helper to build a Uint8ClampedArray from an array of [R,G,B,A] tuples
// ---------------------------------------------------------------------------
function makePixels(tuples: number[][]): Uint8ClampedArray {
  const arr = new Uint8ClampedArray(tuples.length * 4)
  tuples.forEach(([r, g, b, a], i) => {
    arr[i * 4] = r
    arr[i * 4 + 1] = g
    arr[i * 4 + 2] = b
    arr[i * 4 + 3] = a ?? 255
  })
  return arr
}

// ---------------------------------------------------------------------------
// toGrayscale
// ---------------------------------------------------------------------------
describe('toGrayscale', () => {
  it('converts a pure red pixel to the correct luminance', () => {
    // R=255, G=0, B=0 → 0.299*255 = ~76
    const pixels = makePixels([[255, 0, 0, 255]])
    toGrayscale(pixels)
    const expected = Math.round(0.299 * 255)
    expect(pixels[0]).toBe(expected)
    expect(pixels[1]).toBe(expected)
    expect(pixels[2]).toBe(expected)
    expect(pixels[3]).toBe(255) // alpha unchanged
  })

  it('converts a pure green pixel to the correct luminance', () => {
    // G=255 → 0.587*255 = ~150
    const pixels = makePixels([[0, 255, 0, 255]])
    toGrayscale(pixels)
    const expected = Math.round(0.587 * 255)
    expect(pixels[0]).toBe(expected)
    expect(pixels[1]).toBe(expected)
    expect(pixels[2]).toBe(expected)
  })

  it('converts a pure blue pixel to the correct luminance', () => {
    // B=255 → 0.114*255 = ~29
    const pixels = makePixels([[0, 0, 255, 255]])
    toGrayscale(pixels)
    const expected = Math.round(0.114 * 255)
    expect(pixels[0]).toBe(expected)
    expect(pixels[1]).toBe(expected)
    expect(pixels[2]).toBe(expected)
  })

  it('leaves a white pixel white', () => {
    const pixels = makePixels([[255, 255, 255, 255]])
    toGrayscale(pixels)
    expect(pixels[0]).toBe(255)
  })

  it('leaves a black pixel black', () => {
    const pixels = makePixels([[0, 0, 0, 255]])
    toGrayscale(pixels)
    expect(pixels[0]).toBe(0)
  })

  it('handles multiple pixels correctly', () => {
    const pixels = makePixels([
      [255, 0, 0, 255],
      [0, 255, 0, 255],
      [0, 0, 255, 255],
    ])
    toGrayscale(pixels)
    expect(pixels[0]).toBe(Math.round(0.299 * 255))
    expect(pixels[4]).toBe(Math.round(0.587 * 255))
    expect(pixels[8]).toBe(Math.round(0.114 * 255))
  })
})

// ---------------------------------------------------------------------------
// contrastStretch
// ---------------------------------------------------------------------------
describe('contrastStretch', () => {
  it('stretches a range [100, 200] to [0, 255]', () => {
    // 2 pixels: gray=100 and gray=200
    const pixels = makePixels([
      [100, 100, 100, 255],
      [200, 200, 200, 255],
    ])
    contrastStretch(pixels, 2)
    expect(pixels[0]).toBe(0) // min → 0
    expect(pixels[4]).toBe(255) // max → 255
  })

  it('maps a midpoint correctly', () => {
    // 3 pixels: 0, 128, 255 → should map to 0, 128, 255 (already full range)
    const pixels = makePixels([
      [0, 0, 0, 255],
      [128, 128, 128, 255],
      [255, 255, 255, 255],
    ])
    contrastStretch(pixels, 3)
    expect(pixels[0]).toBe(0)
    expect(pixels[8]).toBe(255)
    // midpoint: (128 - 0) * 255/255 = 128
    expect(pixels[4]).toBe(128)
  })

  it('does nothing when all pixels are the same (flat image)', () => {
    const pixels = makePixels([
      [100, 100, 100, 255],
      [100, 100, 100, 255],
    ])
    contrastStretch(pixels, 2)
    // range=0, skip stretch — values should remain 100
    expect(pixels[0]).toBe(100)
    expect(pixels[4]).toBe(100)
  })

  it('preserves alpha channel', () => {
    const pixels = makePixels([
      [50, 50, 50, 128],
      [200, 200, 200, 64],
    ])
    contrastStretch(pixels, 2)
    expect(pixels[3]).toBe(128)
    expect(pixels[7]).toBe(64)
  })
})

// ---------------------------------------------------------------------------
// computeOtsuThreshold
// ---------------------------------------------------------------------------
describe('computeOtsuThreshold', () => {
  it('separates a bimodal image so dark pixels fall below threshold and light pixels at or above', () => {
    // Half pixels at 50 (dark), half at 200 (light)
    const count = 256
    const pixels = new Uint8ClampedArray(count * 4)
    for (let i = 0; i < count; i++) {
      const v = i < count / 2 ? 50 : 200
      pixels[i * 4] = v
      pixels[i * 4 + 1] = v
      pixels[i * 4 + 2] = v
      pixels[i * 4 + 3] = 255
    }
    const t = computeOtsuThreshold(pixels, count)
    // Threshold must be at least 50 (dark class at or below) and below 200 (light class above)
    expect(t).toBeGreaterThanOrEqual(50)
    expect(t).toBeLessThan(200)
  })

  it('returns 0 for a solid black image', () => {
    const pixels = makePixels([[0, 0, 0, 255]])
    const t = computeOtsuThreshold(pixels, 1)
    expect(t).toBe(0)
  })

  it('returns a value in 0-255 range for any image', () => {
    const count = 100
    const pixels = new Uint8ClampedArray(count * 4)
    for (let i = 0; i < count; i++) {
      const v = Math.floor(Math.random() * 256)
      pixels[i * 4] = v
      pixels[i * 4 + 1] = v
      pixels[i * 4 + 2] = v
      pixels[i * 4 + 3] = 255
    }
    const t = computeOtsuThreshold(pixels, count)
    expect(t).toBeGreaterThanOrEqual(0)
    expect(t).toBeLessThanOrEqual(255)
  })
})

// ---------------------------------------------------------------------------
// otsuBinarize
// ---------------------------------------------------------------------------
describe('otsuBinarize', () => {
  it('turns dark pixels black and light pixels white', () => {
    // Bimodal image: many pixels at 30 (dark) and 220 (light), plus one at 10.
    // The single pixel at 10 is below the lower cluster, so Otsu's threshold
    // will be at 30, classifying 30 as white (>= threshold).
    // Verify that the lower-value class (10) is black and higher (220) is white.
    const darkPixels = 49 // value 30
    const extraDark = 1 // value 10, ensures threshold > 10
    const lightPixels = 50 // value 220
    const count = darkPixels + extraDark + lightPixels
    const pixels = new Uint8ClampedArray(count * 4)
    // 1 pixel at 10
    pixels[0] = 10
    pixels[1] = 10
    pixels[2] = 10
    pixels[3] = 255
    // 49 pixels at 30
    for (let i = 1; i <= darkPixels; i++) {
      pixels[i * 4] = 30
      pixels[i * 4 + 1] = 30
      pixels[i * 4 + 2] = 30
      pixels[i * 4 + 3] = 255
    }
    // 50 pixels at 220
    for (let i = darkPixels + extraDark; i < count; i++) {
      pixels[i * 4] = 220
      pixels[i * 4 + 1] = 220
      pixels[i * 4 + 2] = 220
      pixels[i * 4 + 3] = 255
    }
    otsuBinarize(pixels, count)
    // value 10 should be black (below threshold which sits at 30 or between 10-30)
    expect(pixels[0]).toBe(0) // 10 → black
    // value 220 should be white
    expect(pixels[(darkPixels + extraDark) * 4]).toBe(255) // 220 → white
  })

  it('produces only 0 or 255 values', () => {
    const count = 50
    const pixels = new Uint8ClampedArray(count * 4)
    for (let i = 0; i < count; i++) {
      const v = Math.floor(Math.random() * 256)
      pixels[i * 4] = v
      pixels[i * 4 + 1] = v
      pixels[i * 4 + 2] = v
      pixels[i * 4 + 3] = 255
    }
    otsuBinarize(pixels, count)
    for (let i = 0; i < count; i++) {
      expect([0, 255]).toContain(pixels[i * 4])
    }
  })
})
