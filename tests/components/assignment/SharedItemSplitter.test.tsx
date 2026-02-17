import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SharedItemSplitter from '../../../src/components/assignment/SharedItemSplitter'
import type { LineItem, Person } from '../../../src/types'

const alice: Person = { id: 'alice', name: 'Alice', color: '#0057B8' }
const bob: Person = { id: 'bob', name: 'Bob', color: '#C62828' }
const carol: Person = { id: 'carol', name: 'Carol', color: '#2E7D32' }

const item: LineItem = {
  id: 'item-1',
  name: 'Nachos',
  price: 1200,
  quantity: 1,
  confidence: 1.0,
  manuallyEdited: false,
}

function renderSplitter(
  opts: {
    assignees?: string[]
    portions?: Record<string, number>
  } = {}
) {
  const onConfirm = vi.fn<(personIds: string[], portions: Record<string, number>) => void>()
  const onClose = vi.fn<() => void>()
  render(
    <SharedItemSplitter
      item={item}
      people={[alice, bob, carol]}
      currentAssignees={opts.assignees ?? []}
      currentPortions={opts.portions ?? {}}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  )
  return { onConfirm: vi.mocked(onConfirm), onClose: vi.mocked(onClose) }
}

describe('SharedItemSplitter', () => {
  it('renders the item name', () => {
    renderSplitter()
    expect(screen.getByText('Nachos')).toBeInTheDocument()
  })

  it('renders the item total price', () => {
    renderSplitter()
    expect(screen.getByText('£12.00 total')).toBeInTheDocument()
  })

  it('renders checkboxes for all people', () => {
    renderSplitter()
    expect(screen.getByRole('checkbox', { name: /include alice/i })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /include bob/i })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /include carol/i })).toBeInTheDocument()
  })

  it('pre-checks people in currentAssignees', () => {
    renderSplitter({ assignees: ['alice', 'bob'] })
    expect(screen.getByRole('checkbox', { name: /include alice/i })).toHaveAttribute(
      'aria-checked',
      'true'
    )
    expect(screen.getByRole('checkbox', { name: /include bob/i })).toHaveAttribute(
      'aria-checked',
      'true'
    )
    expect(screen.getByRole('checkbox', { name: /include carol/i })).toHaveAttribute(
      'aria-checked',
      'false'
    )
  })

  it('shows cancel button', () => {
    renderSplitter()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup()
    const { onClose } = renderSplitter()
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when Escape key is pressed', () => {
    const { onClose } = renderSplitter()
    // Escape is handled via a document-level event listener
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('has aria-labelledby pointing to the item name heading', () => {
    renderSplitter()
    const dialog = screen.getByRole('dialog')
    const labelId = dialog.getAttribute('aria-labelledby')
    expect(labelId).toBeTruthy()
    const heading = document.getElementById(labelId!)
    expect(heading).toBeInTheDocument()
    expect(heading?.textContent).toContain('Nachos')
  })

  it('has aria-modal="true"', () => {
    renderSplitter()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup()
    const { onClose } = renderSplitter()
    // click the dimmed overlay (aria-hidden)
    const dialog = screen.getByRole('dialog')
    // click outside the bottom sheet panel — the backdrop is the first child of dialog
    await user.click(dialog.firstElementChild as HTMLElement)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('confirm button is disabled when no one is selected', () => {
    renderSplitter({ assignees: [] })
    const confirmBtn = screen.getByRole('button', { name: /select people/i })
    expect(confirmBtn).toBeDisabled()
  })

  it('calls onConfirm with selected person ids and empty portions for even split', async () => {
    const user = userEvent.setup()
    const { onConfirm } = renderSplitter({ assignees: ['alice'] })
    await user.click(screen.getByRole('button', { name: /split 1 way/i }))
    expect(onConfirm).toHaveBeenCalledWith(['alice'], {})
  })

  it('can toggle a person on and off', async () => {
    const user = userEvent.setup()
    const { onConfirm } = renderSplitter({ assignees: ['alice'] })

    // Uncheck alice
    await user.click(screen.getByRole('checkbox', { name: /include alice/i }))
    // Check bob
    await user.click(screen.getByRole('checkbox', { name: /include bob/i }))
    await user.click(screen.getByRole('button', { name: /split 1 way/i }))

    expect(onConfirm).toHaveBeenCalledWith(['bob'], {})
  })

  it('renders custom portions toggle', () => {
    renderSplitter()
    expect(screen.getByRole('button', { name: /custom portions/i })).toBeInTheDocument()
  })

  it('shows portion inputs when custom toggle is enabled', async () => {
    const user = userEvent.setup()
    renderSplitter({ assignees: ['alice', 'bob'] })
    await user.click(screen.getByRole('button', { name: /custom portions/i }))
    expect(screen.getByLabelText(/alice portion count/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/bob portion count/i)).toBeInTheDocument()
  })

  it('calls onConfirm with portion weights in custom mode', async () => {
    const user = userEvent.setup()
    const { onConfirm } = renderSplitter({ assignees: ['alice', 'bob'] })
    await user.click(screen.getByRole('button', { name: /custom portions/i }))

    // Change alice's portion to 2 via fireEvent to avoid number input quirks
    const aliceInput = screen.getByLabelText(/alice portion count/i)
    fireEvent.change(aliceInput, { target: { value: '2' } })

    await user.click(screen.getByRole('button', { name: /split 2 ways/i }))
    expect(onConfirm).toHaveBeenCalledWith(
      expect.arrayContaining(['alice', 'bob']),
      expect.objectContaining({ alice: 2, bob: 1 })
    )
  })
})
