import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LineItemList from '../../../src/components/bill/LineItemList'
import type { LineItem } from '../../../src/types'

const makeItem = (overrides: Partial<LineItem> = {}): LineItem => ({
  id: 'item-1',
  name: 'Burger',
  price: 1299,
  quantity: 1,
  confidence: 0.95,
  manuallyEdited: false,
  ...overrides,
})

describe('LineItemList', () => {
  it('renders empty state message when no items', () => {
    render(<LineItemList items={[]} onUpdate={vi.fn()} onDelete={vi.fn()} onAdd={vi.fn()} />)
    expect(screen.getByText(/No items yet/i)).toBeInTheDocument()
  })

  it('renders all provided items', () => {
    const items = [
      makeItem({ id: '1', name: 'Burger' }),
      makeItem({ id: '2', name: 'Fries' }),
      makeItem({ id: '3', name: 'Soda' }),
    ]
    render(<LineItemList items={items} onUpdate={vi.fn()} onDelete={vi.fn()} onAdd={vi.fn()} />)

    expect(screen.getByLabelText('Edit Burger')).toBeInTheDocument()
    expect(screen.getByLabelText('Edit Fries')).toBeInTheDocument()
    expect(screen.getByLabelText('Edit Soda')).toBeInTheDocument()
  })

  it('shows "Add Item" button by default', () => {
    render(<LineItemList items={[]} onUpdate={vi.fn()} onDelete={vi.fn()} onAdd={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Add item' })).toBeInTheDocument()
  })

  it('shows AddItemForm when "Add Item" button is clicked', async () => {
    const user = userEvent.setup()
    render(<LineItemList items={[]} onUpdate={vi.fn()} onDelete={vi.fn()} onAdd={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Add item' }))

    expect(screen.getByLabelText('Item name')).toBeInTheDocument()
    expect(screen.getByLabelText('Price in dollars')).toBeInTheDocument()
  })

  it('hides AddItemForm and calls onAdd when item is submitted', async () => {
    const onAdd = vi.fn()
    const user = userEvent.setup()
    render(<LineItemList items={[]} onUpdate={vi.fn()} onDelete={vi.fn()} onAdd={onAdd} />)

    await user.click(screen.getByRole('button', { name: 'Add item' }))
    await user.type(screen.getByLabelText('Item name'), 'Pizza')
    await user.type(screen.getByLabelText('Price in dollars'), '14.99')
    await user.click(screen.getByRole('button', { name: 'Add item' }))

    expect(onAdd).toHaveBeenCalledWith('Pizza', 1499, 1)
    // Form should be hidden again
    expect(screen.queryByLabelText('Item name')).not.toBeInTheDocument()
  })

  it('hides AddItemForm when cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<LineItemList items={[]} onUpdate={vi.fn()} onDelete={vi.fn()} onAdd={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Add item' }))
    expect(screen.getByLabelText('Item name')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByLabelText('Item name')).not.toBeInTheDocument()
  })

  it('hides empty state when items are present', () => {
    const items = [makeItem()]
    render(<LineItemList items={items} onUpdate={vi.fn()} onDelete={vi.fn()} onAdd={vi.fn()} />)

    expect(screen.queryByText(/No items yet/i)).not.toBeInTheDocument()
  })
})
