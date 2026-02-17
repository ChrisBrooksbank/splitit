import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TaxConfig from '../../../src/components/bill/TaxConfig'

describe('TaxConfig', () => {
  it('renders a labeled tax input', () => {
    render(<TaxConfig taxAmount={0} onTaxChange={vi.fn()} />)
    expect(screen.getByRole('spinbutton', { name: /tax amount/i })).toBeInTheDocument()
  })

  it('displays the label "Tax"', () => {
    render(<TaxConfig taxAmount={0} onTaxChange={vi.fn()} />)
    expect(screen.getByText('Tax')).toBeInTheDocument()
  })

  it('pre-fills input with taxAmount converted from cents to dollars', () => {
    render(<TaxConfig taxAmount={250} onTaxChange={vi.fn()} />)
    const input = screen.getByRole('spinbutton', { name: /tax amount/i })
    expect(input).toHaveValue(2.5)
  })

  it('pre-fills with 0.00 when taxAmount is 0', () => {
    render(<TaxConfig taxAmount={0} onTaxChange={vi.fn()} />)
    const input = screen.getByRole('spinbutton', { name: /tax amount/i })
    expect(input).toHaveValue(0)
  })

  it('calls onTaxChange with integer cents when value changes', async () => {
    const user = userEvent.setup()
    const onTaxChange = vi.fn()
    render(<TaxConfig taxAmount={0} onTaxChange={onTaxChange} />)

    const input = screen.getByRole('spinbutton', { name: /tax amount/i })
    await user.clear(input)
    await user.type(input, '3.50')

    // onTaxChange should have been called with 350 cents at some point
    const calls = onTaxChange.mock.calls.map((c) => c[0])
    expect(calls).toContain(350)
  })

  it('normalizes display to 2 decimal places on blur', async () => {
    const user = userEvent.setup()
    render(<TaxConfig taxAmount={0} onTaxChange={vi.fn()} />)

    const input = screen.getByRole('spinbutton', { name: /tax amount/i })
    await user.clear(input)
    await user.type(input, '5')
    await user.tab() // trigger blur

    expect(input).toHaveValue(5)
  })

  it('reverts to previous value on blur when input is invalid', async () => {
    const user = userEvent.setup()
    render(<TaxConfig taxAmount={199} onTaxChange={vi.fn()} />)

    const input = screen.getByRole('spinbutton', { name: /tax amount/i })
    await user.clear(input)
    // Leave empty (NaN)
    await user.tab() // trigger blur

    // Should revert to $1.99
    expect(input).toHaveValue(1.99)
  })

  it('syncs when taxAmount prop changes', () => {
    const { rerender } = render(<TaxConfig taxAmount={100} onTaxChange={vi.fn()} />)
    const input = screen.getByRole('spinbutton', { name: /tax amount/i })
    expect(input).toHaveValue(1)

    rerender(<TaxConfig taxAmount={500} onTaxChange={vi.fn()} />)
    expect(input).toHaveValue(5)
  })
})
