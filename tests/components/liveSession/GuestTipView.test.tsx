import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import GuestTipView from '../../../src/components/liveSession/GuestTipView'
import type { SyncPayload } from '../../../src/services/liveSession/types'

const mockSyncedState: SyncPayload = {
  lineItems: [
    { id: 'item-1', name: 'Pizza', price: 1200, quantity: 1, confidence: 1, manuallyEdited: false },
  ],
  people: [{ id: 'p1', name: 'Alice', color: '#0057B8' }],
  assignments: { 'item-1': ['p1'] },
  portions: {},
  personTips: {
    p1: { personId: 'p1', mode: 'percentage', percentage: 10, fixedAmount: 0 },
  },
  phase: 'tips',
  claimedPersonIds: ['p1'],
}

describe('GuestTipView', () => {
  it('renders tip heading and person card', () => {
    render(<GuestTipView syncedState={mockSyncedState} myPersonId="p1" onSetTip={vi.fn()} />)

    expect(screen.getByText('Choose your tip')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('returns null for unknown person', () => {
    const { container } = render(
      <GuestTipView syncedState={mockSyncedState} myPersonId="unknown" onSetTip={vi.fn()} />
    )
    expect(container.innerHTML).toBe('')
  })
})
