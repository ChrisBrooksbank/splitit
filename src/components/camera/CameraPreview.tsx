import { useRef, useState, useEffect, useCallback } from 'react'
import { Camera, Zap, ZapOff, X } from 'lucide-react'

interface CameraPreviewProps {
  onCapture: (file: File, previewUrl: string) => void
  onClose: () => void
}

/**
 * Live camera preview with receipt guide overlay.
 * Uses getUserMedia for rear-facing camera with autofocus.
 * Falls back to parent's file input if unavailable.
 */
export default function CameraPreview({ onCapture, onClose }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const onCloseRef = useRef(onClose)
  const [torchAvailable, setTorchAvailable] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [ready, setReady] = useState(false)

  // Keep onClose ref in sync without accessing during render
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        })

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setReady(true)
        }

        // Check torch capability
        const track = stream.getVideoTracks()[0]
        if (track) {
          const caps = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean }
          if (caps?.torch) {
            setTorchAvailable(true)
          }
        }
      } catch {
        // Camera unavailable — close and let parent fall back to file input
        if (!cancelled) onCloseRef.current()
      }
    }

    startCamera()
    return () => {
      cancelled = true
      stopStream()
    }
  }, [stopStream])

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return

    const newState = !torchOn
    try {
      await track.applyConstraints({
        advanced: [{ torch: newState } as MediaTrackConstraintSet],
      })
      setTorchOn(newState)
    } catch {
      // Torch toggle failed silently
    }
  }

  function captureFrame() {
    const video = videoRef.current
    if (!video) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], 'receipt-capture.jpg', { type: 'image/jpeg' })
        const previewUrl = URL.createObjectURL(blob)
        stopStream()
        onCapture(file, previewUrl)
      },
      'image/jpeg',
      0.92
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Video feed */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />

        {/* Receipt guide overlay */}
        {ready && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
            {/* Semi-transparent overlay outside guide area */}
            <defs>
              <mask id="receipt-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect x="10%" y="15%" width="80%" height="70%" rx="12" fill="black" />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(0,0,0,0.4)" mask="url(#receipt-mask)" />
            {/* Corner markers */}
            <rect
              x="10%"
              y="15%"
              width="80%"
              height="70%"
              rx="12"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeDasharray="24 9999"
              opacity="0.8"
            />
            {/* Guide text */}
            <text
              x="50%"
              y="12%"
              textAnchor="middle"
              fill="white"
              fontSize="14"
              opacity="0.9"
              fontFamily="system-ui, sans-serif"
            >
              Position receipt within the frame
            </text>
          </svg>
        )}
      </div>

      {/* Controls bar */}
      <div className="bg-black/90 px-6 py-6 flex items-center justify-between safe-area-pb">
        {/* Close button */}
        <button
          onClick={() => {
            stopStream()
            onClose()
          }}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 active:bg-white/20 transition-colors"
          aria-label="Close camera"
        >
          <X size={24} className="text-white" />
        </button>

        {/* Capture button */}
        <button
          onClick={captureFrame}
          disabled={!ready}
          className="w-18 h-18 flex items-center justify-center rounded-full bg-white active:scale-90 transition-transform disabled:opacity-40"
          aria-label="Take photo"
        >
          <Camera size={28} className="text-gray-900" />
        </button>

        {/* Torch toggle */}
        {torchAvailable ? (
          <button
            onClick={toggleTorch}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 active:bg-white/20 transition-colors"
            aria-label={torchOn ? 'Turn off flashlight' : 'Turn on flashlight'}
          >
            {torchOn ? (
              <Zap size={22} className="text-yellow-300" />
            ) : (
              <ZapOff size={22} className="text-white/70" />
            )}
          </button>
        ) : (
          <div className="w-12 h-12" /> // Spacer for layout balance
        )}
      </div>
    </div>
  )
}
