import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddItemForm from '../../../src/components/bill/AddItemForm'

describe('AddItemForm', () => {
  it('renders name, quantity, and price inputs', () => {
    render(<AddItemForm onAdd={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByLabelText('Item name')).toBeInTheDocument()
    expect(screen.getByLabelText('Quantity')).toBeInTheDocument()
    expect(screen.getByLabelText('Price in dollars')).toBeInTheDocument()
  })

  it('calls onAdd with correct values when submitted', async () => {
    const onAdd = vi.fn()
    const user = userEvent.setup()
    render(<AddItemForm onAdd={onAdd} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText('Item name'), 'Burger')
    await user.clear(screen.getByLabelText('Quantity'))
    await user.type(screen.getByLabelText('Quantity'), '2')
    await user.type(screen.getByLabelText('Price in dollars'), '12.99')
    await user.click(screen.getByRole('button', { name: 'Add item' }))

    expect(onAdd).toHaveBeenCalledWith('Burger', 1299, 2)
  })

  it('converts price to integer cents', async () => {
    const onAdd = vi.fn()
    const user = userEvent.setup()
    render(<AddItemForm onAdd={onAdd} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText('Item name'), 'Coffee')
    await user.type(screen.getByLabelText('Price in dollars'), '3.50')
    await user.click(screen.getByRole('button', { name: 'Add item' }))

    expect(onAdd).toHaveBeenCalledWith('Coffee', 350, 1)
  })

  it('defaults quantity to 1', async () => {
    const onAdd = vi.fn()
    const user = userEvent.setup()
    render(<AddItemForm onAdd={onAdd} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText('Item name'), 'Tea')
    await user.type(screen.getByLabelText('Price in dollars'), '2.50')
    await user.click(screen.getByRole('button', { name: 'Add item' }))

    expect(onAdd).toHaveBeenCalledWith('Tea', 250, 1)
  })

  it('does not call onAdd when name is empty', async () => {
    const onAdd = vi.fn()
    const user = userEvent.setup()
    render(<AddItemForm onAdd={onAdd} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText('Price in dollars'), '5.00')
    await user.click(screen.getByRole('button', { name: 'Add item' }))

    expect(onAdd).not.toHaveBeenCalled()
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(<AddItemForm onAdd={vi.fn()} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalled()
  })

  it('calls onCancel when Escape is pressed on name input', () => {
    const onCancel = vi.fn()
    render(<AddItemForm onAdd={vi.fn()} onCancel={onCancel} />)

    fireEvent.keyDown(screen.getByLabelText('Item name'), { key: 'Escape' })

    expect(onCancel).toHaveBeenCalled()
  })

  it('trims whitespace from name', async () => {
    const onAdd = vi.fn()
    const user = userEvent.setup()
    render(<AddItemForm onAdd={onAdd} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText('Item name'), '  Salad  ')
    await user.type(screen.getByLabelText('Price in dollars'), '9.00')
    await user.click(screen.getByRole('button', { name: 'Add item' }))

    expect(onAdd).toHaveBeenCalledWith('Salad', 900, 1)
  })
})
