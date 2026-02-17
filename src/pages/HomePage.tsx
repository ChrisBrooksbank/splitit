import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ImageCapture from '../components/camera/ImageCapture'
import ImagePreview from '../components/camera/ImagePreview'
import { useSessionRecovery } from '../hooks/useSessionRecovery'

export default function HomePage() {
  const navigate = useNavigate()
  const [triggerCapture, setTriggerCapture] = useState(false)
  const [capturedFile, setCapturedFile] = useState<{ file: File; previewUrl: string } | null>(null)
  const { hasIncompleteSession, recoveryRoute, lineItemCount, peopleCount, discardSession } =
    useSessionRecovery()

  function handleScanClick() {
    setTriggerCapture(true)
    // Reset trigger after a tick so it can fire again on retake
    setTimeout(() => setTriggerCapture(false), 100)
  }

  function handleCapture(file: File, previewUrl: string) {
    setCapturedFile({ file, previewUrl })
  }

  function handleRetake() {
    if (capturedFile) {
      URL.revokeObjectURL(capturedFile.previewUrl)
    }
    setCapturedFile(null)
    // Trigger capture immediately for retake
    handleScanClick()
  }

  function handleUsePhoto() {
    if (!capturedFile) return
    sessionStorage.setItem('capturedImageUrl', capturedFile.previewUrl)
    navigate('/processing')
  }

  function handleManualEntry() {
    navigate('/editor')
  }

  // Show image preview if a photo has been captured
  if (capturedFile) {
    return (
      <ImagePreview
        previewUrl={capturedFile.previewUrl}
        onRetake={handleRetake}
        onUse={handleUsePhoto}
      />
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        {/* Logo / App name */}
        <div className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-gray-900">SplitIt</h1>
          <p className="mt-2 text-base text-gray-500">Split the bill, not the friendship</p>
        </div>

        {/* Session recovery banner */}
        {hasIncompleteSession && recoveryRoute && (
          <div
            role="region"
            aria-label="Previous session"
            className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-4"
          >
            <p className="text-sm font-medium text-amber-900">Continue previous bill?</p>
            <p className="mt-1 text-xs text-amber-700">
              {lineItemCount} item{lineItemCount !== 1 ? 's' : ''}
              {peopleCount > 0 ? `, ${peopleCount} ${peopleCount !== 1 ? 'people' : 'person'}` : ''}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => navigate(recoveryRoute)}
                className="flex-1 rounded-xl bg-amber-900 py-2.5 text-sm font-medium text-white active:scale-95 transition-transform"
                aria-label="Continue previous bill"
              >
                Continue
              </button>
              <button
                onClick={discardSession}
                className="flex-1 rounded-xl border border-amber-200 bg-white py-2.5 text-sm font-medium text-amber-900 active:scale-95 transition-transform"
                aria-label="Discard previous bill and start fresh"
              >
                Start Fresh
              </button>
            </div>
          </div>
        )}

        {/* Primary CTA */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={handleScanClick}
            className="w-full py-4 px-6 bg-gray-900 text-white text-base font-medium rounded-2xl active:scale-95 transition-transform"
          >
            Scan a Bill
          </button>

          {/* ImageCapture handles the hidden file input */}
          <ImageCapture onCapture={handleCapture} triggerCapture={triggerCapture} />

          {/* Secondary action */}
          <button
            onClick={handleManualEntry}
            className="w-full py-4 px-6 bg-white text-gray-900 text-base font-medium rounded-2xl border border-gray-200 active:scale-95 transition-transform"
          >
            Enter Manually
          </button>
        </div>

        {/* History link */}
        <button
          onClick={() => navigate('/history')}
          className="text-sm text-gray-400 underline-offset-2 hover:text-gray-600 transition-colors"
        >
          View History
        </button>
      </div>
    </div>
  )
}
