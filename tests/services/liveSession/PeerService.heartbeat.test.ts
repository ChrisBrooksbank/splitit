import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

vi.mock('../../../src/services/liveSession/iceConfig', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    HOST_TIMEOUT_MS: 500,
    GUEST_TIMEOUT_MS: 500,
    HEARTBEAT_INTERVAL_MS: 100,
    HEARTBEAT_TIMEOUT_MS: 250,
    RETRY_CONFIG: { maxRetries: 2, baseDelayMs: 10 },
    retryDelayMs: (attempt: number) => 10 * Math.pow(2, attempt),
  }
})

describe('PeerService heartbeat', () => {
  let service: PeerService

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    service = new PeerService()
    mockPeerInstance.on.mockReset()
    mockConnection.on.mockReset()
    mockConnection.send.mockReset()
    mockConnection.close.mockReset()
    mockPeerInstance.connect.mockReturnValue(mockConnection)
  })

  afterEach(() => {
    service.destroy()
    vi.useRealTimers()
  })

  describe('host heartbeat', () => {
    it('emits guest-stale when no pong received within timeout', async () => {
      const staleHandler = vi.fn()
      service.on('guest-stale', staleHandler)

      // Set up host
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

      // Simulate guest connecting
      const guestConn = {
        on: vi.fn(),
        send: vi.fn(),
        close: vi.fn(),
        peer: 'guest-1',
      }
      let guestOpenCb: (() => void) | undefined
      guestConn.on.mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
        if (event === 'open') guestOpenCb = cb as typeof guestOpenCb
      })

      connectionCallback!(guestConn as unknown as typeof mockConnection)
      guestOpenCb!()

      // PING should be sent after HEARTBEAT_INTERVAL_MS
      vi.advanceTimersByTime(100)
      expect(guestConn.send).toHaveBeenCalledWith({ type: '__PING' })

      // No pong received — advance past timeout
      vi.advanceTimersByTime(250)

      expect(staleHandler).toHaveBeenCalledWith('guest-1')
      expect(guestConn.close).toHaveBeenCalled()
    })

    it('does not emit guest-stale when pong is received', async () => {
      const staleHandler = vi.fn()
      service.on('guest-stale', staleHandler)

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

      const guestConn = {
        on: vi.fn(),
        send: vi.fn(),
        close: vi.fn(),
        peer: 'guest-1',
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const connCallbacks: Record<string, (...args: any[]) => void> = {}
      guestConn.on.mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
        connCallbacks[event] = cb
      })

      connectionCallback!(guestConn as unknown as typeof mockConnection)
      connCallbacks['open']()

      // Simulate receiving pong at each heartbeat interval
      vi.advanceTimersByTime(100)
      connCallbacks['data']({ type: '__PONG' })

      vi.advanceTimersByTime(100)
      connCallbacks['data']({ type: '__PONG' })

      vi.advanceTimersByTime(100)
      connCallbacks['data']({ type: '__PONG' })

      expect(staleHandler).not.toHaveBeenCalled()
    })

    it('responds to __PING from guest with __PONG', async () => {
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

      const guestConn = {
        on: vi.fn(),
        send: vi.fn(),
        close: vi.fn(),
        peer: 'guest-1',
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const connCallbacks: Record<string, (...args: any[]) => void> = {}
      guestConn.on.mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
        connCallbacks[event] = cb
      })

      connectionCallback!(guestConn as unknown as typeof mockConnection)
      connCallbacks['open']()

      // Guest sends PING
      connCallbacks['data']({ type: '__PING' })

      expect(guestConn.send).toHaveBeenCalledWith({ type: '__PONG' })
    })

    it('filters internal messages from guest-message events', async () => {
      const messageHandler = vi.fn()
      service.on('guest-message', messageHandler)

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

      const guestConn = {
        on: vi.fn(),
        send: vi.fn(),
        close: vi.fn(),
        peer: 'guest-1',
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const connCallbacks: Record<string, (...args: any[]) => void> = {}
      guestConn.on.mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
        connCallbacks[event] = cb
      })

      connectionCallback!(guestConn as unknown as typeof mockConnection)
      connCallbacks['open']()

      // Internal messages should NOT be emitted as guest-message
      connCallbacks['data']({ type: '__PING' })
      connCallbacks['data']({ type: '__PONG' })
      expect(messageHandler).not.toHaveBeenCalled()

      // Real messages should be emitted
      connCallbacks['data']({ type: 'IDENTIFY', personId: 'p1', displayName: 'Alice' })
      expect(messageHandler).toHaveBeenCalledWith('guest-1', {
        type: 'IDENTIFY',
        personId: 'p1',
        displayName: 'Alice',
      })
    })
  })

  describe('guest heartbeat', () => {
    it('emits host-stale when no pong received within timeout', async () => {
      const staleHandler = vi.fn()
      service.on('host-stale', staleHandler)

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
      await promise

      // Advance past timeout without receiving pong
      vi.advanceTimersByTime(100) // first ping
      vi.advanceTimersByTime(250) // past timeout

      expect(staleHandler).toHaveBeenCalled()
    })
  })
})
