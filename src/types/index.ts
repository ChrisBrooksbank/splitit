export interface LineItem {
  id: string
  name: string
  price: number // integer cents
  quantity: number
  confidence: number // 0-1 from OCR (1.0 for manual)
  manuallyEdited: boolean
}

export interface Person {
  id: string
  name: string
  color: string // from a preset accessible palette
}

export interface TipConfig {
  mode: 'percentage' | 'fixed' | 'per-person'
  percentage: number // e.g. 20 (default)
  fixedAmount: number // cents
}

// Assignment: Map<itemId, personId[]> — which people claimed each item
export type AssignmentMap = Map<string, string[]>

export interface PersonTotal {
  personId: string
  subtotal: number // cents — sum of assigned item shares
  tipAmount: number // cents — person's chosen tip
  total: number // cents — subtotal + tipAmount
  tipPercentage: number // e.g. 20
}

export interface BillSession {
  id: string
  date: string // ISO date
  restaurantName?: string // optional, from receipt
  people: Person[]
  lineItems: LineItem[]
  assignments: Map<string, string[]>
  tipConfig: TipConfig
  totals: PersonTotal[] // calculated summary
}
