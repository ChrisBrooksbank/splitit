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
  MODIFIER_PATTERN,
  parsePriceCents,
} from '../../utils/receiptPatterns'

export interface ParsedReceipt {
  lineItems: LineItem[]
  detectedSubtotal: number | null
  detectedTax: number | null
  detectedTotal: number | null
  validationWarnings: string[]
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

    // Check for modifier lines (indented with -/+/*)
    const modifierItem = extractModifierItem(rawLine)
    if (modifierItem !== undefined) {
      if (modifierItem !== null) {
        lineItems.push(modifierItem)
      }
      // null = modifier without price (kitchen instruction), skip
      continue
    }

    // Try to parse as a line item
    const item = extractLineItem(line)
    if (item) {
      lineItems.push(item)
      continue
    }

    // Multi-line joining: if no price, not noise/metadata, and follows a parsed item,
    // append as continuation of previous item name
    if (lineItems.length > 0 && isContinuationLine(rawLine, line)) {
      const prev = lineItems[lineItems.length - 1]
      prev.name = prev.name + ' ' + line
    }
  }

  // Post-OCR validation: compare item sum vs detected subtotal
  const validationWarnings: string[] = []
  if (lineItems.length > 0 && detectedSubtotal !== null) {
    const itemsTotal = lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const diffCents = Math.abs(itemsTotal - detectedSubtotal)
    if (diffCents > 50) {
      const itemsFmt = (itemsTotal / 100).toFixed(2)
      const subFmt = (detectedSubtotal / 100).toFixed(2)
      validationWarnings.push(
        `Items total (${itemsFmt}) differs from receipt subtotal (${subFmt}) — some items may be missing or misread`
      )
    }
  }

  return { lineItems, detectedSubtotal, detectedTax, detectedTotal, validationWarnings }
}

/**
 * Merge multiple parsed receipts (from multi-photo OCR) into one,
 * deduplicating items that appear in overlapping photos.
 * Only used for multi-photo; single-photo preserves intentional duplicates.
 */
export function mergeReceipts(receipts: ParsedReceipt[]): ParsedReceipt {
  // Collect all line items, dedup by normalized key
  const seen = new Map<string, LineItem>()

  for (const receipt of receipts) {
    for (const item of receipt.lineItems) {
      const key = `${normalize(item.name)}|${item.price}|${item.quantity}`
      const existing = seen.get(key)
      if (!existing || item.confidence > existing.confidence) {
        seen.set(key, item)
      }
    }
  }

  // Take first non-null detected totals across all receipts
  const detectedSubtotal =
    receipts.find((r) => r.detectedSubtotal !== null)?.detectedSubtotal ?? null
  const detectedTax = receipts.find((r) => r.detectedTax !== null)?.detectedTax ?? null
  const detectedTotal = receipts.find((r) => r.detectedTotal !== null)?.detectedTotal ?? null

  // Validate merged result
  const mergedItems = Array.from(seen.values())
  const validationWarnings: string[] = []
  if (mergedItems.length > 0 && detectedSubtotal !== null) {
    const itemsTotal = mergedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const diffCents = Math.abs(itemsTotal - detectedSubtotal)
    if (diffCents > 50) {
      const itemsFmt = (itemsTotal / 100).toFixed(2)
      const subFmt = (detectedSubtotal / 100).toFixed(2)
      validationWarnings.push(
        `Items total (${itemsFmt}) differs from receipt subtotal (${subFmt}) — some items may be missing or misread`
      )
    }
  }

  return {
    lineItems: mergedItems,
    detectedSubtotal,
    detectedTax,
    detectedTotal,
    validationWarnings,
  }
}

function normalize(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim()
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

/**
 * Check if a line is a continuation of the previous item name.
 * A continuation line: has no price, has leading whitespace or starts lowercase,
 * contains at least one letter, and is not a metadata/skip line.
 */
function isContinuationLine(rawLine: string, trimmedLine: string): boolean {
  // Must not have a price
  if (PRICE_PATTERN.test(trimmedLine)) return false
  // Must have at least one letter
  if (!/[a-zA-Z]/.test(trimmedLine)) return false
  // Must have leading whitespace or start lowercase (continuation style)
  const hasIndent = rawLine.length > trimmedLine.length
  const startsLower = /^[a-z]/.test(trimmedLine)
  if (!hasIndent && !startsLower) return false
  // Must not be a metadata line
  if (extractMetadata(trimmedLine)) return false
  return true
}

/**
 * Extract a modifier/add-on line (e.g. "  - No onions" or "  + Extra cheese  $1.50").
 * Returns a LineItem if the modifier has a price, null if no price (kitchen instruction),
 * or undefined if the line is not a modifier.
 */
function extractModifierItem(rawLine: string): LineItem | null | undefined {
  if (!MODIFIER_PATTERN.test(rawLine)) return undefined
  const trimmed = rawLine.trim()
  const priceMatch = trimmed.match(PRICE_PATTERN)
  if (!priceMatch) return null // kitchen instruction, no price

  const rawPriceStr = priceMatch[1]
  const cents = parsePriceCents(rawPriceStr)
  if (cents === null || cents <= 0) return null

  // Remove the price from end, then strip the modifier prefix (- / + / *)
  const withoutPrice = trimmed.slice(0, trimmed.length - priceMatch[0].length).trim()
  const name = withoutPrice.replace(/^[-+*]\s*/, '').trim()
  if (name.length === 0 || !/[a-zA-Z]/.test(name)) return null

  const hasCurrencySymbol = /[£$€]/.test(trimmed)
  return {
    id: nanoid(),
    name,
    price: cents,
    quantity: 1,
    confidence: hasCurrencySymbol ? HIGH_CONFIDENCE : MEDIUM_CONFIDENCE,
    manuallyEdited: false,
  }
}

function extractLineItem(line: string): LineItem | null {
  // Must have a price at the end of the line
  const priceMatch = line.match(PRICE_PATTERN)
  if (!priceMatch) return null

  const rawPriceStr = priceMatch[1]

  // Determine if the line had a currency symbol prefix (affects confidence)
  const hasCurrencySymbol = /[£$€]/.test(line.slice(0, line.lastIndexOf(rawPriceStr)))

  // Check for OCR digit fixes
  const hadOcrFix =
    /[lIoO]/.test(rawPriceStr) &&
    // At least one of them is in a numeric position (next to digits or decimal)
    /(?:\d[lIoO]|[lIoO]\d|[lIoO]\.)/.test(rawPriceStr)

  // Check if line has a leading negative sign (discount/refund)
  const isNegative = /^-/.test(priceMatch[0].trim())

  let cents = parsePriceCents(rawPriceStr)
  if (cents === null || (cents <= 0 && !isNegative)) return null

  // Detect misread currency symbol: £ can be OCR'd as 1/l/I, turning
  // e.g. £16.50 into 116.50. If no currency symbol found and the price
  // is >= £100 (10000 cents) with a leading 1/l/I, strip it.
  let hadCurrencyFix = false
  if (!hasCurrencySymbol && !isNegative && cents >= 10000 && /^[1lI]/.test(rawPriceStr)) {
    const strippedCents = parsePriceCents(rawPriceStr.slice(1))
    if (strippedCents !== null && strippedCents > 0) {
      cents = strippedCents
      hadCurrencyFix = true
    }
  }

  const finalCents = isNegative ? -Math.abs(cents) : cents

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
  if (hadOcrFix || hadCurrencyFix) confidence = LOW_CONFIDENCE

  // The price on the receipt line is the line total (e.g. "2 X Soup  16.00"
  // means 16.00 for both soups). Divide by quantity to get the unit price,
  // since the rest of the app treats `price` as unit price.
  const unitPrice = quantity > 1 ? Math.round(finalCents / quantity) : finalCents

  return {
    id: nanoid(),
    name,
    price: unitPrice,
    quantity,
    confidence,
    manuallyEdited: false,
  }
}
