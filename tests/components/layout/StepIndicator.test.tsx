import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StepIndicator from '../../../src/components/layout/StepIndicator'

describe('StepIndicator', () => {
  it('renders all 5 step labels', () => {
    render(<StepIndicator currentRoute="/editor" />)
    expect(screen.getByText('Items')).toBeInTheDocument()
    expect(screen.getByText('People')).toBeInTheDocument()
    expect(screen.getByText('Assign')).toBeInTheDocument()
    expect(screen.getByText('Tips')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('marks the current step with aria-current="step"', () => {
    render(<StepIndicator currentRoute="/people" />)
    const currentStep = screen.getByText('People')
    expect(currentStep).toHaveAttribute('aria-current', 'step')
  })

  it('does not mark non-current steps with aria-current', () => {
    render(<StepIndicator currentRoute="/people" />)
    expect(screen.getByText('Items')).not.toHaveAttribute('aria-current')
    expect(screen.getByText('Assign')).not.toHaveAttribute('aria-current')
  })

  it('returns null for routes not in the flow', () => {
    const { container } = render(<StepIndicator currentRoute="/" />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null for /history route', () => {
    const { container } = render(<StepIndicator currentRoute="/history" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders correctly on /editor (step 1)', () => {
    render(<StepIndicator currentRoute="/editor" />)
    expect(screen.getByText('Items')).toHaveAttribute('aria-current', 'step')
  })

  it('renders correctly on /assign (step 3)', () => {
    render(<StepIndicator currentRoute="/assign" />)
    expect(screen.getByText('Assign')).toHaveAttribute('aria-current', 'step')
  })

  it('renders correctly on /summary (step 5)', () => {
    render(<StepIndicator currentRoute="/summary" />)
    expect(screen.getByText('Done')).toHaveAttribute('aria-current', 'step')
  })

  it('renders nav with accessible label', () => {
    render(<StepIndicator currentRoute="/tips" />)
    expect(screen.getByRole('navigation', { name: /progress/i })).toBeInTheDocument()
  })
})
