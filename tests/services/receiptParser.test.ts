import { describe, it, expect } from 'vitest'
import { parseReceipt, mergeReceipts } from '../../src/services/ocr/receiptParser'
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

  it('parses negative value (discount)', () => {
    expect(parsePriceCents('-1.00')).toBe(-100)
  })

  it('handles zero amount', () => {
    expect(parsePriceCents('0.00')).toBe(0)
  })

  it('fixes OCR O → 0 in decimal places: 4.OO → 400', () => {
    expect(parsePriceCents('4.OO')).toBe(400)
  })

  it('fixes mixed OCR errors in decimal: lO.5O → 1050', () => {
    expect(parsePriceCents('lO.5O')).toBe(1050)
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
    expect(result.lineItems[0].price).toBe(600) // $12.00 / 2 = $6.00 unit price
    expect(result.lineItems[1].quantity).toBe(3)
    expect(result.lineItems[1].name).toBe('Draft Beer')
    expect(result.lineItems[1].price).toBe(600) // $18.00 / 3 = $6.00 unit price
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
    expect(result.lineItems).toHaveLength(3)
    // Pasta: $l2.99 → 1299
    const pasta = result.lineItems.find((i) => i.name.includes('Pasta'))
    expect(pasta?.price).toBe(1299)
    // Garlic Bread: $4.OO → 400
    const bread = result.lineItems.find((i) => i.name.includes('Garlic Bread'))
    expect(bread?.price).toBe(400)
  })

  // --- Sample 3b: Misread £ as 1 (currency symbol OCR error) ---
  it('corrects misread £ as leading 1 in prices', () => {
    const text = `
Soup of the Day            £ 6.50
3x Peroni 330ml            116.50
Sirloin Steak              124.95
Flat White                 £ 3.80

SUBTOTAL                   £51.25
`
    const result = parseReceipt(text)
    // Peroni: 116.50 → stripped to 16.50 (£ misread as 1)
    const peroni = result.lineItems.find((i) => i.name.includes('Peroni'))
    expect(peroni?.price).toBe(550) // 16.50 / 3 = 5.50 per unit
    expect(peroni?.quantity).toBe(3)
    expect(peroni?.confidence).toBe(0.5) // LOW — OCR fix applied
    // Steak: 124.95 → stripped to 24.95 (£ misread as 1)
    const steak = result.lineItems.find((i) => i.name.includes('Steak'))
    expect(steak?.price).toBe(2495)
    expect(steak?.confidence).toBe(0.5)
    // Items with actual £ symbol are not affected
    const soup = result.lineItems.find((i) => i.name.includes('Soup'))
    expect(soup?.price).toBe(650)
    expect(soup?.confidence).toBe(1.0)
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
    expect(result.lineItems[0].price).toBe(1100) // $22.00 / 2 = $11.00 unit price
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

  // --- Sample 15: Woolpack UK pub receipt with section headers ---
  it('parses a UK pub receipt with section headers and £ prices', () => {
    const text = `
THE WOOLPACK INN
High Street, Emmerdale

- STARTERS -
Soup of the Day             £5.50
Prawn Cocktail              £7.OO

- MAINS -
Fish and Chips              £l2.95
Steak & Ale Pie             £l4.50
2x Side Salad                £7.OO

- DESSERTS -
Sticky Toffee Pudding        £6.50

Subtotal                   £43.45
VAT                          £8.69
Total                      £52.14
`
    const result = parseReceipt(text)
    // Section headers should be skipped
    expect(result.lineItems.find((i) => i.name.includes('STARTERS'))).toBeUndefined()
    expect(result.lineItems.find((i) => i.name.includes('MAINS'))).toBeUndefined()
    expect(result.lineItems.find((i) => i.name.includes('DESSERTS'))).toBeUndefined()

    // Items should be parsed correctly
    expect(result.lineItems.length).toBeGreaterThanOrEqual(5)
    const soup = result.lineItems.find((i) => i.name.includes('Soup'))
    expect(soup?.price).toBe(550)
    // Prawn Cocktail: £7.OO → 700
    const prawn = result.lineItems.find((i) => i.name.includes('Prawn'))
    expect(prawn?.price).toBe(700)
    // Fish and Chips: £l2.95 → 1295
    const fish = result.lineItems.find((i) => i.name.includes('Fish'))
    expect(fish?.price).toBe(1295)
    // Steak & Ale Pie: £l4.50 → 1450
    const steak = result.lineItems.find((i) => i.name.includes('Steak'))
    expect(steak?.price).toBe(1450)
    // 2x Side Salad: £7.OO → 700 total → 350 each
    const salad = result.lineItems.find((i) => i.name.includes('Salad'))
    expect(salad?.quantity).toBe(2)
    expect(salad?.price).toBe(350)

    expect(result.detectedSubtotal).toBe(4345)
    expect(result.detectedTax).toBe(869)
    expect(result.detectedTotal).toBe(5214)
  })
})

// ---------------------------------------------------------------------------
// mergeReceipts tests
// ---------------------------------------------------------------------------

describe('mergeReceipts', () => {
  it('deduplicates overlapping items from two photos', () => {
    const text1 = `
Burger          $8.99
Fries           $3.49
Soda            $2.25
`
    const text2 = `
Fries           $3.49
Soda            $2.25
Dessert         $5.00
`
    const receipt1 = parseReceipt(text1)
    const receipt2 = parseReceipt(text2)
    const merged = mergeReceipts([receipt1, receipt2])

    // Should have 4 unique items, not 6
    expect(merged.lineItems).toHaveLength(4)
    const names = merged.lineItems.map((i) => i.name)
    expect(names).toContain('Burger')
    expect(names).toContain('Fries')
    expect(names).toContain('Soda')
    expect(names).toContain('Dessert')
  })

  it('keeps the higher-confidence duplicate', () => {
    const text1 = `
Burger          $8.99
`
    const text2 = `
Burger          8.99
`
    const receipt1 = parseReceipt(text1)
    const receipt2 = parseReceipt(text2)

    // receipt1 has $ prefix → confidence 1.0, receipt2 has no $ → 0.75
    const merged = mergeReceipts([receipt1, receipt2])
    expect(merged.lineItems).toHaveLength(1)
    expect(merged.lineItems[0].confidence).toBe(1.0)
  })

  it('takes first non-null detected totals', () => {
    const text1 = `
Burger          $8.99
`
    const text2 = `
Fries           $3.49
TOTAL           $12.48
`
    const receipt1 = parseReceipt(text1)
    const receipt2 = parseReceipt(text2)
    const merged = mergeReceipts([receipt1, receipt2])

    expect(merged.detectedTotal).toBe(1248)
  })

  it('preserves different items with same name but different prices', () => {
    const text1 = `
Wine            $8.00
`
    const text2 = `
Wine            $12.00
`
    const receipt1 = parseReceipt(text1)
    const receipt2 = parseReceipt(text2)
    const merged = mergeReceipts([receipt1, receipt2])

    // Same name, different prices → not duplicates
    expect(merged.lineItems).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// Validation warnings
// ---------------------------------------------------------------------------
describe('validationWarnings', () => {
  it('warns when items total differs from subtotal by > 50¢', () => {
    const text = `
Burger          $8.99
Fries           $3.49

SUBTOTAL        $14.73
TAX              $1.18
TOTAL           $15.91
`
    const result = parseReceipt(text)
    // Items: 899 + 349 = 1248, Subtotal: 1473, diff = 225 > 50
    expect(result.validationWarnings.length).toBe(1)
    expect(result.validationWarnings[0]).toContain('differs from receipt subtotal')
  })

  it('does not warn when items total matches subtotal within 50¢', () => {
    const text = `
Burger          $8.99
Fries           $3.49
Soda            $2.25

SUBTOTAL        $14.73
TAX              $1.18
TOTAL           $15.91
`
    const result = parseReceipt(text)
    expect(result.validationWarnings).toHaveLength(0)
  })

  it('does not warn when subtotal is absent', () => {
    const text = `
Burger          $8.99
TOTAL           $9.71
`
    const result = parseReceipt(text)
    expect(result.validationWarnings).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Multi-line item names
// ---------------------------------------------------------------------------
describe('multi-line item names', () => {
  it('joins a continuation line to the previous item', () => {
    const text = `
Grilled Salmon with     $24.95
  lemon butter sauce
Fries                    $3.49

SUBTOTAL                $28.44
`
    const result = parseReceipt(text)
    const salmon = result.lineItems.find((i) => i.name.includes('Salmon'))
    expect(salmon).toBeDefined()
    expect(salmon?.name).toContain('lemon butter sauce')
    expect(result.lineItems).toHaveLength(2)
  })

  it('does not join a line that starts with an uppercase word (not a continuation)', () => {
    const text = `
Burger          $8.99
Fries           $3.49
`
    const result = parseReceipt(text)
    expect(result.lineItems).toHaveLength(2)
    expect(result.lineItems[0].name).toBe('Burger')
  })
})

// ---------------------------------------------------------------------------
// Modifier/add-on lines
// ---------------------------------------------------------------------------
describe('modifier lines', () => {
  it('creates an item for a priced modifier', () => {
    const text = `
Burger              $8.99
  + Extra cheese    $1.50
Fries               $3.49
`
    const result = parseReceipt(text)
    const cheese = result.lineItems.find((i) => i.name.includes('Extra cheese'))
    expect(cheese).toBeDefined()
    expect(cheese?.price).toBe(150)
  })

  it('ignores kitchen instructions without prices', () => {
    const text = `
Burger              $8.99
  - No onions
Fries               $3.49
`
    const result = parseReceipt(text)
    expect(result.lineItems).toHaveLength(2)
    expect(result.lineItems.find((i) => i.name.includes('onions'))).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Negative amounts (discounts)
// ---------------------------------------------------------------------------
describe('negative amounts', () => {
  it('parses a negative price item', () => {
    const text = `
Burger              $8.99
Fries               $3.49
Manager Comp       -$2.00

SUBTOTAL           $10.48
TAX                 $0.84
TOTAL              $11.32
`
    const result = parseReceipt(text)
    const comp = result.lineItems.find((i) => i.name.includes('Manager Comp'))
    expect(comp).toBeDefined()
    expect(comp?.price).toBe(-200)
  })

  it('parsePriceCents handles zero', () => {
    expect(parsePriceCents('0.00')).toBe(0)
  })
})
