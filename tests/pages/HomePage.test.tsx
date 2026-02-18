import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import HomePage from '../../src/pages/HomePage'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  )
}

beforeEach(() => {
  mockNavigate.mockClear()
})

describe('HomePage', () => {
  it('renders the app name', () => {
    renderHomePage()
    expect(screen.getByText('SplitIt')).toBeInTheDocument()
  })

  it('renders Scan a Bill button', () => {
    renderHomePage()
    expect(screen.getByRole('button', { name: /scan a bill/i })).toBeInTheDocument()
  })

  it('renders Enter Manually button', () => {
    renderHomePage()
    expect(screen.getByRole('button', { name: /enter manually/i })).toBeInTheDocument()
  })

  it('renders View History link', () => {
    renderHomePage()
    expect(screen.getByRole('button', { name: /view history/i })).toBeInTheDocument()
  })

  it('renders hidden file input for receipt capture', () => {
    renderHomePage()
    const input = screen.getByLabelText(/capture or upload receipt photo/i)
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'file')
    expect(input).toHaveAttribute('accept', 'image/*')
  })

  it('navigates to /editor on Enter Manually click', async () => {
    const user = userEvent.setup()
    renderHomePage()
    await user.click(screen.getByRole('button', { name: /enter manually/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/editor')
  })

  it('navigates to /history on View History click', async () => {
    const user = userEvent.setup()
    renderHomePage()
    await user.click(screen.getByRole('button', { name: /view history/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/history')
  })

  it('shows image preview after capturing a photo', async () => {
    const user = userEvent.setup()
    renderHomePage()

    const file = new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/capture or upload receipt photo/i)
    await user.upload(input, file)

    // Should now show the preview with Use This Photo and Retake buttons
    expect(screen.getByRole('button', { name: /use this photo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retake/i })).toBeInTheDocument()
    expect(screen.getByAltText(/captured receipt/i)).toBeInTheDocument()
  })

  it('navigates to /processing on Use This Photo then Process click', async () => {
    const user = userEvent.setup()
    renderHomePage()

    const file = new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/capture or upload receipt photo/i)
    await user.upload(input, file)

    // Use This Photo adds to collection
    await user.click(screen.getByRole('button', { name: /use this photo/i }))

    // Should now show the photo collection with Process button
    const processBtn = screen.getByRole('button', { name: /process 1 photo$/i })
    expect(processBtn).toBeInTheDocument()

    await user.click(processBtn)
    expect(mockNavigate).toHaveBeenCalledWith('/processing')
  })

  it('returns to home screen on Retake click', async () => {
    const user = userEvent.setup()
    renderHomePage()

    const file = new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/capture or upload receipt photo/i)
    await user.upload(input, file)

    // In preview mode
    expect(screen.getByRole('button', { name: /use this photo/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /retake/i }))

    // Should show home screen again (Scan a Bill button visible)
    // Note: Retake also triggers the file input, which won't open in test env
    // but the preview should be cleared
    expect(screen.queryByRole('button', { name: /use this photo/i })).not.toBeInTheDocument()
  })
})
