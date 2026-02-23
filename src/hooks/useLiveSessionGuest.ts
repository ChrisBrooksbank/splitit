import { useEffect, useCallback, useState } from 'react'
import { RelayService, RoomNotFoundError } from '../services/liveSession/RelayService'
import { useLiveSessionStore } from '../store/liveSessionStore'
import type { SyncPayload } from '../services/liveSession/types'

type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'error' | 'disconnected'

export function useLiveSessionGuest(roomCode: string) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(() => {
    const stored = useLiveSessionStore.getState().connectionStatus
    return stored === 'disconnected' && useLiveSessionStore.getState().peerService
      ? 'connected'
      : (stored as ConnectionStatus)
  })
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const syncedState = useLiveSessionStore((s) => s.syncedState)
  const myPersonId = useLiveSessionStore((s) => s.myPersonId)
  const phase = useLiveSessionStore((s) => s.phase)

  useEffect(() => {
    // If peer already exists in store (remount after navigation), skip initialization
    if (useLiveSessionStore.getState().peerService) return

    let cancelled = false
    let reconnectCount = 0
    const MAX_RECONNECT_ATTEMPTS = 5
    const peer = new RelayService()

    peer.on('status-change', (msg) => {
      if (!cancelled) setStatusMessage(msg)
    })

    const attemptReconnect = async () => {
      if (cancelled) return

      reconnectCount++
      if (reconnectCount > MAX_RECONNECT_ATTEMPTS) {
        setConnectionStatus('error')
        setStatusMessage('Host disconnected')
        useLiveSessionStore.getState().setConnectionStatus('error')
        return
      }

      setConnectionStatus('reconnecting')
      useLiveSessionStore.getState().setConnectionStatus('reconnecting')
      setStatusMessage(`Reconnecting... (${reconnectCount}/${MAX_RECONNECT_ATTEMPTS})`)

      try {
        const didReconnect = await peer.reconnectToHost(roomCode)
        if (cancelled || !didReconnect) return

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
      } catch (err) {
        if (!cancelled) {
          if (err instanceof RoomNotFoundError) {
            setConnectionStatus('error')
            setStatusMessage('Host disconnected')
            useLiveSessionStore.getState().setConnectionStatus('error')
          } else {
            setConnectionStatus('disconnected')
            useLiveSessionStore.getState().setConnectionStatus('disconnected')
          }
        }
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
          if (!cancelled) attemptReconnect()
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
