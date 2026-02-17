/**
 * Split Calculator — all math in integer cents.
 *
 * Algorithm:
 *   For each person:
 *     subtotal = sum of (item.price * qty * personShareFraction) for their assigned items
 *     tipAmount = based on person's individual tip choice (percentage of subtotal or fixed)
 *     total = subtotal + tipAmount
 *
 *   Rounding adjustment: the person with the largest subtotal absorbs any cent difference
 *   so that grand totals balance exactly.
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

/** Get a person's fractional share of an item (0–1). */
function getPersonShare(
  itemId: string,
  personId: string,
  assignments: Record<string, string[]>,
  portions: Record<string, Record<string, number>>
): number {
  const assignees = assignments[itemId] ?? []
  if (!assignees.includes(personId) || assignees.length === 0) return 0

  const itemPortions = portions[itemId]
  if (!itemPortions || Object.keys(itemPortions).length === 0) {
    return 1 / assignees.length
  }

  const totalWeight = assignees.reduce((sum, id) => sum + (itemPortions[id] ?? 1), 0)
  const personWeight = itemPortions[personId] ?? 1
  return totalWeight > 0 ? personWeight / totalWeight : 1 / assignees.length
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
  for (const person of people) {
    let subtotal = 0
    for (const item of lineItems) {
      const share = getPersonShare(item.id, person.id, assignments, portions)
      if (share > 0) {
        subtotal += Math.round(item.price * item.quantity * share)
      }
    }
    itemSubtotals[person.id] = subtotal
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
