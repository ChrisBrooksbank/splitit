import { describe, it, expect } from 'vitest'
import { parseReceipt } from '../../src/services/ocr/receiptParser'
import { parsePriceCents } from '../../src/utils/receiptPatterns'

// ---------------------------------------------------------------------------
// parsePriceCents unit tests
// ---------------------------------------------------------------------------

describe('parsePriceCents', () => {
  it('parses standard US price', () => {
    expect(parsePriceCents('12.99')).toBe(1299)
  })

  it('parses price with dollar sign', () => {
    expect(parsePriceCents('$5.50')).toBe(550)
  })

  it('parses price with thousand separator', () => {
    expect(parsePriceCents('1,234.56')).toBe(123456)
  })

  it('fixes OCR l → 1', () => {
    expect(parsePriceCents('l2.99')).toBe(1299)
  })

  it('fixes OCR I → 1', () => {
    expect(parsePriceCents('I2.99')).toBe(1299)
  })

  it('returns null for empty string', () => {
    expect(parsePriceCents('')).toBeNull()
  })

  it('returns null for negative value', () => {
    expect(parsePriceCents('-1.00')).toBeNull()
  })

  it('handles zero amount', () => {
    expect(parsePriceCents('0.00')).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// parseReceipt integration tests — 10+ real-world receipt samples
// ---------------------------------------------------------------------------

describe('parseReceipt', () => {
  // --- Sample 1: Basic diner receipt ---
  it('parses a simple diner receipt', () => {
    const text = `
SUNSHINE DINER
123 Main St

Burger          $8.99
Fries           $3.49
Soda            $2.25

SUBTOTAL        $14.73
TAX              $1.18
TOTAL           $15.91

THANK YOU FOR DINING WITH US
`
    const result = parseReceipt(text)
    expect(result.lineItems).toHaveLength(3)
    expect(result.lineItems[0].name).toBe('Burger')
    expect(result.lineItems[0].price).toBe(899)
    expect(result.lineItems[1].price).toBe(349)
    expect(result.lineItems[2].price).toBe(225)
    expect(result.detectedSubtotal).toBe(1473)
    expect(result.detectedTax).toBe(118)
    expect(result.detectedTotal).toBe(1591)
  })

  // --- Sample 2: Receipt with quantity prefixes ---
  it('parses quantity prefixes (2x, 3 X)', () => {
    const text = `
2x Chicken Wings    $12.00
3 X Draft Beer      $18.00
1x Caesar Salad      $9.50

SUBTOTAL            $39.50
TAX                  $3.16
TOTAL               $42.66
`
    const result = parseReceipt(text)
    expect(result.lineItems).toHaveLength(3)
    expect(result.lineItems[0].quantity).toBe(2)
    expect(result.lineItems[0].name).toBe('Chicken Wings')
    expect(result.lineItems[0].price).toBe(1200)
    expect(result.lineItems[1].quantity).toBe(3)
    expect(result.lineItems[1].name).toBe('Draft Beer')
    expect(result.lineItems[1].price).toBe(1800)
    expect(result.lineItems[2].quantity).toBe(1)
  })

  // --- Sample 3: OCR errors ($l2.99, O → 0) ---
  it('handles OCR digit substitutions', () => {
    const text = `
Pasta Bolognese      $l2.99
Garlic Bread          $4.OO
House Wine           $8.50

SUBTOTAL            $25.49
TAX                  $2.04
TOTAL               $27.53
`
    const result = parseReceipt(text)
    // The $ prefix helps identify price lines; OCR fix applied inside
    expect(result.lineItems.length).toBeGreaterThanOrEqual(1)
    // Pasta: $l2.99 → 1299
    const pasta = result.lineItems.find((i) => i.name.includes('Pasta'))
    expect(pasta?.price).toBe(1299)
  })

  // --- Sample 4: Separator lines and noise ---
  it('skips separator and noise lines', () => {
    const text = `
===========================
    THE GOLDEN FORK
===========================
Date: 02/15/2026
Time: 7:32 PM
Server: Mike
Table: 5
---------------------------
Ribeye Steak         $32.00
Mashed Potatoes       $6.00
---------------------------
SUBTOTAL             $38.00
TAX 8.5%              $3.23
TOTAL                $41.23
CASH                 $50.00
CHANGE                $8.77
===========================
THANK YOU
`
    const result = parseReceipt(text)
    expect(result.lineItems).toHaveLength(2)
    expect(result.lineItems[0].name).toContain('Ribeye')
    expect(result.lineItems[1].name).toContain('Mashed Potatoes')
    expect(result.detectedTax).toBe(323)
    expect(result.detectedTotal).toBe(4123)
  })

  // --- Sample 5: Items with special characters and long names ---
  it('handles long item names and special characters', () => {
    const text = `
Grilled Salmon w/ Lemon Butter Sauce    $24.95
Crème Brûlée                            $8.99
House-Made Lemonade (Fresh Squeezed)    $4.50

SUBTOTAL                               $38.44
TAX                                     $3.07
TOTAL                                  $41.51
`
    const result = parseReceipt(text)
    expect(result.lineItems).toHaveLength(3)
    expect(result.lineItems[0].price).toBe(2495)
    expect(result.lineItems[1].price).toBe(899)
    expect(result.lineItems[2].price).toBe(450)
  })

  // --- Sample 6: Missing subtotal, only total ---
  it('detects total when subtotal is absent', () => {
    const text = `
Pizza Margherita     $14.00
Tiramisu              $6.50

TAX                   $1.64
TOTAL                $22.14
`
    const result = parseReceipt(text)
    expect(result.detectedSubtotal).toBeNull()
    expect(result.detectedTax).toBe(164)
    expect(result.detectedTotal).toBe(2214)
  })

  // --- Sample 7: Items without dollar sign ---
  it('parses items without dollar sign prefix', () => {
    const text = `
Cheeseburger        9.99
Onion Rings         4.49
Iced Tea            2.99

SUBTOTAL           17.47
TAX                 1.40
TOTAL              18.87
`
    const result = parseReceipt(text)
    expect(result.lineItems).toHaveLength(3)
    expect(result.lineItems[0].price).toBe(999)
    // No $ prefix → medium confidence
    expect(result.lineItems[0].confidence).toBe(0.75)
  })

  // --- Sample 8: Multiple quantity format (×) ---
  it('handles Unicode × quantity prefix', () => {
    const text = `
2 × Margarita Pizza   $22.00
1 × Tiramisu           $7.50

SUBTOTAL              $29.50
TAX                    $2.36
TOTAL                 $31.86
`
    const result = parseReceipt(text)
    expect(result.lineItems[0].quantity).toBe(2)
    expect(result.lineItems[0].name).toBe('Margarita Pizza')
    expect(result.lineItems[0].price).toBe(2200)
  })

  // --- Sample 9: Tip and discount lines not parsed as items ---
  it('does not parse tip, discount, or payment lines as items', () => {
    const text = `
Fish Tacos            $13.50
Side Salad             $5.00

SUBTOTAL              $18.50
DISCOUNT               -$2.00
TAX                    $1.32
TIP (20%)              $3.70
TOTAL                 $22.52
VISA xxxx1234         $22.52
`
    const result = parseReceipt(text)
    expect(result.lineItems).toHaveLength(2)
    expect(result.lineItems[0].name).toBe('Fish Tacos')
    expect(result.lineItems[1].name).toBe('Side Salad')
  })

  // --- Sample 10: High-end restaurant format ---
  it('parses a high-end restaurant receipt', () => {
    const text = `
MAISON ROUGE
-----------

1 Foie Gras Terrine         $18.00
1 Duck Confit               $35.00
2 Crème Brûlée              $28.00
2 Glass of Bordeaux         $36.00

Sub Total                  $117.00
HST (13%)                   $15.21
Gratuity                    $23.40
Total                      $155.61

Payment: AMEX xxxx0012     $155.61
`
    const result = parseReceipt(text)
    // Should get the 4 food/drink lines (quantities in names, not prefix format)
    expect(result.lineItems.length).toBeGreaterThanOrEqual(3)
    expect(result.detectedSubtotal).toBe(11700)
    expect(result.detectedTax).toBe(1521)
    expect(result.detectedTotal).toBe(15561)
  })

  // --- Sample 11: Fast food / no whitespace alignment ---
  it('parses fast food compact receipt', () => {
    const text = `
BURGER PALACE
#ORDER 9824

BIG BURGER $6.99
LARGE FRIES $3.49
COKE LG $2.29
APPLE PIE $1.19

SUB $13.96
TAX $1.12
TOTAL $15.08
`
    const result = parseReceipt(text)
    expect(result.lineItems).toHaveLength(4)
    expect(result.lineItems[3].name).toBe('APPLE PIE')
    expect(result.lineItems[3].price).toBe(119)
    expect(result.detectedSubtotal).toBe(1396)
    expect(result.detectedTotal).toBe(1508)
  })

  // --- Sample 12: Empty / whitespace only text ---
  it('returns empty results for blank text', () => {
    const result = parseReceipt('   \n\n  \n ')
    expect(result.lineItems).toHaveLength(0)
    expect(result.detectedSubtotal).toBeNull()
    expect(result.detectedTax).toBeNull()
    expect(result.detectedTotal).toBeNull()
  })

  // --- Sample 13: Confidence scoring ---
  it('assigns high confidence to items with $ prefix', () => {
    const text = `
Soup of the Day   $5.99
SUBTOTAL          $5.99
TAX               $0.48
TOTAL             $6.47
`
    const result = parseReceipt(text)
    expect(result.lineItems).toHaveLength(1)
    expect(result.lineItems[0].confidence).toBe(1.0)
  })

  // --- Sample 14: Items with price variations and punctuation ---
  it('strips trailing punctuation from item names', () => {
    const text = `
Chicken Sandwich:  $9.99
Garden Salad,      $7.49
SUBTOTAL          $17.48
TAX                $1.40
TOTAL             $18.88
`
    const result = parseReceipt(text)
    expect(result.lineItems[0].name).toBe('Chicken Sandwich')
    expect(result.lineItems[1].name).toBe('Garden Salad')
  })
})
