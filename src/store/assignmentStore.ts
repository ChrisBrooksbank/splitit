import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// assignments: Map<itemId, personId[]> — who claimed each item (equal split by default)
// portions: Record<itemId, Record<personId, number>> — custom portion weights per person
//   When portions is set for an item, each person's share = portions[personId] / sum(all portions)
//   When portions is empty/absent, equal split among all assignees

interface AssignmentStore {
  assignments: Record<string, string[]> // itemId -> personId[]
  portions: Record<string, Record<string, number>> // itemId -> personId -> portion weight

  // Assign/unassign a person to an item (equal split)
  assignPerson: (itemId: string, personId: string) => void
  unassignPerson: (itemId: string, personId: string) => void
  toggleAssignment: (itemId: string, personId: string) => void

  // Set multiple assignees for an item at once (replaces existing, equal split)
  setAssignees: (itemId: string, personIds: string[]) => void

  // Set custom portion weights for an item
  // portions: { [personId]: portionWeight } — e.g. { alice: 2, bob: 3 } means alice pays 2/5, bob pays 3/5
  setPortions: (itemId: string, portions: Record<string, number>) => void
  clearPortions: (itemId: string) => void

  // Get the share count for a person on an item (returns a fraction 0-1)
  // Used by split calculator: person's fraction of the item cost
  getPersonShare: (itemId: string, personId: string) => number

  // Remove all assignments for an item (e.g. when item is deleted)
  removeItem: (itemId: string) => void

  // Remove all assignments for a person (e.g. when person is removed)
  removePerson: (personId: string) => void

  // Bulk set all assignments and portions (for QR import)
  setAllAssignments: (
    assignments: Record<string, string[]>,
    portions: Record<string, Record<string, number>>
  ) => void

  reset: () => void
}

const initialState = {
  assignments: {} as Record<string, string[]>,
  portions: {} as Record<string, Record<string, number>>,
}

export const useAssignmentStore = create<AssignmentStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      assignPerson: (itemId, personId) =>
        set((state) => {
          const current = state.assignments[itemId] ?? []
          if (current.includes(personId)) return state
          return {
            assignments: {
              ...state.assignments,
              [itemId]: [...current, personId],
            },
          }
        }),

      unassignPerson: (itemId, personId) =>
        set((state) => {
          const current = state.assignments[itemId] ?? []
          const updated = current.filter((id) => id !== personId)

          // Also remove from portions
          const itemPortions = { ...state.portions }
          if (itemPortions[itemId]) {
            const newPortions = { ...itemPortions[itemId] }
            delete newPortions[personId]
            itemPortions[itemId] = newPortions
          }

          return {
            assignments: {
              ...state.assignments,
              [itemId]: updated,
            },
            portions: itemPortions,
          }
        }),

      toggleAssignment: (itemId, personId) => {
        const { assignments, assignPerson, unassignPerson } = get()
        const current = assignments[itemId] ?? []
        if (current.includes(personId)) {
          unassignPerson(itemId, personId)
        } else {
          assignPerson(itemId, personId)
        }
      },

      setAssignees: (itemId, personIds) =>
        set((state) => {
          // Clear portions when resetting to equal split
          const itemPortions = { ...state.portions }
          delete itemPortions[itemId]
          return {
            assignments: {
              ...state.assignments,
              [itemId]: [...personIds],
            },
            portions: itemPortions,
          }
        }),

      setPortions: (itemId, portionWeights) =>
        set((state) => ({
          portions: {
            ...state.portions,
            [itemId]: { ...portionWeights },
          },
        })),

      clearPortions: (itemId) =>
        set((state) => {
          const itemPortions = { ...state.portions }
          delete itemPortions[itemId]
          return { portions: itemPortions }
        }),

      getPersonShare: (itemId, personId) => {
        const { assignments, portions } = get()
        const assignees = assignments[itemId] ?? []
        if (!assignees.includes(personId)) return 0
        if (assignees.length === 0) return 0

        const itemPortions = portions[itemId]
        if (!itemPortions || Object.keys(itemPortions).length === 0) {
          // Equal split
          return 1 / assignees.length
        }

        // Custom portions: sum of all assignee weights
        const totalWeight = assignees.reduce((sum, id) => sum + (itemPortions[id] ?? 1), 0)
        const personWeight = itemPortions[personId] ?? 1
        return totalWeight > 0 ? personWeight / totalWeight : 1 / assignees.length
      },

      removeItem: (itemId) =>
        set((state) => {
          const newAssignments = { ...state.assignments }
          delete newAssignments[itemId]
          const newPortions = { ...state.portions }
          delete newPortions[itemId]
          return { assignments: newAssignments, portions: newPortions }
        }),

      removePerson: (personId) =>
        set((state) => {
          const newAssignments: Record<string, string[]> = {}
          for (const [itemId, assignees] of Object.entries(state.assignments)) {
            newAssignments[itemId] = assignees.filter((id) => id !== personId)
          }

          const newPortions: Record<string, Record<string, number>> = {}
          for (const [itemId, portionWeights] of Object.entries(state.portions)) {
            const updated = { ...portionWeights }
            delete updated[personId]
            newPortions[itemId] = updated
          }

          return { assignments: newAssignments, portions: newPortions }
        }),

      setAllAssignments: (assignments, portions) => set({ assignments, portions }),

      reset: () => set(initialState),
    }),
    {
      name: 'assignment-store',
    }
  )
)
