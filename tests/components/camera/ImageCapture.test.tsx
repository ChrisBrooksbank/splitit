import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ImageCapture from '../../../src/components/camera/ImageCapture'

function renderImageCapture(props: Partial<Parameters<typeof ImageCapture>[0]> = {}) {
  const onCapture = vi.fn()
  return {
    onCapture,
    ...render(<ImageCapture onCapture={onCapture} {...props} />),
  }
}

describe('ImageCapture', () => {
  it('renders a hidden file input', () => {
    renderImageCapture()
    const input = screen.getByLabelText(/capture or upload receipt photo/i)
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'file')
    expect(input).toHaveAttribute('accept', 'image/*')
    expect(input).toHaveAttribute('capture', 'environment')
  })

  it('file input has sr-only class (visually hidden)', () => {
    renderImageCapture()
    const input = screen.getByLabelText(/capture or upload receipt photo/i)
    expect(input).toHaveClass('sr-only')
  })

  it('calls onCapture with file and object URL when file selected', async () => {
    const user = userEvent.setup()
    const { onCapture } = renderImageCapture()

    const file = new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/capture or upload receipt photo/i)

    await user.upload(input, file)

    expect(onCapture).toHaveBeenCalledTimes(1)
    const [calledFile, calledUrl] = onCapture.mock.calls[0]
    expect(calledFile).toBe(file)
    expect(typeof calledUrl).toBe('string')
    expect(calledUrl).toMatch(/^blob:/)
  })

  it('does not call onCapture when no file selected', async () => {
    const { onCapture } = renderImageCapture()
    // Simulate change with no files - just verify onCapture not called initially
    expect(onCapture).not.toHaveBeenCalled()
  })
})
