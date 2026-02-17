import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LineItemRow from '../../../src/components/bill/LineItemRow'
import type { LineItem } from '../../../src/types'

function makeItem(overrides: Partial<LineItem> = {}): LineItem {
  return {
    id: 'item-1',
    name: 'Burger',
    price: 1299, // $12.99
    quantity: 1,
    confidence: 1.0,
    manuallyEdited: false,
    ...overrides,
  }
}

function renderRow(item: LineItem) {
  const onUpdate = vi.fn() as (id: string, updates: Partial<Omit<LineItem, 'id'>>) => void
  const onDelete = vi.fn() as (id: string) => void
  const result = render(<LineItemRow item={item} onUpdate={onUpdate} onDelete={onDelete} />)
  return { onUpdate: vi.mocked(onUpdate), onDelete: vi.mocked(onDelete), ...result }
}

describe('LineItemRow', () => {
  describe('display mode', () => {
    it('renders item name', () => {
      renderRow(makeItem())
      expect(screen.getByText('Burger')).toBeInTheDocument()
    })

    it('renders price formatted as currency', () => {
      renderRow(makeItem({ price: 1299 }))
      expect(screen.getByText('$12.99')).toBeInTheDocument()
    })

    it('shows quantity prefix when qty > 1', () => {
      renderRow(makeItem({ quantity: 3, price: 500 }))
      expect(screen.getByText('3×')).toBeInTheDocument()
    })

    it('shows total price (price × qty) for multi-quantity items', () => {
      renderRow(makeItem({ quantity: 2, price: 500 }))
      // 2 × $5.00 = $10.00
      expect(screen.getByText('$10.00')).toBeInTheDocument()
    })

    it('does not show quantity prefix for single items', () => {
      renderRow(makeItem({ quantity: 1 }))
      expect(screen.queryByText('1×')).not.toBeInTheDocument()
    })

    it('renders delete button', () => {
      renderRow(makeItem())
      expect(screen.getByRole('button', { name: /delete burger/i })).toBeInTheDocument()
    })

    it('does not show low-confidence badge for high-confidence items', () => {
      renderRow(makeItem({ confidence: 0.9 }))
      expect(screen.queryByLabelText(/low confidence/i)).not.toBeInTheDocument()
    })

    it('shows low-confidence badge for items below threshold', () => {
      renderRow(makeItem({ confidence: 0.5 }))
      expect(screen.getByLabelText(/low confidence/i)).toBeInTheDocument()
    })

    it('does not show low-confidence badge for manually edited items even with low confidence', () => {
      renderRow(makeItem({ confidence: 0.3, manuallyEdited: true }))
      expect(screen.queryByLabelText(/low confidence/i)).not.toBeInTheDocument()
    })
  })

  describe('delete', () => {
    it('calls onDelete with item id when delete button is clicked', async () => {
      const user = userEvent.setup()
      const { onDelete } = renderRow(makeItem({ id: 'item-99' }))
      await user.click(screen.getByRole('button', { name: /delete burger/i }))
      expect(onDelete).toHaveBeenCalledOnce()
      expect(onDelete).toHaveBeenCalledWith('item-99')
    })
  })

  describe('inline editing', () => {
    it('enters edit mode when row is clicked', async () => {
      const user = userEvent.setup()
      renderRow(makeItem())
      await user.click(screen.getByRole('button', { name: /edit burger/i }))
      expect(screen.getByLabelText(/item name/i)).toBeInTheDocument()
    })

    it('enters edit mode via keyboard Enter', async () => {
      const user = userEvent.setup()
      renderRow(makeItem())
      const rowBtn = screen.getByRole('button', { name: /edit burger/i })
      rowBtn.focus()
      await user.keyboard('{Enter}')
      expect(screen.getByLabelText(/item name/i)).toBeInTheDocument()
    })

    it('pre-fills name input with current name', async () => {
      const user = userEvent.setup()
      renderRow(makeItem({ name: 'Pasta' }))
      await user.click(screen.getByRole('button', { name: /edit pasta/i }))
      expect(screen.getByLabelText(/item name/i)).toHaveValue('Pasta')
    })

    it('pre-fills price input with current price in dollars', async () => {
      const user = userEvent.setup()
      renderRow(makeItem({ price: 899 }))
      await user.click(screen.getByRole('button', { name: /edit burger/i }))
      expect(screen.getByLabelText(/price in dollars/i)).toHaveValue(8.99)
    })

    it('pre-fills quantity input', async () => {
      const user = userEvent.setup()
      renderRow(makeItem({ quantity: 3 }))
      await user.click(screen.getByRole('button', { name: /edit burger/i }))
      expect(screen.getByLabelText(/quantity/i)).toHaveValue(3)
    })

    it('calls onUpdate with updated values when Done is clicked', async () => {
      const user = userEvent.setup()
      const { onUpdate } = renderRow(makeItem({ id: 'item-1', name: 'Burger', price: 1299 }))

      await user.click(screen.getByRole('button', { name: /edit burger/i }))

      const nameInput = screen.getByLabelText(/item name/i)
      await user.clear(nameInput)
      await user.type(nameInput, 'Cheeseburger')

      await user.click(screen.getByRole('button', { name: /save changes/i }))

      expect(onUpdate).toHaveBeenCalledOnce()
      expect(onUpdate).toHaveBeenCalledWith(
        'item-1',
        expect.objectContaining({ name: 'Cheeseburger' })
      )
    })

    it('converts dollar price input to integer cents on save', async () => {
      const user = userEvent.setup()
      const { onUpdate } = renderRow(makeItem({ id: 'item-1', price: 1299 }))

      await user.click(screen.getByRole('button', { name: /edit burger/i }))

      const priceInput = screen.getByLabelText(/price in dollars/i)
      await user.clear(priceInput)
      await user.type(priceInput, '7.50')

      await user.click(screen.getByRole('button', { name: /save changes/i }))

      expect(onUpdate).toHaveBeenCalledWith('item-1', expect.objectContaining({ price: 750 }))
    })

    it('exits edit mode when Escape is pressed', async () => {
      const user = userEvent.setup()
      renderRow(makeItem())
      await user.click(screen.getByRole('button', { name: /edit burger/i }))
      expect(screen.getByLabelText(/item name/i)).toBeInTheDocument()

      await user.keyboard('{Escape}')
      expect(screen.queryByLabelText(/item name/i)).not.toBeInTheDocument()
    })

    it('saves when Enter is pressed in name input', async () => {
      const user = userEvent.setup()
      const { onUpdate } = renderRow(makeItem({ id: 'item-1' }))

      await user.click(screen.getByRole('button', { name: /edit burger/i }))
      const nameInput = screen.getByLabelText(/item name/i)
      await user.clear(nameInput)
      await user.type(nameInput, 'Pizza{Enter}')

      expect(onUpdate).toHaveBeenCalledWith('item-1', expect.objectContaining({ name: 'Pizza' }))
    })
  })
})
