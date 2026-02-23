import type { LineItem, Person, PersonTotal } from '../types'
import { formatCurrency } from './formatCurrency'

interface ShareTextInput {
  lineItems: LineItem[]
  people?: Person[]
  assignments?: Record<string, string[]>
  portions?: Record<string, Record<string, number>>
  personTotals?: PersonTotal[]
  grandTotal?: number
  restaurantName?: string
}

/**
 * Build a shareable text summary that adapts to whatever data is available.
 *
 * - Items only (editor stage): lists items and subtotal
 * - Items + people (people stage): adds who's splitting
 * - Items + people + assignments (assign stage): shows who has what
 * - Items + people + assignments + tips (tip / summary stage): full breakdown
 */
export function buildShareText({
  lineItems,
  people,
  assignments,
  portions,
  personTotals,
  grandTotal,
  restaurantName,
}: ShareTextInput): string {
  const dateStr = new Date().toLocaleDateString('en-GB', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const lines: string[] = ['SplitIt Summary']
  lines.push(`${restaurantName ? `${restaurantName} - ` : ''}${dateStr}`)
  lines.push('')

  const hasPeople = people && people.length > 0
  const hasAssignments = assignments && Object.values(assignments).some((ids) => ids.length > 0)
  const hasPersonTotals = personTotals && personTotals.length > 0

  // Full summary with per-person totals (tip/summary stage)
  if (hasPeople && hasPersonTotals && hasAssignments) {
    for (const person of people) {
      const pt = personTotals.find((t) => t.personId === person.id)
      if (!pt) continue
      lines.push(`${person.name}: ${formatCurrency(pt.total)}`)

      // List assigned items
      for (const item of lineItems) {
        const assignees = assignments[item.id] ?? []
        if (!assignees.includes(person.id)) continue

        const shareCount = getShareCount(item.id, person.id, assignees, portions)
        const itemTotal = Math.round(item.price * item.quantity * shareCount)
        const suffix = assignees.length > 1 ? ` (÷${assignees.length})` : ''
        lines.push(`  - ${item.name}${suffix} (${formatCurrency(itemTotal)})`)
      }

      if (pt.tipAmount > 0) {
        lines.push(`  - Tip (${pt.tipPercentage}%): ${formatCurrency(pt.tipAmount)}`)
      }
      lines.push('')
    }

    if (grandTotal !== undefined) {
      lines.push(`Total: ${formatCurrency(grandTotal)}`)
    }
    return lines.join('\n')
  }

  // Partial summary with assignments but no tips (assign stage)
  if (hasPeople && hasAssignments) {
    for (const person of people) {
      const personItems: string[] = []
      let personSubtotal = 0

      for (const item of lineItems) {
        const assignees = assignments[item.id] ?? []
        if (!assignees.includes(person.id)) continue

        const share = getShareCount(item.id, person.id, assignees, portions)
        const itemTotal = Math.round(item.price * item.quantity * share)
        personSubtotal += itemTotal
        const suffix = assignees.length > 1 ? ` (÷${assignees.length})` : ''
        personItems.push(`  - ${item.name}${suffix} (${formatCurrency(itemTotal)})`)
      }

      if (personItems.length > 0) {
        lines.push(`${person.name}: ${formatCurrency(personSubtotal)}`)
        lines.push(...personItems)
        lines.push('')
      } else {
        lines.push(`${person.name}: no items yet`)
        lines.push('')
      }
    }

    // Unassigned items
    const unassigned = lineItems.filter((item) => (assignments[item.id] ?? []).length === 0)
    if (unassigned.length > 0) {
      lines.push('Unassigned:')
      for (const item of unassigned) {
        lines.push(`  - ${item.name} (${formatCurrency(item.price * item.quantity)})`)
      }
      lines.push('')
    }

    const subtotal = lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    lines.push(`Subtotal: ${formatCurrency(subtotal)}`)
    return lines.join('\n')
  }

  // Items + people but no assignments (people stage)
  if (hasPeople) {
    lines.push('Items:')
    for (const item of lineItems) {
      const label = item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name
      lines.push(`  - ${label} (${formatCurrency(item.price * item.quantity)})`)
    }
    lines.push('')

    const subtotal = lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    lines.push(`Subtotal: ${formatCurrency(subtotal)}`)
    lines.push('')

    lines.push(`Splitting between: ${people.map((p) => p.name).join(', ')}`)
    return lines.join('\n')
  }

  // Items only (editor stage)
  lines.push('Items:')
  for (const item of lineItems) {
    const label = item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name
    lines.push(`  - ${label} (${formatCurrency(item.price * item.quantity)})`)
  }
  lines.push('')

  const subtotal = lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  lines.push(`Subtotal: ${formatCurrency(subtotal)}`)

  return lines.join('\n')
}

/**
 * Get a person's fractional share of an item, respecting custom portions.
 */
function getShareCount(
  itemId: string,
  personId: string,
  assignees: string[],
  portions?: Record<string, Record<string, number>>
): number {
  if (assignees.length === 0) return 0

  const itemPortions = portions?.[itemId]
  if (!itemPortions || Object.keys(itemPortions).length === 0) {
    return 1 / assignees.length
  }

  const totalWeight = assignees.reduce((sum, id) => sum + (itemPortions[id] ?? 1), 0)
  const personWeight = itemPortions[personId] ?? 1
  return totalWeight > 0 ? personWeight / totalWeight : 1 / assignees.length
}
