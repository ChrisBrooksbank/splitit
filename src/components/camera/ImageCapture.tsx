import { useRef, useEffect } from 'react'

interface ImageCaptureProps {
  onCapture: (file: File, previewUrl: string) => void
  triggerCapture?: boolean
}

/**
 * Primary: hidden file input with capture="environment" (works on iOS PWA, Android, desktop).
 * Enhancement: if getUserMedia is available, the parent can render CameraPreview directly.
 */
export default function ImageCapture({ onCapture, triggerCapture }: ImageCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      />
    </>
  )
}
