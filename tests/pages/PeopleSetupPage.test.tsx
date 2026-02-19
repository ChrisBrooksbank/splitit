import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import PeopleSetupPage from '../../src/pages/PeopleSetupPage'
import { usePeopleStore } from '../../src/store/peopleStore'

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
      <PeopleSetupPage />
    </MemoryRouter>
  )
}

beforeEach(() => {
  mockNavigate.mockClear()
  usePeopleStore.getState().reset()
})

describe('PeopleSetupPage', () => {
  it('renders the page heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /who's at the table/i })).toBeInTheDocument()
  })

  it('renders the name input', () => {
    renderPage()
    expect(screen.getByRole('textbox', { name: /person's name/i })).toBeInTheDocument()
  })

  it('renders the Add button', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /add person/i })).toBeInTheDocument()
  })

  it('disables Continue button when fewer than 2 people', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /continue with pass-around/i })).toBeDisabled()
  })

  it('disables Add button when input is empty', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /add person/i })).toBeDisabled()
  })

  it('adds a person when Add button is clicked', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByRole('textbox', { name: /person's name/i }), 'Alice')
    await user.click(screen.getByRole('button', { name: /add person/i }))
    // Name appears as edit button in the list
    expect(screen.getByRole('button', { name: /edit alice/i })).toBeInTheDocument()
  })

  it('adds a person when Enter is pressed in input', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByRole('textbox', { name: /person's name/i }), 'Bob{Enter}')
    expect(screen.getByRole('button', { name: /edit bob/i })).toBeInTheDocument()
  })

  it('clears input after adding a person', async () => {
    const user = userEvent.setup()
    renderPage()
    const input = screen.getByRole('textbox', { name: /person's name/i })
    await user.type(input, 'Carol{Enter}')
    expect(input).toHaveValue('')
  })

  it('enables Continue button when 2+ people added', async () => {
    const user = userEvent.setup()
    renderPage()
    const input = screen.getByRole('textbox', { name: /person's name/i })
    await user.type(input, 'Alice{Enter}')
    await user.type(input, 'Bob{Enter}')
    expect(screen.getByRole('button', { name: /continue with pass-around/i })).not.toBeDisabled()
  })

  it('navigates to /assign when Continue is clicked', async () => {
    const user = userEvent.setup()
    renderPage()
    const input = screen.getByRole('textbox', { name: /person's name/i })
    await user.type(input, 'Alice{Enter}')
    await user.type(input, 'Bob{Enter}')
    await user.click(screen.getByRole('button', { name: /continue with pass-around/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/assign')
  })

  it('removes a person when remove button is clicked', async () => {
    const user = userEvent.setup()
    renderPage()
    const input = screen.getByRole('textbox', { name: /person's name/i })
    await user.type(input, 'Alice{Enter}')
    await user.click(screen.getByRole('button', { name: /remove alice/i }))
    expect(screen.queryByText('Alice')).not.toBeInTheDocument()
  })

  it('shows empty state hint when no people added', () => {
    renderPage()
    expect(screen.getByText(/add at least 2 people/i)).toBeInTheDocument()
  })

  it('shows reminder when only 1 person added', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByRole('textbox', { name: /person's name/i }), 'Alice{Enter}')
    expect(screen.getByText(/add one more person/i)).toBeInTheDocument()
  })
})
