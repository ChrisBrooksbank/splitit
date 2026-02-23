import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AppearanceToggle from '../../../src/components/layout/AppearanceToggle'
import { useAppearanceStore } from '../../../src/store/appearanceStore'

beforeEach(() => {
  useAppearanceStore.setState({ preference: 'system', fontSize: 16 })
})

describe('AppearanceToggle', () => {
  it('renders theme cycle button', () => {
    render(<AppearanceToggle />)
    expect(screen.getByRole('button', { name: /theme/i })).toBeInTheDocument()
  })

  it('cycles from system to light on click', async () => {
    const user = userEvent.setup()
    render(<AppearanceToggle />)
    await user.click(screen.getByRole('button', { name: /theme/i }))
    expect(useAppearanceStore.getState().preference).toBe('light')
  })

  it('cycles from light to dark on click', async () => {
    useAppearanceStore.setState({ preference: 'light' })
    const user = userEvent.setup()
    render(<AppearanceToggle />)
    await user.click(screen.getByRole('button', { name: /theme/i }))
    expect(useAppearanceStore.getState().preference).toBe('dark')
  })

  it('cycles from dark to system on click', async () => {
    useAppearanceStore.setState({ preference: 'dark' })
    const user = userEvent.setup()
    render(<AppearanceToggle />)
    await user.click(screen.getByRole('button', { name: /theme/i }))
    expect(useAppearanceStore.getState().preference).toBe('system')
  })

  it('increases font size on A+ click', async () => {
    const user = userEvent.setup()
    render(<AppearanceToggle />)
    await user.click(screen.getByRole('button', { name: 'Increase font size' }))
    expect(useAppearanceStore.getState().fontSize).toBe(18)
  })

  it('decreases font size on A- click', async () => {
    const user = userEvent.setup()
    render(<AppearanceToggle />)
    await user.click(screen.getByRole('button', { name: 'Decrease font size' }))
    expect(useAppearanceStore.getState().fontSize).toBe(14)
  })

  it('disables A- button at minimum font size', () => {
    useAppearanceStore.setState({ fontSize: 14 })
    render(<AppearanceToggle />)
    expect(screen.getByRole('button', { name: 'Decrease font size' })).toBeDisabled()
  })

  it('disables A+ button at maximum font size', () => {
    useAppearanceStore.setState({ fontSize: 20 })
    render(<AppearanceToggle />)
    expect(screen.getByRole('button', { name: 'Increase font size' })).toBeDisabled()
  })
})
