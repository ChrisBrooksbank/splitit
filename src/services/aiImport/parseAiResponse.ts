import { nanoid } from 'nanoid'
import type { LineItem } from '../../types'

interface AiItem {
  name: string
  price: number
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

  if (parsed.items.length === 0) {
    throw new Error('No items found in the AI response.')
  }

  return parsed.items.map((item) => {
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
      typeof (item as Record<string, unknown>).price === 'number'
  )
}
