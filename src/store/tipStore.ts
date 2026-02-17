import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Per-person tip configuration
// Each person can choose a percentage or fixed dollar amount (cents)
export interface PersonTip {
  personId: string
  mode: 'percentage' | 'fixed'
  percentage: number // e.g. 20 for 20%
  fixedAmount: number // cents — used only when mode is 'fixed'
}

interface TipStore {
  // Map of personId -> their tip choice
  personTips: Record<string, PersonTip>

  // Global mode: 'pass-around' (each person picks) or 'everyone' (one person sets all)
  tipMode: 'pass-around' | 'everyone'

  // Initialize tips for all people (called when entering tip screen)
  initializeTips: (personIds: string[], defaultPercentage?: number) => void

  setPersonTipPercentage: (personId: string, percentage: number) => void
  setPersonTipFixed: (personId: string, fixedAmount: number) => void
  setTipMode: (mode: 'pass-around' | 'everyone') => void

  // Set all people to the same percentage
  setAllPercentage: (percentage: number) => void

  reset: () => void
}

const DEFAULT_TIP_PERCENTAGE = 12.5

const initialState = {
  personTips: {} as Record<string, PersonTip>,
  tipMode: 'pass-around' as const,
}

export const useTipStore = create<TipStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      initializeTips: (personIds, defaultPercentage = DEFAULT_TIP_PERCENTAGE) =>
        set((state) => {
          const personTips = { ...state.personTips }
          for (const personId of personIds) {
            if (!personTips[personId]) {
              personTips[personId] = {
                personId,
                mode: 'percentage',
                percentage: defaultPercentage,
                fixedAmount: 0,
              }
            }
          }
          return { personTips }
        }),

      setPersonTipPercentage: (personId, percentage) =>
        set((state) => ({
          personTips: {
            ...state.personTips,
            [personId]: {
              personId,
              mode: 'percentage',
              percentage,
              fixedAmount: state.personTips[personId]?.fixedAmount ?? 0,
            },
          },
        })),

      setPersonTipFixed: (personId, fixedAmount) =>
        set((state) => ({
          personTips: {
            ...state.personTips,
            [personId]: {
              personId,
              mode: 'fixed',
              percentage: state.personTips[personId]?.percentage ?? DEFAULT_TIP_PERCENTAGE,
              fixedAmount,
            },
          },
        })),

      setTipMode: (mode) => set({ tipMode: mode }),

      setAllPercentage: (percentage) => {
        const { personTips } = get()
        const updated: Record<string, PersonTip> = {}
        for (const [personId, tip] of Object.entries(personTips)) {
          updated[personId] = { ...tip, mode: 'percentage', percentage }
        }
        set({ personTips: updated })
      },

      reset: () => set(initialState),
    }),
    {
      name: 'tip-store',
    }
  )
)
