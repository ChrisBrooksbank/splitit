export interface DebouncedFunction<T extends (...args: never[]) => void> {
  (...args: Parameters<T>): void
  cancel: () => void
  flush: () => void
}

export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  ms: number
): DebouncedFunction<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T>

  const debounced = (...args: Parameters<T>) => {
    lastArgs = args
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      timeoutId = null
      fn(...args)
    }, ms)
  }

  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  debounced.flush = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
      fn(...lastArgs)
    }
  }

  return debounced as DebouncedFunction<T>
}
