import { describe, it, expect, beforeEach } from 'vitest'
import { useThemeStore } from '../../src/store/themeStore'

beforeEach(() => {
  useThemeStore.setState({ preference: 'system' })
})

describe('themeStore', () => {
  it('defaults to system preference', () => {
    expect(useThemeStore.getState().preference).toBe('system')
  })

  it('sets preference to dark', () => {
    useThemeStore.getState().setPreference('dark')
    expect(useThemeStore.getState().preference).toBe('dark')
  })

  it('sets preference to light', () => {
    useThemeStore.getState().setPreference('light')
    expect(useThemeStore.getState().preference).toBe('light')
  })

  it('sets preference back to system', () => {
    useThemeStore.getState().setPreference('dark')
    useThemeStore.getState().setPreference('system')
    expect(useThemeStore.getState().preference).toBe('system')
  })
})
