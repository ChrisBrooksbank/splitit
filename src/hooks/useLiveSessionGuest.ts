import { useEffect, useCallback, useState } from 'react'
import { RelayService, RoomNotFoundError } from '../services/liveSession/RelayService'
import { useLiveSessionStore } from '../store/liveSessionStore'
import type { SyncPayload } from '../services/liveSession/types'

type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'error' | 'disconnected'

export function useLiveSessionGuest(roomCode: string) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    () => useLiveSessionStore.getState().connectionStatus
  )
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const storedStatus = useLiveSessionStore((s) => s.connectionStatus)

  // The relay peer outlives this component (it lives in the store), and so does its reconnect
  // logic. If it updates the store while we are remounted, mirror that here.
  useEffect(() => {
    // 'disconnected' is the store's idle default, but once a peer exists it means a failed reconnect
    if (storedStatus !== 'disconnected' || useLiveSessionStore.getState().peerService) {
      setConnectionStatus(storedStatus)
    }
  }, [storedStatus])

  const syncedState = useLiveSessionStore((s) => s.syncedState)
  const myPersonId = useLiveSessionStore((s) => s.myPersonId)
  const phase = useLiveSessionStore((s) => s.phase)

  useEffect(() => {
    // If peer already exists in store (remount after navigation), skip initialization
    if (useLiveSessionStore.getState().peerService) return

    // `cancelled` only covers the initial join (e.g. StrictMode's mount/unmount/mount). Once the
    // peer is stored it must keep reconnecting even if this component unmounts and remounts.
    let cancelled = false
    let reconnecting = false
    let reconnectCount = 0
    const MAX_RECONNECT_ATTEMPTS = 5
    const peer = new RelayService()

    peer.on('status-change', (msg) => {
      setStatusMessage(msg)
    })

    const attemptReconnect = async () => {
      // A single drop can raise several connection-error events (relay ERROR + socket close)
      if (reconnecting) return
      reconnecting = true
      try {
        // A failed attempt raises no further socket events, so keep retrying until we give up
        while (await reconnectOnce()) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * reconnectCount))
          if (useLiveSessionStore.getState().peerService !== peer) return
        }
      } finally {
        reconnecting = false
      }
    }

    // Resolves true when the attempt failed transiently and another should follow
    const reconnectOnce = async (): Promise<boolean> => {
      reconnectCount++
      if (reconnectCount > MAX_RECONNECT_ATTEMPTS) {
        setConnectionStatus('error')
        setStatusMessage('Host disconnected')
        useLiveSessionStore.getState().setConnectionStatus('error')
        return false
      }

      setConnectionStatus('reconnecting')
      useLiveSessionStore.getState().setConnectionStatus('reconnecting')
      setStatusMessage(`Reconnecting... (${reconnectCount}/${MAX_RECONNECT_ATTEMPTS})`)

      try {
        const didReconnect = await peer.reconnectToHost(roomCode)
        if (!didReconnect) return false

        reconnectCount = 0
        setConnectionStatus('connected')
        setStatusMessage(null)
        useLiveSessionStore.getState().setConnectionStatus('connected')

        // Re-identify if we had a personId
        const { myPersonId: pid } = useLiveSessionStore.getState()
        const syncState = useLiveSessionStore.getState().syncedState
        if (pid) {
          const person = syncState?.people.find((p) => p.id === pid)
          peer.sendToHost({
            type: 'IDENTIFY',
            personId: pid,
            displayName: person?.name ?? 'Guest',
          })
        }
        return false
      } catch (err) {
        if (err instanceof RoomNotFoundError) {
          setConnectionStatus('error')
          setStatusMessage('Host disconnected')
          useLiveSessionStore.getState().setConnectionStatus('error')
          return false
        }
        setConnectionStatus('disconnected')
        useLiveSessionStore.getState().setConnectionStatus('disconnected')
        return true
      }
    }

    const connect = async () => {
      setConnectionStatus('connecting')
      useLiveSessionStore.getState().startSession('guest', roomCode)
      try {
        await peer.joinAsGuest(roomCode)
        if (cancelled) {
          peer.destroy()
          return
        }

        // Store peer and cleanup function in zustand
        useLiveSessionStore.getState().setPeerService(peer, () => {
          peer.destroy()
        })

        setConnectionStatus('connected')
        setStatusMessage(null)
        useLiveSessionStore.getState().setConnectionStatus('connected')

        peer.on('host-message', (msg) => {
          if (msg.type === 'SYNC_STATE') {
            useLiveSessionStore.getState().setSyncedState(msg.payload)
            useLiveSessionStore.getState().setPhase(msg.payload.phase)
          } else if (msg.type === 'PHASE_CHANGE') {
            useLiveSessionStore.getState().setPhase(msg.phase)
          }
        })

        peer.on('connection-error', () => {
          void attemptReconnect()
        })
      } catch {
        if (!cancelled) {
          setConnectionStatus('error')
          useLiveSessionStore.getState().setConnectionStatus('error')
        }
      }
    }

    connect()

    return () => {
      cancelled = true
      // Don't destroy peer — it's in the store and must survive navigation
    }
  }, [roomCode])

  const isConnected = connectionStatus === 'connected'

  const identify = useCallback((personId: string, displayName: string) => {
    const peer = useLiveSessionStore.getState().peerService
    if (!peer?.isConnected()) return
    useLiveSessionStore.getState().setMyPersonId(personId)
    peer.sendToHost({ type: 'IDENTIFY', personId, displayName })
  }, [])

  const sendClaim = useCallback((itemId: string) => {
    const peer = useLiveSessionStore.getState().peerService
    if (!peer?.isConnected()) return
    const personId = useLiveSessionStore.getState().myPersonId
    if (personId) {
      peer.sendToHost({ type: 'CLAIM_ITEM', itemId, personId })
    }
  }, [])

  const sendUnclaim = useCallback((itemId: string) => {
    const peer = useLiveSessionStore.getState().peerService
    if (!peer?.isConnected()) return
    const personId = useLiveSessionStore.getState().myPersonId
    if (personId) {
      peer.sendToHost({ type: 'UNCLAIM_ITEM', itemId, personId })
    }
  }, [])

  const sendSetAssignees = useCallback(
    (itemId: string, personIds: string[], portions: Record<string, number>) => {
      const peer = useLiveSessionStore.getState().peerService
      if (!peer?.isConnected()) return
      peer.sendToHost({ type: 'SET_ASSIGNEES', itemId, personIds, portions })
    },
    []
  )

  const sendTip = useCallback((mode: 'percentage' | 'fixed', value: number) => {
    const peer = useLiveSessionStore.getState().peerService
    if (!peer?.isConnected()) return
    const personId = useLiveSessionStore.getState().myPersonId
    if (personId) {
      peer.sendToHost({ type: 'SET_TIP', personId, mode, value })
    }
  }, [])

  const sendAddPerson = useCallback((name: string) => {
    const peer = useLiveSessionStore.getState().peerService
    if (!peer?.isConnected()) return
    peer.sendToHost({ type: 'ADD_PERSON', name })
  }, [])

  return {
    connectionStatus,
    statusMessage,
    syncedState: syncedState as SyncPayload | null,
    myPersonId,
    phase,
    isConnected,
    identify,
    sendClaim,
    sendUnclaim,
    sendSetAssignees,
    sendTip,
    sendAddPerson,
  }
}
