import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ItemEditorPage from '../../src/pages/ItemEditorPage'
import { useBillStore } from '../../src/store/billStore'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderPage() {
  return render(
    <MemoryRouter>
      <ItemEditorPage />
    </MemoryRouter>
  )
}

beforeEach(() => {
  mockNavigate.mockClear()
  // Reset bill store to empty state before each test
  useBillStore.getState().reset()
  sessionStorage.clear()
})

describe('ItemEditorPage', () => {
  it('renders the page heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /review items/i })).toBeInTheDocument()
  })

  it('renders the Continue button', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /continue to people setup/i })).toBeInTheDocument()
  })

  it('disables Continue button when no items present', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /continue to people setup/i })).toBeDisabled()
  })

  it('enables Continue button when items are present', () => {
    useBillStore.getState().addLineItem({
      name: 'Burger',
      price: 1299,
      quantity: 1,
      confidence: 1.0,
      manuallyEdited: true,
    })
    renderPage()
    expect(screen.getByRole('button', { name: /continue to people setup/i })).not.toBeDisabled()
  })

  it('navigates to /people on Continue click', async () => {
    useBillStore.getState().addLineItem({
      name: 'Burger',
      price: 1299,
      quantity: 1,
      confidence: 1.0,
      manuallyEdited: true,
    })
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /continue to people setup/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/people')
  })

  it('shows empty state message when no items', () => {
    renderPage()
    expect(screen.getByText(/no items yet/i)).toBeInTheDocument()
  })

  it('renders tax config input', () => {
    renderPage()
    expect(screen.getByLabelText(/tax amount/i)).toBeInTheDocument()
  })

  it('renders bill summary card with totals region', () => {
    renderPage()
    expect(screen.getByRole('region', { name: /bill totals/i })).toBeInTheDocument()
  })

  it('populates items from ocrResult in sessionStorage', () => {
    // Simple OCR text with a single line item
    const ocrText = 'Burger   $12.99\nTAX   $1.04\n'
    sessionStorage.setItem('ocrResult', ocrText)

    renderPage()

    // Should have populated the item from OCR
    expect(screen.getByLabelText(/edit burger/i)).toBeInTheDocument()
  })

  it('does not overwrite existing store items with ocrResult', () => {
    // Pre-populate the store
    useBillStore.getState().addLineItem({
      name: 'Existing Item',
      price: 500,
      quantity: 1,
      confidence: 1.0,
      manuallyEdited: true,
    })
    // Also set an OCR result
    sessionStorage.setItem('ocrResult', 'Burger   $12.99\n')

    renderPage()

    // Existing item should still be there
    expect(screen.getByLabelText(/edit existing item/i)).toBeInTheDocument()
    // OCR item should NOT have been added (store was not empty)
    expect(screen.queryByLabelText(/edit burger/i)).not.toBeInTheDocument()
  })

  it('can add a new item manually', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Add item' }))
    await user.type(screen.getByLabelText('Item name'), 'Pizza')
    await user.type(screen.getByLabelText('Price in dollars'), '14.99')
    await user.click(screen.getByRole('button', { name: 'Add item' }))

    expect(screen.getByLabelText(/edit pizza/i)).toBeInTheDocument()
  })
})
