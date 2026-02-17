import { describe, it, expect, beforeEach } from 'vitest'
import { useAppearanceStore } from '../../src/store/appearanceStore'

beforeEach(() => {
  useAppearanceStore.setState({ preference: 'system', fontSize: 16 })
})

describe('appearanceStore', () => {
  it('defaults to system preference', () => {
    expect(useAppearanceStore.getState().preference).toBe('system')
  })

  it('sets preference to dark', () => {
    useAppearanceStore.getState().setPreference('dark')
    expect(useAppearanceStore.getState().preference).toBe('dark')
  })

  it('sets preference to light', () => {
    useAppearanceStore.getState().setPreference('light')
    expect(useAppearanceStore.getState().preference).toBe('light')
  })

  it('sets preference back to system', () => {
    useAppearanceStore.getState().setPreference('dark')
    useAppearanceStore.getState().setPreference('system')
    expect(useAppearanceStore.getState().preference).toBe('system')
  })

  it('defaults fontSize to 16', () => {
    expect(useAppearanceStore.getState().fontSize).toBe(16)
  })

  it('increments fontSize', () => {
    useAppearanceStore.getState().setFontSize(18)
    expect(useAppearanceStore.getState().fontSize).toBe(18)
  })

  it('decrements fontSize', () => {
    useAppearanceStore.getState().setFontSize(14)
    expect(useAppearanceStore.getState().fontSize).toBe(14)
  })

  it('clamps fontSize at maximum 20', () => {
    useAppearanceStore.getState().setFontSize(22)
    expect(useAppearanceStore.getState().fontSize).toBe(20)
  })

  it('clamps fontSize at minimum 14', () => {
    useAppearanceStore.getState().setFontSize(12)
    expect(useAppearanceStore.getState().fontSize).toBe(14)
  })
})
