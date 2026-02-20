import { useParams } from 'react-router-dom'
import { Wifi, RefreshCw } from 'lucide-react'
import { useLiveSessionGuest } from '../hooks/useLiveSessionGuest'
import GuestClaimingView from '../components/liveSession/GuestClaimingView'
import GuestTipView from '../components/liveSession/GuestTipView'
import GuestSummaryView from '../components/liveSession/GuestSummaryView'

export default function JoinPage() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const {
    connectionStatus,
    statusMessage,
    syncedState,
    myPersonId,
    phase,
    identify,
    sendClaim,
    sendUnclaim,
    sendSetAssignees,
    sendTip,
  } = useLiveSessionGuest(roomCode ?? '')

  // Missing or empty room code
  if (!roomCode) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
          <Wifi className="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Invalid Link
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          No room code found. Please scan the QR code again.
        </p>
      </div>
    )
  }

  // Connecting
  if (connectionStatus === 'connecting') {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center px-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700 border-t-gray-800 dark:border-t-gray-200" />
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {statusMessage ?? 'Joining session...'}
        </p>
      </div>
    )
  }

  // Error
  if (connectionStatus === 'error') {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
          <Wifi className="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Could not connect
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          The session may have ended or the host is unavailable.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-medium"
        >
          <RefreshCw size={16} className="inline -mt-0.5 mr-1" />
          Try Again
        </button>
      </div>
    )
  }

  // Disconnected
  if (connectionStatus === 'disconnected' && syncedState) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mb-4">
          <Wifi className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Disconnected
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Connection to the host was lost.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => window.location.reload()}
            className="w-full px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-medium"
          >
            <RefreshCw size={16} className="inline -mt-0.5 mr-1" />
            Try Reconnecting
          </button>
          {myPersonId && (
            <div className="mt-4">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Last known state:</p>
              <GuestSummaryView syncedState={syncedState} myPersonId={myPersonId} />
            </div>
          )}
        </div>
      </div>
    )
  }

  // Identity selection — waiting for sync or no personId yet
  if (!myPersonId || !syncedState) {
    if (!syncedState) {
      return (
        <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center px-6">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700 border-t-gray-800 dark:border-t-gray-200" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Waiting for host data...</p>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col px-4 pt-8 pb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100 mb-2">
          Who are you?
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Tap your name to join the session.
        </p>
        <div className="flex flex-col gap-3">
          {syncedState.people.map((person) => {
            const isClaimed = syncedState.claimedPersonIds.includes(person.id)
            return (
              <button
                key={person.id}
                onClick={() => identify(person.id, person.name)}
                disabled={isClaimed}
                className={`w-full py-5 px-6 rounded-2xl text-xl font-bold tracking-tight transition-transform ${
                  isClaimed
                    ? 'opacity-40 cursor-not-allowed'
                    : 'text-white active:scale-95 shadow-sm'
                }`}
                style={{ backgroundColor: person.color }}
                aria-label={isClaimed ? `${person.name} (already joined)` : `I am ${person.name}`}
              >
                {person.name}
                {isClaimed && (
                  <span className="block text-sm font-normal mt-0.5 opacity-80">
                    Already joined
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Phase-based views
  if (phase === 'claiming' || phase === 'lobby') {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 px-4 pt-4 pb-8">
        {phase === 'lobby' ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700 border-t-gray-800 dark:border-t-gray-200" />
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Waiting for host to start...
            </p>
          </div>
        ) : (
          <GuestClaimingView
            syncedState={syncedState}
            myPersonId={myPersonId}
            onClaim={sendClaim}
            onUnclaim={sendUnclaim}
            onSetAssignees={sendSetAssignees}
          />
        )}
      </div>
    )
  }

  if (phase === 'tips') {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 px-4 pt-4 pb-8">
        <GuestTipView syncedState={syncedState} myPersonId={myPersonId} onSetTip={sendTip} />
      </div>
    )
  }

  if (phase === 'summary') {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 px-4 pt-4 pb-8">
        <GuestSummaryView syncedState={syncedState} myPersonId={myPersonId} />
      </div>
    )
  }

  return null
}
