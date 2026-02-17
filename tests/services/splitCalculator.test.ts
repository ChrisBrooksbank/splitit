import { describe, it, expect } from 'vitest'
import { calculateSplit } from '../../src/services/calculator/splitCalculator'
import type { SplitInput } from '../../src/services/calculator/splitCalculator'
import type { PersonTip } from '../../src/store/tipStore'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pct(personId: string, percentage: number): PersonTip {
  return { personId, mode: 'percentage', percentage, fixedAmount: 0 }
}

function fixed(personId: string, fixedAmount: number): PersonTip {
  return { personId, mode: 'fixed', percentage: 0, fixedAmount }
}

function item(id: string, name: string, price: number, quantity = 1) {
  return { id, name, price, quantity, confidence: 1, manuallyEdited: false }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('calculateSplit', () => {
  it('single person gets the entire bill', () => {
    const input: SplitInput = {
      people: [{ id: 'alice' }],
      lineItems: [item('i1', 'Burger', 1500), item('i2', 'Fries', 500)],
      assignments: { i1: ['alice'], i2: ['alice'] },
      portions: {},
      personTips: { alice: pct('alice', 20) },
    }

    const result = calculateSplit(input)
    const alice = result.personTotals[0]

    expect(alice.subtotal).toBe(2000)
    expect(alice.tipAmount).toBe(400) // 20% of 2000
    expect(alice.total).toBe(2400)
    expect(result.grandTotal).toBe(2400)
    expect(result.billSubtotal).toBe(2000)
  })

  it('two people with all individual items', () => {
    const input: SplitInput = {
      people: [{ id: 'alice' }, { id: 'bob' }],
      lineItems: [item('i1', 'Salmon', 1200), item('i2', 'Pasta', 800)],
      assignments: { i1: ['alice'], i2: ['bob'] },
      portions: {},
      personTips: {
        alice: pct('alice', 20),
        bob: pct('bob', 20),
      },
    }

    const result = calculateSplit(input)
    const alice = result.personTotals.find((p) => p.personId === 'alice')!
    const bob = result.personTotals.find((p) => p.personId === 'bob')!

    expect(alice.subtotal).toBe(1200)
    expect(alice.tipAmount).toBe(240) // 20% of 1200

    expect(bob.subtotal).toBe(800)
    expect(bob.tipAmount).toBe(160) // 20% of 800

    // Grand total = subtotals + tips
    expect(result.grandTotal).toBe(2000 + 240 + 160)
  })

  it('three people with a shared item (even split)', () => {
    const input: SplitInput = {
      people: [{ id: 'alice' }, { id: 'bob' }, { id: 'carol' }],
      lineItems: [
        item('shared', 'Platter', 3000),
        item('i1', 'Drink', 500),
        item('i2', 'Soup', 800),
        item('i3', 'Salad', 700),
      ],
      assignments: {
        shared: ['alice', 'bob', 'carol'],
        i1: ['alice'],
        i2: ['bob'],
        i3: ['carol'],
      },
      portions: {},
      personTips: {
        alice: pct('alice', 15),
        bob: pct('bob', 15),
        carol: pct('carol', 15),
      },
    }

    const result = calculateSplit(input)
    const alice = result.personTotals.find((p) => p.personId === 'alice')!
    const bob = result.personTotals.find((p) => p.personId === 'bob')!
    const carol = result.personTotals.find((p) => p.personId === 'carol')!

    // Shared item: each gets 3000/3 = 1000
    expect(alice.subtotal).toBe(1000 + 500) // 1500
    expect(bob.subtotal).toBe(1000 + 800) // 1800
    expect(carol.subtotal).toBe(1000 + 700) // 1700

    // Tips at 15%
    expect(alice.tipAmount).toBe(Math.round(1500 * 0.15))
    expect(bob.tipAmount).toBe(Math.round(1800 * 0.15))
    expect(carol.tipAmount).toBe(Math.round(1700 * 0.15))

    // Grand total must match
    const expectedGrand = result.billSubtotal + alice.tipAmount + bob.tipAmount + carol.tipAmount
    expect(result.grandTotal).toBe(expectedGrand)
  })

  it('shared items with custom portions', () => {
    // Alice pays 2 portions, Bob pays 1 portion of a $30 item
    // alice: 2/3 * 3000 = 2000, bob: 1/3 * 3000 = 1000
    const input: SplitInput = {
      people: [{ id: 'alice' }, { id: 'bob' }],
      lineItems: [item('shared', 'Feast', 3000)],
      assignments: { shared: ['alice', 'bob'] },
      portions: { shared: { alice: 2, bob: 1 } },
      personTips: {
        alice: pct('alice', 0),
        bob: pct('bob', 0),
      },
    }

    const result = calculateSplit(input)
    const alice = result.personTotals.find((p) => p.personId === 'alice')!
    const bob = result.personTotals.find((p) => p.personId === 'bob')!

    expect(alice.subtotal).toBe(2000)
    expect(bob.subtotal).toBe(1000)
    expect(alice.total).toBe(2000)
    expect(bob.total).toBe(1000)
  })

  it('rounding edge case: totals match exactly', () => {
    // $10 split 3 ways = $3.33, $3.33, $3.34 (last cent to largest)
    const input: SplitInput = {
      people: [{ id: 'alice' }, { id: 'bob' }, { id: 'carol' }],
      lineItems: [item('shared', 'Pizza', 1000)],
      assignments: { shared: ['alice', 'bob', 'carol'] },
      portions: {},
      personTips: {
        alice: pct('alice', 0),
        bob: pct('bob', 0),
        carol: pct('carol', 0),
      },
    }

    const result = calculateSplit(input)
    const totalPaid = result.personTotals.reduce((sum, p) => sum + p.total, 0)

    // Totals must sum to grand total
    expect(totalPaid).toBe(result.grandTotal)
    expect(result.grandTotal).toBe(result.billSubtotal)
  })

  it('zero-item person gets zero total', () => {
    // Bob has no items assigned
    const input: SplitInput = {
      people: [{ id: 'alice' }, { id: 'bob' }],
      lineItems: [item('i1', 'Steak', 5000)],
      assignments: { i1: ['alice'] },
      portions: {},
      personTips: {
        alice: pct('alice', 20),
        bob: pct('bob', 20),
      },
    }

    const result = calculateSplit(input)
    const bob = result.personTotals.find((p) => p.personId === 'bob')!

    expect(bob.subtotal).toBe(0)
    expect(bob.tipAmount).toBe(0)
    expect(bob.total).toBe(0)
  })

  it('different tip percentages per person', () => {
    // Alice tips 20%, Bob tips 15%
    const input: SplitInput = {
      people: [{ id: 'alice' }, { id: 'bob' }],
      lineItems: [item('i1', 'Pizza', 2000), item('i2', 'Wings', 1000)],
      assignments: { i1: ['alice'], i2: ['bob'] },
      portions: {},
      personTips: {
        alice: pct('alice', 20),
        bob: pct('bob', 15),
      },
    }

    const result = calculateSplit(input)
    const alice = result.personTotals.find((p) => p.personId === 'alice')!
    const bob = result.personTotals.find((p) => p.personId === 'bob')!

    expect(alice.tipAmount).toBe(400) // 20% of $20
    expect(alice.tipPercentage).toBe(20)
    expect(bob.tipAmount).toBe(150) // 15% of $10
    expect(bob.tipPercentage).toBe(15)

    expect(result.totalTip).toBe(550)
    expect(result.grandTotal).toBe(3000 + 550)
  })

  it('fixed tip amount per person', () => {
    const input: SplitInput = {
      people: [{ id: 'alice' }, { id: 'bob' }],
      lineItems: [item('i1', 'Burger', 1500), item('i2', 'Pasta', 1500)],
      assignments: { i1: ['alice'], i2: ['bob'] },
      portions: {},
      personTips: {
        alice: fixed('alice', 300), // $3.00 fixed tip
        bob: fixed('bob', 200), // $2.00 fixed tip
      },
    }

    const result = calculateSplit(input)
    const alice = result.personTotals.find((p) => p.personId === 'alice')!
    const bob = result.personTotals.find((p) => p.personId === 'bob')!

    expect(alice.tipAmount).toBe(300)
    expect(bob.tipAmount).toBe(200)
    expect(result.totalTip).toBe(500)
  })

  it('no people returns empty result', () => {
    const input: SplitInput = {
      people: [],
      lineItems: [item('i1', 'Item', 1000)],
      assignments: {},
      portions: {},
      personTips: {},
    }

    const result = calculateSplit(input)
    expect(result.personTotals).toHaveLength(0)
    expect(result.billSubtotal).toBe(0)
    expect(result.totalTip).toBe(0)
    expect(result.grandTotal).toBe(0)
  })

  it('quantity multiplier applied correctly', () => {
    // 2x $5 item = $10 total
    const input: SplitInput = {
      people: [{ id: 'alice' }],
      lineItems: [item('i1', 'Beer', 500, 2)], // 2 x $5
      assignments: { i1: ['alice'] },
      portions: {},
      personTips: { alice: pct('alice', 0) },
    }

    const result = calculateSplit(input)
    expect(result.personTotals[0].subtotal).toBe(1000)
  })
})
