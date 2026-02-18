import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useInstallPrompt } from '../../src/hooks/useInstallPrompt'

function fireBeforeInstallPrompt() {
  const promptEvent = new Event('beforeinstallprompt') as Event & {
    prompt: ReturnType<typeof vi.fn>
    userChoice: Promise<{ outcome: string }>
  }
  promptEvent.prompt = vi.fn().mockResolvedValue(undefined)
  promptEvent.userChoice = Promise.resolve({ outcome: 'accepted' })
  window.dispatchEvent(promptEvent)
  return promptEvent
}

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useInstallPrompt', () => {
  it('canInstall is false by default', () => {
    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.canInstall).toBe(false)
  })

  it('sets canInstall to true on beforeinstallprompt', () => {
    const { result } = renderHook(() => useInstallPrompt())
    act(() => {
      fireBeforeInstallPrompt()
    })
    expect(result.current.canInstall).toBe(true)
  })

  it('promptInstall calls event.prompt()', async () => {
    const { result } = renderHook(() => useInstallPrompt())
    let evt: ReturnType<typeof fireBeforeInstallPrompt>
    act(() => {
      evt = fireBeforeInstallPrompt()
    })
    await act(async () => {
      await result.current.promptInstall()
    })
    expect(evt!.prompt).toHaveBeenCalled()
    expect(result.current.canInstall).toBe(false)
  })

  it('dismiss sets canInstall to false and writes to localStorage', () => {
    const { result } = renderHook(() => useInstallPrompt())
    act(() => {
      fireBeforeInstallPrompt()
    })
    expect(result.current.canInstall).toBe(true)
    act(() => {
      result.current.dismiss()
    })
    expect(result.current.canInstall).toBe(false)
    expect(localStorage.getItem('pwa-install-dismissed')).toBeTruthy()
  })

  it('stays hidden when display-mode is standalone', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    }))
    const { result } = renderHook(() => useInstallPrompt())
    act(() => {
      fireBeforeInstallPrompt()
    })
    expect(result.current.canInstall).toBe(false)
  })

  it('clears banner on appinstalled event', () => {
    const { result } = renderHook(() => useInstallPrompt())
    act(() => {
      fireBeforeInstallPrompt()
    })
    expect(result.current.canInstall).toBe(true)
    act(() => {
      window.dispatchEvent(new Event('appinstalled'))
    })
    expect(result.current.canInstall).toBe(false)
  })
})
