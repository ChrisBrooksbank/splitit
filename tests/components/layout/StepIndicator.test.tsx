import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import StepIndicator from '../../../src/components/layout/StepIndicator'

function renderWith(currentRoute: string) {
  return render(
    <MemoryRouter>
      <StepIndicator currentRoute={currentRoute} />
    </MemoryRouter>
  )
}

describe('StepIndicator', () => {
  it('renders all 5 step labels', () => {
    renderWith('/editor')
    expect(screen.getByText('Items')).toBeInTheDocument()
    expect(screen.getByText('People')).toBeInTheDocument()
    expect(screen.getByText('Assign')).toBeInTheDocument()
    expect(screen.getByText('Tips')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('marks the current step with aria-current="step"', () => {
    renderWith('/people')
    const currentStep = screen.getByText('People')
    expect(currentStep).toHaveAttribute('aria-current', 'step')
  })

  it('does not mark non-current steps with aria-current', () => {
    renderWith('/people')
    expect(screen.getByText('Items')).not.toHaveAttribute('aria-current')
    expect(screen.getByText('Assign')).not.toHaveAttribute('aria-current')
  })

  it('returns null for routes not in the flow', () => {
    const { container } = renderWith('/')
    expect(container.firstChild).toBeNull()
  })

  it('returns null for /history route', () => {
    const { container } = renderWith('/history')
    expect(container.firstChild).toBeNull()
  })

  it('renders correctly on /editor (step 1)', () => {
    renderWith('/editor')
    expect(screen.getByText('Items')).toHaveAttribute('aria-current', 'step')
  })

  it('renders correctly on /assign (step 3)', () => {
    renderWith('/assign')
    expect(screen.getByText('Assign')).toHaveAttribute('aria-current', 'step')
  })

  it('renders correctly on /summary (step 5)', () => {
    renderWith('/summary')
    expect(screen.getByText('Done')).toHaveAttribute('aria-current', 'step')
  })

  it('renders nav with accessible label', () => {
    renderWith('/tips')
    expect(screen.getByRole('navigation', { name: /progress/i })).toBeInTheDocument()
  })

  it('makes completed steps clickable', () => {
    renderWith('/assign')
    // Items and People are completed (before Assign)
    const itemsButton = screen.getByRole('link', { name: /go back to items/i })
    expect(itemsButton).toBeInTheDocument()
    const peopleButton = screen.getByRole('link', { name: /go back to people/i })
    expect(peopleButton).toBeInTheDocument()
  })

  it('does not make current or future steps clickable', async () => {
    renderWith('/people')
    // People is current, Assign/Tips/Done are future — none should be buttons
    expect(screen.queryByRole('link', { name: /go back to people/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /go back to assign/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /go back to tips/i })).not.toBeInTheDocument()
  })
})
