import { useEffect } from 'react'
import { useAppearanceStore } from '../store/appearanceStore'

export function useAppearanceEffect() {
  const preference = useAppearanceStore((s) => s.preference)
  const fontSize = useAppearanceStore((s) => s.fontSize)

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`
  }, [fontSize])

  useEffect(() => {
    const root = document.documentElement
    const meta = document.querySelector('meta[name="theme-color"]')

    function applyTheme(isDark: boolean) {
      if (isDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
      if (meta) {
        meta.setAttribute('content', isDark ? '#111827' : '#ffffff')
      }
    }

    if (preference === 'dark') {
      applyTheme(true)
      return
    }

    if (preference === 'light') {
      applyTheme(false)
      return
    }

    // System preference
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    applyTheme(mq.matches)

    function handleChange(e: MediaQueryListEvent) {
      applyTheme(e.matches)
    }

    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [preference])
}
