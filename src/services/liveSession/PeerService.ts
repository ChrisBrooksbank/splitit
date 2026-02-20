import Peer from 'peerjs'
import type { DataConnection } from 'peerjs'
import type { GuestMessage, HostMessage, InternalMessage } from './types'
import {
  PEER_CONFIG,
  HOST_TIMEOUT_MS,
  GUEST_TIMEOUT_MS,
  RETRY_CONFIG,
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_TIMEOUT_MS,
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
  'guest-stale': [peerId: string]
  'host-stale': []
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHandler = (...args: any[]) => void

const PING: InternalMessage = { type: '__PING' }
const PONG: InternalMessage = { type: '__PONG' }

function isInternalMessage(data: unknown): data is InternalMessage {
  if (!data || typeof data !== 'object') return false
  const msg = data as Record<string, unknown>
  return msg.type === '__PING' || msg.type === '__PONG'
}

export class PeerService {
  private peer: Peer | null = null
  private connections: Map<string, DataConnection> = new Map()
  private hostConnection: DataConnection | null = null
  private listeners: Map<string, Set<AnyHandler>> = new Map()
  private _roomCode: string | null = null
  private destroyed = false
  private isReconnecting = false

  // Heartbeat tracking
  private heartbeatIntervals: Map<string, ReturnType<typeof setInterval>> = new Map()
  private lastPongTimes: Map<string, number> = new Map()
  private heartbeatCheckers: Map<string, ReturnType<typeof setInterval>> = new Map()

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
      this.startHostHeartbeat(conn)
    })

    conn.on('data', (data) => {
      // Handle internal heartbeat messages
      if (isInternalMessage(data)) {
        if (data.type === '__PONG') {
          this.lastPongTimes.set(conn.peer, Date.now())
        } else if (data.type === '__PING') {
          conn.send(PONG)
        }
        return
      }

      if (this.isValidGuestMessage(data)) {
        this.emit('guest-message', conn.peer, data as GuestMessage)
      } else {
        console.warn('[PeerService] Invalid guest message received:', data)
      }
    })

    conn.on('close', () => {
      this.stopHeartbeat(conn.peer)
      this.connections.delete(conn.peer)
      this.emit('guest-disconnected', conn.peer)
    })

    conn.on('error', () => {
      this.stopHeartbeat(conn.peer)
      this.connections.delete(conn.peer)
      this.emit('guest-disconnected', conn.peer)
    })
  }

  private startHostHeartbeat(conn: DataConnection): void {
    const peerId = conn.peer
    this.lastPongTimes.set(peerId, Date.now())

    // Send PING at regular intervals
    const pingInterval = setInterval(() => {
      if (this.connections.has(peerId)) {
        conn.send(PING)
      }
    }, HEARTBEAT_INTERVAL_MS)
    this.heartbeatIntervals.set(peerId, pingInterval)

    // Check for stale connection
    const checker = setInterval(() => {
      const lastPong = this.lastPongTimes.get(peerId) ?? 0
      if (Date.now() - lastPong > HEARTBEAT_TIMEOUT_MS) {
        this.stopHeartbeat(peerId)
        this.connections.delete(peerId)
        conn.close()
        this.emit('guest-stale', peerId)
      }
    }, HEARTBEAT_INTERVAL_MS)
    this.heartbeatCheckers.set(peerId, checker)
  }

  private startGuestHeartbeat(): void {
    const key = '__host'
    this.lastPongTimes.set(key, Date.now())

    const pingInterval = setInterval(() => {
      if (this.hostConnection) {
        this.hostConnection.send(PING)
      }
    }, HEARTBEAT_INTERVAL_MS)
    this.heartbeatIntervals.set(key, pingInterval)

    const checker = setInterval(() => {
      const lastPong = this.lastPongTimes.get(key) ?? 0
      if (Date.now() - lastPong > HEARTBEAT_TIMEOUT_MS) {
        this.stopHeartbeat(key)
        this.hostConnection?.close()
        this.hostConnection = null
        this.emit('host-stale')
      }
    }, HEARTBEAT_INTERVAL_MS)
    this.heartbeatCheckers.set(key, checker)
  }

  private stopHeartbeat(key: string): void {
    const pingInterval = this.heartbeatIntervals.get(key)
    if (pingInterval) {
      clearInterval(pingInterval)
      this.heartbeatIntervals.delete(key)
    }
    const checker = this.heartbeatCheckers.get(key)
    if (checker) {
      clearInterval(checker)
      this.heartbeatCheckers.delete(key)
    }
    this.lastPongTimes.delete(key)
  }

  private stopAllHeartbeats(): void {
    for (const interval of this.heartbeatIntervals.values()) clearInterval(interval)
    for (const checker of this.heartbeatCheckers.values()) clearInterval(checker)
    this.heartbeatIntervals.clear()
    this.heartbeatCheckers.clear()
    this.lastPongTimes.clear()
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
          this.startGuestHeartbeat()
          resolve()
        })

        conn.on('data', (data) => {
          // Handle internal heartbeat messages
          if (isInternalMessage(data)) {
            if (data.type === '__PONG') {
              this.lastPongTimes.set('__host', Date.now())
            } else if (data.type === '__PING') {
              conn.send(PONG)
            }
            return
          }

          if (this.isValidHostMessage(data)) {
            this.emit('host-message', data as HostMessage)
          } else {
            console.warn('[PeerService] Invalid host message received:', data)
          }
        })

        conn.on('close', () => {
          this.stopHeartbeat('__host')
          this.hostConnection = null
          this.emit('connection-error', new Error('Connection to host closed'))
        })

        conn.on('error', (err) => {
          clearTimeout(timeout)
          this.stopHeartbeat('__host')
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

  async reconnectToHost(roomCode: string): Promise<void> {
    if (this.isReconnecting || this.destroyed) return
    this.isReconnecting = true

    try {
      // Tear down existing peer without clearing listeners or destroyed flag
      this.stopAllHeartbeats()
      this.hostConnection = null
      this.peer?.destroy()
      this.peer = null

      // Re-use the same retry loop
      await this.joinAsGuest(roomCode)
    } finally {
      this.isReconnecting = false
    }
  }

  broadcastToAll(msg: HostMessage): number {
    let sent = 0
    for (const conn of this.connections.values()) {
      conn.send(msg)
      sent++
    }
    if (sent === 0) {
      console.warn('[PeerService] broadcastToAll: no connected guests')
    }
    return sent
  }

  sendToGuest(peerId: string, msg: HostMessage): boolean {
    const conn = this.connections.get(peerId)
    if (conn) {
      conn.send(msg)
      return true
    }
    console.warn(`[PeerService] sendToGuest: no connection for peer ${peerId}`)
    return false
  }

  sendToHost(msg: GuestMessage): boolean {
    if (this.hostConnection) {
      this.hostConnection.send(msg)
      return true
    }
    console.warn('[PeerService] sendToHost: no host connection')
    return false
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
    this.stopAllHeartbeats()
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
