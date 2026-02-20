import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PeerService } from '../../../src/services/liveSession/PeerService'

// Mock peerjs — accept options argument
const mockPeerInstance = {
  on: vi.fn(),
  connect: vi.fn(),
  destroy: vi.fn(),
  id: 'test-peer-id',
}

const mockConnection = {
  on: vi.fn(),
  send: vi.fn(),
  peer: 'guest-peer-id',
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

// Speed up retries for tests
vi.mock('../../../src/services/liveSession/iceConfig', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    HOST_TIMEOUT_MS: 500,
    GUEST_TIMEOUT_MS: 500,
    RETRY_CONFIG: { maxRetries: 2, baseDelayMs: 10 },
    retryDelayMs: (attempt: number) => 10 * Math.pow(2, attempt),
  }
})

describe('PeerService', () => {
  let service: PeerService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new PeerService()
    mockPeerInstance.on.mockReset()
    mockConnection.on.mockReset()
    mockConnection.send.mockReset()
    mockPeerInstance.connect.mockReturnValue(mockConnection)
  })

  describe('startHost', () => {
    it('resolves with peer ID on open', async () => {
      mockPeerInstance.on.mockImplementation((event: string, cb: (arg?: unknown) => void) => {
        if (event === 'open') setTimeout(() => cb('host-id'), 0)
        return mockPeerInstance
      })

      const roomCode = await service.startHost()
      expect(roomCode).toBe('host-id')
      expect(service.roomCode).toBe('host-id')
    })

    it('rejects after all retries exhausted', async () => {
      mockPeerInstance.on.mockImplementation((event: string, cb: (arg?: unknown) => void) => {
        if (event === 'error') setTimeout(() => cb(new Error('fail')), 0)
        return mockPeerInstance
      })

      await expect(service.startHost()).rejects.toThrow('fail')
    })

    it('emits status-change and retry events during retries', async () => {
      let callCount = 0
      mockPeerInstance.on.mockImplementation((event: string, cb: (arg?: unknown) => void) => {
        callCount++
        // First two attempts fail, third succeeds
        if (event === 'error' && callCount <= 4) {
          setTimeout(() => cb(new Error('fail')), 0)
        }
        if (event === 'open' && callCount > 4) {
          setTimeout(() => cb('host-id'), 0)
        }
        return mockPeerInstance
      })

      const statusHandler = vi.fn()
      const retryHandler = vi.fn()
      service.on('status-change', statusHandler)
      service.on('retry', retryHandler)

      const roomCode = await service.startHost()
      expect(roomCode).toBe('host-id')
      expect(retryHandler).toHaveBeenCalled()
      expect(statusHandler).toHaveBeenCalled()
    })

    it('emits guest-connected when a guest connects', async () => {
      const connectedHandler = vi.fn()
      service.on('guest-connected', connectedHandler)

      let connectionCallback: ((conn: typeof mockConnection) => void) | undefined
      let openCallback: ((id: string) => void) | undefined

      mockPeerInstance.on.mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
        if (event === 'connection') connectionCallback = cb as typeof connectionCallback
        if (event === 'open') openCallback = cb as typeof openCallback
        return mockPeerInstance
      })

      const promise = service.startHost()
      openCallback!('host-id')
      await promise

      // simulate guest connecting
      const guestConn = { ...mockConnection, on: vi.fn(), peer: 'guest-1' }
      let guestOpenCb: (() => void) | undefined
      guestConn.on.mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
        if (event === 'open') guestOpenCb = cb as typeof guestOpenCb
      })

      connectionCallback!(guestConn as unknown as typeof mockConnection)
      guestOpenCb!()

      expect(connectedHandler).toHaveBeenCalledWith('guest-1')
    })
  })

  describe('joinAsGuest', () => {
    it('resolves when connection opens', async () => {
      let peerOpenCb: (() => void) | undefined

      mockPeerInstance.on.mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
        if (event === 'open') peerOpenCb = cb as typeof peerOpenCb
        return mockPeerInstance
      })

      let connOpenCb: (() => void) | undefined
      mockConnection.on.mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
        if (event === 'open') connOpenCb = cb as typeof connOpenCb
      })

      const promise = service.joinAsGuest('room-123')
      peerOpenCb!()
      connOpenCb!()

      await expect(promise).resolves.toBeUndefined()
      expect(service.roomCode).toBe('room-123')
    })

    it('rejects after all retries exhausted', async () => {
      mockPeerInstance.on.mockImplementation((event: string, cb: (arg?: unknown) => void) => {
        if (event === 'error') setTimeout(() => cb(new Error('connection failed')), 0)
        return mockPeerInstance
      })

      await expect(service.joinAsGuest('room-123')).rejects.toThrow('connection failed')
    })
  })

  describe('messaging', () => {
    it('broadcastToAll sends to all connections', () => {
      const conn1 = { send: vi.fn() }
      const conn2 = { send: vi.fn() }
      const connections = (service as unknown as { connections: Map<string, unknown> }).connections
      connections.set('peer-1', conn1)
      connections.set('peer-2', conn2)

      const msg = { type: 'SYNC_STATE' as const, payload: {} as never }
      service.broadcastToAll(msg)

      expect(conn1.send).toHaveBeenCalledWith(msg)
      expect(conn2.send).toHaveBeenCalledWith(msg)
    })

    it('sendToGuest sends to specific peer', () => {
      const conn1 = { send: vi.fn() }
      const connections = (service as unknown as { connections: Map<string, unknown> }).connections
      connections.set('peer-1', conn1)

      const msg = { type: 'SYNC_STATE' as const, payload: {} as never }
      service.sendToGuest('peer-1', msg)

      expect(conn1.send).toHaveBeenCalledWith(msg)
    })

    it('sendToHost sends via host connection', () => {
      const hostConn = { send: vi.fn() }
      ;(service as unknown as { hostConnection: unknown }).hostConnection = hostConn

      const msg = { type: 'IDENTIFY' as const, personId: 'p1', displayName: 'Alice' }
      service.sendToHost(msg)

      expect(hostConn.send).toHaveBeenCalledWith(msg)
    })
  })

  describe('destroy', () => {
    it('cleans up peer and connections', () => {
      ;(service as unknown as { peer: unknown }).peer = mockPeerInstance
      service.destroy()

      expect(mockPeerInstance.destroy).toHaveBeenCalled()
      expect(service.roomCode).toBeNull()
      expect(service.isConnected()).toBe(false)
    })

    it('prevents further retries after destroy', async () => {
      mockPeerInstance.on.mockImplementation((event: string, cb: (arg?: unknown) => void) => {
        if (event === 'error') setTimeout(() => cb(new Error('fail')), 0)
        return mockPeerInstance
      })

      // Destroy immediately — should abort retry loop
      const promise = service.startHost()
      service.destroy()

      await expect(promise).rejects.toThrow()
    })
  })

  describe('event emitter', () => {
    it('on/off works correctly', () => {
      const handler = vi.fn()
      service.on('open', handler)
      ;(service as unknown as { emit: (event: string, ...args: unknown[]) => void }).emit(
        'open',
        'test-id'
      )
      expect(handler).toHaveBeenCalledWith('test-id')

      service.off('open', handler)
      ;(service as unknown as { emit: (event: string, ...args: unknown[]) => void }).emit(
        'open',
        'test-id-2'
      )
      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe('getConnectedPeerIds', () => {
    it('returns all connected peer IDs', () => {
      const connections = (service as unknown as { connections: Map<string, unknown> }).connections
      connections.set('peer-1', {})
      connections.set('peer-2', {})

      expect(service.getConnectedPeerIds()).toEqual(['peer-1', 'peer-2'])
    })
  })
})
