import { describe, it, expect, beforeEach } from 'vitest'
import { usePeopleStore } from '../../src/store/peopleStore'

beforeEach(() => {
  usePeopleStore.getState().reset()
})

describe('peopleStore', () => {
  describe('initial state', () => {
    it('starts with empty people list', () => {
      expect(usePeopleStore.getState().people).toEqual([])
    })

    it('starts with nextColorIndex at 0', () => {
      expect(usePeopleStore.getState().nextColorIndex).toBe(0)
    })
  })

  describe('addPerson', () => {
    it('adds a person with auto-generated id and color', () => {
      usePeopleStore.getState().addPerson('Alice')
      const { people } = usePeopleStore.getState()
      expect(people).toHaveLength(1)
      expect(people[0].name).toBe('Alice')
      expect(people[0].id).toBeTruthy()
      expect(people[0].color).toBeTruthy()
    })

    it('trims whitespace from name', () => {
      usePeopleStore.getState().addPerson('  Bob  ')
      expect(usePeopleStore.getState().people[0].name).toBe('Bob')
    })

    it('increments color index for each person added', () => {
      usePeopleStore.getState().addPerson('Alice')
      expect(usePeopleStore.getState().nextColorIndex).toBe(1)
      usePeopleStore.getState().addPerson('Bob')
      expect(usePeopleStore.getState().nextColorIndex).toBe(2)
    })

    it('assigns different colors to different people', () => {
      usePeopleStore.getState().addPerson('Alice')
      usePeopleStore.getState().addPerson('Bob')
      const { people } = usePeopleStore.getState()
      expect(people[0].color).not.toBe(people[1].color)
    })

    it('generates unique ids for each person', () => {
      usePeopleStore.getState().addPerson('Alice')
      usePeopleStore.getState().addPerson('Bob')
      const { people } = usePeopleStore.getState()
      expect(people[0].id).not.toBe(people[1].id)
    })

    it('preserves insertion order', () => {
      usePeopleStore.getState().addPerson('Alice')
      usePeopleStore.getState().addPerson('Bob')
      usePeopleStore.getState().addPerson('Carol')
      const { people } = usePeopleStore.getState()
      expect(people[0].name).toBe('Alice')
      expect(people[1].name).toBe('Bob')
      expect(people[2].name).toBe('Carol')
    })

    it('wraps color palette after all colors used', () => {
      // Add 9 people — 8 colors in palette, 9th should wrap
      for (let i = 0; i < 9; i++) {
        usePeopleStore.getState().addPerson(`Person ${i}`)
      }
      const { people } = usePeopleStore.getState()
      expect(people[8].color).toBe(people[0].color)
    })
  })

  describe('updatePerson', () => {
    it('updates the name of a person', () => {
      usePeopleStore.getState().addPerson('Alice')
      const id = usePeopleStore.getState().people[0].id
      usePeopleStore.getState().updatePerson(id, 'Alicia')
      expect(usePeopleStore.getState().people[0].name).toBe('Alicia')
    })

    it('trims whitespace when updating name', () => {
      usePeopleStore.getState().addPerson('Bob')
      const id = usePeopleStore.getState().people[0].id
      usePeopleStore.getState().updatePerson(id, '  Robert  ')
      expect(usePeopleStore.getState().people[0].name).toBe('Robert')
    })

    it('does not affect other people', () => {
      usePeopleStore.getState().addPerson('Alice')
      usePeopleStore.getState().addPerson('Bob')
      const idAlice = usePeopleStore.getState().people[0].id
      usePeopleStore.getState().updatePerson(idAlice, 'Alicia')
      expect(usePeopleStore.getState().people[1].name).toBe('Bob')
    })

    it('preserves color when updating name', () => {
      usePeopleStore.getState().addPerson('Alice')
      const { id, color } = usePeopleStore.getState().people[0]
      usePeopleStore.getState().updatePerson(id, 'Alicia')
      expect(usePeopleStore.getState().people[0].color).toBe(color)
    })

    it('is a no-op for non-existent id', () => {
      usePeopleStore.getState().addPerson('Alice')
      usePeopleStore.getState().updatePerson('nonexistent', 'Ghost')
      expect(usePeopleStore.getState().people[0].name).toBe('Alice')
    })
  })

  describe('removePerson', () => {
    it('removes a person by id', () => {
      usePeopleStore.getState().addPerson('Alice')
      const id = usePeopleStore.getState().people[0].id
      usePeopleStore.getState().removePerson(id)
      expect(usePeopleStore.getState().people).toHaveLength(0)
    })

    it('removes only the targeted person', () => {
      usePeopleStore.getState().addPerson('Alice')
      usePeopleStore.getState().addPerson('Bob')
      const idAlice = usePeopleStore.getState().people[0].id
      usePeopleStore.getState().removePerson(idAlice)
      expect(usePeopleStore.getState().people).toHaveLength(1)
      expect(usePeopleStore.getState().people[0].name).toBe('Bob')
    })

    it('is a no-op for non-existent id', () => {
      usePeopleStore.getState().addPerson('Alice')
      usePeopleStore.getState().removePerson('nonexistent')
      expect(usePeopleStore.getState().people).toHaveLength(1)
    })
  })

  describe('reset', () => {
    it('clears all people', () => {
      usePeopleStore.getState().addPerson('Alice')
      usePeopleStore.getState().addPerson('Bob')
      usePeopleStore.getState().reset()
      expect(usePeopleStore.getState().people).toEqual([])
    })

    it('resets color index to 0', () => {
      usePeopleStore.getState().addPerson('Alice')
      usePeopleStore.getState().addPerson('Bob')
      usePeopleStore.getState().reset()
      expect(usePeopleStore.getState().nextColorIndex).toBe(0)
    })
  })
})
