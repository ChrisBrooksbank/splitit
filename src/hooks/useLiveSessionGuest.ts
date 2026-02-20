import { useEffect, useRef, useCallback, useState } from 'react'
import { PeerService } from '../services/liveSession/PeerService'
import { useLiveSessionStore } from '../store/liveSessionStore'
import type { SyncPayload } from '../services/liveSession/types'

type ConnectionStatus = 'connecting' | 'connected' | 'error' | 'disconnected'

export function useLiveSessionGuest(roomCode: string) {
  const peerRef = useRef<PeerService | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const syncedState = useLiveSessionStore((s) => s.syncedState)
  const myPersonId = useLiveSessionStore((s) => s.myPersonId)
  const phase = useLiveSessionStore((s) => s.phase)

  useEffect(() => {
    let cancelled = false
    const peer = new PeerService()
    peerRef.current = peer

    peer.on('status-change', (msg) => {
      if (!cancelled) setStatusMessage(msg)
    })

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
          if (!cancelled) {
            setConnectionStatus('disconnected')
            useLiveSessionStore.getState().setConnectionStatus('disconnected')
          }
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

  const identify = useCallback((personId: string, displayName: string) => {
    useLiveSessionStore.getState().setMyPersonId(personId)
    peerRef.current?.sendToHost({ type: 'IDENTIFY', personId, displayName })
  }, [])

  const sendClaim = useCallback((itemId: string) => {
    const personId = useLiveSessionStore.getState().myPersonId
    if (personId) {
      peerRef.current?.sendToHost({ type: 'CLAIM_ITEM', itemId, personId })
    }
  }, [])

  const sendUnclaim = useCallback((itemId: string) => {
    const personId = useLiveSessionStore.getState().myPersonId
    if (personId) {
      peerRef.current?.sendToHost({ type: 'UNCLAIM_ITEM', itemId, personId })
    }
  }, [])

  const sendSetAssignees = useCallback(
    (itemId: string, personIds: string[], portions: Record<string, number>) => {
      peerRef.current?.sendToHost({ type: 'SET_ASSIGNEES', itemId, personIds, portions })
    },
    []
  )

  const sendTip = useCallback((mode: 'percentage' | 'fixed', value: number) => {
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
    identify,
    sendClaim,
    sendUnclaim,
    sendSetAssignees,
    sendTip,
  }
}
