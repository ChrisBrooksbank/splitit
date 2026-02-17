import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ItemEditorModal from '../../../src/components/bill/ItemEditorModal'

describe('ItemEditorModal', () => {
  it('renders with the given title', () => {
    render(<ItemEditorModal title="Add Item" saveLabel="Add" onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog', { name: 'Add Item' })).toBeInTheDocument()
    expect(screen.getByText('Add Item')).toBeInTheDocument()
  })

  it('renders name, price, and quantity inputs', () => {
    render(<ItemEditorModal title="Add Item" saveLabel="Add" onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByLabelText('Item name')).toBeInTheDocument()
    expect(screen.getByLabelText('Price')).toBeInTheDocument()
    expect(screen.getByLabelText('Qty')).toBeInTheDocument()
  })

  it('pre-fills inputs with initial values', () => {
    render(
      <ItemEditorModal
        title="Edit Item"
        saveLabel="Save"
        initialName="Burger"
        initialPrice="12.99"
        initialQty="2"
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByLabelText('Item name')).toHaveValue('Burger')
    expect(screen.getByLabelText('Price')).toHaveValue(12.99)
    expect(screen.getByLabelText('Qty')).toHaveValue(2)
  })

  it('calls onSave with correct values', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()
    render(
      <ItemEditorModal title="Add Item" saveLabel="Add Item" onSave={onSave} onClose={vi.fn()} />
    )

    await user.type(screen.getByLabelText('Item name'), 'Pizza')
    await user.type(screen.getByLabelText('Price'), '14.99')
    await user.clear(screen.getByLabelText('Qty'))
    await user.type(screen.getByLabelText('Qty'), '2')
    await user.click(screen.getByRole('button', { name: 'Add Item' }))

    expect(onSave).toHaveBeenCalledWith('Pizza', 1499, 2)
  })

  it('converts price to integer cents', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()
    render(<ItemEditorModal title="Add Item" saveLabel="Add" onSave={onSave} onClose={vi.fn()} />)

    await user.type(screen.getByLabelText('Item name'), 'Coffee')
    await user.type(screen.getByLabelText('Price'), '3.50')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(onSave).toHaveBeenCalledWith('Coffee', 350, 1)
  })

  it('does not call onSave when name is empty', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()
    render(<ItemEditorModal title="Add Item" saveLabel="Add" onSave={onSave} onClose={vi.fn()} />)

    await user.type(screen.getByLabelText('Price'), '5.00')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(onSave).not.toHaveBeenCalled()
  })

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<ItemEditorModal title="Add Item" saveLabel="Add" onSave={vi.fn()} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    const { container } = render(
      <ItemEditorModal title="Add Item" saveLabel="Add" onSave={vi.fn()} onClose={onClose} />
    )

    // Click the backdrop (first child of dialog wrapper)
    const backdrop = container.querySelector('[aria-hidden="true"]')!
    await user.click(backdrop)
    expect(onClose).toHaveBeenCalled()
  })

  it('trims whitespace from name', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()
    render(<ItemEditorModal title="Add Item" saveLabel="Add" onSave={onSave} onClose={vi.fn()} />)

    await user.type(screen.getByLabelText('Item name'), '  Salad  ')
    await user.type(screen.getByLabelText('Price'), '9.00')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(onSave).toHaveBeenCalledWith('Salad', 900, 1)
  })

  it('defaults quantity to 1', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()
    render(<ItemEditorModal title="Add Item" saveLabel="Add" onSave={onSave} onClose={vi.fn()} />)

    await user.type(screen.getByLabelText('Item name'), 'Tea')
    await user.type(screen.getByLabelText('Price'), '2.50')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(onSave).toHaveBeenCalledWith('Tea', 250, 1)
  })

  it('renders delete button when onDelete is provided', () => {
    render(
      <ItemEditorModal
        title="Edit Item"
        saveLabel="Save"
        onSave={vi.fn()}
        onClose={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: 'Delete item' })).toBeInTheDocument()
  })

  it('does not render delete button when onDelete is not provided', () => {
    render(<ItemEditorModal title="Add Item" saveLabel="Add" onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Delete item' })).not.toBeInTheDocument()
  })

  it('calls onDelete when delete button is clicked', async () => {
    const onDelete = vi.fn()
    const user = userEvent.setup()
    render(
      <ItemEditorModal
        title="Edit Item"
        saveLabel="Save"
        onSave={vi.fn()}
        onClose={vi.fn()}
        onDelete={onDelete}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Delete item' }))
    expect(onDelete).toHaveBeenCalled()
  })

  it('renders the save button with the given label', () => {
    render(
      <ItemEditorModal
        title="Edit Item"
        saveLabel="Save Changes"
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument()
  })
})
