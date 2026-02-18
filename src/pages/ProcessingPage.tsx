import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { preprocessImage } from '../services/ocr/imagePreprocessor'
import { recognize } from '../services/ocr/tesseractService'

export default function ProcessingPage() {
  const navigate = useNavigate()
  const hasStarted = useRef(false)
  const [progress, setProgress] = useState(0)
  const [label, setLabel] = useState('Starting…')
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null)

  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    // Read multi-photo or single-photo URLs from sessionStorage
    const multiJson = sessionStorage.getItem('capturedImageUrls')
    const singleUrl = sessionStorage.getItem('capturedImageUrl')

    const urls: string[] = multiJson ? JSON.parse(multiJson) : singleUrl ? [singleUrl] : []
    const isMulti = multiJson !== null

    if (urls.length === 0) {
      navigate('/editor', { replace: true })
      return
    }

    // Show first image as background
    setBackgroundUrl(urls[0])

    async function processPhotos() {
      const totalPhotos = urls.length
      const texts: string[] = []

      for (let i = 0; i < totalPhotos; i++) {
        const photoLabel =
          totalPhotos > 1 ? `Scanning photo ${i + 1} of ${totalPhotos}…` : undefined

        // Fetch blob from URL
        if (photoLabel) setLabel(photoLabel)
        else setLabel('Preparing image…')

        try {
          const response = await fetch(urls[i])
          const blob = await response.blob()
          const file = new File([blob], `receipt-${i}.jpg`, { type: blob.type || 'image/jpeg' })

          // Preprocess
          if (!photoLabel) setLabel('Preparing image…')
          setProgress((i + 0.1) / totalPhotos)
          const processed = await preprocessImage(file)

          // OCR
          if (!photoLabel) setLabel('Loading OCR…')
          const text = await recognize(processed, (tesseractProgress, status) => {
            const photoProgress = 0.1 + tesseractProgress * 0.85
            setProgress((i + photoProgress) / totalPhotos)
            if (!photoLabel) {
              const lower = status.toLowerCase()
              if (lower.includes('loading') || lower.includes('initializing')) {
                setLabel('Loading OCR…')
              } else if (lower.includes('recognizing')) {
                setLabel('Processing…')
              } else if (lower.includes('extracting')) {
                setLabel('Extracting text…')
              }
            }
          })

          texts.push(text)
        } catch {
          // Skip failed photo, continue with rest
          texts.push('')
        }
      }

      // Store results
      if (isMulti) {
        sessionStorage.setItem('ocrResults', JSON.stringify(texts))
        sessionStorage.removeItem('capturedImageUrls')
      } else {
        const text = texts[0] || ''
        if (text) {
          sessionStorage.setItem('ocrResult', text)
        } else {
          sessionStorage.removeItem('ocrResult')
        }
        sessionStorage.removeItem('capturedImageUrl')
      }

      setProgress(1)
      setLabel('Done')
      navigate('/editor', { replace: true })
    }

    processPhotos()
  }, [navigate])

  const progressPercent = Math.round(progress * 100)

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-end bg-black">
      {/* Dimmed receipt image background */}
      {backgroundUrl && (
        <img
          src={backgroundUrl}
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
