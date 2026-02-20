import Peer from 'peerjs'
import type { DataConnection } from 'peerjs'
import type { GuestMessage, HostMessage } from './types'
import {
  PEER_CONFIG,
  HOST_TIMEOUT_MS,
  GUEST_TIMEOUT_MS,
  RETRY_CONFIG,
  retryDelayMs,
} from './iceConfig'

type PeerEventMap = {
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

export class PeerService {
  private peer: Peer | null = null
  private connections: Map<string, DataConnection> = new Map()
  private hostConnection: DataConnection | null = null
  private listeners: Map<string, Set<AnyHandler>> = new Map()
  private _roomCode: string | null = null
  private destroyed = false

  get roomCode(): string | null {
    return this._roomCode
  }

  on<K extends keyof PeerEventMap>(event: K, handler: (...args: PeerEventMap[K]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler as AnyHandler)
  }

  off<K extends keyof PeerEventMap>(event: K, handler: (...args: PeerEventMap[K]) => void): void {
    this.listeners.get(event)?.delete(handler as AnyHandler)
  }

  private emit<K extends keyof PeerEventMap>(event: K, ...args: PeerEventMap[K]): void {
    const handlers = this.listeners.get(event)
    if (handlers) {
      for (const handler of handlers) {
        handler(...args)
      }
    }
  }

  async startHost(): Promise<string> {
    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      if (this.destroyed) throw new Error('PeerService destroyed')

      if (attempt > 0) {
        const delay = retryDelayMs(attempt - 1)
        this.emit('retry', attempt, RETRY_CONFIG.maxRetries)
        this.emit(
          'status-change',
          `Retrying... (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1})`
        )
        await this.sleep(delay)
        if (this.destroyed) throw new Error('PeerService destroyed')
      } else {
        this.emit('status-change', 'Connecting to signaling server...')
      }

      try {
        const id = await this.attemptStartHost()
        this.emit('status-change', 'Connected')
        return id
      } catch (err) {
        // Destroy failed peer before retrying
        this.peer?.destroy()
        this.peer = null

        if (attempt === RETRY_CONFIG.maxRetries) {
          this.emit('status-change', 'Connection failed')
          throw err
        }
      }
    }

    // Unreachable, but TypeScript needs it
    throw new Error('Host start failed')
  }

  private attemptStartHost(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Host start timed out'))
      }, HOST_TIMEOUT_MS)

      this.peer = new Peer(PEER_CONFIG)

      this.peer.on('open', (id) => {
        clearTimeout(timeout)
        this._roomCode = id
        this.emit('open', id)
        resolve(id)
      })

      this.peer.on('error', (err) => {
        clearTimeout(timeout)
        this.emit('connection-error', err as unknown as Error)
        reject(err)
      })

      this.peer.on('connection', (conn) => {
        this.setupGuestConnection(conn)
      })
    })
  }

  private setupGuestConnection(conn: DataConnection): void {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn)
      this.emit('guest-connected', conn.peer)
    })

    conn.on('data', (data) => {
      if (this.isValidGuestMessage(data)) {
        this.emit('guest-message', conn.peer, data as GuestMessage)
      }
    })

    conn.on('close', () => {
      this.connections.delete(conn.peer)
      this.emit('guest-disconnected', conn.peer)
    })

    conn.on('error', () => {
      this.connections.delete(conn.peer)
      this.emit('guest-disconnected', conn.peer)
    })
  }

  async joinAsGuest(roomCode: string): Promise<void> {
    this._roomCode = roomCode

    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      if (this.destroyed) throw new Error('PeerService destroyed')

      if (attempt > 0) {
        const delay = retryDelayMs(attempt - 1)
        this.emit('retry', attempt, RETRY_CONFIG.maxRetries)
        this.emit(
          'status-change',
          `Retrying... (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1})`
        )
        await this.sleep(delay)
        if (this.destroyed) throw new Error('PeerService destroyed')
      } else {
        this.emit('status-change', 'Connecting...')
      }

      try {
        await this.attemptJoinAsGuest(roomCode)
        this.emit('status-change', 'Connected')
        return
      } catch (err) {
        this.peer?.destroy()
        this.peer = null

        if (attempt === RETRY_CONFIG.maxRetries) {
          this.emit('status-change', 'Connection failed')
          throw err
        }
      }
    }
  }

  private attemptJoinAsGuest(roomCode: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Guest join timed out'))
      }, GUEST_TIMEOUT_MS)

      this.peer = new Peer(PEER_CONFIG)

      this.peer.on('open', () => {
        const conn = this.peer!.connect(roomCode, { reliable: true })

        conn.on('open', () => {
          clearTimeout(timeout)
          this.hostConnection = conn
          this.emit('open', this.peer!.id)
          resolve()
        })

        conn.on('data', (data) => {
          if (this.isValidHostMessage(data)) {
            this.emit('host-message', data as HostMessage)
          }
        })

        conn.on('close', () => {
          this.hostConnection = null
          this.emit('connection-error', new Error('Connection to host closed'))
        })

        conn.on('error', (err) => {
          clearTimeout(timeout)
          this.hostConnection = null
          this.emit('connection-error', err as unknown as Error)
          reject(err)
        })
      })

      this.peer.on('error', (err) => {
        clearTimeout(timeout)
        this.emit('connection-error', err as unknown as Error)
        reject(err)
      })
    })
  }

  broadcastToAll(msg: HostMessage): void {
    for (const conn of this.connections.values()) {
      conn.send(msg)
    }
  }

  sendToGuest(peerId: string, msg: HostMessage): void {
    const conn = this.connections.get(peerId)
    if (conn) {
      conn.send(msg)
    }
  }

  sendToHost(msg: GuestMessage): void {
    if (this.hostConnection) {
      this.hostConnection.send(msg)
    }
  }

  getConnectedPeerIds(): string[] {
    return Array.from(this.connections.keys())
  }

  isConnected(): boolean {
    if (this.hostConnection) return true
    return this.connections.size > 0
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.connections.clear()
    this.hostConnection = null
    this.listeners.clear()
    this.peer?.destroy()
    this.peer = null
    this._roomCode = null
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private isValidGuestMessage(data: unknown): data is GuestMessage {
    if (!data || typeof data !== 'object') return false
    const msg = data as Record<string, unknown>
    return ['IDENTIFY', 'CLAIM_ITEM', 'UNCLAIM_ITEM', 'SET_ASSIGNEES', 'SET_TIP'].includes(
      msg.type as string
    )
  }

  private isValidHostMessage(data: unknown): data is HostMessage {
    if (!data || typeof data !== 'object') return false
    const msg = data as Record<string, unknown>
    return ['SYNC_STATE', 'PHASE_CHANGE'].includes(msg.type as string)
  }
}
