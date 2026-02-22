/**
 * SplitIt WebSocket Relay Server (Deno Deploy)
 *
 * A stateless relay that forwards JSON messages between a host and guests
 * in ephemeral rooms. No data storage, no auth, no business logic.
 */

interface Room {
  host: WebSocket
  guests: Map<string, WebSocket>
  lastActivity: number
}

const rooms = new Map<string, Room>()

const ROOM_CODE_LENGTH = 8
const ROOM_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
const MAX_JOIN_FAILURES = 5 // per-connection limit before disconnect
const JOIN_FAILURE_WINDOW_MS = 60_000 // sliding window for rate limiting

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/0/1 for readability
  const randomBytes = new Uint8Array(ROOM_CODE_LENGTH)
  crypto.getRandomValues(randomBytes)
  let code = ''
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += chars[randomBytes[i] % chars.length]
  }
  return code
}

function uniqueRoomCode(): string {
  let code = generateRoomCode()
  let attempts = 0
  while (rooms.has(code) && attempts < 100) {
    code = generateRoomCode()
    attempts++
  }
  return code
}

let peerCounter = 0
function generatePeerId(): string {
  return `peer-${Date.now()}-${++peerCounter}`
}

function send(ws: WebSocket, msg: Record<string, unknown>): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg))
  }
}

// Track failed join attempts per connection to prevent room code enumeration
const joinFailures: { timestamp: number; ws: WebSocket }[] = []

function checkJoinRateLimit(ws: WebSocket): boolean {
  const now = Date.now()
  // Prune old entries outside the window
  while (joinFailures.length > 0 && now - joinFailures[0].timestamp > JOIN_FAILURE_WINDOW_MS) {
    joinFailures.shift()
  }
  // Count failures for this specific WebSocket connection
  const failures = joinFailures.filter((f) => f.ws === ws).length
  return failures < MAX_JOIN_FAILURES
}

function recordJoinFailure(ws: WebSocket): void {
  joinFailures.push({ timestamp: Date.now(), ws })
}

function handleSocket(ws: WebSocket): void {
  let myPeerId: string | null = null
  let myRoomCode: string | null = null
  let isHost = false

  ws.addEventListener('message', (event) => {
    let msg: Record<string, unknown>
    try {
      msg = JSON.parse(event.data as string)
    } catch {
      send(ws, { type: 'ERROR', message: 'Invalid JSON' })
      return
    }

    switch (msg.type) {
      case 'CREATE_ROOM': {
        if (myRoomCode) {
          send(ws, { type: 'ERROR', message: 'Already in a room' })
          return
        }
        const roomCode = uniqueRoomCode()
        myPeerId = generatePeerId()
        myRoomCode = roomCode
        isHost = true

        rooms.set(roomCode, {
          host: ws,
          guests: new Map(),
          lastActivity: Date.now(),
        })

        send(ws, { type: 'ROOM_CREATED', roomCode, peerId: myPeerId })
        break
      }

      case 'JOIN_ROOM': {
        if (myRoomCode) {
          send(ws, { type: 'ERROR', message: 'Already in a room' })
          return
        }
        if (!checkJoinRateLimit(ws)) {
          send(ws, { type: 'ERROR', message: 'Too many attempts. Please try again later.' })
          ws.close()
          return
        }
        const code = msg.roomCode as string
        const room = rooms.get(code)
        if (!room) {
          recordJoinFailure(ws)
          send(ws, { type: 'ERROR', message: 'Room not found' })
          return
        }

        myPeerId = generatePeerId()
        myRoomCode = code
        isHost = false

        room.guests.set(myPeerId, ws)
        room.lastActivity = Date.now()

        send(ws, { type: 'JOINED', peerId: myPeerId })
        send(room.host, { type: 'PEER_JOINED', peerId: myPeerId })
        break
      }

      case 'RELAY': {
        if (!myRoomCode || !myPeerId) {
          send(ws, { type: 'ERROR', message: 'Not in a room' })
          return
        }
        const room = rooms.get(myRoomCode)
        if (!room) return

        room.lastActivity = Date.now()
        const payload = msg.payload

        if (isHost) {
          // Host sending to a specific guest or all guests
          const targetPeerId = msg.to as string | undefined
          if (targetPeerId) {
            const guest = room.guests.get(targetPeerId)
            if (guest) {
              send(guest, { type: 'RELAY', from: myPeerId, payload })
            }
          } else {
            // Broadcast to all guests
            for (const [guestId, guestWs] of room.guests) {
              send(guestWs, { type: 'RELAY', from: myPeerId, payload })
              void guestId // used as map key
            }
          }
        } else {
          // Guest sending to host
          send(room.host, { type: 'RELAY', from: myPeerId, payload })
        }
        break
      }

      default:
        send(ws, { type: 'ERROR', message: `Unknown message type: ${msg.type}` })
    }
  })

  ws.addEventListener('close', () => {
    if (!myRoomCode || !myPeerId) return
    const room = rooms.get(myRoomCode)
    if (!room) return

    if (isHost) {
      // Notify all guests and close the room
      for (const guestWs of room.guests.values()) {
        send(guestWs, { type: 'ERROR', message: 'Host disconnected' })
        guestWs.close()
      }
      rooms.delete(myRoomCode)
    } else {
      room.guests.delete(myPeerId)
      send(room.host, { type: 'PEER_LEFT', peerId: myPeerId })
    }
  })
}

// Periodic cleanup of stale rooms
setInterval(() => {
  const now = Date.now()
  for (const [code, room] of rooms) {
    if (now - room.lastActivity > ROOM_TTL_MS) {
      send(room.host, { type: 'ERROR', message: 'Room expired' })
      room.host.close()
      for (const guestWs of room.guests.values()) {
        send(guestWs, { type: 'ERROR', message: 'Room expired' })
        guestWs.close()
      }
      rooms.delete(code)
    }
  }
}, CLEANUP_INTERVAL_MS)

Deno.serve({ port: 8000 }, (req) => {
  const url = new URL(req.url)

  // Health check
  if (url.pathname === '/health') {
    return new Response(JSON.stringify({ status: 'ok', rooms: rooms.size }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // WebSocket upgrade
  if (req.headers.get('upgrade')?.toLowerCase() === 'websocket') {
    const { socket, response } = Deno.upgradeWebSocket(req)
    handleSocket(socket)
    return response
  }

  return new Response('SplitIt Relay Server', { status: 200 })
})
