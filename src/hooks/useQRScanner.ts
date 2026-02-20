import { useState, useRef, useCallback, useEffect } from 'react'

interface UseQRScannerResult {
  isScanning: boolean
  error: string | null
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  startScanning: () => Promise<void>
  stopScanning: () => void
}

export function useQRScanner(onDetected: (data: string) => void): UseQRScannerResult {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const detectedRef = useRef(false)
  const onDetectedRef = useRef(onDetected)
  onDetectedRef.current = onDetected

  const stopScanning = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setIsScanning(false)
  }, [])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  const startScanning = useCallback(async () => {
    setError(null)
    detectedRef.current = false

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream

      const video = videoRef.current
      if (!video) {
        stopScanning()
        return
      }

      video.srcObject = stream
      await video.play()
      setIsScanning(true)

      const canvas = canvasRef.current
      if (!canvas) {
        stopScanning()
        return
      }
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) {
        stopScanning()
        return
      }

      // Determine decoder: native BarcodeDetector or jsqr fallback
      let nativeDetector: BarcodeDetector | null = null
      let jsQR:
        | ((data: Uint8ClampedArray, width: number, height: number) => { data: string } | null)
        | null = null

      if (window.BarcodeDetector) {
        try {
          nativeDetector = new BarcodeDetector({ formats: ['qr_code'] })
        } catch {
          // Fall through to jsqr
        }
      }

      if (!nativeDetector) {
        const mod = await import('jsqr')
        jsQR = mod.default
      }

      const scanFrame = () => {
        if (detectedRef.current || !streamRef.current) return

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

          if (nativeDetector) {
            nativeDetector
              .detect(canvas)
              .then((barcodes) => {
                if (barcodes.length > 0 && !detectedRef.current) {
                  detectedRef.current = true
                  stopScanning()
                  onDetectedRef.current(barcodes[0].rawValue)
                }
              })
              .catch(() => {
                // Ignore detection errors, keep scanning
              })
          } else if (jsQR) {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const result = jsQR(imageData.data, canvas.width, canvas.height)
            if (result && !detectedRef.current) {
              detectedRef.current = true
              stopScanning()
              onDetectedRef.current(result.data)
              return
            }
          }
        }

        rafRef.current = requestAnimationFrame(scanFrame)
      }

      rafRef.current = requestAnimationFrame(scanFrame)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.name === 'NotAllowedError'
            ? 'Camera access denied. Please allow camera permissions.'
            : err.message
          : 'Failed to access camera'
      setError(message)
      stopScanning()
    }
  }, [stopScanning])

  return { isScanning, error, videoRef, canvasRef, startScanning, stopScanning }
}
