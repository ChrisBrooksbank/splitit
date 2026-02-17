import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import type { LineItem } from '../types'

interface BillStore {
  lineItems: LineItem[]
  taxAmount: number // integer cents

  // Line item CRUD
  setLineItems: (items: LineItem[]) => void
  addLineItem: (item: Omit<LineItem, 'id'>) => void
  updateLineItem: (id: string, updates: Partial<Omit<LineItem, 'id'>>) => void
  deleteLineItem: (id: string) => void

  // Tax
  setTaxAmount: (amount: number) => void

  // Reset
  reset: () => void
}

const initialState = {
  lineItems: [] as LineItem[],
  taxAmount: 0,
}

export const useBillStore = create<BillStore>()(
  persist(
    (set) => ({
      ...initialState,

      setLineItems: (items) => set({ lineItems: items }),

      addLineItem: (item) =>
        set((state) => ({
          lineItems: [...state.lineItems, { ...item, id: nanoid() }],
        })),

      updateLineItem: (id, updates) =>
        set((state) => ({
          lineItems: state.lineItems.map((item) =>
            item.id === id ? { ...item, ...updates, manuallyEdited: true } : item
          ),
        })),

      deleteLineItem: (id) =>
        set((state) => ({
          lineItems: state.lineItems.filter((item) => item.id !== id),
        })),

      setTaxAmount: (amount) => set({ taxAmount: amount }),

      reset: () => set(initialState),
    }),
    {
      name: 'bill-store',
    }
  )
)
