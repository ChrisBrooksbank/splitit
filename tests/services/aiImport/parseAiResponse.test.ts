import { describe, it, expect } from 'vitest'
import { parseAiResponse } from '../../../src/services/aiImport/parseAiResponse'

describe('parseAiResponse', () => {
  it('parses valid JSON and converts price to pence', () => {
    const input = JSON.stringify({
      items: [{ name: 'Fish & Chips', price: 12.99, qty: 1 }],
    })
    const result = parseAiResponse(input)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Fish & Chips')
    expect(result[0].price).toBe(1299)
    expect(result[0].quantity).toBe(1)
    expect(result[0].confidence).toBe(1.0)
    expect(result[0].manuallyEdited).toBe(false)
    expect(result[0].id).toBeTruthy()
  })

  it('divides line total by qty for unit price', () => {
    const input = JSON.stringify({
      items: [{ name: 'Beer', price: 11.0, qty: 2 }],
    })
    const result = parseAiResponse(input)
    expect(result[0].price).toBe(550) // 1100 / 2
    expect(result[0].quantity).toBe(2)
  })

  it('handles JSON wrapped in markdown code fences', () => {
    const input = '```json\n{"items":[{"name":"Salad","price":8.50,"qty":1}]}\n```'
    const result = parseAiResponse(input)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Salad')
    expect(result[0].price).toBe(850)
  })

  it('handles code fences without json language tag', () => {
    const input = '```\n{"items":[{"name":"Soup","price":5.00,"qty":1}]}\n```'
    const result = parseAiResponse(input)
    expect(result[0].name).toBe('Soup')
    expect(result[0].price).toBe(500)
  })

  it('defaults qty to 1 when missing', () => {
    const input = JSON.stringify({
      items: [{ name: 'Pasta', price: 14.5 }],
    })
    const result = parseAiResponse(input)
    expect(result[0].quantity).toBe(1)
    expect(result[0].price).toBe(1450)
  })

  it('throws on invalid JSON', () => {
    expect(() => parseAiResponse('not json at all')).toThrow('Invalid JSON')
  })

  it('throws on missing items array', () => {
    expect(() => parseAiResponse('{"data":[]}')).toThrow('Unexpected format')
  })

  it('throws on items missing required fields', () => {
    const input = JSON.stringify({ items: [{ name: 'Pizza' }] })
    expect(() => parseAiResponse(input)).toThrow('Unexpected format')
  })

  it('throws on empty items array', () => {
    expect(() => parseAiResponse('{"items":[]}')).toThrow('No items found')
  })

  it('handles price rounding edge cases', () => {
    // 3 × item at £10.01 total → 1001 / 3 = 334 pence (rounded)
    const input = JSON.stringify({
      items: [{ name: 'Drink', price: 10.01, qty: 3 }],
    })
    const result = parseAiResponse(input)
    expect(result[0].price).toBe(334)
    expect(result[0].quantity).toBe(3)
  })

  it('handles multiple items', () => {
    const input = JSON.stringify({
      items: [
        { name: 'Burger', price: 15.0, qty: 1 },
        { name: 'Fries', price: 4.5, qty: 2 },
        { name: 'Coke', price: 2.0, qty: 3 },
      ],
    })
    const result = parseAiResponse(input)
    expect(result).toHaveLength(3)
    expect(result[0].price).toBe(1500)
    expect(result[1].price).toBe(225) // 450 / 2
    expect(result[2].price).toBe(67) // 200 / 3 = 66.67 → 67
  })
})
