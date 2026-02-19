import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { debounce } from '../../src/utils/debounce'

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls function after delay', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('resets timer on subsequent calls', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    vi.advanceTimersByTime(50)
    debounced()
    vi.advanceTimersByTime(50)
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(50)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('passes arguments to the function', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('a', 'b')
    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledWith('a', 'b')
  })

  it('uses latest arguments when called multiple times', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('first')
    debounced('second')
    debounced('third')
    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('third')
  })

  it('cancel prevents the function from being called', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    debounced.cancel()
    vi.advanceTimersByTime(200)

    expect(fn).not.toHaveBeenCalled()
  })

  it('cancel is safe to call when no timer is pending', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    expect(() => debounced.cancel()).not.toThrow()
  })
})
