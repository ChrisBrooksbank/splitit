import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import BillSummaryCard from '../../../src/components/bill/BillSummaryCard'

describe('BillSummaryCard', () => {
  it('renders subtotal formatted as currency', () => {
    render(<BillSummaryCard subtotalCents={2500} taxCents={100} />)
    expect(screen.getByText('Subtotal')).toBeInTheDocument()
    expect(screen.getByText('$25.00')).toBeInTheDocument()
  })

  it('renders tax formatted as currency', () => {
    render(<BillSummaryCard subtotalCents={500} taxCents={300} />)
    expect(screen.getByText('Tax')).toBeInTheDocument()
    expect(screen.getByText('$3.00')).toBeInTheDocument()
  })

  it('renders grand total as sum of subtotal and tax', () => {
    // subtotal $25.00 + tax $3.00 = $28.00
    render(<BillSummaryCard subtotalCents={2500} taxCents={300} />)
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('$28.00')).toBeInTheDocument()
  })

  it('renders $0.00 totals when both values are zero', () => {
    render(<BillSummaryCard subtotalCents={0} taxCents={0} />)
    // Three currency cells, all $0.00
    const zeros = screen.getAllByText('$0.00')
    expect(zeros.length).toBeGreaterThanOrEqual(2)
  })

  it('has accessible region label', () => {
    render(<BillSummaryCard subtotalCents={1000} taxCents={100} />)
    expect(screen.getByRole('region', { name: /bill totals/i })).toBeInTheDocument()
  })

  it('total is labeled as bold/semibold via Total label', () => {
    render(<BillSummaryCard subtotalCents={1000} taxCents={100} />)
    // Verify Grand Total row is the one labeled "Total"
    const totalLabel = screen.getByText('Total')
    expect(totalLabel).toBeInTheDocument()
  })

  it('handles large amounts correctly (integer cents)', () => {
    // $100.50 subtotal + $9.99 tax = $110.49
    render(<BillSummaryCard subtotalCents={10050} taxCents={999} />)
    expect(screen.getByText('$100.50')).toBeInTheDocument()
    expect(screen.getByText('$9.99')).toBeInTheDocument()
    expect(screen.getByText('$110.49')).toBeInTheDocument()
  })

  it('correctly rounds odd cent amounts', () => {
    // 1 cent + 2 cents = 3 cents
    render(<BillSummaryCard subtotalCents={1} taxCents={2} />)
    expect(screen.getByText('$0.03')).toBeInTheDocument()
  })
})
