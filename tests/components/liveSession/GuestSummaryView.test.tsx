import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import GuestSummaryView from '../../../src/components/liveSession/GuestSummaryView'
import type { SyncPayload } from '../../../src/services/liveSession/types'

const mockSyncedState: SyncPayload = {
  lineItems: [
    { id: 'item-1', name: 'Pizza', price: 1200, quantity: 1, confidence: 1, manuallyEdited: false },
    { id: 'item-2', name: 'Beer', price: 500, quantity: 2, confidence: 1, manuallyEdited: false },
  ],
  people: [
    { id: 'p1', name: 'Alice', color: '#0057B8' },
    { id: 'p2', name: 'Bob', color: '#C62828' },
  ],
  assignments: {
    'item-1': ['p1'],
    'item-2': ['p1', 'p2'],
  },
  portions: {},
  personTips: {
    p1: { personId: 'p1', mode: 'percentage', percentage: 10, fixedAmount: 0 },
    p2: { personId: 'p2', mode: 'percentage', percentage: 15, fixedAmount: 0 },
  },
  phase: 'summary',
  claimedPersonIds: ['p1', 'p2'],
}

describe('GuestSummaryView', () => {
  it('renders person name and total', () => {
    render(<GuestSummaryView syncedState={mockSyncedState} myPersonId="p1" />)

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Your total')).toBeInTheDocument()
    // Alice has Pizza (£12.00) + half of Beer (£5.00) = £17.00 subtotal
    // Tip 10% = £1.70 → total £18.70
  })

  it('shows items assigned to the person', () => {
    render(<GuestSummaryView syncedState={mockSyncedState} myPersonId="p1" />)

    expect(screen.getByText('Pizza')).toBeInTheDocument()
    expect(screen.getByText('Beer')).toBeInTheDocument()
  })

  it('returns null for unknown person', () => {
    const { container } = render(
      <GuestSummaryView syncedState={mockSyncedState} myPersonId="nonexistent" />
    )
    expect(container.innerHTML).toBe('')
  })
})
