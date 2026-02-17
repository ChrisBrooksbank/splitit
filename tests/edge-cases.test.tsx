/**
 * Edge case tests covering:
 * - Zero items in editor (Continue disabled, empty state shown)
 * - Very long name truncation (PersonChip, LineItemRow, AssignableItem)
 * - Single person / zero-people guard on downstream pages
 * - Zero-people guard on AssignmentPage, TipSelectionPage, SummaryPage
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ItemEditorPage from '../src/pages/ItemEditorPage'
import AssignmentPage from '../src/pages/AssignmentPage'
import TipSelectionPage from '../src/pages/TipSelectionPage'
import SummaryPage from '../src/pages/SummaryPage'
import PersonChip from '../src/components/assignment/PersonChip'
import AssignableItem from '../src/components/assignment/AssignableItem'
import AddItemForm from '../src/components/bill/AddItemForm'
import { useBillStore } from '../src/store/billStore'
import { usePeopleStore } from '../src/store/peopleStore'
import { useAssignmentStore } from '../src/store/assignmentStore'
import type { LineItem, Person } from '../src/types'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function wrap(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

const LONG_NAME = 'A'.repeat(80)

const longNamePerson: Person = { id: 'p1', name: LONG_NAME, color: '#0057B8' }

function makeItem(overrides: Partial<LineItem> = {}): LineItem {
  return {
    id: 'item-1',
    name: 'Burger',
    price: 1299,
    quantity: 1,
    confidence: 1.0,
    manuallyEdited: false,
    ...overrides,
  }
}

beforeEach(() => {
  mockNavigate.mockClear()
  useBillStore.getState().reset()
  usePeopleStore.getState().reset()
  useAssignmentStore.getState().reset()
  sessionStorage.clear()
})

// ---------------------------------------------------------------------------
// Zero items in editor
// ---------------------------------------------------------------------------
describe('Zero items edge case', () => {
  it('Continue button is disabled when no items in editor', () => {
    wrap(<ItemEditorPage />)
    expect(screen.getByRole('button', { name: /continue to people setup/i })).toBeDisabled()
  })

  it('shows empty state message when no items in editor', () => {
    wrap(<ItemEditorPage />)
    expect(screen.getByText(/no items yet/i)).toBeInTheDocument()
  })

  it('Continue button is enabled after adding an item', () => {
    useBillStore.getState().addLineItem({
      name: 'Salad',
      price: 899,
      quantity: 1,
      confidence: 1.0,
      manuallyEdited: true,
    })
    wrap(<ItemEditorPage />)
    expect(screen.getByRole('button', { name: /continue to people setup/i })).not.toBeDisabled()
  })
})

// ---------------------------------------------------------------------------
// Very long name truncation — PersonChip
// ---------------------------------------------------------------------------
describe('Very long name truncation', () => {
  it('PersonChip renders a very long name without throwing', () => {
    wrap(<PersonChip person={longNamePerson} />)
    // The accessible label contains the full name
    expect(screen.getByLabelText(LONG_NAME)).toBeInTheDocument()
  })

  it('PersonChip title attribute contains the full long name', () => {
    wrap(<PersonChip person={longNamePerson} />)
    const chip = screen.getByLabelText(LONG_NAME)
    expect(chip).toHaveAttribute('title', LONG_NAME)
  })

  it('AssignableItem renders item with very long name without throwing', () => {
    const item = makeItem({ name: LONG_NAME })
    render(
      <AssignableItem
        item={item}
        assignees={[]}
        currentPerson={{ id: 'p1', name: 'Alice', color: '#f00' }}
        isAssigned={false}
        isUnassigned={false}
        onToggle={vi.fn()}
        onShareClick={vi.fn()}
      />
    )
    // Name is present in the document (may be truncated visually but text is there)
    expect(screen.getByText(LONG_NAME)).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// AddItemForm maxLength
// ---------------------------------------------------------------------------
describe('AddItemForm name length limit', () => {
  it('name input has maxLength=100', () => {
    render(<AddItemForm onAdd={vi.fn()} onCancel={vi.fn()} />)
    const nameInput = screen.getByLabelText('Item name')
    expect(nameInput).toHaveAttribute('maxLength', '100')
  })
})

// ---------------------------------------------------------------------------
// Zero-people guard on AssignmentPage
// ---------------------------------------------------------------------------
describe('AssignmentPage with zero or one person', () => {
  it('shows guard message when fewer than 2 people', () => {
    // zero people
    wrap(<AssignmentPage />)
    expect(screen.getByText(/at least 2 people/i)).toBeInTheDocument()
  })

  it('shows a "Set up people" button when fewer than 2 people', () => {
    wrap(<AssignmentPage />)
    expect(screen.getByRole('button', { name: /go to people setup/i })).toBeInTheDocument()
  })

  it('navigates to /people when Set up people is clicked', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    wrap(<AssignmentPage />)
    await user.click(screen.getByRole('button', { name: /go to people setup/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/people')
  })

  it('shows guard message when only 1 person is present', () => {
    usePeopleStore.getState().addPerson('Alice')
    wrap(<AssignmentPage />)
    expect(screen.getByText(/at least 2 people/i)).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Zero-people guard on TipSelectionPage
// ---------------------------------------------------------------------------
describe('TipSelectionPage with zero people', () => {
  it('shows fallback message when no people in store', () => {
    wrap(<TipSelectionPage />)
    expect(screen.getByText(/no people found/i)).toBeInTheDocument()
  })

  it('shows Set up people button when no people', () => {
    wrap(<TipSelectionPage />)
    expect(screen.getByRole('button', { name: /go to people setup/i })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Zero-people guard on SummaryPage
// ---------------------------------------------------------------------------
describe('SummaryPage with zero people', () => {
  it('shows fallback message when no people in store', () => {
    wrap(<SummaryPage />)
    expect(screen.getByText(/no bill data found/i)).toBeInTheDocument()
  })

  it('shows Start a new bill button when no people', () => {
    wrap(<SummaryPage />)
    expect(screen.getByRole('button', { name: /start a new bill/i })).toBeInTheDocument()
  })
})
