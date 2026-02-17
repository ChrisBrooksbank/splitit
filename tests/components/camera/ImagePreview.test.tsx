import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ImagePreview from '../../../src/components/camera/ImagePreview'

const PREVIEW_URL = 'blob:http://localhost/test-receipt'

function renderImagePreview(overrides: Partial<Parameters<typeof ImagePreview>[0]> = {}) {
  const onRetake = vi.fn()
  const onUse = vi.fn()
  return {
    onRetake,
    onUse,
    ...render(
      <ImagePreview previewUrl={PREVIEW_URL} onRetake={onRetake} onUse={onUse} {...overrides} />
    ),
  }
}

describe('ImagePreview', () => {
  it('renders the receipt image', () => {
    renderImagePreview()
    const img = screen.getByAltText(/captured receipt/i)
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', PREVIEW_URL)
  })

  it('renders "Use This Photo" button', () => {
    renderImagePreview()
    expect(screen.getByRole('button', { name: /use this photo/i })).toBeInTheDocument()
  })

  it('renders "Retake" button', () => {
    renderImagePreview()
    expect(screen.getByRole('button', { name: /retake/i })).toBeInTheDocument()
  })

  it('calls onUse when "Use This Photo" is clicked', async () => {
    const user = userEvent.setup()
    const { onUse } = renderImagePreview()
    await user.click(screen.getByRole('button', { name: /use this photo/i }))
    expect(onUse).toHaveBeenCalledTimes(1)
  })

  it('calls onRetake when "Retake" is clicked', async () => {
    const user = userEvent.setup()
    const { onRetake } = renderImagePreview()
    await user.click(screen.getByRole('button', { name: /retake/i }))
    expect(onRetake).toHaveBeenCalledTimes(1)
  })
})
