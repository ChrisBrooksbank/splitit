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

  it('accepts GBP string prices and strips quantity prefixes from names', () => {
    const input = JSON.stringify({
      items: [{ name: '2x Lager', price: '£11.00', qty: 2 }],
    })
    const result = parseAiResponse(input)
    expect(result[0].name).toBe('Lager')
    expect(result[0].price).toBe(550)
    expect(result[0].quantity).toBe(2)
  })

  it('filters metadata lines if the AI includes them', () => {
    const input = JSON.stringify({
      items: [
        { name: 'Fish & Chips', price: 15.95, qty: 1 },
        { name: 'VAT Included', price: 8.85, qty: 1 },
        { name: '12.5% Service Charge', price: 6.64, qty: 1 },
        { name: 'DRINK', price: 28.1, qty: 1 },
        { name: 'FOOD', price: 50.8, qty: 1 },
        { name: 'Total', price: 59.74, qty: 1 },
        { name: 'Contactless', price: 59.74, qty: 1 },
        { name: '10% Loyalty Discount', price: -2.46, qty: 1 },
      ],
    })
    const result = parseAiResponse(input)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Fish & Chips')
  })

  it('handles the structured AI version of the OCR variety bills', () => {
    const input = JSON.stringify({
      items: [
        { name: '2 CAMDEN HELLS', price: 12.4, qty: 2 },
        { name: 'Fish & Chips', price: 15.95, qty: 1 },
        { name: 'Mushy Peas', price: 2.5, qty: 1 },
        { name: 'DRINK', price: 21.5, qty: 1 },
        { name: 'FOOD', price: 39.2, qty: 1 },
        { name: 'Subtotal', price: 60.7, qty: 1 },
        { name: 'VAT Included', price: 10.12, qty: 1 },
        { name: 'Service %12.50', price: 7.59, qty: 1 },
        { name: 'Contactless', price: 68.29, qty: 1 },
        { name: '1 Sticky Toffee Pudding', price: 7.25, qty: 1 },
      ],
    })
    const result = parseAiResponse(input)

    expect(result.map((item) => item.name)).toEqual([
      'CAMDEN HELLS',
      'Fish & Chips',
      'Mushy Peas',
      'Sticky Toffee Pudding',
    ])
    expect(result[0].quantity).toBe(2)
    expect(result[0].price).toBe(620)
    expect(result[3].price).toBe(725)
  })
})
