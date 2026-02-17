import { useRef, useEffect, useState } from 'react'

interface ImageCaptureProps {
  onCapture: (file: File, previewUrl: string) => void
  triggerCapture?: boolean
}

/**
 * Primary: hidden file input with capture="environment" (works on iOS PWA, Android, desktop).
 * Enhancement: if getUserMedia is available, we still use the file input as primary to
 * ensure maximum compatibility. getUserMedia is available as a future enhancement hook.
 */
export default function ImageCapture({ onCapture, triggerCapture }: ImageCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [hasMediaDevices] = useState(
    () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
  )

  // Trigger the file input when parent signals
  useEffect(() => {
    if (triggerCapture) {
      fileInputRef.current?.click()
    }
  }, [triggerCapture])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const previewUrl = URL.createObjectURL(file)
    onCapture(file, previewUrl)
    // Reset input so the same file can be selected again (retake)
    e.target.value = ''
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleFileChange}
        aria-label="Capture or upload receipt photo"
        data-has-media-devices={hasMediaDevices}
      />
    </>
  )
}
