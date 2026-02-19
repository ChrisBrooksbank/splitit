export interface DebouncedFunction<T extends (...args: never[]) => void> {
  (...args: Parameters<T>): void
  cancel: () => void
}

export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  ms: number
): DebouncedFunction<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const debounced = (...args: Parameters<T>) => {
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

  return debounced as DebouncedFunction<T>
}
