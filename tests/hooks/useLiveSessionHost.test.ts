import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useLiveSessionHost } from '../../src/hooks/useLiveSessionHost'
import { useLiveSessionStore } from '../../src/store/liveSessionStore'

// Mock RelayService
const mockStartHost = vi.fn()
const mockDestroy = vi.fn()
const mockOn = vi.fn()
const mockOff = vi.fn()
const mockBroadcastToAll = vi.fn()
const mockSendToGuest = vi.fn()
const mockGetConnectedPeerIds = vi.fn(() => [])

vi.mock('../../src/services/liveSession/RelayService', () => ({
  RelayService: class {
    startHost = mockStartHost
    destroy = mockDestroy
    on = mockOn
    off = mockOff
    broadcastToAll = mockBroadcastToAll
    sendToGuest = mockSendToGuest
    getConnectedPeerIds = mockGetConnectedPeerIds
  },
}))

// Mock hostOrchestrator
const mockOrchestratorStart = vi.fn()
const mockOrchestratorDestroy = vi.fn()
const mockOrchestratorAdvancePhase = vi.fn()
const mockOrchestratorBroadcastState = vi.fn()

vi.mock('../../src/services/liveSession/hostOrchestrator', () => ({
  createHostOrchestrator: vi.fn(() => ({
    start: mockOrchestratorStart,
    destroy: mockOrchestratorDestroy,
    advancePhase: mockOrchestratorAdvancePhase,
    broadcastState: mockOrchestratorBroadcastState,
  })),
}))

describe('useLiveSessionHost', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useLiveSessionStore.getState().endSession()
    mockStartHost.mockResolvedValue('test-room-code')
  })

  afterEach(() => {
    cleanup()
  })

  it('starts host session and returns roomCode', async () => {
    const { result } = renderHook(() => useLiveSessionHost())

    // Initially starting
    expect(result.current.isStarting).toBe(true)

    // Wait for startHost to resolve
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.roomCode).toBe('test-room-code')
    expect(result.current.isStarting).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('sets error on failure', async () => {
    mockStartHost.mockRejectedValue(new Error('Connection failed'))

    const { result } = renderHook(() => useLiveSessionHost())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.error).toBe('Connection failed')
    expect(result.current.roomCode).toBeNull()
  })

  it('cleans up on unmount', async () => {
    const { unmount } = renderHook(() => useLiveSessionHost())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    unmount()
    expect(mockDestroy).toHaveBeenCalled()
  })

  it('endSession cleans up everything', async () => {
    const { result } = renderHook(() => useLiveSessionHost())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    act(() => {
      result.current.endSession()
    })

    expect(result.current.roomCode).toBeNull()
    expect(useLiveSessionStore.getState().isLive).toBe(false)
  })
})
