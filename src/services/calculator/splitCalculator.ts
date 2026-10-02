/**
 * Split Calculator — all math in integer cents.
 *
 * Algorithm:
 *   For each item, its total (price * qty) is divided among the assignees by weight using
 *   largest-remainder allocation, so the shares always add up to the item total exactly.
 *   For each person:
 *     subtotal = sum of their allocated item shares
 *     tipAmount = based on person's individual tip choice (percentage of subtotal or fixed)
 *     total = subtotal + tipAmount
 */

import type { LineItem, PersonTotal } from '../../types'
import type { PersonTip } from '../../store/tipStore'

export interface SplitInput {
  people: { id: string }[]
  lineItems: LineItem[]
  /** itemId -> personId[] assigned to that item */
  assignments: Record<string, string[]>
  /** itemId -> personId -> portion weight (custom split); absent = equal split */
  portions: Record<string, Record<string, number>>
  personTips: Record<string, PersonTip>
}

export interface SplitResult {
  personTotals: PersonTotal[]
  /** Sum of all person item subtotals */
  billSubtotal: number
  /** Sum of all person tips */
  totalTip: number
  /** billSubtotal + totalTip */
  grandTotal: number
}

/**
 * Divide an item's total (integer cents) among its assignees.
 * Shares follow custom portion weights when present (otherwise equal) and always sum to the
 * item total exactly: leftover cents go to the largest fractional remainders, ties to the
 * earliest assignee.
 */
export function allocateItemCents(
  totalCents: number,
  assignees: string[],
  itemPortions?: Record<string, number>
): Record<string, number> {
  const ids = Array.from(new Set(assignees))
  const result: Record<string, number> = {}
  if (ids.length === 0) return result

  const hasPortions = !!itemPortions && Object.keys(itemPortions).length > 0
  let weights = ids.map((id) => {
    const w = hasPortions ? (itemPortions[id] ?? 1) : 1
    return Number.isFinite(w) && w > 0 ? w : 0
  })
  let totalWeight = weights.reduce((sum, w) => sum + w, 0)
  if (totalWeight <= 0) {
    weights = ids.map(() => 1)
    totalWeight = ids.length
  }

  const sign = totalCents < 0 ? -1 : 1
  const magnitude = Math.abs(totalCents)
  const exact = weights.map((w) => (magnitude * w) / totalWeight)
  const floors = exact.map((x) => Math.floor(x))
  let remainder = magnitude - floors.reduce((sum, f) => sum + f, 0)

  const order = exact
    .map((x, idx) => ({ idx, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac || a.idx - b.idx)
  for (const { idx } of order) {
    if (remainder <= 0) break
    floors[idx] += 1
    remainder -= 1
  }

  ids.forEach((id, idx) => {
    result[id] = sign * floors[idx]
  })
  return result
}

/** A person's share of one item in cents (0 if they aren't an assignee). */
export function personItemCents(
  item: LineItem,
  personId: string,
  assignments: Record<string, string[]>,
  portions: Record<string, Record<string, number>>
): number {
  const shares = allocateItemCents(
    item.price * item.quantity,
    assignments[item.id] ?? [],
    portions[item.id]
  )
  return shares[personId] ?? 0
}

/** A person's pre-tip subtotal across all items, in cents. */
export function personSubtotalCents(
  lineItems: LineItem[],
  personId: string,
  assignments: Record<string, string[]>,
  portions: Record<string, Record<string, number>>
): number {
  return lineItems.reduce(
    (sum, item) => sum + personItemCents(item, personId, assignments, portions),
    0
  )
}

/** Calculate tip amount in cents for a person given their item subtotal. */
function calcTipAmount(subtotalCents: number, tip: PersonTip | undefined): number {
  if (!tip) return 0
  if (tip.mode === 'fixed') return tip.fixedAmount
  return Math.round((subtotalCents * tip.percentage) / 100)
}

export function calculateSplit(input: SplitInput): SplitResult {
  const { people, lineItems, assignments, portions, personTips } = input

  // Step 1: Item subtotal per person (integer cents)
  const itemSubtotals: Record<string, number> = {}
  for (const person of people) itemSubtotals[person.id] = 0
  for (const item of lineItems) {
    const shares = allocateItemCents(
      item.price * item.quantity,
      assignments[item.id] ?? [],
      portions[item.id]
    )
    for (const person of people) {
      itemSubtotals[person.id] += shares[person.id] ?? 0
    }
  }

  // Step 2: Bill subtotal = sum of all person item subtotals
  const billSubtotal = people.reduce((sum, p) => sum + (itemSubtotals[p.id] ?? 0), 0)

  // Step 3: Tip per person
  const tipAmounts: Record<string, number> = {}
  for (const person of people) {
    tipAmounts[person.id] = calcTipAmount(itemSubtotals[person.id] ?? 0, personTips[person.id])
  }

  // Step 4: Assemble results
  const personTotals: PersonTotal[] = people.map((person) => {
    const subtotal = itemSubtotals[person.id] ?? 0
    const tipAmount = tipAmounts[person.id] ?? 0
    const tip = personTips[person.id]
    const tipPercentage =
      tip?.mode === 'percentage'
        ? tip.percentage
        : subtotal > 0
          ? Math.round((tipAmount / subtotal) * 100)
          : 0

    return {
      personId: person.id,
      subtotal,
      tipAmount,
      total: subtotal + tipAmount,
      tipPercentage,
    }
  })

  const totalTip = personTotals.reduce((sum, p) => sum + p.tipAmount, 0)
  const grandTotal = billSubtotal + totalTip

  return { personTotals, billSubtotal, totalTip, grandTotal }
}
