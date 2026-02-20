import type { PeerJSOption } from 'peerjs'

/**
 * ICE (Interactive Connectivity Establishment) configuration for PeerJS.
 *
 * Provides multiple STUN servers for redundancy and free TURN servers
 * from Open Relay Project (metered.ca) for NAT traversal behind
 * symmetric NATs and corporate firewalls.
 */
const iceServers: RTCIceServer[] = [
  // STUN servers — multiple for redundancy
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },

  // TURN servers — Open Relay Project (metered.ca) free tier
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  // TCP on port 443 — traverses most corporate firewalls
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
]

/** PeerJS config with ICE servers and extended timeouts */
export const PEER_CONFIG: PeerJSOption = {
  config: {
    iceServers,
    iceCandidatePoolSize: 10,
  },
}

/** Heartbeat interval — send PING every 15 s */
export const HEARTBEAT_INTERVAL_MS = 15_000

/** If no PONG received within 45 s, consider the peer stale */
export const HEARTBEAT_TIMEOUT_MS = 45_000

/** Timeout for host to register with signaling server (ms) */
export const HOST_TIMEOUT_MS = 20_000

/** Timeout for guest to connect to host (ms) — longer for TURN negotiation */
export const GUEST_TIMEOUT_MS = 25_000

/** Retry configuration */
export const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 2_000,
} as const

/** Calculate delay for a given retry attempt (exponential backoff) */
export function retryDelayMs(attempt: number): number {
  return RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt)
}
