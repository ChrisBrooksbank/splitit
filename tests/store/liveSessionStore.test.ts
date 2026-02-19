import { describe, it, expect, beforeEach } from 'vitest'
import { useLiveSessionStore } from '../../src/store/liveSessionStore'

describe('liveSessionStore', () => {
  beforeEach(() => {
    useLiveSessionStore.getState().endSession()
  })

  it('starts with default state', () => {
    const state = useLiveSessionStore.getState()
    expect(state.isLive).toBe(false)
    expect(state.role).toBeNull()
    expect(state.roomCode).toBeNull()
    expect(state.phase).toBe('lobby')
    expect(state.guests).toEqual([])
    expect(state.myPersonId).toBeNull()
    expect(state.syncedState).toBeNull()
    expect(state.connectionStatus).toBe('disconnected')
  })

  it('startSession sets live state', () => {
    useLiveSessionStore.getState().startSession('host', 'room-123')
    const state = useLiveSessionStore.getState()
    expect(state.isLive).toBe(true)
    expect(state.role).toBe('host')
    expect(state.roomCode).toBe('room-123')
    expect(state.phase).toBe('lobby')
    expect(state.connectionStatus).toBe('connecting')
  })

  it('setPhase updates phase', () => {
    useLiveSessionStore.getState().setPhase('claiming')
    expect(useLiveSessionStore.getState().phase).toBe('claiming')
  })

  it('setMyPersonId updates personId', () => {
    useLiveSessionStore.getState().setMyPersonId('person-1')
    expect(useLiveSessionStore.getState().myPersonId).toBe('person-1')
  })

  it('addGuest adds a guest', () => {
    const guest = { peerId: 'p1', personId: null, displayName: null, connected: true }
    useLiveSessionStore.getState().addGuest(guest)
    expect(useLiveSessionStore.getState().guests).toEqual([guest])
  })

  it('disconnectGuest marks guest disconnected', () => {
    const guest = { peerId: 'p1', personId: null, displayName: null, connected: true }
    useLiveSessionStore.getState().addGuest(guest)
    useLiveSessionStore.getState().disconnectGuest('p1')
    expect(useLiveSessionStore.getState().guests[0].connected).toBe(false)
  })

  it('identifyGuest updates guest personId and displayName', () => {
    const guest = { peerId: 'p1', personId: null, displayName: null, connected: true }
    useLiveSessionStore.getState().addGuest(guest)
    useLiveSessionStore.getState().identifyGuest('p1', 'person-1', 'Alice')
    const updated = useLiveSessionStore.getState().guests[0]
    expect(updated.personId).toBe('person-1')
    expect(updated.displayName).toBe('Alice')
  })

  it('setSyncedState updates synced state', () => {
    const payload = {
      lineItems: [],
      people: [],
      assignments: {},
      portions: {},
      personTips: {},
      phase: 'claiming' as const,
      claimedPersonIds: [],
    }
    useLiveSessionStore.getState().setSyncedState(payload)
    expect(useLiveSessionStore.getState().syncedState).toEqual(payload)
  })

  it('setConnectionStatus updates status', () => {
    useLiveSessionStore.getState().setConnectionStatus('connected')
    expect(useLiveSessionStore.getState().connectionStatus).toBe('connected')
  })

  it('setAdvancePhaseFn stores the function', () => {
    const fn = () => {}
    useLiveSessionStore.getState().setAdvancePhaseFn(fn)
    expect(useLiveSessionStore.getState().advancePhaseFn).toBe(fn)
  })

  it('endSession resets all state', () => {
    useLiveSessionStore.getState().startSession('host', 'room-123')
    useLiveSessionStore.getState().setPhase('claiming')
    useLiveSessionStore.getState().addGuest({
      peerId: 'p1',
      personId: 'person-1',
      displayName: 'Alice',
      connected: true,
    })
    useLiveSessionStore.getState().endSession()

    const state = useLiveSessionStore.getState()
    expect(state.isLive).toBe(false)
    expect(state.role).toBeNull()
    expect(state.guests).toEqual([])
    expect(state.phase).toBe('lobby')
  })
})
