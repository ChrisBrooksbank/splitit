import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemePreference = 'light' | 'dark' | 'system'

const MIN_FONT_SIZE = 14
const MAX_FONT_SIZE = 20

interface AppearanceStore {
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
  fontSize: number
  setFontSize: (size: number) => void
}

export const useAppearanceStore = create<AppearanceStore>()(
  persist(
    (set) => ({
      preference: 'system',
      setPreference: (preference) => set({ preference }),
      fontSize: 16,
      setFontSize: (size) =>
        set({ fontSize: Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, size)) }),
    }),
    { name: 'appearance-store' }
  )
)
