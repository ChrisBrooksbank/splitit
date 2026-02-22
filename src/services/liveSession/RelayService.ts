import type { GuestMessage, HostMessage } from './types'
import { RELAY_URL, CONNECT_TIMEOUT_MS, MAX_RETRIES, retryDelayMs } from './relayConfig'

export class RoomNotFoundError extends Error {
  constructor() {
    super('Room not found')
    this.name = 'RoomNotFoundError'
  }
}

type RelayEventMap = {
  open: [id: string]
  'guest-connected': [peerId: string]
  'guest-disconnected': [peerId: string]
  'guest-message': [peerId: string, message: GuestMessage]
  'host-message': [message: HostMessage]
  'connection-error': [error: Error]
  'status-change': [message: string]
  retry: [attempt: number, maxRetries: number]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHandler = (...args: any[]) => void

export class RelayService {
  private ws: WebSocket | null = null
  private listeners: Map<string, Set<AnyHandler>> = new Map()
  private _roomCode: string | null = null
  private _peerId: string | null = null
  private destroyed = false
  private isReconnecting = false
  private connectedGuestIds: Set<string> = new Set()

  get roomCode(): string | null {
    return this._roomCode
  }

  on<K extends keyof RelayEventMap>(event: K, handler: (...args: RelayEventMap[K]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler as AnyHandler)
  }

  off<K extends keyof RelayEventMap>(event: K, handler: (...args: RelayEventMap[K]) => void): void {
    this.listeners.get(event)?.delete(handler as AnyHandler)
  }

  private emit<K extends keyof RelayEventMap>(event: K, ...args: RelayEventMap[K]): void {
    const handlers = this.listeners.get(event)
    if (handlers) {
      for (const handler of handlers) {
        handler(...args)
      }
    }
  }

  async startHost(): Promise<string> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (this.destroyed) throw new Error('RelayService destroyed')

      if (attempt > 0) {
        const delay = retryDelayMs(attempt - 1)
        this.emit('retry', attempt, MAX_RETRIES)
        this.emit('status-change', `Retrying... (attempt ${attempt + 1}/${MAX_RETRIES + 1})`)
        await this.sleep(delay)
        if (this.destroyed) throw new Error('RelayService destroyed')
      } else {
        this.emit('status-change', 'Connecting to relay server...')
      }

      try {
        const roomCode = await this.attemptCreateRoom()
        this.emit('status-change', 'Connected')
        return roomCode
      } catch (err) {
        this.closeSocket()

        if (attempt === MAX_RETRIES) {
          this.emit('status-change', 'Connection failed')
          throw err
        }
      }
    }

    throw new Error('Host start failed')
  }

  private attemptCreateRoom(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.closeSocket()
        reject(new Error('Host start timed out'))
      }, CONNECT_TIMEOUT_MS)

      const ac = new AbortController()
      const ws = new WebSocket(RELAY_URL)
      this.ws = ws

      ws.addEventListener(
        'open',
        () => {
          this.sendToRelay({ type: 'CREATE_ROOM' })
        },
        { signal: ac.signal }
      )

      ws.addEventListener(
        'message',
        (event) => {
          const msg = this.parseMessage(event.data)
          if (!msg) return

          switch (msg.type) {
            case 'ROOM_CREATED':
              clearTimeout(timeout)
              this._roomCode = msg.roomCode as string
              this._peerId = msg.peerId as string
              this.emit('open', this._peerId)
              ac.abort()
              this.setupHostListeners(ws)
              resolve(this._roomCode)
              break
            case 'ERROR':
              clearTimeout(timeout)
              ac.abort()
              reject(new Error(msg.message as string))
              break
          }
        },
        { signal: ac.signal }
      )

      ws.addEventListener(
        'error',
        () => {
          clearTimeout(timeout)
          ac.abort()
          reject(new Error('WebSocket connection failed'))
        },
        { signal: ac.signal }
      )

      ws.addEventListener(
        'close',
        () => {
          clearTimeout(timeout)
          ac.abort()
          reject(new Error('Connection closed before room was created'))
        },
        { signal: ac.signal }
      )
    })
  }

  private setupHostListeners(ws: WebSocket): void {
    // Replace the initial message listener with the persistent one
    ws.onmessage = (event) => {
      const msg = this.parseMessage(event.data)
      if (!msg) return

      switch (msg.type) {
        case 'PEER_JOINED': {
          const peerId = msg.peerId as string
          this.connectedGuestIds.add(peerId)
          this.emit('guest-connected', peerId)
          break
        }
        case 'PEER_LEFT': {
          const peerId = msg.peerId as string
          this.connectedGuestIds.delete(peerId)
          this.emit('guest-disconnected', peerId)
          break
        }
        case 'RELAY': {
          const from = msg.from as string
          const payload = msg.payload as Record<string, unknown>
          if (this.isValidGuestMessage(payload)) {
            this.emit('guest-message', from, payload as GuestMessage)
          }
          break
        }
        case 'ERROR':
          this.emit('connection-error', new Error(msg.message as string))
          break
      }
    }

    ws.onclose = () => {
      if (this.destroyed) return
      // Notify about all connected guests disconnecting
      for (const peerId of this.connectedGuestIds) {
        this.emit('guest-disconnected', peerId)
      }
      this.connectedGuestIds.clear()
      this.emit('connection-error', new Error('Relay connection lost'))
    }
  }

  async joinAsGuest(roomCode: string): Promise<void> {
    this._roomCode = roomCode
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (this.destroyed) throw new Error('RelayService destroyed')

      if (attempt > 0) {
        const delay = retryDelayMs(attempt - 1)
        this.emit('retry', attempt, MAX_RETRIES)
        this.emit('status-change', `Retrying... (attempt ${attempt + 1}/${MAX_RETRIES + 1})`)
        await this.sleep(delay)
        if (this.destroyed) throw new Error('RelayService destroyed')
      } else {
        this.emit('status-change', 'Connecting...')
      }

      try {
        await this.attemptJoinRoom(roomCode)
        this.emit('status-change', 'Connected')
        return
      } catch (err) {
        this.closeSocket()

        // Don't retry if the room no longer exists (host disconnected)
        if (err instanceof RoomNotFoundError) {
          this.emit('status-change', 'Host disconnected')
          throw err
        }

        if (attempt === MAX_RETRIES) {
          this.emit('status-change', 'Connection failed')
          throw err
        }
      }
    }
  }

  private attemptJoinRoom(roomCode: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.closeSocket()
        reject(new Error('Guest join timed out'))
      }, CONNECT_TIMEOUT_MS)

      const ac = new AbortController()
      const ws = new WebSocket(RELAY_URL)
      this.ws = ws

      ws.addEventListener(
        'open',
        () => {
          this.sendToRelay({ type: 'JOIN_ROOM', roomCode })
        },
        { signal: ac.signal }
      )

      ws.addEventListener(
        'message',
        (event) => {
          const msg = this.parseMessage(event.data)
          if (!msg) return

          switch (msg.type) {
            case 'JOINED':
              clearTimeout(timeout)
              this._peerId = msg.peerId as string
              this.emit('open', this._peerId)
              ac.abort()
              this.setupGuestListeners(ws)
              resolve()
              break
            case 'ERROR': {
              clearTimeout(timeout)
              ac.abort()
              const errorMsg = msg.message as string
              if (errorMsg === 'Room not found') {
                reject(new RoomNotFoundError())
              } else {
                reject(new Error(errorMsg))
              }
              break
            }
          }
        },
        { signal: ac.signal }
      )

      ws.addEventListener(
        'error',
        () => {
          clearTimeout(timeout)
          ac.abort()
          reject(new Error('WebSocket connection failed'))
        },
        { signal: ac.signal }
      )

      ws.addEventListener(
        'close',
        () => {
          clearTimeout(timeout)
          ac.abort()
          reject(new Error('Connection closed before joining room'))
        },
        { signal: ac.signal }
      )
    })
  }

  private setupGuestListeners(ws: WebSocket): void {
    ws.onmessage = (event) => {
      const msg = this.parseMessage(event.data)
      if (!msg) return

      switch (msg.type) {
        case 'RELAY': {
          const payload = msg.payload as Record<string, unknown>
          if (this.isValidHostMessage(payload)) {
            this.emit('host-message', payload as HostMessage)
          }
          break
        }
        case 'ERROR':
          this.emit('connection-error', new Error(msg.message as string))
          break
      }
    }

    ws.onclose = () => {
      if (this.destroyed) return
      this.emit('connection-error', new Error('Connection to host closed'))
    }
  }

  async reconnectAsHost(): Promise<string | null> {
    if (this.isReconnecting || this.destroyed) return null
    this.isReconnecting = true

    try {
      this.closeSocket()
      this.connectedGuestIds.clear()
      const roomCode = await this.startHost()
      return roomCode
    } finally {
      this.isReconnecting = false
    }
  }

  async reconnectToHost(roomCode: string): Promise<boolean> {
    if (this.isReconnecting || this.destroyed) return false
    this.isReconnecting = true

    try {
      this.closeSocket()
      await this.joinAsGuest(roomCode)
      return true
    } finally {
      this.isReconnecting = false
    }
  }

  broadcastToAll(msg: HostMessage): number {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[RelayService] broadcastToAll: not connected')
      return 0
    }

    this.sendToRelay({ type: 'RELAY', payload: msg })
    return this.connectedGuestIds.size
  }

  sendToGuest(peerId: string, msg: HostMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn(`[RelayService] sendToGuest: not connected`)
      return false
    }

    this.sendToRelay({ type: 'RELAY', to: peerId, payload: msg })
    return true
  }

  sendToHost(msg: GuestMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[RelayService] sendToHost: not connected')
      return false
    }

    this.sendToRelay({ type: 'RELAY', payload: msg })
    return true
  }

  getConnectedPeerIds(): string[] {
    return Array.from(this.connectedGuestIds)
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.closeSocket()
    this.connectedGuestIds.clear()
    this.listeners.clear()
    this._roomCode = null
    this._peerId = null
  }

  private closeSocket(): void {
    if (this.ws) {
      this.ws.onmessage = null
      this.ws.onclose = null
      this.ws.onerror = null
      this.ws.close()
      this.ws = null
    }
  }

  private sendToRelay(msg: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }

  private parseMessage(data: unknown): Record<string, unknown> | null {
    try {
      return JSON.parse(data as string)
    } catch {
      return null
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private isValidGuestMessage(data: unknown): data is GuestMessage {
    if (!data || typeof data !== 'object') return false
    const msg = data as Record<string, unknown>

    switch (msg.type) {
      case 'IDENTIFY':
        return typeof msg.personId === 'string' && typeof msg.displayName === 'string'
      case 'CLAIM_ITEM':
      case 'UNCLAIM_ITEM':
        return typeof msg.itemId === 'string' && typeof msg.personId === 'string'
      case 'SET_ASSIGNEES':
        return (
          typeof msg.itemId === 'string' &&
          Array.isArray(msg.personIds) &&
          typeof msg.portions === 'object' &&
          msg.portions !== null
        )
      case 'SET_TIP':
        return typeof msg.personId === 'string' && typeof msg.value === 'number'
      default:
        return false
    }
  }

  private isValidHostMessage(data: unknown): data is HostMessage {
    if (!data || typeof data !== 'object') return false
    const msg = data as Record<string, unknown>
    return ['SYNC_STATE', 'PHASE_CHANGE'].includes(msg.type as string)
  }
}
