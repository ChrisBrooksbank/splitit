/**
 * Regex patterns for parsing restaurant receipt OCR text.
 */

// Price at the end of a line: $12.99, 12.99, $1,234.56
// Also allows leading OCR-corrupted digits (l/I in place of 1): $l2.99
export const PRICE_PATTERN = /[£$€]?\s*([lIO\d]{1,4}[,.]?[lIO\d]{0,3}[.,][lIO\d]{2})\s*$/

// Price with possible OCR digit errors (l/I → 1, O/o → 0) before parsing
// Applied to a candidate price string only
export const OCR_DIGIT_FIX = /[lI]/g // replace with '1'
export const OCR_ZERO_FIX = /[Oo]/g // replace with '0'

// Quantity prefix patterns at the start of an item name:
//   "2x", "3 X", "2 ×", "3x ", "2 x "
export const QUANTITY_PATTERN = /^(\d+)\s*[xX×]\s+/

// Lines to skip entirely (noise / non-item content)
export const SKIP_PATTERNS: RegExp[] = [
  /^\s*[-_=*#~]{2,}\s*$/, // separator lines: ---, ===, ***
  /thank\s*you/i, // THANK YOU
  /please\s*come\s*again/i, // PLEASE COME AGAIN
  /visit\s*us/i, // VISIT US AGAIN
  /\b(?:www\.|https?:\/\/)/i, // URLs / website
  /^\s*\d{1,2}[/:]\d{2}(?:[/:]\d{2,4})?\s*(?:am|pm)?\s*$/i, // time-only lines
  /^\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\s*$/, // date-only lines
  /table\s*#?\s*\d+/i, // TABLE #12
  /server\s*[:#]?\s*\w+/i, // SERVER: Jane
  /cashier\s*[:#]?\s*\w+/i, // CASHIER: 42
  /guest\s*count/i, // GUEST COUNT: 4
  /order\s*#?\s*\d+/i, // ORDER #1234
  /#\s*order\s*\d*/i, // #ORDER 9824
  /check\s*#?\s*\d+/i, // CHECK #99
  /^\s*receipt\s*#/i, // RECEIPT #
  /^\s*\*+\s*$/, // lines of only asterisks
  /^\s*$/, // blank lines
  /^\s*[-–—*]+\s+[A-Z][A-Z\s&]+\s*[-–—*]*\s*$/, // Section headers: - STARTERS -, * MAINS *
]

// Metadata line patterns — these lines are not items but carry totals
export const METADATA_PATTERNS: {
  key: 'subtotal' | 'tax' | 'total' | 'tip' | 'change' | 'payment' | 'discount'
  pattern: RegExp
}[] = [
  { key: 'subtotal', pattern: /\b(?:sub\s*total|subtotal|sub-total|sub)\b/i },
  {
    key: 'tax',
    pattern: /\b(?:tax|hst|gst|pst|vat|sales\s*tax|state\s*tax|city\s*tax)\b/i,
  },
  { key: 'total', pattern: /\b(?:total|grand\s*total|amount\s*due|balance\s*due|total\s*due)\b/i },
  { key: 'tip', pattern: /\b(?:tip|gratuity|svc\s*charge|service\s*charge)\b/i },
  {
    key: 'payment',
    pattern: /\b(?:cash|credit|debit|visa|mastercard|amex|discover|card|payment|paid)\b/i,
  },
  { key: 'change', pattern: /\b(?:change|change\s*due)\b/i },
  { key: 'discount', pattern: /\b(?:discount|coupon|promo|savings?|off)\b/i },
]

/**
 * Extract a numeric price (in cents) from a raw price string.
 * Handles OCR substitutions: l/I → 1, O → 0.
 * Returns null if the string cannot be parsed.
 */
export function parsePriceCents(raw: string): number | null {
  // Fix common OCR digit substitutions
  let fixed = raw.replace(OCR_DIGIT_FIX, '1').replace(OCR_ZERO_FIX, '0')

  // Remove currency symbol and spaces
  fixed = fixed.replace(/[£$€\s]/g, '')

  // Remove thousand separators (commas before 3 digits before decimal)
  // Handles formats like 1,234.56 → 123456 cents
  // Also handles European: 1.234,56 — detect by last separator
  const lastComma = fixed.lastIndexOf(',')
  const lastDot = fixed.lastIndexOf('.')

  if (lastComma > lastDot) {
    // European format: 12,99 or 1.234,56
    fixed = fixed.replace(/\./g, '').replace(',', '.')
  } else {
    // US format: 12.99 or 1,234.56
    fixed = fixed.replace(/,/g, '')
  }

  const value = parseFloat(fixed)
  if (isNaN(value) || value < 0) return null

  return Math.round(value * 100)
}
