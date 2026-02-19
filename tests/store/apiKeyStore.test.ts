import { describe, it, expect, beforeEach } from 'vitest'
import { useApiKeyStore } from '../../src/store/apiKeyStore'

describe('apiKeyStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useApiKeyStore.setState({ provider: 'openai', apiKey: '' })
  })

  it('has correct initial state', () => {
    const state = useApiKeyStore.getState()
    expect(state.provider).toBe('openai')
    expect(state.apiKey).toBe('')
  })

  it('sets provider to anthropic', () => {
    useApiKeyStore.getState().setProvider('anthropic')
    expect(useApiKeyStore.getState().provider).toBe('anthropic')
  })

  it('sets provider to gemini', () => {
    useApiKeyStore.getState().setProvider('gemini')
    expect(useApiKeyStore.getState().provider).toBe('gemini')
  })

  it('sets API key', () => {
    useApiKeyStore.getState().setApiKey('sk-test-123')
    expect(useApiKeyStore.getState().apiKey).toBe('sk-test-123')
  })

  it('clears provider and key', () => {
    useApiKeyStore.getState().setProvider('anthropic')
    useApiKeyStore.getState().setApiKey('sk-ant-test')
    useApiKeyStore.getState().clear()

    const state = useApiKeyStore.getState()
    expect(state.provider).toBe('openai')
    expect(state.apiKey).toBe('')
  })
})
