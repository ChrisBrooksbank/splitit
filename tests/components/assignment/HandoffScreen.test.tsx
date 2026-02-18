import { describe, it, expect, vi } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import HandoffScreen from '../../../src/components/assignment/HandoffScreen'

describe('HandoffScreen', () => {
  it('displays "Pass the phone" heading', () => {
    render(<HandoffScreen onConfirm={vi.fn()} />)
    expect(screen.getByRole('heading', { name: /pass the phone/i })).toBeInTheDocument()
  })

  it('displays "to the next person" text', () => {
    render(<HandoffScreen onConfirm={vi.fn()} />)
    expect(screen.getByText(/to the next person/i)).toBeInTheDocument()
  })

  it('button is initially disabled during lockout', () => {
    render(<HandoffScreen onConfirm={vi.fn()} />)
    const btn = screen.getByRole('button', { name: /wait before tapping/i })
    expect(btn).toBeDisabled()
  })

  it('button becomes enabled after lockout period', async () => {
    vi.useFakeTimers()
    render(<HandoffScreen onConfirm={vi.fn()} />)

    expect(screen.getByRole('button', { name: /wait before tapping/i })).toBeDisabled()

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    expect(screen.getByRole('button', { name: /ready to continue/i })).not.toBeDisabled()
    vi.useRealTimers()
  })

  it('calls onConfirm when button is clicked after lockout', async () => {
    vi.useFakeTimers()
    const onConfirm = vi.fn()
    render(<HandoffScreen onConfirm={onConfirm} />)

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    fireEvent.click(screen.getByRole('button', { name: /ready to continue/i }))
    expect(onConfirm).toHaveBeenCalledOnce()
    vi.useRealTimers()
  })

  it('does not call onConfirm when button is disabled during lockout', () => {
    const onConfirm = vi.fn()
    render(<HandoffScreen onConfirm={onConfirm} />)

    const btn = screen.getByRole('button', { name: /wait before tapping/i })
    fireEvent.click(btn)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('uses neutral dark background', () => {
    const { container } = render(<HandoffScreen onConfirm={vi.fn()} />)
    const overlay = container.firstElementChild as HTMLElement
    expect(overlay.className).toContain('bg-gray-900')
  })
})
