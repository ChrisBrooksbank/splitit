import { useEffect, useState, useCallback } from 'react'
import { RelayService } from '../services/liveSession/RelayService'
import { createHostOrchestrator } from '../services/liveSession/hostOrchestrator'
import { useLiveSessionStore } from '../store/liveSessionStore'
import type { SessionPhase } from '../services/liveSession/types'

export function useLiveSessionHost() {
  const [roomCode, setRoomCode] = useState<string | null>(
    () => useLiveSessionStore.getState().roomCode
  )
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const guests = useLiveSessionStore((s) => s.guests)
  const phase = useLiveSessionStore((s) => s.phase)

  const advancePhase = useCallback((newPhase: SessionPhase) => {
    useLiveSessionStore.getState().advancePhaseFn?.(newPhase)
  }, [])

  const endSession = useCallback(() => {
    setRoomCode(null)
    useLiveSessionStore.getState().endSession()
  }, [])

  useEffect(() => {
    // If peer already exists in store (remount after navigation), skip initialization
    if (useLiveSessionStore.getState().peerService) return

    let cancelled = false
    const peer = new RelayService()

    peer.on('status-change', (msg) => {
      if (!cancelled) setStatusMessage(msg)
    })

    const startUp = async () => {
      setIsStarting(true)
      setError(null)
      try {
        const code = await peer.startHost()
        if (cancelled) {
          peer.destroy()
          return
        }

        const orchestrator = createHostOrchestrator(peer)
        orchestrator.start()

        // Store peer and cleanup function in zustand
        useLiveSessionStore.getState().setPeerService(peer, () => {
          orchestrator.destroy()
          peer.destroy()
        })

        peer.on('connection-error', async () => {
          if (cancelled) return
          setStatusMessage('Connection lost — reconnecting...')
          useLiveSessionStore.getState().setConnectionStatus('reconnecting')

          try {
            const newCode = await peer.reconnectAsHost()
            if (cancelled || !newCode) return

            // Re-attach orchestrator listeners (old ones were on the old socket)
            orchestrator.destroy()
            orchestrator.start()

            setRoomCode(newCode)
            setError(null)
            setStatusMessage(null)
            useLiveSessionStore.getState().startSession('host', newCode)
            useLiveSessionStore.getState().setConnectionStatus('connected')
          } catch {
            if (!cancelled) {
              setError('Connection lost. Please reload to start a new session.')
              setStatusMessage('Connection failed')
              useLiveSessionStore.getState().setConnectionStatus('error')
            }
          }
        })

        setRoomCode(code)
        setStatusMessage(null)
        useLiveSessionStore.getState().startSession('host', code)
        useLiveSessionStore.getState().setConnectionStatus('connected')
        useLiveSessionStore.getState().setAdvancePhaseFn(orchestrator.advancePhase)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to start session')
        }
      } finally {
        if (!cancelled) setIsStarting(false)
      }
    }

    startUp()

    return () => {
      cancelled = true
      // Don't destroy peer — it's in the store and must survive navigation
    }
  }, [])

  // beforeunload warning
  useEffect(() => {
    if (!roomCode) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [roomCode])

  return { roomCode, guests, phase, isStarting, error, statusMessage, advancePhase, endSession }
}
