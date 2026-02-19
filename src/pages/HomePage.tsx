import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Camera,
  PenLine,
  Clock,
  Play,
  RefreshCw,
  ImagePlus,
  ScanLine,
  X,
} from 'lucide-react'
import ImageCapture from '../components/camera/ImageCapture'
import ImagePreview from '../components/camera/ImagePreview'
import { useSessionRecovery } from '../hooks/useSessionRecovery'
import { useApiKeyStore } from '../store/apiKeyStore'

interface CapturedPhoto {
  file: File
  previewUrl: string
}

export default function HomePage() {
  const navigate = useNavigate()
  const [triggerCapture, setTriggerCapture] = useState(false)
  const [capturedFiles, setCapturedFiles] = useState<CapturedPhoto[]>([])
  const [pendingPreview, setPendingPreview] = useState<CapturedPhoto | null>(null)
  const { hasIncompleteSession, recoveryRoute, lineItemCount, peopleCount, discardSession } =
    useSessionRecovery()
  const hasApiKey = Boolean(useApiKeyStore((s) => s.apiKey))

  // Revoke blob URLs on unmount
  useEffect(() => {
    return () => {
      capturedFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl))
      if (pendingPreview) URL.revokeObjectURL(pendingPreview.previewUrl)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleScanClick() {
    setTriggerCapture(true)
    setTimeout(() => setTriggerCapture(false), 100)
  }

  function handleCapture(file: File, previewUrl: string) {
    setPendingPreview({ file, previewUrl })
  }

  function handleRetake() {
    if (pendingPreview) {
      URL.revokeObjectURL(pendingPreview.previewUrl)
    }
    setPendingPreview(null)
    handleScanClick()
  }

  function handleUsePhoto() {
    if (!pendingPreview) return
    setCapturedFiles((prev) => [...prev, pendingPreview])
    setPendingPreview(null)
  }

  function handleRemovePhoto(index: number) {
    setCapturedFiles((prev) => {
      const removed = prev[index]
      URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  function handleProcess() {
    if (capturedFiles.length === 0) return

    if (capturedFiles.length === 1) {
      // Single photo: backward-compatible path
      sessionStorage.setItem('capturedImageUrl', capturedFiles[0].previewUrl)
    } else {
      // Multi-photo path
      const urls = capturedFiles.map((f) => f.previewUrl)
      sessionStorage.setItem('capturedImageUrls', JSON.stringify(urls))
    }
    navigate('/processing')
  }

  function handleManualEntry() {
    navigate('/editor')
  }

  // Show image preview if a photo is pending review
  if (pendingPreview) {
    return (
      <ImagePreview
        previewUrl={pendingPreview.previewUrl}
        onRetake={handleRetake}
        onUse={handleUsePhoto}
      />
    )
  }

  // Show photo collection strip when photos have been captured
  if (capturedFiles.length > 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm flex flex-col items-center gap-6">
          <div className="text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
              SplitIt
            </h1>
            <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
              {capturedFiles.length} photo{capturedFiles.length !== 1 ? 's' : ''} captured
            </p>
          </div>

          {/* Photo thumbnails strip */}
          <div className="w-full flex gap-2 overflow-x-auto py-2">
            {capturedFiles.map((photo, index) => (
              <div key={photo.previewUrl} className="relative flex-shrink-0">
                <img
                  src={photo.previewUrl}
                  alt={`Photo ${index + 1}`}
                  className="w-16 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                />
                <button
                  onClick={() => handleRemovePhoto(index)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full text-xs flex items-center justify-center active:scale-90 transition-transform"
                  aria-label={`Remove photo ${index + 1}`}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="w-full flex flex-col gap-3">
            <button
              onClick={handleProcess}
              className="w-full py-4 px-6 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-base font-medium rounded-2xl active:scale-95 transition-transform"
            >
              <ScanLine size={18} className="inline -mt-0.5 mr-1.5" />
              Process {capturedFiles.length} Photo{capturedFiles.length !== 1 ? 's' : ''}
            </button>

            <ImageCapture onCapture={handleCapture} triggerCapture={triggerCapture} />

            <button
              onClick={handleScanClick}
              className="w-full py-4 px-6 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-base font-medium rounded-2xl border border-gray-200 dark:border-gray-600 active:scale-95 transition-transform"
            >
              <ImagePlus size={18} className="inline -mt-0.5 mr-1.5" />
              Add Another Photo
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        {/* Logo / App name */}
        <div className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            SplitIt
          </h1>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
            Split the bill, not the friendship
          </p>
        </div>

        {/* Session recovery banner */}
        {hasIncompleteSession && recoveryRoute && (
          <div
            role="region"
            aria-label="Previous session"
            className="w-full rounded-2xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 p-4"
          >
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              Continue previous bill?
            </p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              {lineItemCount} item{lineItemCount !== 1 ? 's' : ''}
              {peopleCount > 0 ? `, ${peopleCount} ${peopleCount !== 1 ? 'people' : 'person'}` : ''}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => navigate(recoveryRoute)}
                className="flex-1 rounded-xl bg-amber-900 dark:bg-amber-700 py-2.5 text-sm font-medium text-white active:scale-95 transition-transform"
                aria-label="Continue previous bill"
              >
                <Play size={14} className="inline -mt-0.5 mr-1" />
                Continue
              </button>
              <button
                onClick={discardSession}
                className="flex-1 rounded-xl border border-amber-200 dark:border-amber-700 bg-white dark:bg-gray-800 py-2.5 text-sm font-medium text-amber-900 dark:text-amber-100 active:scale-95 transition-transform"
                aria-label="Discard previous bill and start fresh"
              >
                <RefreshCw size={14} className="inline -mt-0.5 mr-1" />
                Start Fresh
              </button>
            </div>
          </div>
        )}

        {/* Primary CTA */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={() => navigate('/ai-assist')}
            className="w-full py-4 px-6 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-base font-medium rounded-2xl active:scale-95 transition-transform"
          >
            <Sparkles size={18} className="inline -mt-0.5 mr-1.5" />
            Use AI Assistant
            <span className="block text-xs text-gray-400 dark:text-gray-500 mt-1 text-center font-normal">
              {hasApiKey
                ? 'Most accurate · uses your API key'
                : 'Most accurate · needs ChatGPT app'}
            </span>
          </button>

          <button
            onClick={handleScanClick}
            className="w-full py-4 px-6 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-base font-medium rounded-2xl border border-gray-200 dark:border-gray-600 active:scale-95 transition-transform"
          >
            <Camera size={18} className="inline -mt-0.5 mr-1.5" />
            Scan a Bill
            <span className="block text-xs text-gray-400 dark:text-gray-500 mt-1 text-center font-normal">
              Quick · works offline · less accurate
            </span>
          </button>

          {/* ImageCapture handles the hidden file input */}
          <ImageCapture onCapture={handleCapture} triggerCapture={triggerCapture} />

          <button
            onClick={handleManualEntry}
            className="w-full py-4 px-6 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-base font-medium rounded-2xl border border-gray-200 dark:border-gray-600 active:scale-95 transition-transform"
          >
            <PenLine size={18} className="inline -mt-0.5 mr-1.5" />
            Enter Manually
            <span className="block text-xs text-gray-400 dark:text-gray-500 mt-1 text-center font-normal">
              Always works · type items yourself
            </span>
          </button>
        </div>

        {/* History link */}
        <button
          onClick={() => navigate('/history')}
          className="text-sm text-gray-400 dark:text-gray-500 underline-offset-2 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <Clock size={14} className="inline -mt-0.5 mr-1" />
          View History
        </button>

        <span className="text-xs text-gray-300 dark:text-gray-600">v{__APP_VERSION__}</span>
      </div>
    </div>
  )
}
