import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RelayService } from '../../../src/services/liveSession/RelayService'

// Mock relayConfig to disable retries in tests
vi.mock('../../../src/services/liveSession/relayConfig', () => ({
  RELAY_URL: 'wss://test-relay',
  CONNECT_TIMEOUT_MS: 5_000,
  MAX_RETRIES: 0,
  BASE_DELAY_MS: 100,
  retryDelayMs: () => 100,
}))

// Mock WebSocket
const WS_CONNECTING = 0
const WS_OPEN = 1
const WS_CLOSED = 3

class MockWebSocket {
  static CONNECTING = WS_CONNECTING
  static OPEN = WS_OPEN
  static CLOSING = 2
  static CLOSED = WS_CLOSED

  readyState = WS_CONNECTING
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null

  private eventListeners: Record<string, Array<(event?: unknown) => void>> = {}

  url: string

  constructor(url: string) {
    this.url = url
    // Auto-open after microtask
    setTimeout(() => {
      this.readyState = WS_OPEN
      this.dispatchEvent('open')
    }, 0)
  }

  addEventListener(event: string, handler: (event?: unknown) => void): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = []
    }
    this.eventListeners[event].push(handler)
  }

  removeEventListener(event: string, handler: (event?: unknown) => void): void {
    const handlers = this.eventListeners[event]
    if (handlers) {
      this.eventListeners[event] = handlers.filter((h) => h !== handler)
    }
  }

  dispatchEvent(event: string, data?: unknown): void {
    const handlers = this.eventListeners[event] || []
    for (const handler of handlers) {
      handler(data)
    }
  }

  send = vi.fn()

  close(): void {
    this.readyState = WS_CLOSED
    if (this.onclose) this.onclose()
    this.dispatchEvent('close')
  }

  // Helper to simulate receiving a message
  receiveMessage(msg: Record<string, unknown>): void {
    const event = { data: JSON.stringify(msg) }
    // Try onmessage first (used after setup*Listeners), then addEventListener handlers
    if (this.onmessage) {
      this.onmessage(event)
    } else {
      const handlers = this.eventListeners['message'] || []
      for (const handler of handlers) {
        handler(event)
      }
    }
  }
}

// Install mock
let mockWsInstance: MockWebSocket | null = null

function setMockInstance(instance: MockWebSocket): void {
  mockWsInstance = instance
}

beforeEach(() => {
  mockWsInstance = null
  vi.stubGlobal(
    'WebSocket',
    class extends MockWebSocket {
      constructor(url: string) {
        super(url)
        setMockInstance(this)
      }
    }
  )
})

afterEach(() => {
  vi.restoreAllMocks()
})

/** Helper: wait for WS to open and CREATE_ROOM to be sent */
async function waitForCreateRoom(): Promise<void> {
  await vi.waitFor(() => {
    expect(mockWsInstance).not.toBeNull()
    expect(mockWsInstance!.send).toHaveBeenCalledWith(JSON.stringify({ type: 'CREATE_ROOM' }))
  })
}

/** Helper: wait for WS to open and JOIN_ROOM to be sent */
async function waitForJoinRoom(roomCode: string): Promise<void> {
  await vi.waitFor(() => {
    expect(mockWsInstance).not.toBeNull()
    expect(mockWsInstance!.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'JOIN_ROOM', roomCode })
    )
  })
}

describe('RelayService', () => {
  let service: RelayService

  beforeEach(() => {
    service = new RelayService()
  })

  afterEach(() => {
    service.destroy()
  })

  describe('startHost', () => {
    it('creates room and returns room code', async () => {
      const openHandler = vi.fn()
      service.on('open', openHandler)

      const promise = service.startHost()
      await waitForCreateRoom()

      mockWsInstance!.receiveMessage({
        type: 'ROOM_CREATED',
        roomCode: 'ABC123',
        peerId: 'peer-1',
      })

      const code = await promise
      expect(code).toBe('ABC123')
      expect(service.roomCode).toBe('ABC123')
      expect(openHandler).toHaveBeenCalledWith('peer-1')
    })

    it('emits status-change during connection', async () => {
      const statusHandler = vi.fn()
      service.on('status-change', statusHandler)

      const promise = service.startHost()
      await waitForCreateRoom()

      mockWsInstance!.receiveMessage({
        type: 'ROOM_CREATED',
        roomCode: 'XYZ789',
        peerId: 'peer-1',
      })

      await promise
      expect(statusHandler).toHaveBeenCalledWith('Connecting to relay server...')
      expect(statusHandler).toHaveBeenCalledWith('Connected')
    })

    it('throws on error response', async () => {
      const promise = service.startHost()
      await waitForCreateRoom()

      mockWsInstance!.receiveMessage({
        type: 'ERROR',
        message: 'Server error',
      })

      await expect(promise).rejects.toThrow('Server error')
    })
  })

  describe('joinAsGuest', () => {
    it('joins room successfully', async () => {
      const openHandler = vi.fn()
      service.on('open', openHandler)

      const promise = service.joinAsGuest('ROOM01')
      await waitForJoinRoom('ROOM01')

      mockWsInstance!.receiveMessage({
        type: 'JOINED',
        peerId: 'guest-1',
      })

      await promise
      expect(service.roomCode).toBe('ROOM01')
      expect(openHandler).toHaveBeenCalledWith('guest-1')
    })

    it('throws when room not found', async () => {
      const promise = service.joinAsGuest('BADROOM')
      await waitForJoinRoom('BADROOM')

      mockWsInstance!.receiveMessage({
        type: 'ERROR',
        message: 'Room not found',
      })

      await expect(promise).rejects.toThrow('Room not found')
    })
  })

  describe('host message handling', () => {
    it('emits guest-connected on PEER_JOINED', async () => {
      const guestConnected = vi.fn()
      service.on('guest-connected', guestConnected)

      const promise = service.startHost()
      await waitForCreateRoom()

      mockWsInstance!.receiveMessage({
        type: 'ROOM_CREATED',
        roomCode: 'HOST01',
        peerId: 'host-1',
      })

      await promise

      mockWsInstance!.receiveMessage({
        type: 'PEER_JOINED',
        peerId: 'guest-1',
      })

      expect(guestConnected).toHaveBeenCalledWith('guest-1')
    })

    it('emits guest-disconnected on PEER_LEFT', async () => {
      const guestDisconnected = vi.fn()
      service.on('guest-disconnected', guestDisconnected)

      const promise = service.startHost()
      await waitForCreateRoom()

      mockWsInstance!.receiveMessage({
        type: 'ROOM_CREATED',
        roomCode: 'HOST01',
        peerId: 'host-1',
      })

      await promise

      mockWsInstance!.receiveMessage({ type: 'PEER_JOINED', peerId: 'guest-1' })
      mockWsInstance!.receiveMessage({ type: 'PEER_LEFT', peerId: 'guest-1' })

      expect(guestDisconnected).toHaveBeenCalledWith('guest-1')
    })

    it('emits guest-message on RELAY with valid guest message', async () => {
      const guestMessage = vi.fn()
      service.on('guest-message', guestMessage)

      const promise = service.startHost()
      await waitForCreateRoom()

      mockWsInstance!.receiveMessage({
        type: 'ROOM_CREATED',
        roomCode: 'HOST01',
        peerId: 'host-1',
      })

      await promise

      mockWsInstance!.receiveMessage({
        type: 'RELAY',
        from: 'guest-1',
        payload: { type: 'IDENTIFY', personId: 'p1', displayName: 'Alice' },
      })

      expect(guestMessage).toHaveBeenCalledWith('guest-1', {
        type: 'IDENTIFY',
        personId: 'p1',
        displayName: 'Alice',
      })
    })

    it('emits guest-message on RELAY with valid ADD_PERSON message', async () => {
      const guestMessage = vi.fn()
      service.on('guest-message', guestMessage)

      const promise = service.startHost()
      await waitForCreateRoom()

      mockWsInstance!.receiveMessage({
        type: 'ROOM_CREATED',
        roomCode: 'HOST01',
        peerId: 'host-1',
      })

      await promise

      mockWsInstance!.receiveMessage({
        type: 'RELAY',
        from: 'guest-1',
        payload: { type: 'ADD_PERSON', name: 'Charlie' },
      })

      expect(guestMessage).toHaveBeenCalledWith('guest-1', {
        type: 'ADD_PERSON',
        name: 'Charlie',
      })
    })
  })

  describe('guest message handling', () => {
    it('emits host-message on RELAY with valid host message', async () => {
      const hostMessage = vi.fn()
      service.on('host-message', hostMessage)

      const promise = service.joinAsGuest('ROOM01')
      await waitForJoinRoom('ROOM01')

      mockWsInstance!.receiveMessage({ type: 'JOINED', peerId: 'guest-1' })
      await promise

      const payload = {
        type: 'SYNC_STATE',
        payload: {
          lineItems: [],
          people: [],
          assignments: {},
          portions: {},
          personTips: {},
          phase: 'lobby',
          claimedPersonIds: [],
        },
      }

      mockWsInstance!.receiveMessage({ type: 'RELAY', from: 'host-1', payload })

      expect(hostMessage).toHaveBeenCalledWith(payload)
    })
  })

  describe('broadcastToAll', () => {
    it('sends RELAY message to server', async () => {
      const promise = service.startHost()
      await waitForCreateRoom()

      mockWsInstance!.receiveMessage({
        type: 'ROOM_CREATED',
        roomCode: 'HOST01',
        peerId: 'host-1',
      })

      await promise

      // Add a guest
      mockWsInstance!.receiveMessage({ type: 'PEER_JOINED', peerId: 'guest-1' })

      const msg = { type: 'PHASE_CHANGE' as const, phase: 'claiming' as const }
      const sent = service.broadcastToAll(msg)

      expect(sent).toBe(1)
      expect(mockWsInstance!.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'RELAY', payload: msg })
      )
    })

    it('returns 0 when not connected', () => {
      const msg = { type: 'PHASE_CHANGE' as const, phase: 'claiming' as const }
      expect(service.broadcastToAll(msg)).toBe(0)
    })
  })

  describe('sendToGuest', () => {
    it('sends targeted RELAY message', async () => {
      const promise = service.startHost()
      await waitForCreateRoom()

      mockWsInstance!.receiveMessage({
        type: 'ROOM_CREATED',
        roomCode: 'HOST01',
        peerId: 'host-1',
      })

      await promise

      const msg = { type: 'PHASE_CHANGE' as const, phase: 'claiming' as const }
      service.sendToGuest('guest-1', msg)

      expect(mockWsInstance!.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'RELAY', to: 'guest-1', payload: msg })
      )
    })
  })

  describe('sendToHost', () => {
    it('sends RELAY message as guest', async () => {
      const promise = service.joinAsGuest('ROOM01')
      await waitForJoinRoom('ROOM01')

      mockWsInstance!.receiveMessage({ type: 'JOINED', peerId: 'guest-1' })
      await promise

      const msg = { type: 'CLAIM_ITEM' as const, itemId: 'i1', personId: 'p1' }
      const sent = service.sendToHost(msg)

      expect(sent).toBe(true)
      expect(mockWsInstance!.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'RELAY', payload: msg })
      )
    })

    it('returns false when not connected', () => {
      const msg = { type: 'CLAIM_ITEM' as const, itemId: 'i1', personId: 'p1' }
      expect(service.sendToHost(msg)).toBe(false)
    })
  })

  describe('destroy', () => {
    it('closes WebSocket and clears state', async () => {
      const promise = service.startHost()
      await waitForCreateRoom()

      mockWsInstance!.receiveMessage({
        type: 'ROOM_CREATED',
        roomCode: 'HOST01',
        peerId: 'host-1',
      })

      await promise

      service.destroy()
      expect(service.roomCode).toBeNull()
      expect(service.isConnected()).toBe(false)
    })

    it('is idempotent', () => {
      service.destroy()
      service.destroy()
      // no error
    })
  })

  describe('getConnectedPeerIds', () => {
    it('tracks connected guests', async () => {
      const promise = service.startHost()
      await waitForCreateRoom()

      mockWsInstance!.receiveMessage({
        type: 'ROOM_CREATED',
        roomCode: 'HOST01',
        peerId: 'host-1',
      })

      await promise

      mockWsInstance!.receiveMessage({ type: 'PEER_JOINED', peerId: 'g1' })
      mockWsInstance!.receiveMessage({ type: 'PEER_JOINED', peerId: 'g2' })

      expect(service.getConnectedPeerIds()).toEqual(['g1', 'g2'])

      mockWsInstance!.receiveMessage({ type: 'PEER_LEFT', peerId: 'g1' })
      expect(service.getConnectedPeerIds()).toEqual(['g2'])
    })
  })
})
