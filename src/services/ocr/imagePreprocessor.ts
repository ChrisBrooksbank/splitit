/**
 * Image preprocessing pipeline for OCR.
 * Steps: resize → grayscale → contrast stretch → Otsu binarization
 * All operations use the Canvas API (no external dependencies).
 */

const MAX_DIMENSION = 2000

/**
 * Preprocess an image file for optimal OCR accuracy.
 * Returns a Blob (PNG) of the processed image.
 */
export async function preprocessImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  // Step 1: Resize to max 2000px on longest edge
  const { width, height } = resize(bitmap.width, bitmap.height, MAX_DIMENSION)
  canvas.width = width
  canvas.height = height
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const imageData = ctx.getImageData(0, 0, width, height)
  const pixels = imageData.data // Uint8ClampedArray, RGBA

  // Step 2: Convert to grayscale using luminance formula (in-place, channel 0)
  toGrayscale(pixels)

  // Step 3: Contrast stretch (histogram stretching)
  contrastStretch(pixels, width * height)

  // Step 4: Otsu binarization
  otsuBinarize(pixels, width * height)

  // Write back and export
  ctx.putImageData(imageData, 0, 0)
  return canvasToBlob(canvas)
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function resize(
  srcWidth: number,
  srcHeight: number,
  maxDim: number
): { width: number; height: number } {
  if (srcWidth <= maxDim && srcHeight <= maxDim) {
    return { width: srcWidth, height: srcHeight }
  }
  const scale = maxDim / Math.max(srcWidth, srcHeight)
  return {
    width: Math.round(srcWidth * scale),
    height: Math.round(srcHeight * scale),
  }
}

/**
 * Convert RGBA pixels to grayscale in-place using the ITU-R BT.601 luminance formula.
 * Stores the gray value in the R channel; G and B are set to the same value; A unchanged.
 */
export function toGrayscale(pixels: Uint8ClampedArray): void {
  for (let i = 0; i < pixels.length; i += 4) {
    const gray = Math.round(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2])
    pixels[i] = gray
    pixels[i + 1] = gray
    pixels[i + 2] = gray
    // pixels[i + 3] = alpha, unchanged
  }
}

/**
 * Contrast stretching (histogram stretching): maps [min, max] → [0, 255].
 * Operates on the R channel (after grayscale conversion).
 */
export function contrastStretch(pixels: Uint8ClampedArray, numPixels: number): void {
  // Find min and max gray values
  let min = 255
  let max = 0
  for (let i = 0; i < numPixels * 4; i += 4) {
    const v = pixels[i]
    if (v < min) min = v
    if (v > max) max = v
  }

  // Avoid division by zero for flat images
  const range = max - min
  if (range === 0) return

  const scale = 255 / range
  for (let i = 0; i < numPixels * 4; i += 4) {
    const stretched = Math.round((pixels[i] - min) * scale)
    pixels[i] = stretched
    pixels[i + 1] = stretched
    pixels[i + 2] = stretched
  }
}

/**
 * Otsu's thresholding: computes the optimal threshold to binarize a grayscale image.
 * Pixels at or above the threshold become 255 (white); below become 0 (black).
 */
export function otsuBinarize(pixels: Uint8ClampedArray, numPixels: number): void {
  const threshold = computeOtsuThreshold(pixels, numPixels)

  for (let i = 0; i < numPixels * 4; i += 4) {
    const bin = pixels[i] >= threshold ? 255 : 0
    pixels[i] = bin
    pixels[i + 1] = bin
    pixels[i + 2] = bin
  }
}

/**
 * Compute Otsu's optimal threshold from the grayscale histogram.
 * Returns the threshold value (0–255).
 */
export function computeOtsuThreshold(pixels: Uint8ClampedArray, numPixels: number): number {
  // Build histogram
  const histogram = new Float64Array(256)
  for (let i = 0; i < numPixels * 4; i += 4) {
    histogram[pixels[i]]++
  }

  // Normalize
  const total = numPixels
  for (let i = 0; i < 256; i++) {
    histogram[i] /= total
  }

  // Compute total mean
  let mean = 0
  for (let i = 0; i < 256; i++) {
    mean += i * histogram[i]
  }

  // Maximize inter-class variance
  let maxVariance = 0
  let bestThreshold = 0
  let cumulativeProb = 0
  let cumulativeMean = 0

  for (let t = 0; t < 256; t++) {
    cumulativeProb += histogram[t]
    cumulativeMean += t * histogram[t]

    if (cumulativeProb === 0 || cumulativeProb === 1) continue

    const bgMean = cumulativeMean / cumulativeProb
    const fgMean = (mean - cumulativeMean) / (1 - cumulativeProb)
    const variance = cumulativeProb * (1 - cumulativeProb) * (bgMean - fgMean) ** 2

    if (variance > maxVariance) {
      maxVariance = variance
      bestThreshold = t
    }
  }

  return bestThreshold
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('Failed to convert canvas to Blob'))
      }
    }, 'image/png')
  })
}
