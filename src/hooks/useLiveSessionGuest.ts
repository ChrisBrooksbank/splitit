import { useEffect, useRef, useCallback, useState } from 'react'
import { RelayService, RoomNotFoundError } from '../services/liveSession/RelayService'
import { useLiveSessionStore } from '../store/liveSessionStore'
import type { SyncPayload } from '../services/liveSession/types'

type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'error' | 'disconnected'

export function useLiveSessionGuest(roomCode: string) {
  const peerRef = useRef<RelayService | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const syncedState = useLiveSessionStore((s) => s.syncedState)
  const myPersonId = useLiveSessionStore((s) => s.myPersonId)
  const phase = useLiveSessionStore((s) => s.phase)

  useEffect(() => {
    let cancelled = false
    const peer = new RelayService()
    peerRef.current = peer

    peer.on('status-change', (msg) => {
      if (!cancelled) setStatusMessage(msg)
    })

    const attemptReconnect = async () => {
      if (cancelled) return
      setConnectionStatus('reconnecting')
      useLiveSessionStore.getState().setConnectionStatus('reconnecting')
      setStatusMessage('Reconnecting...')

      try {
        const didReconnect = await peer.reconnectToHost(roomCode)
        if (cancelled || !didReconnect) return

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
        if (cancelled) return

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
      peer.destroy()
    }
  }, [roomCode])

  const isConnected = connectionStatus === 'connected'

  const identify = useCallback((personId: string, displayName: string) => {
    if (!peerRef.current?.isConnected()) return
    useLiveSessionStore.getState().setMyPersonId(personId)
    peerRef.current.sendToHost({ type: 'IDENTIFY', personId, displayName })
  }, [])

  const sendClaim = useCallback((itemId: string) => {
    if (!peerRef.current?.isConnected()) return
    const personId = useLiveSessionStore.getState().myPersonId
    if (personId) {
      peerRef.current?.sendToHost({ type: 'CLAIM_ITEM', itemId, personId })
    }
  }, [])

  const sendUnclaim = useCallback((itemId: string) => {
    if (!peerRef.current?.isConnected()) return
    const personId = useLiveSessionStore.getState().myPersonId
    if (personId) {
      peerRef.current?.sendToHost({ type: 'UNCLAIM_ITEM', itemId, personId })
    }
  }, [])

  const sendSetAssignees = useCallback(
    (itemId: string, personIds: string[], portions: Record<string, number>) => {
      if (!peerRef.current?.isConnected()) return
      peerRef.current?.sendToHost({ type: 'SET_ASSIGNEES', itemId, personIds, portions })
    },
    []
  )

  const sendTip = useCallback((mode: 'percentage' | 'fixed', value: number) => {
    if (!peerRef.current?.isConnected()) return
    const personId = useLiveSessionStore.getState().myPersonId
    if (personId) {
      peerRef.current?.sendToHost({ type: 'SET_TIP', personId, mode, value })
    }
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
  }
}
