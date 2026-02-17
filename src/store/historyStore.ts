import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { BillSession, Person, LineItem, PersonTotal, TipConfig } from '../types'

const MAX_HISTORY = 10

// BillSession.assignments is a Map — we store it as a plain object in JSON.
// This serialized form is what gets written to localStorage.
interface SerializedSession {
  id: string
  date: string
  restaurantName?: string
  people: Person[]
  lineItems: LineItem[]
  assignments: Record<string, string[]>
  taxAmount: number
  tipConfig: TipConfig
  totals: PersonTotal[]
}

function toSerialized(session: BillSession): SerializedSession {
  return {
    ...session,
    assignments: Object.fromEntries(session.assignments),
  }
}

function fromSerialized(s: SerializedSession): BillSession {
  return {
    ...s,
    assignments: new Map(Object.entries(s.assignments)),
  }
}

interface HistoryStore {
  // Stored as serialized (plain object) internally to survive JSON round-trips
  _sessions: SerializedSession[]
  sessions: BillSession[]
  saveSession: (session: BillSession) => void
  deleteSession: (id: string) => void
  reset: () => void
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      _sessions: [],
      get sessions() {
        return get()._sessions.map(fromSerialized)
      },

      saveSession: (session) =>
        set((state) => {
          const serialized = toSerialized(session)
          const existing = state._sessions.findIndex((s) => s.id === session.id)
          let updated: SerializedSession[]
          if (existing >= 0) {
            updated = state._sessions.map((s) => (s.id === session.id ? serialized : s))
          } else {
            updated = [serialized, ...state._sessions]
          }
          return { _sessions: updated.slice(0, MAX_HISTORY) }
        }),

      deleteSession: (id) =>
        set((state) => ({
          _sessions: state._sessions.filter((s) => s.id !== id),
        })),

      reset: () => set({ _sessions: [] }),
    }),
    {
      name: 'history-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ _sessions: state._sessions }),
    }
  )
)
