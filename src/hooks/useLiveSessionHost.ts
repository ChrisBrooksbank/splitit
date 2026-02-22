import { useEffect, useRef, useState, useCallback } from 'react'
import { RelayService } from '../services/liveSession/RelayService'
import { createHostOrchestrator } from '../services/liveSession/hostOrchestrator'
import { useLiveSessionStore } from '../store/liveSessionStore'
import type { SessionPhase } from '../services/liveSession/types'

export function useLiveSessionHost() {
  const peerRef = useRef<RelayService | null>(null)
  const orchestratorRef = useRef<ReturnType<typeof createHostOrchestrator> | null>(null)
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const guests = useLiveSessionStore((s) => s.guests)
  const phase = useLiveSessionStore((s) => s.phase)

  const advancePhase = useCallback((newPhase: SessionPhase) => {
    orchestratorRef.current?.advancePhase(newPhase)
  }, [])

  const endSession = useCallback(() => {
    orchestratorRef.current?.destroy()
    peerRef.current?.destroy()
    peerRef.current = null
    orchestratorRef.current = null
    setRoomCode(null)
    useLiveSessionStore.getState().endSession()
  }, [])

  useEffect(() => {
    let cancelled = false
    const peer = new RelayService()
    peerRef.current = peer

    peer.on('status-change', (msg) => {
      if (!cancelled) setStatusMessage(msg)
    })

    const startUp = async () => {
      setIsStarting(true)
      setError(null)
      try {
        const code = await peer.startHost()
        if (cancelled) return

        const orchestrator = createHostOrchestrator(peer)
        orchestratorRef.current = orchestrator
        orchestrator.start()

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
      orchestratorRef.current?.destroy()
      peer.destroy()
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
