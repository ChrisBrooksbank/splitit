import { describe, it, expect } from 'vitest'
import {
  PEER_CONFIG,
  HOST_TIMEOUT_MS,
  GUEST_TIMEOUT_MS,
  RETRY_CONFIG,
  retryDelayMs,
} from '../../../src/services/liveSession/iceConfig'

describe('iceConfig', () => {
  describe('PEER_CONFIG', () => {
    it('includes multiple STUN servers', () => {
      const servers = PEER_CONFIG.config!.iceServers as RTCIceServer[]
      const stunServers = servers.filter((s) =>
        (Array.isArray(s.urls) ? s.urls : [s.urls]).some((u) => u.startsWith('stun:'))
      )
      expect(stunServers.length).toBeGreaterThanOrEqual(2)
    })

    it('includes TURN servers with credentials', () => {
      const servers = PEER_CONFIG.config!.iceServers as RTCIceServer[]
      const turnServers = servers.filter((s) =>
        (Array.isArray(s.urls) ? s.urls : [s.urls]).some((u) => u.startsWith('turn:'))
      )
      expect(turnServers.length).toBeGreaterThanOrEqual(1)
      for (const server of turnServers) {
        expect(server.username).toBeTruthy()
        expect(server.credential).toBeTruthy()
      }
    })

    it('includes a TCP TURN server on port 443 for firewall traversal', () => {
      const servers = PEER_CONFIG.config!.iceServers as RTCIceServer[]
      const tcpTurn = servers.filter((s) =>
        (Array.isArray(s.urls) ? s.urls : [s.urls]).some(
          (u) => u.includes('transport=tcp') && u.includes(':443')
        )
      )
      expect(tcpTurn.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('timeouts', () => {
    it('host timeout is longer than 10s', () => {
      expect(HOST_TIMEOUT_MS).toBeGreaterThan(10_000)
    })

    it('guest timeout is longer than host timeout', () => {
      expect(GUEST_TIMEOUT_MS).toBeGreaterThan(HOST_TIMEOUT_MS)
    })
  })

  describe('retryDelayMs', () => {
    it('uses exponential backoff', () => {
      const d0 = retryDelayMs(0)
      const d1 = retryDelayMs(1)
      const d2 = retryDelayMs(2)

      expect(d0).toBe(RETRY_CONFIG.baseDelayMs)
      expect(d1).toBe(RETRY_CONFIG.baseDelayMs * 2)
      expect(d2).toBe(RETRY_CONFIG.baseDelayMs * 4)
    })
  })
})
