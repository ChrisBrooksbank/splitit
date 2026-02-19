import { create } from 'zustand'
import type { SessionPhase, SyncPayload, GuestInfo } from '../services/liveSession/types'

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

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

  startSession: (role: 'host' | 'guest', roomCode: string) => void
  setPhase: (phase: SessionPhase) => void
  setMyPersonId: (personId: string) => void
  addGuest: (guest: GuestInfo) => void
  disconnectGuest: (peerId: string) => void
  identifyGuest: (peerId: string, personId: string, displayName: string) => void
  setSyncedState: (state: SyncPayload) => void
  setConnectionStatus: (status: ConnectionStatus) => void
  setAdvancePhaseFn: (fn: ((phase: SessionPhase) => void) | null) => void
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
      guests: state.guests.map((g) => (g.peerId === peerId ? { ...g, personId, displayName } : g)),
    })),

  setSyncedState: (syncedState) => set({ syncedState }),

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

  setAdvancePhaseFn: (fn) => set({ advancePhaseFn: fn }),

  endSession: () => set(initialState),
}))
