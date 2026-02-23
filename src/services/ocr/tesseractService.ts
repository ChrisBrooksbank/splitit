/**
 * Singleton Tesseract.js v7 worker service.
 * Lazy-initialized on first call to recognize().
 * English-only language data (~4MB).
 */

import { createWorker, PSM } from 'tesseract.js'
import type { Worker } from 'tesseract.js'

export type OcrProgressCallback = (progress: number, status: string) => void

// Singleton state
let workerInstance: Worker | null = null
let initPromise: Promise<Worker> | null = null

/**
 * Initialize the Tesseract worker (lazy — only called once).
 * Subsequent calls return the already-initialized worker.
 */
async function getWorker(onProgress?: OcrProgressCallback): Promise<Worker> {
  if (workerInstance) {
    return workerInstance
  }

  if (initPromise) {
    return initPromise
  }

  initPromise = createWorker('eng', 3, {
    logger: (msg) => {
      if (onProgress && typeof msg.progress === 'number') {
        onProgress(msg.progress, msg.status)
      }
    },
  }).then(async (worker) => {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_COLUMN,
      preserve_interword_spaces: '1',
    })
    workerInstance = worker
    return worker
  })

  return initPromise
}

/**
 * Recognize text in an image (File or Blob).
 * Lazy-initializes the worker on first call.
 *
 * @param image - The image to process (File, Blob, or URL)
 * @param onProgress - Optional callback receiving (progress 0–1, statusLabel)
 * @returns The recognized text string
 */
export async function recognize(
  image: File | Blob | string,
  onProgress?: OcrProgressCallback
): Promise<string> {
  const worker = await getWorker(onProgress)
  const result = await worker.recognize(image)
  return result.data.text
}

/**
 * Pre-initialize the Tesseract worker during idle time.
 * Call from App.tsx via requestIdleCallback after mount.
 */
export function preloadWorker(): void {
  getWorker().catch(() => {
    // Preload failed silently — will retry on first recognize() call
  })
}

/**
 * Terminate the singleton worker and reset state.
 * Useful for cleanup in tests or when the user navigates away.
 */
export async function terminateWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.terminate()
    workerInstance = null
    initPromise = null
  }
}
