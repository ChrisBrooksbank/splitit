import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HostLiveAssignmentView from '../../../src/components/liveSession/HostLiveAssignmentView'
import { useBillStore } from '../../../src/store/billStore'
import { usePeopleStore } from '../../../src/store/peopleStore'
import { useAssignmentStore } from '../../../src/store/assignmentStore'
import { useLiveSessionStore } from '../../../src/store/liveSessionStore'

// Mock StepIndicator since it uses useLocation
vi.mock('../../../src/components/layout/StepIndicator', () => ({
  default: ({ currentRoute }: { currentRoute: string }) => (
    <div data-testid="step-indicator">{currentRoute}</div>
  ),
}))

describe('HostLiveAssignmentView', () => {
  beforeEach(() => {
    useBillStore.getState().reset()
    usePeopleStore.getState().reset()
    useAssignmentStore.getState().reset()
    useLiveSessionStore.getState().endSession()
  })

  it('renders live assignment heading', () => {
    render(<HostLiveAssignmentView onAdvanceToTips={vi.fn()} />)
    expect(screen.getByText('Live Assignment')).toBeInTheDocument()
  })

  it('shows items with assignment status', () => {
    useBillStore.getState().addLineItem({
      name: 'Pizza',
      price: 1200,
      quantity: 1,
      confidence: 1,
      manuallyEdited: false,
    })

    render(<HostLiveAssignmentView onAdvanceToTips={vi.fn()} />)
    expect(screen.getByText('Pizza')).toBeInTheDocument()
    expect(screen.getByText('Unassigned')).toBeInTheDocument()
  })

  it('disables Move to Tips when unassigned items exist', () => {
    useBillStore.getState().addLineItem({
      name: 'Pizza',
      price: 1200,
      quantity: 1,
      confidence: 1,
      manuallyEdited: false,
    })

    render(<HostLiveAssignmentView onAdvanceToTips={vi.fn()} />)
    expect(screen.getByText('Move to Tips')).toBeDisabled()
  })

  it('enables Move to Tips when all items assigned', () => {
    useBillStore.getState().addLineItem({
      name: 'Pizza',
      price: 1200,
      quantity: 1,
      confidence: 1,
      manuallyEdited: false,
    })
    const itemId = useBillStore.getState().lineItems[0].id
    useAssignmentStore.getState().assignPerson(itemId, 'p1')

    const onAdvance = vi.fn()
    render(<HostLiveAssignmentView onAdvanceToTips={onAdvance} />)

    const button = screen.getByText('Move to Tips')
    expect(button).not.toBeDisabled()
    fireEvent.click(button)
    expect(onAdvance).toHaveBeenCalled()
  })

  it('shows connected guests', () => {
    useLiveSessionStore.getState().addGuest({
      peerId: 'g1',
      personId: null,
      displayName: 'Alice',
      connected: true,
    })

    render(<HostLiveAssignmentView onAdvanceToTips={vi.fn()} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('shows no guests message when empty', () => {
    render(<HostLiveAssignmentView onAdvanceToTips={vi.fn()} />)
    expect(screen.getByText('No guests connected yet')).toBeInTheDocument()
  })
})
