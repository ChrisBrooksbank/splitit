import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Wifi, ArrowRight } from 'lucide-react'
import { useLiveSessionHost } from '../hooks/useLiveSessionHost'
import StepIndicator from '../components/layout/StepIndicator'

export default function LiveSessionPage() {
  const navigate = useNavigate()
  const { roomCode, guests, isStarting, error, statusMessage, advancePhase } = useLiveSessionHost()

  const identifiedGuests = guests.filter((g) => g.personId !== null && g.connected)
  const canStart = identifiedGuests.length >= 1

  const joinUrl = roomCode ? `${window.location.origin}/join/${roomCode}` : ''

  function handleStart() {
    advancePhase('claiming')
    navigate('/assign')
  }

  // Loading state
  if (isStarting) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center px-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700 border-t-gray-800 dark:border-t-gray-200" />
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {statusMessage ?? 'Starting live session...'}
        </p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
          <Wifi className="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Connection Failed
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{error}</p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => window.location.reload()}
            className="w-full px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-medium"
          >
            Try Again
          </button>
          <button
            onClick={() => navigate('/assign')}
            className="w-full px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium"
          >
            Use Pass-Around Instead
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
      <StepIndicator currentRoute="/assign" />

      <div className="flex-1 flex flex-col items-center px-4 pt-6 pb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100 mb-2">
          Scan to Join
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
          Everyone scans this QR code with their phone's camera
        </p>

        {/* QR Code */}
        {roomCode && (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
            <QRCodeSVG value={joinUrl} size={220} />
          </div>
        )}

        {/* Manual URL */}
        {roomCode && (
          <div className="w-full max-w-sm mb-6">
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center mb-1">
              Or share this link:
            </p>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 text-xs text-gray-600 dark:text-gray-300 break-all text-center select-all">
              {joinUrl}
            </div>
          </div>
        )}

        {/* Connected guests */}
        <div className="w-full max-w-sm mb-6">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Guests ({guests.length})
          </h2>
          <div className="space-y-2">
            {guests.map((guest) => (
              <div
                key={guest.peerId}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${
                  guest.connected
                    ? 'bg-green-50 dark:bg-green-900/20'
                    : 'bg-red-50 dark:bg-red-900/20'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    guest.connected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span
                  className={`text-sm font-medium ${
                    guest.connected
                      ? 'text-green-700 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {guest.displayName ?? 'Connecting...'}
                </span>
              </div>
            ))}
            {guests.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-4">
                Waiting for guests to scan...
              </p>
            )}
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          disabled={!canStart}
          className={`w-full max-w-sm py-4 px-6 rounded-2xl text-base font-medium transition-colors ${
            canStart
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 active:scale-95 transition-transform'
              : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
        >
          Everyone's Here <ArrowRight size={18} className="inline -mt-0.5 ml-1" />
        </button>
      </div>
    </div>
  )
}
