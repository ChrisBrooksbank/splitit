import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useLiveSessionGuest } from '../../src/hooks/useLiveSessionGuest'
import { useLiveSessionStore } from '../../src/store/liveSessionStore'

const mockJoinAsGuest = vi.fn()
const mockDestroy = vi.fn()
const mockSendToHost = vi.fn()
const handlers: Record<string, (...args: unknown[]) => void> = {}

vi.mock('../../src/services/liveSession/PeerService', () => ({
  PeerService: class {
    joinAsGuest = mockJoinAsGuest
    destroy = mockDestroy
    sendToHost = mockSendToHost
    on = vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers[event] = handler
    })
    off = vi.fn()
  },
}))

describe('useLiveSessionGuest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useLiveSessionStore.getState().endSession()
    mockJoinAsGuest.mockResolvedValue(undefined)
    for (const key of Object.keys(handlers)) delete handlers[key]
  })

  afterEach(() => {
    cleanup()
  })

  it('connects to room and becomes connected', async () => {
    const { result } = renderHook(() => useLiveSessionGuest('room-123'))

    expect(result.current.connectionStatus).toBe('connecting')

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.connectionStatus).toBe('connected')
    expect(mockJoinAsGuest).toHaveBeenCalledWith('room-123')
  })

  it('sets error status on connection failure', async () => {
    mockJoinAsGuest.mockRejectedValue(new Error('fail'))

    const { result } = renderHook(() => useLiveSessionGuest('room-123'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.connectionStatus).toBe('error')
  })

  it('identify sends IDENTIFY message and sets myPersonId', async () => {
    const { result } = renderHook(() => useLiveSessionGuest('room-123'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    act(() => {
      result.current.identify('p1', 'Alice')
    })

    expect(useLiveSessionStore.getState().myPersonId).toBe('p1')
    expect(mockSendToHost).toHaveBeenCalledWith({
      type: 'IDENTIFY',
      personId: 'p1',
      displayName: 'Alice',
    })
  })

  it('sendClaim sends CLAIM_ITEM with personId from store', async () => {
    const { result } = renderHook(() => useLiveSessionGuest('room-123'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    act(() => {
      result.current.identify('p1', 'Alice')
    })

    act(() => {
      result.current.sendClaim('item-1')
    })

    expect(mockSendToHost).toHaveBeenCalledWith({
      type: 'CLAIM_ITEM',
      itemId: 'item-1',
      personId: 'p1',
    })
  })

  it('sendTip sends SET_TIP message', async () => {
    const { result } = renderHook(() => useLiveSessionGuest('room-123'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    act(() => {
      result.current.identify('p1', 'Alice')
    })

    act(() => {
      result.current.sendTip('percentage', 15)
    })

    expect(mockSendToHost).toHaveBeenCalledWith({
      type: 'SET_TIP',
      personId: 'p1',
      mode: 'percentage',
      value: 15,
    })
  })

  it('handles SYNC_STATE from host', async () => {
    renderHook(() => useLiveSessionGuest('room-123'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    const payload = {
      lineItems: [],
      people: [],
      assignments: {},
      portions: {},
      personTips: {},
      phase: 'claiming' as const,
      claimedPersonIds: [],
    }

    act(() => {
      handlers['host-message']({ type: 'SYNC_STATE', payload })
    })

    expect(useLiveSessionStore.getState().syncedState).toEqual(payload)
    expect(useLiveSessionStore.getState().phase).toBe('claiming')
  })

  it('cleans up on unmount', async () => {
    const { unmount } = renderHook(() => useLiveSessionGuest('room-123'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    unmount()
    expect(mockDestroy).toHaveBeenCalled()
  })
})
