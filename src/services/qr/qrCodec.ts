import { nanoid } from 'nanoid'
import type { LineItem, Person } from '../../types'
import type { PersonTip } from '../../store/tipStore'

// --- QR Payload Schema ---

export interface QRPayload {
  v: 1
  r?: string // restaurant name
  i: Array<[string, number, number]> // [name, priceCents, qty]
  p: Array<[string, string]> // [name, color]
  a: Record<number, number[]> // itemIdx → personIdx[]
  o?: Record<number, Record<number, number>> // portions (only if custom splits)
  t?: Record<number, [string, number]> // personIdx → ['p'|'f', value]
}

export class BillTooLargeError extends Error {
  byteCount: number
  maxBytes: number

  constructor(byteCount: number, maxBytes: number) {
    super(`QR data too large: ${byteCount} bytes (max ${maxBytes})`)
    this.name = 'BillTooLargeError'
    this.byteCount = byteCount
    this.maxBytes = maxBytes
  }
}

const QR_PREFIX = 'splitit:gz:'
const QR_PREFIX_RAW = 'splitit:raw:'
const MAX_QR_BYTES = 2900

// --- Compression helpers ---

async function gzipCompress(data: string): Promise<Uint8Array> {
  const blob = new Blob([new TextEncoder().encode(data)])
  const stream = blob.stream().pipeThrough(new CompressionStream('gzip'))
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}

async function gzipDecompress(data: Uint8Array): Promise<string> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'))
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return new TextDecoder().decode(result)
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// --- Encode ---

export async function encodeForQR(
  lineItems: LineItem[],
  people: Person[],
  assignments: Record<string, string[]>,
  portions: Record<string, Record<string, number>>,
  personTips: Record<string, PersonTip>,
  restaurantName?: string
): Promise<string> {
  // Build index maps: id → sequential index
  const itemIdToIdx = new Map<string, number>()
  lineItems.forEach((item, idx) => itemIdToIdx.set(item.id, idx))

  const personIdToIdx = new Map<string, number>()
  people.forEach((person, idx) => personIdToIdx.set(person.id, idx))

  const payload: QRPayload = {
    v: 1,
    i: lineItems.map((item) => [item.name, item.price, item.quantity]),
    p: people.map((person) => [person.name, person.color]),
    a: {},
  }

  if (restaurantName) {
    payload.r = restaurantName
  }

  // Assignments: itemIdx → personIdx[]
  for (const [itemId, personIds] of Object.entries(assignments)) {
    const itemIdx = itemIdToIdx.get(itemId)
    if (itemIdx === undefined) continue
    const personIdxs = personIds
      .map((pid) => personIdToIdx.get(pid))
      .filter((idx): idx is number => idx !== undefined)
    if (personIdxs.length > 0) {
      payload.a[itemIdx] = personIdxs
    }
  }

  // Portions (only if any custom splits exist)
  const portionEntries: [number, Record<number, number>][] = []
  for (const [itemId, personPortions] of Object.entries(portions)) {
    const itemIdx = itemIdToIdx.get(itemId)
    if (itemIdx === undefined) continue
    if (Object.keys(personPortions).length === 0) continue
    const mapped: Record<number, number> = {}
    for (const [personId, weight] of Object.entries(personPortions)) {
      const personIdx = personIdToIdx.get(personId)
      if (personIdx !== undefined) {
        mapped[personIdx] = weight
      }
    }
    if (Object.keys(mapped).length > 0) {
      portionEntries.push([itemIdx, mapped])
    }
  }
  if (portionEntries.length > 0) {
    payload.o = Object.fromEntries(portionEntries)
  }

  // Tips
  const tipEntries: [number, [string, number]][] = []
  for (const [personId, tip] of Object.entries(personTips)) {
    const personIdx = personIdToIdx.get(personId)
    if (personIdx === undefined) continue
    const mode = tip.mode === 'percentage' ? 'p' : 'f'
    const value = tip.mode === 'percentage' ? tip.percentage : tip.fixedAmount
    tipEntries.push([personIdx, [mode, value]])
  }
  if (tipEntries.length > 0) {
    payload.t = Object.fromEntries(tipEntries)
  }

  const json = JSON.stringify(payload)

  // Try gzip compression first, fall back to raw JSON
  let encoded: string
  try {
    const compressed = await gzipCompress(json)
    const base64 = uint8ToBase64(compressed)
    encoded = QR_PREFIX + base64
    // If compression makes it bigger, use raw
    const rawEncoded = QR_PREFIX_RAW + json
    if (rawEncoded.length < encoded.length) {
      encoded = rawEncoded
    }
  } catch {
    // CompressionStream not available
    encoded = QR_PREFIX_RAW + json
  }

  const byteCount = new TextEncoder().encode(encoded).length
  if (byteCount > MAX_QR_BYTES) {
    throw new BillTooLargeError(byteCount, MAX_QR_BYTES)
  }

  return encoded
}

// --- Decode ---

export async function decodeFromQR(qrData: string): Promise<QRPayload> {
  let json: string

  if (qrData.startsWith(QR_PREFIX)) {
    const base64 = qrData.slice(QR_PREFIX.length)
    const compressed = base64ToUint8(base64)
    json = await gzipDecompress(compressed)
  } else if (qrData.startsWith(QR_PREFIX_RAW)) {
    json = qrData.slice(QR_PREFIX_RAW.length)
  } else {
    throw new Error('Not a SplitIt QR code')
  }

  const payload = JSON.parse(json) as QRPayload
  validatePayload(payload)
  return payload
}

function validatePayload(payload: QRPayload): void {
  if (payload.v !== 1) {
    throw new Error(`Unsupported QR version: ${payload.v}`)
  }
  if (!Array.isArray(payload.i) || payload.i.length === 0) {
    throw new Error('QR code contains no items')
  }
  if (!Array.isArray(payload.p) || payload.p.length === 0) {
    throw new Error('QR code contains no people')
  }
  for (const item of payload.i) {
    if (!Array.isArray(item) || item.length !== 3) {
      throw new Error('Invalid item format')
    }
    if (typeof item[0] !== 'string' || typeof item[1] !== 'number' || typeof item[2] !== 'number') {
      throw new Error('Invalid item data types')
    }
  }
  for (const person of payload.p) {
    if (!Array.isArray(person) || person.length !== 2) {
      throw new Error('Invalid person format')
    }
    if (typeof person[0] !== 'string' || typeof person[1] !== 'string') {
      throw new Error('Invalid person data types')
    }
  }
}

// --- Convert payload to store data ---

export interface StoreData {
  lineItems: LineItem[]
  people: Person[]
  assignments: Record<string, string[]>
  portions: Record<string, Record<string, number>>
  personTips: Record<string, PersonTip>
  restaurantName?: string
}

export function payloadToStoreData(payload: QRPayload): StoreData {
  // Generate fresh IDs
  const itemIds = payload.i.map(() => nanoid())
  const personIds = payload.p.map(() => nanoid())

  const lineItems: LineItem[] = payload.i.map(([name, price, quantity], idx) => ({
    id: itemIds[idx],
    name,
    price,
    quantity,
    confidence: 1.0,
    manuallyEdited: false,
  }))

  const people: Person[] = payload.p.map(([name, color], idx) => ({
    id: personIds[idx],
    name,
    color,
  }))

  // Map index-based assignments back to ID-based
  const assignments: Record<string, string[]> = {}
  for (const [itemIdxStr, personIdxs] of Object.entries(payload.a)) {
    const itemId = itemIds[Number(itemIdxStr)]
    if (!itemId) continue
    assignments[itemId] = personIdxs
      .map((pidx) => personIds[pidx])
      .filter((id): id is string => id !== undefined)
  }

  // Map index-based portions back to ID-based
  const portions: Record<string, Record<string, number>> = {}
  if (payload.o) {
    for (const [itemIdxStr, personPortions] of Object.entries(payload.o)) {
      const itemId = itemIds[Number(itemIdxStr)]
      if (!itemId) continue
      const mapped: Record<string, number> = {}
      for (const [personIdxStr, weight] of Object.entries(personPortions)) {
        const personId = personIds[Number(personIdxStr)]
        if (personId) {
          mapped[personId] = weight
        }
      }
      if (Object.keys(mapped).length > 0) {
        portions[itemId] = mapped
      }
    }
  }

  // Map index-based tips back to ID-based
  const personTips: Record<string, PersonTip> = {}
  if (payload.t) {
    for (const [personIdxStr, [mode, value]] of Object.entries(payload.t)) {
      const personId = personIds[Number(personIdxStr)]
      if (!personId) continue
      personTips[personId] = {
        personId,
        mode: mode === 'p' ? 'percentage' : 'fixed',
        percentage: mode === 'p' ? value : 12.5,
        fixedAmount: mode === 'f' ? value : 0,
      }
    }
  }

  return {
    lineItems,
    people,
    assignments,
    portions,
    personTips,
    ...(payload.r ? { restaurantName: payload.r } : {}),
  }
}

// --- Utility ---

export function getQRByteCount(data: string): number {
  return new TextEncoder().encode(data).length
}
