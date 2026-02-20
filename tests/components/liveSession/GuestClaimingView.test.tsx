import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import GuestClaimingView from '../../../src/components/liveSession/GuestClaimingView'
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
  assignments: { 'item-1': ['p1'] },
  portions: {},
  personTips: {},
  phase: 'claiming',
  claimedPersonIds: ['p1', 'p2'],
}

describe('GuestClaimingView', () => {
  it('renders items and header', () => {
    render(
      <GuestClaimingView
        syncedState={mockSyncedState}
        myPersonId="p1"
        onClaim={vi.fn()}
        onUnclaim={vi.fn()}
        onSetAssignees={vi.fn()}
      />
    )

    expect(screen.getByText('Claim your items')).toBeInTheDocument()
    expect(screen.getByText('Pizza')).toBeInTheDocument()
    expect(screen.getByText('Beer')).toBeInTheDocument()
  })

  it('calls onUnclaim when clicking already-claimed item', () => {
    const onUnclaim = vi.fn()
    render(
      <GuestClaimingView
        syncedState={mockSyncedState}
        myPersonId="p1"
        onClaim={vi.fn()}
        onUnclaim={onUnclaim}
        onSetAssignees={vi.fn()}
      />
    )

    // Pizza is claimed by p1, clicking should unclaim
    fireEvent.click(screen.getByRole('checkbox', { name: /Pizza/ }))
    expect(onUnclaim).toHaveBeenCalledWith('item-1')
  })

  it('calls onClaim when clicking unclaimed item', () => {
    const onClaim = vi.fn()
    render(
      <GuestClaimingView
        syncedState={mockSyncedState}
        myPersonId="p1"
        onClaim={onClaim}
        onUnclaim={vi.fn()}
        onSetAssignees={vi.fn()}
      />
    )

    // Beer is not claimed by p1
    fireEvent.click(screen.getByRole('checkbox', { name: /Beer/ }))
    expect(onClaim).toHaveBeenCalledWith('item-2')
  })

  it('does not call onClaim or onUnclaim when disabled', () => {
    const onClaim = vi.fn()
    const onUnclaim = vi.fn()
    render(
      <GuestClaimingView
        syncedState={mockSyncedState}
        myPersonId="p1"
        onClaim={onClaim}
        onUnclaim={onUnclaim}
        onSetAssignees={vi.fn()}
        disabled
      />
    )

    // All checkboxes should have aria-disabled
    const checkboxes = screen.getAllByRole('checkbox')
    for (const cb of checkboxes) {
      expect(cb).toHaveAttribute('aria-disabled', 'true')
    }

    // Clicking should not trigger callbacks
    fireEvent.click(screen.getByRole('checkbox', { name: /Pizza/ }))
    expect(onUnclaim).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('checkbox', { name: /Beer/ }))
    expect(onClaim).not.toHaveBeenCalled()

    // Share buttons should be disabled
    const shareButtons = screen.getAllByRole('button', { name: /Split .* among/ })
    for (const btn of shareButtons) {
      expect(btn).toBeDisabled()
    }
  })

  it('returns null if person not found', () => {
    const { container } = render(
      <GuestClaimingView
        syncedState={mockSyncedState}
        myPersonId="nonexistent"
        onClaim={vi.fn()}
        onUnclaim={vi.fn()}
        onSetAssignees={vi.fn()}
      />
    )

    expect(container.innerHTML).toBe('')
  })
})
