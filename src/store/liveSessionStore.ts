import { create } from 'zustand'
import type { RelayService } from '../services/liveSession/RelayService'
import type { SessionPhase, SyncPayload, GuestInfo } from '../services/liveSession/types'

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

interface LiveSessionStore {
  isLive: boolean
  role: 'host' | 'guest' | null
  roomCode: string | null
  phase: SessionPhase
  guests: GuestInfo[]
  myPersonId: string | null
  syncedState: SyncPayload | null
  connectionStatus: ConnectionStatus
  advancePhaseFn: ((phase: SessionPhase) => void) | null
  peerService: RelayService | null
  destroyFn: (() => void) | null

  startSession: (role: 'host' | 'guest', roomCode: string) => void
  setPhase: (phase: SessionPhase) => void
  setMyPersonId: (personId: string) => void
  addGuest: (guest: GuestInfo) => void
  disconnectGuest: (peerId: string) => void
  identifyGuest: (peerId: string, personId: string, displayName: string) => void
  setSyncedState: (state: SyncPayload) => void
  setConnectionStatus: (status: ConnectionStatus) => void
  setAdvancePhaseFn: (fn: ((phase: SessionPhase) => void) | null) => void
  setPeerService: (peer: RelayService, destroyFn: () => void) => void
  endSession: () => void
}

const initialState = {
  isLive: false,
  role: null as 'host' | 'guest' | null,
  roomCode: null as string | null,
  phase: 'lobby' as SessionPhase,
  guests: [] as GuestInfo[],
  myPersonId: null as string | null,
  syncedState: null as SyncPayload | null,
  connectionStatus: 'disconnected' as ConnectionStatus,
  advancePhaseFn: null as ((phase: SessionPhase) => void) | null,
  peerService: null as RelayService | null,
  destroyFn: null as (() => void) | null,
}

export const useLiveSessionStore = create<LiveSessionStore>()((set) => ({
  ...initialState,

  startSession: (role, roomCode) =>
    set({
      isLive: true,
      role,
      roomCode,
      phase: 'lobby',
      connectionStatus: 'connecting',
    }),

  setPhase: (phase) => set({ phase }),

  setMyPersonId: (personId) => set({ myPersonId: personId }),

  addGuest: (guest) =>
    set((state) => ({
      guests: [...state.guests, guest],
    })),

  disconnectGuest: (peerId) =>
    set((state) => ({
      guests: state.guests.map((g) => (g.peerId === peerId ? { ...g, connected: false } : g)),
    })),

  identifyGuest: (peerId, personId, displayName) =>
    set((state) => ({
      // Remove old disconnected entries with the same personId (ghost cleanup after reconnect)
      guests: state.guests
        .filter((g) => !(g.peerId !== peerId && g.personId === personId && !g.connected))
        .map((g) => (g.peerId === peerId ? { ...g, personId, displayName } : g)),
    })),

  setSyncedState: (syncedState) => set({ syncedState }),

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

  setAdvancePhaseFn: (fn) => set({ advancePhaseFn: fn }),

  setPeerService: (peer, destroyFn) => set({ peerService: peer, destroyFn }),

  endSession: () => {
    const { destroyFn } = useLiveSessionStore.getState()
    if (destroyFn) destroyFn()
    set(initialState)
  },
}))
