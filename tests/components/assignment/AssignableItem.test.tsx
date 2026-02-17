import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AssignableItem from '../../../src/components/assignment/AssignableItem'
import type { LineItem, Person } from '../../../src/types'

const alice: Person = { id: 'alice', name: 'Alice', color: '#0057B8' }
const bob: Person = { id: 'bob', name: 'Bob', color: '#C62828' }

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

function renderItem(
  item: LineItem,
  opts: {
    assignees?: Person[]
    currentPerson?: Person
    isAssigned?: boolean
    isUnassigned?: boolean
  } = {}
) {
  const onToggle = vi.fn()
  const onShareClick = vi.fn()
  const result = render(
    <AssignableItem
      item={item}
      assignees={opts.assignees ?? []}
      currentPerson={opts.currentPerson ?? alice}
      isAssigned={opts.isAssigned ?? false}
      isUnassigned={opts.isUnassigned ?? false}
      onToggle={onToggle}
      onShareClick={onShareClick}
    />
  )
  return { onToggle: vi.mocked(onToggle), onShareClick: vi.mocked(onShareClick), ...result }
}

describe('AssignableItem', () => {
  it('renders item name', () => {
    renderItem(makeItem({ name: 'Pasta' }))
    expect(screen.getByText('Pasta')).toBeInTheDocument()
  })

  it('renders item price', () => {
    renderItem(makeItem({ price: 1299, quantity: 1 }))
    expect(screen.getByText('$12.99')).toBeInTheDocument()
  })

  it('renders total price for multi-quantity items', () => {
    renderItem(makeItem({ price: 500, quantity: 2 }))
    expect(screen.getByText('$10.00')).toBeInTheDocument()
  })

  it('shows quantity prefix for qty > 1', () => {
    renderItem(makeItem({ quantity: 3 }))
    expect(screen.getByText('3×')).toBeInTheDocument()
  })

  it('renders share button', () => {
    renderItem(makeItem())
    expect(screen.getByRole('button', { name: /split burger/i })).toBeInTheDocument()
  })

  it('renders as checkbox role', () => {
    renderItem(makeItem())
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('aria-checked is false when not assigned', () => {
    renderItem(makeItem(), { isAssigned: false })
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'false')
  })

  it('aria-checked is true when assigned', () => {
    renderItem(makeItem(), { isAssigned: true })
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true')
  })

  it('shows unassigned label when isUnassigned is true', () => {
    renderItem(makeItem(), { isUnassigned: true })
    expect(screen.getByText('Unassigned')).toBeInTheDocument()
  })

  it('does not show unassigned label when assigned', () => {
    renderItem(makeItem(), { isAssigned: true, isUnassigned: false })
    expect(screen.queryByText('Unassigned')).not.toBeInTheDocument()
  })

  it('shows assignee chips when item has assignees', () => {
    renderItem(makeItem(), { assignees: [alice, bob] })
    expect(screen.getByLabelText('Alice')).toBeInTheDocument()
    expect(screen.getByLabelText('Bob')).toBeInTheDocument()
  })

  it('calls onToggle with item id when row is clicked', async () => {
    const user = userEvent.setup()
    const { onToggle } = renderItem(makeItem({ id: 'item-42' }))
    await user.click(screen.getByRole('checkbox'))
    expect(onToggle).toHaveBeenCalledOnce()
    expect(onToggle).toHaveBeenCalledWith('item-42')
  })

  it('calls onToggle via keyboard Enter', async () => {
    const user = userEvent.setup()
    const { onToggle } = renderItem(makeItem({ id: 'item-42' }))
    const checkbox = screen.getByRole('checkbox')
    checkbox.focus()
    await user.keyboard('{Enter}')
    expect(onToggle).toHaveBeenCalledWith('item-42')
  })

  it('calls onShareClick with item id when share button is clicked', async () => {
    const user = userEvent.setup()
    const { onShareClick } = renderItem(makeItem({ id: 'item-42' }))
    await user.click(screen.getByRole('button', { name: /split burger/i }))
    expect(onShareClick).toHaveBeenCalledOnce()
    expect(onShareClick).toHaveBeenCalledWith('item-42')
  })

  it('does not call onToggle when share button is clicked', async () => {
    const user = userEvent.setup()
    const { onToggle } = renderItem(makeItem())
    await user.click(screen.getByRole('button', { name: /split burger/i }))
    expect(onToggle).not.toHaveBeenCalled()
  })
})
