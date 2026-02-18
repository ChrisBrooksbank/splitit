import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InstallBanner from '../../../src/components/layout/InstallBanner'

describe('InstallBanner', () => {
  it('renders install text and buttons', () => {
    render(<InstallBanner onInstall={vi.fn()} onDismiss={vi.fn()} />)
    expect(screen.getByText('Install SplitIt for offline use')).toBeInTheDocument()
    expect(screen.getByText('Install')).toBeInTheDocument()
    expect(screen.getByLabelText('Dismiss install banner')).toBeInTheDocument()
  })

  it('calls onInstall when Install button is clicked', async () => {
    const onInstall = vi.fn()
    render(<InstallBanner onInstall={onInstall} onDismiss={vi.fn()} />)
    await userEvent.click(screen.getByText('Install'))
    expect(onInstall).toHaveBeenCalledOnce()
  })

  it('calls onDismiss when dismiss button is clicked', async () => {
    const onDismiss = vi.fn()
    render(<InstallBanner onInstall={vi.fn()} onDismiss={onDismiss} />)
    await userEvent.click(screen.getByLabelText('Dismiss install banner'))
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
