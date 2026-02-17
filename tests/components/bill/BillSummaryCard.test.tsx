import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import BillSummaryCard from '../../../src/components/bill/BillSummaryCard'

describe('BillSummaryCard', () => {
  it('renders total formatted as currency', () => {
    render(<BillSummaryCard subtotalCents={2500} />)
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('£25.00')).toBeInTheDocument()
  })

  it('renders £0.00 when value is zero', () => {
    render(<BillSummaryCard subtotalCents={0} />)
    expect(screen.getByText('£0.00')).toBeInTheDocument()
  })

  it('has accessible region label', () => {
    render(<BillSummaryCard subtotalCents={1000} />)
    expect(screen.getByRole('region', { name: /bill totals/i })).toBeInTheDocument()
  })

  it('handles large amounts correctly (integer cents)', () => {
    render(<BillSummaryCard subtotalCents={10050} />)
    expect(screen.getByText('£100.50')).toBeInTheDocument()
  })

  it('correctly displays odd cent amounts', () => {
    render(<BillSummaryCard subtotalCents={3} />)
    expect(screen.getByText('£0.03')).toBeInTheDocument()
  })
})
