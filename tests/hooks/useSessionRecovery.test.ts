import { describe, it, expect, beforeEach } from 'vitest'
import { getRecoveryRoute } from '../../src/hooks/useSessionRecovery'
import { useBillStore } from '../../src/store/billStore'
import { usePeopleStore } from '../../src/store/peopleStore'
import { useAssignmentStore } from '../../src/store/assignmentStore'
import { useTipStore } from '../../src/store/tipStore'

beforeEach(() => {
  useBillStore.getState().reset()
  usePeopleStore.getState().reset()
  useAssignmentStore.getState().reset()
  useTipStore.getState().reset()
})

describe('getRecoveryRoute', () => {
  it('returns null when no line items', () => {
    expect(getRecoveryRoute(0, 0, 0)).toBeNull()
  })

  it('returns /editor when items exist but no people', () => {
    expect(getRecoveryRoute(3, 0, 0)).toBe('/editor')
  })

  it('returns /assign when items and people exist but no assignments', () => {
    expect(getRecoveryRoute(3, 2, 0)).toBe('/assign')
  })

  it('returns /assign when items, people, and assignments exist', () => {
    expect(getRecoveryRoute(3, 2, 2)).toBe('/assign')
  })

  it('returns null for zero items even when people exist', () => {
    expect(getRecoveryRoute(0, 5, 3)).toBeNull()
  })
})

describe('store reset integration', () => {
  it('resets billStore to empty state', () => {
    useBillStore.getState().addLineItem({
      name: 'Burger',
      price: 1299,
      quantity: 1,
      confidence: 1.0,
      manuallyEdited: false,
    })
    expect(useBillStore.getState().lineItems.length).toBe(1)

    useBillStore.getState().reset()
    expect(useBillStore.getState().lineItems.length).toBe(0)
  })

  it('resets peopleStore to empty state', () => {
    usePeopleStore.getState().addPerson('Alice')
    expect(usePeopleStore.getState().people.length).toBe(1)

    usePeopleStore.getState().reset()
    expect(usePeopleStore.getState().people.length).toBe(0)
  })

  it('resets assignmentStore to empty state', () => {
    useAssignmentStore.getState().assignPerson('item1', 'person1')
    expect(Object.keys(useAssignmentStore.getState().assignments).length).toBe(1)

    useAssignmentStore.getState().reset()
    expect(Object.keys(useAssignmentStore.getState().assignments).length).toBe(0)
  })

  it('resets tipStore to empty state', () => {
    useTipStore.getState().initializeTips(['person1'], 20)
    expect(Object.keys(useTipStore.getState().personTips).length).toBe(1)

    useTipStore.getState().reset()
    expect(Object.keys(useTipStore.getState().personTips).length).toBe(0)
  })
})
