import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ThemeToggle from '../../../src/components/layout/ThemeToggle'
import { useThemeStore } from '../../../src/store/themeStore'

beforeEach(() => {
  useThemeStore.setState({ preference: 'system' })
})

describe('ThemeToggle', () => {
  it('renders 3 radio buttons', () => {
    render(<ThemeToggle />)
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(3)
  })

  it('has system checked by default', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('radio', { name: 'System' })).toHaveAttribute('aria-checked', 'true')
  })

  it('updates preference to dark on click', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)
    await user.click(screen.getByRole('radio', { name: 'Dark' }))
    expect(useThemeStore.getState().preference).toBe('dark')
  })

  it('updates preference to light on click', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)
    await user.click(screen.getByRole('radio', { name: 'Light' }))
    expect(useThemeStore.getState().preference).toBe('light')
  })
})
