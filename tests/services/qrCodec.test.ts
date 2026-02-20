import { describe, it, expect } from 'vitest'
import {
  encodeForQR,
  decodeFromQR,
  payloadToStoreData,
  BillTooLargeError,
  getQRByteCount,
} from '../../src/services/qr/qrCodec'
import type { LineItem, Person } from '../../src/types'
import type { PersonTip } from '../../src/store/tipStore'

function makeItems(count: number): LineItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i}`,
    name: `Item ${i + 1}`,
    price: (i + 1) * 100, // 100, 200, 300... cents
    quantity: 1,
    confidence: 1.0,
    manuallyEdited: false,
  }))
}

function makePeople(count: number): Person[] {
  const colors = [
    '#0057B8',
    '#C62828',
    '#2E7D32',
    '#6A1B9A',
    '#EF6C00',
    '#00695C',
    '#AD1457',
    '#4527A0',
  ]
  return Array.from({ length: count }, (_, i) => ({
    id: `person-${i}`,
    name: `Person ${i + 1}`,
    color: colors[i % colors.length],
  }))
}

describe('QR Codec', () => {
  describe('encode/decode round-trip', () => {
    it('round-trips a simple bill', async () => {
      const items = makeItems(3)
      const people = makePeople(2)
      const assignments: Record<string, string[]> = {
        'item-0': ['person-0'],
        'item-1': ['person-0', 'person-1'],
        'item-2': ['person-1'],
      }
      const portions: Record<string, Record<string, number>> = {}
      const personTips: Record<string, PersonTip> = {}

      const encoded = await encodeForQR(items, people, assignments, portions, personTips)
      expect(encoded).toMatch(/^splitit:(gz|raw):/)

      const payload = await decodeFromQR(encoded)
      expect(payload.v).toBe(1)
      expect(payload.i).toHaveLength(3)
      expect(payload.p).toHaveLength(2)
      expect(payload.i[0]).toEqual(['Item 1', 100, 1])
      expect(payload.a[0]).toEqual([0]) // item-0 → person-0
      expect(payload.a[1]).toEqual([0, 1]) // item-1 → both
    })

    it('round-trips with restaurant name', async () => {
      const items = makeItems(1)
      const people = makePeople(1)
      const assignments: Record<string, string[]> = { 'item-0': ['person-0'] }

      const encoded = await encodeForQR(items, people, assignments, {}, {}, 'Pizza Palace')
      const payload = await decodeFromQR(encoded)
      expect(payload.r).toBe('Pizza Palace')
    })

    it('round-trips with custom portions', async () => {
      const items = makeItems(2)
      const people = makePeople(2)
      const assignments: Record<string, string[]> = {
        'item-0': ['person-0', 'person-1'],
      }
      const portions: Record<string, Record<string, number>> = {
        'item-0': { 'person-0': 2, 'person-1': 3 },
      }

      const encoded = await encodeForQR(items, people, assignments, portions, {})
      const payload = await decodeFromQR(encoded)
      expect(payload.o).toBeDefined()
      expect(payload.o![0]).toEqual({ 0: 2, 1: 3 })
    })

    it('round-trips with tips', async () => {
      const items = makeItems(1)
      const people = makePeople(2)
      const assignments: Record<string, string[]> = { 'item-0': ['person-0', 'person-1'] }
      const personTips: Record<string, PersonTip> = {
        'person-0': { personId: 'person-0', mode: 'percentage', percentage: 20, fixedAmount: 0 },
        'person-1': { personId: 'person-1', mode: 'fixed', percentage: 12.5, fixedAmount: 500 },
      }

      const encoded = await encodeForQR(items, people, assignments, {}, personTips)
      const payload = await decodeFromQR(encoded)
      expect(payload.t).toBeDefined()
      expect(payload.t![0]).toEqual(['p', 20])
      expect(payload.t![1]).toEqual(['f', 500])
    })
  })

  describe('payload validation', () => {
    it('rejects non-SplitIt QR data', async () => {
      await expect(decodeFromQR('https://example.com')).rejects.toThrow('Not a SplitIt QR code')
    })

    it('rejects invalid JSON', async () => {
      await expect(decodeFromQR('splitit:raw:{invalid')).rejects.toThrow()
    })

    it('rejects missing items', async () => {
      const data = 'splitit:raw:' + JSON.stringify({ v: 1, i: [], p: [['Alice', '#fff']], a: {} })
      await expect(decodeFromQR(data)).rejects.toThrow('no items')
    })

    it('rejects missing people', async () => {
      const data = 'splitit:raw:' + JSON.stringify({ v: 1, i: [['Burger', 1000, 1]], p: [], a: {} })
      await expect(decodeFromQR(data)).rejects.toThrow('no people')
    })

    it('rejects unsupported version', async () => {
      const data =
        'splitit:raw:' +
        JSON.stringify({ v: 99, i: [['Burger', 1000, 1]], p: [['Alice', '#fff']], a: {} })
      await expect(decodeFromQR(data)).rejects.toThrow('Unsupported QR version')
    })
  })

  describe('payloadToStoreData', () => {
    it('produces valid objects with fresh IDs', () => {
      const payload = {
        v: 1 as const,
        r: 'Sushi Place',
        i: [
          ['Salmon Roll', 1200, 1] as [string, number, number],
          ['Miso Soup', 400, 2] as [string, number, number],
        ],
        p: [['Alice', '#0057B8'] as [string, string], ['Bob', '#C62828'] as [string, string]],
        a: { 0: [0, 1], 1: [1] },
      }

      const data = payloadToStoreData(payload)

      expect(data.restaurantName).toBe('Sushi Place')
      expect(data.lineItems).toHaveLength(2)
      expect(data.people).toHaveLength(2)

      // IDs should be fresh nanoid strings (not the original indexes)
      expect(data.lineItems[0].id).not.toBe('0')
      expect(data.lineItems[0].id.length).toBeGreaterThan(5)
      expect(data.people[0].id).not.toBe('0')

      // Item data preserved
      expect(data.lineItems[0].name).toBe('Salmon Roll')
      expect(data.lineItems[0].price).toBe(1200)
      expect(data.lineItems[1].quantity).toBe(2)

      // People data preserved
      expect(data.people[0].name).toBe('Alice')
      expect(data.people[1].color).toBe('#C62828')

      // Assignments mapped to new IDs
      const item0Id = data.lineItems[0].id
      const item1Id = data.lineItems[1].id
      const alice = data.people[0].id
      const bob = data.people[1].id
      expect(data.assignments[item0Id]).toEqual([alice, bob])
      expect(data.assignments[item1Id]).toEqual([bob])
    })

    it('maps portions to new IDs', () => {
      const payload = {
        v: 1 as const,
        i: [['Steak', 3000, 1] as [string, number, number]],
        p: [['Alice', '#0057B8'] as [string, string], ['Bob', '#C62828'] as [string, string]],
        a: { 0: [0, 1] },
        o: { 0: { 0: 2, 1: 3 } },
      }

      const data = payloadToStoreData(payload)
      const itemId = data.lineItems[0].id
      const alice = data.people[0].id
      const bob = data.people[1].id

      expect(data.portions[itemId][alice]).toBe(2)
      expect(data.portions[itemId][bob]).toBe(3)
    })

    it('maps tips to new IDs', () => {
      const payload = {
        v: 1 as const,
        i: [['Burger', 1000, 1] as [string, number, number]],
        p: [['Alice', '#0057B8'] as [string, string]],
        a: { 0: [0] },
        t: { 0: ['p' as string, 15] as [string, number] },
      }

      const data = payloadToStoreData(payload)
      const alice = data.people[0].id

      expect(data.personTips[alice]).toBeDefined()
      expect(data.personTips[alice].mode).toBe('percentage')
      expect(data.personTips[alice].percentage).toBe(15)
    })
  })

  describe('size limits', () => {
    it('throws BillTooLargeError for very large bills', async () => {
      // Create a bill with very long item names to exceed limit
      const items: LineItem[] = Array.from({ length: 50 }, (_, i) => ({
        id: `item-${i}`,
        name: `Very Long Item Name That Takes Up Space Number ${i + 1} With Extra Text`,
        price: (i + 1) * 1000,
        quantity: i + 1,
        confidence: 1.0,
        manuallyEdited: false,
      }))
      const people = makePeople(8)
      const assignments: Record<string, string[]> = {}
      for (const item of items) {
        assignments[item.id] = people.map((p) => p.id)
      }

      await expect(encodeForQR(items, people, assignments, {}, {})).rejects.toThrow(
        BillTooLargeError
      )
    })

    it('getQRByteCount returns correct byte count', () => {
      expect(getQRByteCount('hello')).toBe(5)
      expect(getQRByteCount('')).toBe(0)
    })
  })
})
