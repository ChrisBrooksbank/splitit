import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import type { Person } from '../types'

// Accessible, colorblind-friendly palette (WCAG AA contrast on white)
const COLOR_PALETTE = [
  '#0057B8', // blue
  '#C62828', // red
  '#2E7D32', // green
  '#6A1B9A', // purple
  '#EF6C00', // orange
  '#00695C', // teal
  '#AD1457', // pink
  '#4527A0', // indigo
]

interface PeopleStore {
  people: Person[]
  nextColorIndex: number

  addPerson: (name: string) => void
  setPeople: (people: Person[]) => void
  updatePerson: (id: string, name: string) => void
  removePerson: (id: string) => void
  reset: () => void
}

const initialState = {
  people: [] as Person[],
  nextColorIndex: 0,
}

export const usePeopleStore = create<PeopleStore>()(
  persist(
    (set) => ({
      ...initialState,

      addPerson: (name) =>
        set((state) => {
          const color = COLOR_PALETTE[state.nextColorIndex % COLOR_PALETTE.length]
          return {
            people: [...state.people, { id: nanoid(), name: name.trim(), color }],
            nextColorIndex: state.nextColorIndex + 1,
          }
        }),

      setPeople: (people) => set({ people, nextColorIndex: people.length }),

      updatePerson: (id, name) =>
        set((state) => ({
          people: state.people.map((p) => (p.id === id ? { ...p, name: name.trim() } : p)),
        })),

      removePerson: (id) =>
        set((state) => ({
          people: state.people.filter((p) => p.id !== id),
        })),

      reset: () => set(initialState),
    }),
    {
      name: 'people-store',
    }
  )
)
