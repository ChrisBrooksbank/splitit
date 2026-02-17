/**
 * Receipt parser: converts raw OCR text into structured line items.
 *
 * Returns:
 *   lineItems[]        — parsed food/drink items with prices (integer cents)
 *   detectedSubtotal   — subtotal from receipt metadata (cents) or null
 *   detectedTax        — tax from receipt metadata (cents) or null
 *   detectedTotal      — grand total from receipt metadata (cents) or null
 */

import { nanoid } from 'nanoid'
import type { LineItem } from '../../types'
import {
  PRICE_PATTERN,
  QUANTITY_PATTERN,
  SKIP_PATTERNS,
  METADATA_PATTERNS,
  parsePriceCents,
} from '../../utils/receiptPatterns'

export interface ParsedReceipt {
  lineItems: LineItem[]
  detectedSubtotal: number | null
  detectedTax: number | null
  detectedTotal: number | null
}

/** Confidence thresholds */
const HIGH_CONFIDENCE = 1.0 // explicit $ prefix + standard format
const MEDIUM_CONFIDENCE = 0.75 // no $ prefix but clean number
const LOW_CONFIDENCE = 0.5 // had OCR digit fixes applied

/**
 * Parse raw OCR text from a restaurant receipt.
 */
export function parseReceipt(ocrText: string): ParsedReceipt {
  const lines = ocrText.split(/\r?\n/)

  const lineItems: LineItem[] = []
  let detectedSubtotal: number | null = null
  let detectedTax: number | null = null
  let detectedTotal: number | null = null

  for (const rawLine of lines) {
    const line = rawLine.trim()

    // Skip blank / noise lines
    if (shouldSkipLine(line)) continue

    // Check for metadata (subtotal / tax / total / tip / payment)
    const metadata = extractMetadata(line)
    if (metadata) {
      if (metadata.key === 'subtotal' && detectedSubtotal === null) {
        detectedSubtotal = metadata.cents
      } else if (metadata.key === 'tax' && detectedTax === null) {
        detectedTax = metadata.cents
      } else if (metadata.key === 'total' && detectedTotal === null) {
        // Only treat as grand total if it's labeled "total" (not "subtotal")
        // and is >= any previously seen subtotal
        if (
          detectedSubtotal === null ||
          metadata.cents === null ||
          metadata.cents >= detectedSubtotal
        ) {
          detectedTotal = metadata.cents
        }
      }
      // tip, change, payment, discount lines are intentionally not stored
      continue
    }

    // Try to parse as a line item
    const item = extractLineItem(line)
    if (item) {
      lineItems.push(item)
    }
  }

  return { lineItems, detectedSubtotal, detectedTax, detectedTotal }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function shouldSkipLine(line: string): boolean {
  if (line.length === 0) return true
  return SKIP_PATTERNS.some((p) => p.test(line))
}

function extractMetadata(
  line: string
): { key: (typeof METADATA_PATTERNS)[number]['key']; cents: number | null } | null {
  for (const { key, pattern } of METADATA_PATTERNS) {
    if (pattern.test(line)) {
      // Extract price from the line (may not always have one, e.g. payment method)
      const priceMatch = line.match(PRICE_PATTERN)
      const cents = priceMatch ? parsePriceCents(priceMatch[1]) : null
      return { key, cents }
    }
  }
  return null
}

function extractLineItem(line: string): LineItem | null {
  // Must have a price at the end of the line
  const priceMatch = line.match(PRICE_PATTERN)
  if (!priceMatch) return null

  const rawPriceStr = priceMatch[1]

  // Determine if the line had a $ prefix (affects confidence)
  const hasCurrencySymbol = /\$/.test(line.slice(0, line.lastIndexOf(rawPriceStr)))

  // Check for OCR digit fixes
  const hadOcrFix =
    /[lIoO]/.test(rawPriceStr) &&
    // At least one of them is in a numeric position (next to digits or decimal)
    /(?:\d[lIoO]|[lIoO]\d|[lIoO]\.)/.test(rawPriceStr)

  const cents = parsePriceCents(rawPriceStr)
  if (cents === null || cents <= 0) return null

  // Remove the price portion from the end of the line to get the name part
  const nameRaw = line.slice(0, line.length - priceMatch[0].length).trim()
  if (nameRaw.length === 0) return null

  // Extract quantity prefix (e.g. "2x ", "3 X ")
  const qtyMatch = nameRaw.match(QUANTITY_PATTERN)
  let quantity = 1
  let name = nameRaw

  if (qtyMatch) {
    quantity = parseInt(qtyMatch[1], 10)
    name = nameRaw.slice(qtyMatch[0].length).trim()
  }

  // The name must have at least one letter to be a real item
  if (!/[a-zA-Z]/.test(name)) return null

  // Trim trailing punctuation / noise from name
  name = name.replace(/[.\-–—:,]+$/, '').trim()

  // Confidence: high if $ present, medium if plain number, low if OCR fix applied
  let confidence = hasCurrencySymbol ? HIGH_CONFIDENCE : MEDIUM_CONFIDENCE
  if (hadOcrFix) confidence = LOW_CONFIDENCE

  return {
    id: nanoid(),
    name,
    price: cents,
    quantity,
    confidence,
    manuallyEdited: false,
  }
}
