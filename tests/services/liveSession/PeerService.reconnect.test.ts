import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PeerService } from '../../../src/services/liveSession/PeerService'

// Mock peerjs
const mockPeerInstance = {
  on: vi.fn(),
  connect: vi.fn(),
  destroy: vi.fn(),
  id: 'test-peer-id',
}

const mockConnection = {
  on: vi.fn(),
  send: vi.fn(),
  close: vi.fn(),
  peer: 'host-peer-id',
}

vi.mock('peerjs', () => ({
  default: class {
    on = mockPeerInstance.on
    connect = mockPeerInstance.connect
    destroy = mockPeerInstance.destroy
    id = mockPeerInstance.id
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_options?: unknown) {}
  },
}))

vi.mock('../../../src/services/liveSession/iceConfig', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    HOST_TIMEOUT_MS: 500,
    GUEST_TIMEOUT_MS: 500,
    HEARTBEAT_INTERVAL_MS: 100_000, // large so heartbeat doesn't interfere
    HEARTBEAT_TIMEOUT_MS: 300_000,
    RETRY_CONFIG: { maxRetries: 1, baseDelayMs: 10 },
    retryDelayMs: (attempt: number) => 10 * Math.pow(2, attempt),
  }
})

describe('PeerService reconnect', () => {
  let service: PeerService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new PeerService()
    mockPeerInstance.on.mockReset()
    mockConnection.on.mockReset()
    mockConnection.send.mockReset()
    mockPeerInstance.connect.mockReturnValue(mockConnection)
  })

  it('reconnectToHost re-establishes connection and emits open', async () => {
    const openHandler = vi.fn()
    service.on('open', openHandler)

    // Set up successful join
    let peerOpenCb: (() => void) | undefined
    let connOpenCb: (() => void) | undefined

    mockPeerInstance.on.mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
      if (event === 'open') peerOpenCb = cb as typeof peerOpenCb
      return mockPeerInstance
    })
    mockConnection.on.mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
      if (event === 'open') connOpenCb = cb as typeof connOpenCb
    })

    // Initial join
    const joinPromise = service.joinAsGuest('room-abc')
    peerOpenCb!()
    connOpenCb!()
    await joinPromise
    expect(openHandler).toHaveBeenCalledTimes(1)

    // Reset mocks for reconnect
    mockPeerInstance.on.mockReset()
    mockConnection.on.mockReset()

    mockPeerInstance.on.mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
      if (event === 'open') peerOpenCb = cb as typeof peerOpenCb
      return mockPeerInstance
    })
    mockConnection.on.mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
      if (event === 'open') connOpenCb = cb as typeof connOpenCb
    })

    // Reconnect
    const reconnectPromise = service.reconnectToHost('room-abc')
    peerOpenCb!()
    connOpenCb!()
    await reconnectPromise

    expect(openHandler).toHaveBeenCalledTimes(2)
    expect(service.isConnected()).toBe(true)
  })

  describe('send return values', () => {
    it('sendToHost returns false when no host connection', () => {
      expect(service.sendToHost({ type: 'IDENTIFY', personId: 'p1', displayName: 'A' })).toBe(false)
    })

    it('sendToHost returns true when connected', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(service as any).hostConnection = { send: vi.fn() }
      expect(service.sendToHost({ type: 'IDENTIFY', personId: 'p1', displayName: 'A' })).toBe(true)
    })

    it('sendToGuest returns false for unknown peer', () => {
      expect(service.sendToGuest('unknown', { type: 'SYNC_STATE', payload: {} as never })).toBe(
        false
      )
    })

    it('broadcastToAll returns 0 with no connections', () => {
      expect(service.broadcastToAll({ type: 'SYNC_STATE', payload: {} as never })).toBe(0)
    })

    it('broadcastToAll returns count of connections', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const connections = (service as any).connections as Map<string, unknown>
      connections.set('p1', { send: vi.fn() })
      connections.set('p2', { send: vi.fn() })

      expect(service.broadcastToAll({ type: 'SYNC_STATE', payload: {} as never })).toBe(2)
    })
  })
})
