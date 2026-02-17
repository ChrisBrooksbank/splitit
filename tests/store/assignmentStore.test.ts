import { describe, it, expect, beforeEach } from 'vitest'
import { useAssignmentStore } from '../../src/store/assignmentStore'

beforeEach(() => {
  useAssignmentStore.getState().reset()
})

describe('assignmentStore', () => {
  describe('initial state', () => {
    it('starts with empty assignments', () => {
      expect(useAssignmentStore.getState().assignments).toEqual({})
    })

    it('starts with empty portions', () => {
      expect(useAssignmentStore.getState().portions).toEqual({})
    })
  })

  describe('assignPerson', () => {
    it('assigns a person to an item', () => {
      useAssignmentStore.getState().assignPerson('item1', 'alice')
      expect(useAssignmentStore.getState().assignments['item1']).toEqual(['alice'])
    })

    it('assigns multiple people to an item', () => {
      useAssignmentStore.getState().assignPerson('item1', 'alice')
      useAssignmentStore.getState().assignPerson('item1', 'bob')
      expect(useAssignmentStore.getState().assignments['item1']).toEqual(['alice', 'bob'])
    })

    it('does not duplicate a person already assigned to an item', () => {
      useAssignmentStore.getState().assignPerson('item1', 'alice')
      useAssignmentStore.getState().assignPerson('item1', 'alice')
      expect(useAssignmentStore.getState().assignments['item1']).toHaveLength(1)
    })

    it('handles multiple items independently', () => {
      useAssignmentStore.getState().assignPerson('item1', 'alice')
      useAssignmentStore.getState().assignPerson('item2', 'bob')
      expect(useAssignmentStore.getState().assignments['item1']).toEqual(['alice'])
      expect(useAssignmentStore.getState().assignments['item2']).toEqual(['bob'])
    })
  })

  describe('unassignPerson', () => {
    it('removes a person from an item', () => {
      useAssignmentStore.getState().assignPerson('item1', 'alice')
      useAssignmentStore.getState().assignPerson('item1', 'bob')
      useAssignmentStore.getState().unassignPerson('item1', 'alice')
      expect(useAssignmentStore.getState().assignments['item1']).toEqual(['bob'])
    })

    it('results in empty array when last person is removed', () => {
      useAssignmentStore.getState().assignPerson('item1', 'alice')
      useAssignmentStore.getState().unassignPerson('item1', 'alice')
      expect(useAssignmentStore.getState().assignments['item1']).toEqual([])
    })

    it('is a no-op for a person not assigned to the item', () => {
      useAssignmentStore.getState().assignPerson('item1', 'alice')
      useAssignmentStore.getState().unassignPerson('item1', 'bob')
      expect(useAssignmentStore.getState().assignments['item1']).toEqual(['alice'])
    })

    it('removes person from custom portions when unassigned', () => {
      useAssignmentStore.getState().assignPerson('item1', 'alice')
      useAssignmentStore.getState().assignPerson('item1', 'bob')
      useAssignmentStore.getState().setPortions('item1', { alice: 2, bob: 3 })
      useAssignmentStore.getState().unassignPerson('item1', 'alice')
      expect(useAssignmentStore.getState().portions['item1']).not.toHaveProperty('alice')
      expect(useAssignmentStore.getState().portions['item1']).toHaveProperty('bob')
    })

    it('does not affect other items', () => {
      useAssignmentStore.getState().assignPerson('item1', 'alice')
      useAssignmentStore.getState().assignPerson('item2', 'alice')
      useAssignmentStore.getState().unassignPerson('item1', 'alice')
      expect(useAssignmentStore.getState().assignments['item2']).toEqual(['alice'])
    })
  })

  describe('toggleAssignment', () => {
    it('assigns a person when not currently assigned', () => {
      useAssignmentStore.getState().toggleAssignment('item1', 'alice')
      expect(useAssignmentStore.getState().assignments['item1']).toContain('alice')
    })

    it('unassigns a person when currently assigned', () => {
      useAssignmentStore.getState().assignPerson('item1', 'alice')
      useAssignmentStore.getState().toggleAssignment('item1', 'alice')
      expect(useAssignmentStore.getState().assignments['item1']).not.toContain('alice')
    })

    it('toggles without affecting other assignees', () => {
      useAssignmentStore.getState().assignPerson('item1', 'alice')
      useAssignmentStore.getState().assignPerson('item1', 'bob')
      useAssignmentStore.getState().toggleAssignment('item1', 'alice')
      expect(useAssignmentStore.getState().assignments['item1']).toEqual(['bob'])
    })
  })

  describe('setAssignees', () => {
    it('sets assignees for an item', () => {
      useAssignmentStore.getState().setAssignees('item1', ['alice', 'bob', 'carol'])
      expect(useAssignmentStore.getState().assignments['item1']).toEqual(['alice', 'bob', 'carol'])
    })

    it('replaces existing assignees', () => {
      useAssignmentStore.getState().assignPerson('item1', 'alice')
      useAssignmentStore.getState().setAssignees('item1', ['bob', 'carol'])
      expect(useAssignmentStore.getState().assignments['item1']).toEqual(['bob', 'carol'])
    })

    it('clears custom portions when resetting assignees', () => {
      useAssignmentStore.getState().assignPerson('item1', 'alice')
      useAssignmentStore.getState().assignPerson('item1', 'bob')
      useAssignmentStore.getState().setPortions('item1', { alice: 2, bob: 3 })
      useAssignmentStore.getState().setAssignees('item1', ['alice', 'bob'])
      expect(useAssignmentStore.getState().portions['item1']).toBeUndefined()
    })

    it('handles empty array to clear all assignees', () => {
      useAssignmentStore.getState().assignPerson('item1', 'alice')
      useAssignmentStore.getState().setAssignees('item1', [])
      expect(useAssignmentStore.getState().assignments['item1']).toEqual([])
    })
  })

  describe('setPortions / clearPortions', () => {
    it('sets custom portion weights for an item', () => {
      useAssignmentStore.getState().setPortions('item1', { alice: 2, bob: 3 })
      expect(useAssignmentStore.getState().portions['item1']).toEqual({ alice: 2, bob: 3 })
    })

    it('replaces existing portions', () => {
      useAssignmentStore.getState().setPortions('item1', { alice: 1, bob: 1 })
      useAssignmentStore.getState().setPortions('item1', { alice: 3, bob: 2 })
      expect(useAssignmentStore.getState().portions['item1']).toEqual({ alice: 3, bob: 2 })
    })

    it('clears portions for an item', () => {
      useAssignmentStore.getState().setPortions('item1', { alice: 2, bob: 3 })
      useAssignmentStore.getState().clearPortions('item1')
      expect(useAssignmentStore.getState().portions['item1']).toBeUndefined()
    })

    it('clearPortions does not affect other items', () => {
      useAssignmentStore.getState().setPortions('item1', { alice: 2 })
      useAssignmentStore.getState().setPortions('item2', { bob: 3 })
      useAssignmentStore.getState().clearPortions('item1')
      expect(useAssignmentStore.getState().portions['item2']).toEqual({ bob: 3 })
    })
  })

  describe('getPersonShare', () => {
    it('returns 0 for a person not assigned to the item', () => {
      useAssignmentStore.getState().assignPerson('item1', 'alice')
      expect(useAssignmentStore.getState().getPersonShare('item1', 'bob')).toBe(0)
    })

    it('returns 1 for a single assignee (equal split)', () => {
      useAssignmentStore.getState().assignPerson('item1', 'alice')
      expect(useAssignmentStore.getState().getPersonShare('item1', 'alice')).toBe(1)
    })

    it('returns 0.5 for two equal assignees', () => {
      useAssignmentStore.getState().assignPerson('item1', 'alice')
      useAssignmentStore.getState().assignPerson('item1', 'bob')
      expect(useAssignmentStore.getState().getPersonShare('item1', 'alice')).toBeCloseTo(0.5)
      expect(useAssignmentStore.getState().getPersonShare('item1', 'bob')).toBeCloseTo(0.5)
    })

    it('returns equal fractions for three equal assignees', () => {
      useAssignmentStore.getState().assignPerson('item1', 'alice')
      useAssignmentStore.getState().assignPerson('item1', 'bob')
      useAssignmentStore.getState().assignPerson('item1', 'carol')
      expect(useAssignmentStore.getState().getPersonShare('item1', 'alice')).toBeCloseTo(1 / 3)
      expect(useAssignmentStore.getState().getPersonShare('item1', 'bob')).toBeCloseTo(1 / 3)
      expect(useAssignmentStore.getState().getPersonShare('item1', 'carol')).toBeCloseTo(1 / 3)
    })

    it('uses custom portions when set (2:3 split)', () => {
      useAssignmentStore.getState().assignPerson('item1', 'alice')
      useAssignmentStore.getState().assignPerson('item1', 'bob')
      useAssignmentStore.getState().setPortions('item1', { alice: 2, bob: 3 })
      expect(useAssignmentStore.getState().getPersonShare('item1', 'alice')).toBeCloseTo(2 / 5)
      expect(useAssignmentStore.getState().getPersonShare('item1', 'bob')).toBeCloseTo(3 / 5)
    })

    it('custom portions sum to 1', () => {
      useAssignmentStore.getState().assignPerson('item1', 'alice')
      useAssignmentStore.getState().assignPerson('item1', 'bob')
      useAssignmentStore.getState().assignPerson('item1', 'carol')
      useAssignmentStore.getState().setPortions('item1', { alice: 1, bob: 2, carol: 2 })
      const aliceShare = useAssignmentStore.getState().getPersonShare('item1', 'alice')
      const bobShare = useAssignmentStore.getState().getPersonShare('item1', 'bob')
      const carolShare = useAssignmentStore.getState().getPersonShare('item1', 'carol')
      expect(aliceShare + bobShare + carolShare).toBeCloseTo(1)
    })

    it('returns 0 for unassigned item with no assignees', () => {
      expect(useAssignmentStore.getState().getPersonShare('nonexistent', 'alice')).toBe(0)
    })
  })

  describe('removeItem', () => {
    it('removes all assignments for an item', () => {
      useAssignmentStore.getState().assignPerson('item1', 'alice')
      useAssignmentStore.getState().assignPerson('item1', 'bob')
      useAssignmentStore.getState().removeItem('item1')
      expect(useAssignmentStore.getState().assignments['item1']).toBeUndefined()
    })

    it('removes custom portions for an item', () => {
      useAssignmentStore.getState().assignPerson('item1', 'alice')
      useAssignmentStore.getState().setPortions('item1', { alice: 1 })
      useAssignmentStore.getState().removeItem('item1')
      expect(useAssignmentStore.getState().portions['item1']).toBeUndefined()
    })

    it('does not affect other items', () => {
      useAssignmentStore.getState().assignPerson('item1', 'alice')
      useAssignmentStore.getState().assignPerson('item2', 'bob')
      useAssignmentStore.getState().removeItem('item1')
      expect(useAssignmentStore.getState().assignments['item2']).toEqual(['bob'])
    })

    it('is a no-op for non-existent item', () => {
      useAssignmentStore.getState().assignPerson('item1', 'alice')
      useAssignmentStore.getState().removeItem('nonexistent')
      expect(useAssignmentStore.getState().assignments['item1']).toEqual(['alice'])
    })
  })

  describe('removePerson', () => {
    it('removes a person from all items', () => {
      useAssignmentStore.getState().assignPerson('item1', 'alice')
      useAssignmentStore.getState().assignPerson('item2', 'alice')
      useAssignmentStore.getState().assignPerson('item2', 'bob')
      useAssignmentStore.getState().removePerson('alice')
      expect(useAssignmentStore.getState().assignments['item1']).toEqual([])
      expect(useAssignmentStore.getState().assignments['item2']).toEqual(['bob'])
    })

    it('removes person from custom portions across all items', () => {
      useAssignmentStore.getState().assignPerson('item1', 'alice')
      useAssignmentStore.getState().assignPerson('item1', 'bob')
      useAssignmentStore.getState().setPortions('item1', { alice: 2, bob: 3 })
      useAssignmentStore.getState().removePerson('alice')
      expect(useAssignmentStore.getState().portions['item1']).not.toHaveProperty('alice')
      expect(useAssignmentStore.getState().portions['item1']).toHaveProperty('bob')
    })

    it('is a no-op for a person with no assignments', () => {
      useAssignmentStore.getState().assignPerson('item1', 'alice')
      useAssignmentStore.getState().removePerson('nonexistent')
      expect(useAssignmentStore.getState().assignments['item1']).toEqual(['alice'])
    })
  })

  describe('reset', () => {
    it('clears all assignments', () => {
      useAssignmentStore.getState().assignPerson('item1', 'alice')
      useAssignmentStore.getState().assignPerson('item2', 'bob')
      useAssignmentStore.getState().reset()
      expect(useAssignmentStore.getState().assignments).toEqual({})
    })

    it('clears all portions', () => {
      useAssignmentStore.getState().assignPerson('item1', 'alice')
      useAssignmentStore.getState().setPortions('item1', { alice: 1 })
      useAssignmentStore.getState().reset()
      expect(useAssignmentStore.getState().portions).toEqual({})
    })
  })
})
