import { useState, useCallback } from 'react'
import { preprocessImage } from '../services/ocr/imagePreprocessor'
import { recognize } from '../services/ocr/tesseractService'

export type OcrStage = 'idle' | 'preprocessing' | 'loading' | 'processing' | 'extracting' | 'done'

export interface OcrState {
  stage: OcrStage
  progress: number // 0-1
  result: string | null
  error: string | null
}

export interface UseOcrReturn extends OcrState {
  runOcr: (file: File) => Promise<string | null>
  reset: () => void
}

const INITIAL_STATE: OcrState = {
  stage: 'idle',
  progress: 0,
  result: null,
  error: null,
}

/**
 * React hook that manages OCR state and orchestrates the full pipeline:
 * imagePreprocessor → tesseractService
 *
 * Stage labels shown on the ProcessingPage progress bar:
 *  - preprocessing: resizing and binarizing the image via Canvas API
 *  - loading:       loading Tesseract WASM + language data
 *  - processing:    Tesseract recognizing the image
 *  - extracting:    finalizing extracted text
 *  - done:          text is available in `result`
 */
export function useOcr(): UseOcrReturn {
  const [state, setState] = useState<OcrState>(INITIAL_STATE)

  const runOcr = useCallback(async (file: File): Promise<string | null> => {
    setState({ stage: 'preprocessing', progress: 0.05, result: null, error: null })

    try {
      // Step 1: Preprocess image (resize, grayscale, binarize)
      const processedBlob = await preprocessImage(file)

      setState((s) => ({ ...s, stage: 'loading', progress: 0.1 }))

      // Step 2: Run OCR with progress updates from Tesseract
      const text = await recognize(processedBlob, (tesseractProgress, status) => {
        // Map Tesseract progress messages to our stage labels
        const stage = mapTesseractStatus(status)
        // Reserve 0.1–1.0 range for Tesseract (preprocessing used 0–0.1)
        const progress = 0.1 + tesseractProgress * 0.85

        setState((s) => ({
          ...s,
          stage,
          progress,
        }))
      })

      setState({ stage: 'done', progress: 1, result: text, error: null })
      return text
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OCR failed'
      setState({ stage: 'idle', progress: 0, result: null, error: message })
      return null
    }
  }, [])

  const reset = useCallback(() => {
    setState(INITIAL_STATE)
  }, [])

  return {
    ...state,
    runOcr,
    reset,
  }
}

/**
 * Map a Tesseract status string to one of our stage labels.
 * Tesseract v6 status messages include:
 *   "loading tesseract core", "initializing tesseract", "loading language traineddata",
 *   "initializing api", "recognizing text"
 */
function mapTesseractStatus(status: string): OcrStage {
  const lower = status.toLowerCase()
  if (lower.includes('loading') || lower.includes('initializing')) {
    return 'loading'
  }
  if (lower.includes('recognizing')) {
    return 'processing'
  }
  if (lower.includes('extracting') || lower.includes('extract')) {
    return 'extracting'
  }
  return 'processing'
}
