/**
 * Web Worker for image preprocessing.
 * Receives raw pixel data, applies grayscale → contrast stretch → sharpen → median filter → adaptive threshold,
 * and returns the processed pixel data.
 */

import {
  toGrayscale,
  contrastStretch,
  sharpen,
  medianFilter,
  adaptiveThreshold,
} from './imagePreprocessor'

export interface PreprocessMessage {
  pixels: Uint8ClampedArray
  width: number
  height: number
}

self.onmessage = (e: MessageEvent<PreprocessMessage>) => {
  const { pixels, width, height } = e.data
  const numPixels = width * height

  toGrayscale(pixels)
  contrastStretch(pixels, numPixels)
  sharpen(pixels, width, height)
  medianFilter(pixels, width, height)
  adaptiveThreshold(pixels, width, height)

  // Transfer the buffer back to the main thread
  const msg = { pixels }
  const transfer: Transferable[] = [pixels.buffer as ArrayBuffer]
  ;(self.postMessage as (message: unknown, transfer: Transferable[]) => void)(msg, transfer)
}
