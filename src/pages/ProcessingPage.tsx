import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOcr, type OcrStage } from '../hooks/useOcr'

const STAGE_LABELS: Record<OcrStage, string> = {
  idle: 'Starting…',
  preprocessing: 'Preparing image…',
  loading: 'Loading OCR…',
  processing: 'Processing…',
  extracting: 'Extracting text…',
  done: 'Done',
}

export default function ProcessingPage() {
  const navigate = useNavigate()
  const { stage, progress, result, error, runOcr } = useOcr()
  const hasStarted = useRef(false)

  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    const imageUrl = sessionStorage.getItem('capturedImageUrl')

    if (!imageUrl) {
      // No image captured — go to editor for manual entry
      navigate('/editor', { replace: true })
      return
    }

    async function run() {
      if (!imageUrl) return
      try {
        const response = await fetch(imageUrl)
        const blob = await response.blob()
        const file = new File([blob], 'receipt.jpg', { type: blob.type || 'image/jpeg' })
        const text = await runOcr(file)

        // Store OCR result for the editor page
        if (text) {
          sessionStorage.setItem('ocrResult', text)
        } else {
          sessionStorage.removeItem('ocrResult')
        }
      } catch {
        sessionStorage.removeItem('ocrResult')
      }
    }

    run()
  }, [navigate, runOcr])

  // Navigate when OCR completes (success or error)
  useEffect(() => {
    if (stage === 'done') {
      navigate('/editor', { replace: true })
    }
  }, [stage, navigate])

  useEffect(() => {
    if (error) {
      sessionStorage.removeItem('ocrResult')
      navigate('/editor', { replace: true })
    }
  }, [error, navigate])

  // Unused — kept for future use
  void result

  const imageUrl = sessionStorage.getItem('capturedImageUrl')
  const progressPercent = Math.round(progress * 100)
  const label = STAGE_LABELS[stage]

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-end bg-black">
      {/* Dimmed receipt image background */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt="Receipt being processed"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
          aria-hidden="true"
        />
      )}

      {/* Processing UI — anchored to bottom */}
      <div className="relative z-10 w-full max-w-sm px-6 pb-16 flex flex-col items-center gap-6">
        {/* Stage label */}
        <p className="text-white text-base font-medium tracking-wide" aria-live="polite">
          {label}
        </p>

        {/* Progress bar */}
        <div
          className="w-full"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="OCR progress"
        >
          <div className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-2 text-center text-white/60 text-xs">{progressPercent}%</p>
        </div>
      </div>
    </div>
  )
}
