import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddItemForm from '../../../src/components/bill/AddItemForm'

describe('AddItemForm', () => {
  it('renders "Add Item" button', () => {
    render(<AddItemForm onAdd={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Add item' })).toBeInTheDocument()
  })

  it('opens modal when button is clicked', async () => {
    const user = userEvent.setup()
    render(<AddItemForm onAdd={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Add item' }))

    expect(screen.getByRole('dialog', { name: 'Add Item' })).toBeInTheDocument()
    expect(screen.getByLabelText('Item name')).toBeInTheDocument()
    expect(screen.getByLabelText('Total price')).toBeInTheDocument()
  })

  it('calls onAdd with correct values when submitted', async () => {
    const onAdd = vi.fn()
    const user = userEvent.setup()
    render(<AddItemForm onAdd={onAdd} />)

    await user.click(screen.getByRole('button', { name: 'Add item' }))
    await user.type(screen.getByLabelText('Item name'), 'Burger')
    await user.clear(screen.getByLabelText('Qty'))
    await user.type(screen.getByLabelText('Qty'), '2')
    await user.type(screen.getByLabelText('Total price'), '12.99')
    await user.click(screen.getByRole('button', { name: 'Add Item' }))

    // 12.99 total / 2 = 650 unit price (rounded)
    expect(onAdd).toHaveBeenCalledWith('Burger', 650, 2)
  })

  it('converts price to integer cents', async () => {
    const onAdd = vi.fn()
    const user = userEvent.setup()
    render(<AddItemForm onAdd={onAdd} />)

    await user.click(screen.getByRole('button', { name: 'Add item' }))
    await user.type(screen.getByLabelText('Item name'), 'Coffee')
    await user.type(screen.getByLabelText('Total price'), '3.50')
    await user.click(screen.getByRole('button', { name: 'Add Item' }))

    expect(onAdd).toHaveBeenCalledWith('Coffee', 350, 1)
  })

  it('defaults quantity to 1', async () => {
    const onAdd = vi.fn()
    const user = userEvent.setup()
    render(<AddItemForm onAdd={onAdd} />)

    await user.click(screen.getByRole('button', { name: 'Add item' }))
    await user.type(screen.getByLabelText('Item name'), 'Tea')
    await user.type(screen.getByLabelText('Total price'), '2.50')
    await user.click(screen.getByRole('button', { name: 'Add Item' }))

    expect(onAdd).toHaveBeenCalledWith('Tea', 250, 1)
  })

  it('does not call onAdd when name is empty', async () => {
    const onAdd = vi.fn()
    const user = userEvent.setup()
    render(<AddItemForm onAdd={onAdd} />)

    await user.click(screen.getByRole('button', { name: 'Add item' }))
    await user.type(screen.getByLabelText('Total price'), '5.00')
    await user.click(screen.getByRole('button', { name: 'Add Item' }))

    expect(onAdd).not.toHaveBeenCalled()
  })

  it('closes modal when close button is clicked', async () => {
    const user = userEvent.setup()
    render(<AddItemForm onAdd={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Add item' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes modal after successful add', async () => {
    const user = userEvent.setup()
    render(<AddItemForm onAdd={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Add item' }))
    await user.type(screen.getByLabelText('Item name'), 'Salad')
    await user.type(screen.getByLabelText('Total price'), '9.00')
    await user.click(screen.getByRole('button', { name: 'Add Item' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('trims whitespace from name', async () => {
    const onAdd = vi.fn()
    const user = userEvent.setup()
    render(<AddItemForm onAdd={onAdd} />)

    await user.click(screen.getByRole('button', { name: 'Add item' }))
    await user.type(screen.getByLabelText('Item name'), '  Salad  ')
    await user.type(screen.getByLabelText('Total price'), '9.00')
    await user.click(screen.getByRole('button', { name: 'Add Item' }))

    expect(onAdd).toHaveBeenCalledWith('Salad', 900, 1)
  })
})
