import { nanoid } from 'nanoid'
import type { LineItem } from '../../types'

interface AiItem {
  name: string
  price: number | string
  qty?: number
}

interface AiResponse {
  items: AiItem[]
}

/**
 * Parse an AI assistant's JSON response into LineItem[].
 * Handles markdown code fences and validates structure.
 * Converts price (line total in £) to unit price in pence.
 */
export function parseAiResponse(text: string): LineItem[] {
  const stripped = stripCodeFences(text.trim())

  let parsed: unknown
  try {
    parsed = JSON.parse(stripped)
  } catch {
    throw new Error(
      'Invalid JSON — could not parse the AI response. Make sure you copied the entire response.'
    )
  }

  if (!isAiResponse(parsed)) {
    throw new Error(
      'Unexpected format — expected {"items":[...]} with name and price for each item.'
    )
  }

  const items = parsed.items
    .map(normalizeAiItem)
    .filter((item): item is NormalizedAiItem => item !== null)

  if (items.length === 0) {
    throw new Error('No items found in the AI response.')
  }

  return items.map((item) => {
    const qty = typeof item.qty === 'number' && item.qty >= 1 ? Math.round(item.qty) : 1
    const lineTotalPence = Math.round(item.price * 100)
    const unitPricePence = Math.round(lineTotalPence / qty)

    return {
      id: nanoid(),
      name: item.name,
      price: unitPricePence,
      quantity: qty,
      confidence: 1.0,
      manuallyEdited: false,
    }
  })
}

interface NormalizedAiItem {
  name: string
  price: number
  qty?: number
}

const NON_ITEM_NAME_PATTERN =
  /\b(?:sub\s*total|subtotal|total|balance|amount\s*due|vat|tax|service|svc|gratuity|tip|discount|voucher|coupon|promo|loyalty|card|cash|visa|mastercard|amex|change|payment|paid)\b/i
const CATEGORY_TOTAL_NAME_PATTERN = /^(?:FOOD|DRINK|DRINKS)$/

function normalizeAiItem(item: AiItem): NormalizedAiItem | null {
  const name = item.name
    .trim()
    .replace(/^\d+\s*x\s+/i, '')
    .trim()
  const price = normalizePrice(item.price)

  if (
    name.length === 0 ||
    NON_ITEM_NAME_PATTERN.test(name) ||
    CATEGORY_TOTAL_NAME_PATTERN.test(name.trim())
  ) {
    return null
  }
  if (price === null || price <= 0) return null

  return { name, price, qty: item.qty }
}

function normalizePrice(price: number | string): number | null {
  if (typeof price === 'number') {
    return Number.isFinite(price) ? price : null
  }

  const normalized = price.replace(/[£,\s]/g, '')
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(normalized)) return null

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function stripCodeFences(text: string): string {
  // Match ```json ... ``` or ``` ... ```
  const fenceMatch = text.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/m)
  if (fenceMatch) {
    return fenceMatch[1].trim()
  }
  return text
}

function isAiResponse(value: unknown): value is AiResponse {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  if (!Array.isArray(obj.items)) return false
  return obj.items.every(
    (item: unknown) =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as Record<string, unknown>).name === 'string' &&
      (typeof (item as Record<string, unknown>).price === 'number' ||
        typeof (item as Record<string, unknown>).price === 'string')
  )
}
