import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, AlertTriangle } from 'lucide-react'
import { useQRScanner } from '../hooks/useQRScanner'
import { decodeFromQR, payloadToStoreData } from '../services/qr/qrCodec'
import { useBillStore } from '../store/billStore'
import { usePeopleStore } from '../store/peopleStore'
import { useAssignmentStore } from '../store/assignmentStore'
import { useTipStore } from '../store/tipStore'

type ImportState =
  | { phase: 'idle' }
  | { phase: 'scanning' }
  | {
      phase: 'confirm'
      itemCount: number
      peopleCount: number
      data: ReturnType<typeof payloadToStoreData>
    }
  | { phase: 'error'; message: string }

export default function ImportQRPage() {
  const navigate = useNavigate()
  const [state, setState] = useState<ImportState>({ phase: 'idle' })

  const handleDetected = useCallback(async (rawData: string) => {
    try {
      const payload = await decodeFromQR(rawData)
      const data = payloadToStoreData(payload)
      setState({
        phase: 'confirm',
        itemCount: data.lineItems.length,
        peopleCount: data.people.length,
        data,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to read QR code'
      setState({ phase: 'error', message })
    }
  }, [])

  const {
    isScanning,
    error: scanError,
    videoRef,
    canvasRef,
    startScanning,
    stopScanning,
  } = useQRScanner(handleDetected)

  // Start scanning automatically when entering scanning phase
  useEffect(() => {
    if (state.phase === 'scanning' && !isScanning) {
      startScanning()
    }
  }, [state.phase, isScanning, startScanning])

  function handleConfirmImport() {
    if (state.phase !== 'confirm') return
    const { data } = state

    // Reset all stores
    useBillStore.getState().reset()
    usePeopleStore.getState().reset()
    useAssignmentStore.getState().reset()
    useTipStore.getState().reset()

    // Populate with imported data
    useBillStore.getState().setLineItems(data.lineItems)
    usePeopleStore.getState().setPeople(data.people)
    useAssignmentStore.getState().setAllAssignments(data.assignments, data.portions)
    useTipStore.getState().setAllPersonTips(data.personTips)

    navigate('/editor')
  }

  function handleCancel() {
    stopScanning()
    setState({ phase: 'idle' })
  }

  function handleRetry() {
    setState({ phase: 'scanning' })
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-4 flex items-center gap-3">
        <button
          onClick={() => {
            stopScanning()
            navigate(-1)
          }}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 active:scale-95 transition-transform"
          aria-label="Go back"
        >
          <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
        </button>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
          Import from QR
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        {/* Idle */}
        {state.phase === 'idle' && (
          <div className="flex flex-col items-center gap-6 text-center">
            <Camera size={48} className="text-gray-400 dark:text-gray-500" />
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xs">
              Scan a SplitIt QR code from another phone to import the bill.
            </p>
            <button
              onClick={() => setState({ phase: 'scanning' })}
              className="px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-base font-medium rounded-2xl active:scale-95 transition-transform"
            >
              <Camera size={18} className="inline -mt-0.5 mr-1.5" />
              Open Camera
            </button>
          </div>
        )}

        {/* Scanning */}
        {state.phase === 'scanning' && (
          <div className="flex flex-col items-center gap-4 w-full max-w-sm">
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black">
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                muted
              />
              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-white/50 rounded-2xl" />
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {scanError && (
              <p className="text-sm text-red-600 dark:text-red-400 text-center">{scanError}</p>
            )}

            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Point your camera at a SplitIt QR code
            </p>

            <button
              onClick={handleCancel}
              className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl active:scale-95 transition-transform"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Confirmation */}
        {state.phase === 'confirm' && (
          <div className="flex flex-col items-center gap-6 text-center max-w-sm">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <Camera size={28} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Bill found!</p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {state.itemCount} item{state.itemCount !== 1 ? 's' : ''} and {state.peopleCount}{' '}
                {state.peopleCount !== 1 ? 'people' : 'person'}
              </p>
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                This will replace your current session.
              </p>
            </div>
            <div className="w-full flex flex-col gap-2">
              <button
                onClick={handleConfirmImport}
                className="w-full py-4 px-6 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-base font-medium rounded-2xl active:scale-95 transition-transform"
              >
                Import Bill
              </button>
              <button
                onClick={handleCancel}
                className="w-full py-3 px-6 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-base font-medium rounded-2xl active:scale-95 transition-transform"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {state.phase === 'error' && (
          <div className="flex flex-col items-center gap-6 text-center max-w-sm">
            <AlertTriangle size={48} className="text-amber-500" />
            <div>
              <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                Could not read QR code
              </p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{state.message}</p>
            </div>
            <div className="w-full flex flex-col gap-2">
              <button
                onClick={handleRetry}
                className="w-full py-4 px-6 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-base font-medium rounded-2xl active:scale-95 transition-transform"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate(-1)}
                className="w-full py-3 px-6 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-base font-medium rounded-2xl active:scale-95 transition-transform"
              >
                Go Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
