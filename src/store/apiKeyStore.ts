import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AiProvider = 'openai' | 'anthropic'

interface ApiKeyStore {
  provider: AiProvider
  apiKey: string
  setProvider: (provider: AiProvider) => void
  setApiKey: (apiKey: string) => void
  clear: () => void
}

export const useApiKeyStore = create<ApiKeyStore>()(
  persist(
    (set) => ({
      provider: 'openai' as AiProvider,
      apiKey: '',
      setProvider: (provider) => set({ provider }),
      setApiKey: (apiKey) => set({ apiKey }),
      clear: () => set({ provider: 'openai', apiKey: '' }),
    }),
    { name: 'api-key-store' }
  )
)
