import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsStore {
  geminiApiKey: string
  setGeminiApiKey: (key: string) => void
  clearGeminiApiKey: () => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      geminiApiKey: '',
      setGeminiApiKey: (key) => set({ geminiApiKey: key.trim() }),
      clearGeminiApiKey: () => set({ geminiApiKey: '' }),
    }),
    { name: 'settings-store' }
  )
)
