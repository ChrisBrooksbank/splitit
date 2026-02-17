import { describe, it, expect, vi } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import HandoffScreen from '../../../src/components/assignment/HandoffScreen'
import type { Person } from '../../../src/types'

const alice: Person = { id: 'alice', name: 'Alice', color: '#0057B8' }

describe('HandoffScreen', () => {
  it('displays the next person name', () => {
    render(<HandoffScreen nextPerson={alice} onConfirm={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Alice' })).toBeInTheDocument()
  })

  it('displays "Pass the phone to" text', () => {
    render(<HandoffScreen nextPerson={alice} onConfirm={vi.fn()} />)
    expect(screen.getByText(/pass the phone to/i)).toBeInTheDocument()
  })

  it('button is initially disabled during lockout', () => {
    render(<HandoffScreen nextPerson={alice} onConfirm={vi.fn()} />)
    const btn = screen.getByRole('button', { name: /wait before tapping/i })
    expect(btn).toBeDisabled()
  })

  it('button becomes enabled after lockout period', async () => {
    vi.useFakeTimers()
    render(<HandoffScreen nextPerson={alice} onConfirm={vi.fn()} />)

    expect(screen.getByRole('button', { name: /wait before tapping/i })).toBeDisabled()

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    expect(screen.getByRole('button', { name: /i'm alice/i })).not.toBeDisabled()
    vi.useRealTimers()
  })

  it('calls onConfirm when button is clicked after lockout', async () => {
    vi.useFakeTimers()
    const onConfirm = vi.fn()
    render(<HandoffScreen nextPerson={alice} onConfirm={onConfirm} />)

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    fireEvent.click(screen.getByRole('button', { name: /i'm alice/i }))
    expect(onConfirm).toHaveBeenCalledOnce()
    vi.useRealTimers()
  })

  it('does not call onConfirm when button is disabled during lockout', () => {
    const onConfirm = vi.fn()
    render(<HandoffScreen nextPerson={alice} onConfirm={onConfirm} />)

    // Button is disabled — fireEvent still dispatches but onClick is not attached during lockout
    const btn = screen.getByRole('button', { name: /wait before tapping/i })
    fireEvent.click(btn)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('uses person color as background', () => {
    const { container } = render(<HandoffScreen nextPerson={alice} onConfirm={vi.fn()} />)
    const overlay = container.firstElementChild as HTMLElement
    expect(overlay.style.backgroundColor).toBe('rgb(0, 87, 184)') // #0057B8
  })
})
