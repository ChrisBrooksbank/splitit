/**
 * Image preprocessing pipeline for OCR.
 * Steps: resize → deskew → grayscale → contrast stretch → sharpen → median filter → adaptive threshold
 * All operations use the Canvas API (no external dependencies).
 * Pixel manipulation is offloaded to a Web Worker when available.
 */

const MAX_DIMENSION = 2000
const MIN_DIMENSION = 1000

/**
 * Run pixel manipulation (grayscale + contrast stretch only).
 * Tesseract.js handles its own binarization internally, so we skip
 * sharpen / median / adaptive threshold which can destroy text.
 */
function processPixelsSimple(pixels: Uint8ClampedArray, width: number, height: number): void {
  const numPixels = width * height
  toGrayscale(pixels)
  contrastStretch(pixels, numPixels)
  // Note: sharpen, medianFilter, and adaptiveThreshold are intentionally
  // omitted — Tesseract handles binarization better on its own, and the
  // aggressive thresholding was destroying text in many real-world photos.
  void width
  void height
}

/**
 * Preprocess an image file for optimal OCR accuracy.
 * Returns a Blob (PNG) of the processed image.
 */
export async function preprocessImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  let canvas = document.createElement('canvas')
  let ctx = canvas.getContext('2d')!

  // Step 1: Resize (enforce min 1000px and max 2000px on longest edge)
  const { width, height } = resize(bitmap.width, bitmap.height, MAX_DIMENSION)
  canvas.width = width
  canvas.height = height
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  // Step 2: Detect and correct skew on a grayscale copy
  const skewData = ctx.getImageData(0, 0, width, height)
  toGrayscale(skewData.data)
  const skewAngle = detectSkewAngle(skewData.data, width, height)
  if (Math.abs(skewAngle) >= 0.001) {
    canvas = rotateCanvas(canvas, -skewAngle)
    ctx = canvas.getContext('2d')!
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

  // Steps 3-4: grayscale + contrast stretch (main thread, fast enough)
  processPixelsSimple(imageData.data, canvas.width, canvas.height)

  ctx.putImageData(imageData, 0, 0)
  return canvasToBlob(canvas)
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function resize(
  srcWidth: number,
  srcHeight: number,
  maxDim: number,
  minDim: number = MIN_DIMENSION
): { width: number; height: number } {
  const longest = Math.max(srcWidth, srcHeight)
  if (longest > maxDim) {
    const scale = maxDim / longest
    return {
      width: Math.round(srcWidth * scale),
      height: Math.round(srcHeight * scale),
    }
  }
  if (longest < minDim) {
    const scale = minDim / longest
    return {
      width: Math.round(srcWidth * scale),
      height: Math.round(srcHeight * scale),
    }
  }
  return { width: srcWidth, height: srcHeight }
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

/**
 * 3×3 median filter: removes salt-and-pepper noise while preserving text edges.
 * For each pixel, sort 9 neighbours and pick the median value.
 * Operates on R channel (after grayscale). Skips 1px border. Alpha unchanged.
 */
export function medianFilter(pixels: Uint8ClampedArray, width: number, height: number): void {
  const src = new Uint8ClampedArray(pixels)
  const buf = new Uint8Array(9)

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let k = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          buf[k++] = src[((y + dy) * width + (x + dx)) * 4]
        }
      }
      // Partial sort to find median (index 4 of 9)
      buf.sort()
      const median = buf[4]
      const idx = (y * width + x) * 4
      pixels[idx] = median
      pixels[idx + 1] = median
      pixels[idx + 2] = median
    }
  }
}

/**
 * Adaptive mean thresholding using an integral image (summed area table).
 * For each pixel, threshold = local mean over windowSize×windowSize - C.
 * O(1) per-pixel mean lookup via integral image. Handles uneven lighting.
 */
export function adaptiveThreshold(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  windowSize: number = 15,
  C: number = 10
): void {
  const numPixels = width * height

  // Build integral image from R channel (grayscale)
  const integral = new Float64Array((width + 1) * (height + 1))
  const iw = width + 1
  for (let y = 0; y < height; y++) {
    let rowSum = 0
    for (let x = 0; x < width; x++) {
      rowSum += pixels[(y * width + x) * 4]
      integral[(y + 1) * iw + (x + 1)] = rowSum + integral[y * iw + (x + 1)]
    }
  }

  const half = Math.floor(windowSize / 2)

  for (let i = 0; i < numPixels; i++) {
    const x = i % width
    const y = Math.floor(i / width)

    // Window bounds (clamped to image)
    const x1 = Math.max(0, x - half)
    const y1 = Math.max(0, y - half)
    const x2 = Math.min(width - 1, x + half)
    const y2 = Math.min(height - 1, y + half)

    const count = (x2 - x1 + 1) * (y2 - y1 + 1)
    const sum =
      integral[(y2 + 1) * iw + (x2 + 1)] -
      integral[y1 * iw + (x2 + 1)] -
      integral[(y2 + 1) * iw + x1] +
      integral[y1 * iw + x1]

    const localMean = sum / count
    const val = pixels[i * 4] >= localMean - C ? 255 : 0
    pixels[i * 4] = val
    pixels[i * 4 + 1] = val
    pixels[i * 4 + 2] = val
  }
}

/**
 * Sharpen grayscale image using a 3x3 Laplacian kernel: [0,-1,0; -1,5,-1; 0,-1,0].
 * Operates on the R channel (after grayscale). Skips 1px border. Alpha unchanged.
 */
export function sharpen(pixels: Uint8ClampedArray, width: number, height: number): void {
  // Copy pixel data for reading (we write back into `pixels`)
  const src = new Uint8ClampedArray(pixels)

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4
      // 3x3 Laplacian sharpening kernel: center=5, cross=-1
      const val =
        5 * src[idx] -
        src[((y - 1) * width + x) * 4] -
        src[((y + 1) * width + x) * 4] -
        src[(y * width + (x - 1)) * 4] -
        src[(y * width + (x + 1)) * 4]
      const clamped = val < 0 ? 0 : val > 255 ? 255 : val
      pixels[idx] = clamped
      pixels[idx + 1] = clamped
      pixels[idx + 2] = clamped
      // alpha unchanged
    }
  }
}

/**
 * Detect skew angle using projection profile method.
 * Computes horizontal row sums at angles -5° to +5° (0.5° steps)
 * on a downscaled binarized copy, picks the angle that maximizes
 * the variance of row sums (text lines align → sharp peaks).
 * Returns the detected angle in radians.
 */
export function detectSkewAngle(pixels: Uint8ClampedArray, width: number, height: number): number {
  // Downscale for speed: target ~500px on longest edge
  const targetSize = 500
  const scale = targetSize / Math.max(width, height)
  const sw = Math.round(width * scale)
  const sh = Math.round(height * scale)

  // Create downscaled grayscale+binarized copy
  const small = new Uint8Array(sw * sh)
  for (let y = 0; y < sh; y++) {
    const srcY = Math.min(Math.floor(y / scale), height - 1)
    for (let x = 0; x < sw; x++) {
      const srcX = Math.min(Math.floor(x / scale), width - 1)
      // R channel from grayscale pixels; treat < 128 as foreground (1)
      small[y * sw + x] = pixels[(srcY * width + srcX) * 4] < 128 ? 1 : 0
    }
  }

  let bestAngle = 0
  let bestVariance = -1

  for (let deg = -5; deg <= 5; deg += 0.5) {
    const rad = (deg * Math.PI) / 180
    const cosA = Math.cos(rad)
    const sinA = Math.sin(rad)
    const cx = sw / 2
    const cy = sh / 2

    // Compute row sums for this angle
    const rowSums = new Float64Array(sh)
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        if (small[y * sw + x] === 0) continue
        // Rotate point and map to row
        const ry = Math.round(-sinA * (x - cx) + cosA * (y - cy) + cy)
        if (ry >= 0 && ry < sh) {
          rowSums[ry]++
        }
      }
    }

    // Compute variance of row sums
    let sum = 0
    let sumSq = 0
    for (let i = 0; i < sh; i++) {
      sum += rowSums[i]
      sumSq += rowSums[i] * rowSums[i]
    }
    const mean = sum / sh
    const variance = sumSq / sh - mean * mean

    if (variance > bestVariance) {
      bestVariance = variance
      bestAngle = deg
    }
  }

  return (bestAngle * Math.PI) / 180
}

/**
 * Rotate the canvas by the given angle (radians) around its center.
 * Expands canvas slightly to avoid cropping corners.
 */
function rotateCanvas(srcCanvas: HTMLCanvasElement, angle: number): HTMLCanvasElement {
  if (Math.abs(angle) < 0.001) return srcCanvas

  const { width, height } = srcCanvas
  const cos = Math.abs(Math.cos(angle))
  const sin = Math.abs(Math.sin(angle))
  const newW = Math.ceil(width * cos + height * sin)
  const newH = Math.ceil(width * sin + height * cos)

  const dst = document.createElement('canvas')
  dst.width = newW
  dst.height = newH
  const ctx = dst.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, newW, newH)
  ctx.translate(newW / 2, newH / 2)
  ctx.rotate(angle)
  ctx.drawImage(srcCanvas, -width / 2, -height / 2)

  return dst
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
