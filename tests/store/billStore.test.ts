import { describe, it, expect, beforeEach } from 'vitest'
import { useBillStore } from '../../src/store/billStore'

// Reset store state before each test
beforeEach(() => {
  useBillStore.getState().reset()
})

describe('billStore', () => {
  describe('initial state', () => {
    it('starts with empty line items', () => {
      expect(useBillStore.getState().lineItems).toEqual([])
    })

    it('starts with zero tax amount', () => {
      expect(useBillStore.getState().taxAmount).toBe(0)
    })
  })

  describe('setLineItems', () => {
    it('replaces all line items', () => {
      const items = [
        {
          id: 'a',
          name: 'Burger',
          price: 1299,
          quantity: 1,
          confidence: 0.9,
          manuallyEdited: false,
        },
        {
          id: 'b',
          name: 'Fries',
          price: 399,
          quantity: 2,
          confidence: 0.85,
          manuallyEdited: false,
        },
      ]
      useBillStore.getState().setLineItems(items)
      expect(useBillStore.getState().lineItems).toEqual(items)
    })

    it('replaces existing items with new set', () => {
      useBillStore.getState().addLineItem({
        name: 'Old Item',
        price: 500,
        quantity: 1,
        confidence: 1.0,
        manuallyEdited: false,
      })
      const newItems = [
        {
          id: 'x',
          name: 'New Item',
          price: 800,
          quantity: 1,
          confidence: 1.0,
          manuallyEdited: false,
        },
      ]
      useBillStore.getState().setLineItems(newItems)
      expect(useBillStore.getState().lineItems).toHaveLength(1)
      expect(useBillStore.getState().lineItems[0].name).toBe('New Item')
    })
  })

  describe('addLineItem', () => {
    it('adds a line item with auto-generated id', () => {
      useBillStore.getState().addLineItem({
        name: 'Caesar Salad',
        price: 1199,
        quantity: 1,
        confidence: 0.95,
        manuallyEdited: false,
      })
      const items = useBillStore.getState().lineItems
      expect(items).toHaveLength(1)
      expect(items[0].name).toBe('Caesar Salad')
      expect(items[0].price).toBe(1199) // integer cents
      expect(items[0].id).toBeTruthy()
    })

    it('adds multiple items and preserves order', () => {
      useBillStore.getState().addLineItem({
        name: 'Item A',
        price: 100,
        quantity: 1,
        confidence: 1.0,
        manuallyEdited: false,
      })
      useBillStore.getState().addLineItem({
        name: 'Item B',
        price: 200,
        quantity: 1,
        confidence: 1.0,
        manuallyEdited: false,
      })
      useBillStore.getState().addLineItem({
        name: 'Item C',
        price: 300,
        quantity: 1,
        confidence: 1.0,
        manuallyEdited: false,
      })
      const items = useBillStore.getState().lineItems
      expect(items).toHaveLength(3)
      expect(items[0].name).toBe('Item A')
      expect(items[1].name).toBe('Item B')
      expect(items[2].name).toBe('Item C')
    })

    it('generates unique ids for each item', () => {
      useBillStore
        .getState()
        .addLineItem({ name: 'A', price: 100, quantity: 1, confidence: 1.0, manuallyEdited: false })
      useBillStore
        .getState()
        .addLineItem({ name: 'B', price: 200, quantity: 1, confidence: 1.0, manuallyEdited: false })
      const items = useBillStore.getState().lineItems
      expect(items[0].id).not.toBe(items[1].id)
    })

    it('stores price in integer cents', () => {
      useBillStore.getState().addLineItem({
        name: 'Pricey Item',
        price: 2499,
        quantity: 1,
        confidence: 1.0,
        manuallyEdited: false,
      })
      expect(useBillStore.getState().lineItems[0].price).toBe(2499)
    })
  })

  describe('updateLineItem', () => {
    it('updates name of an item', () => {
      useBillStore.getState().addLineItem({
        name: 'Old Name',
        price: 500,
        quantity: 1,
        confidence: 0.7,
        manuallyEdited: false,
      })
      const id = useBillStore.getState().lineItems[0].id
      useBillStore.getState().updateLineItem(id, { name: 'New Name' })
      expect(useBillStore.getState().lineItems[0].name).toBe('New Name')
    })

    it('updates price in cents', () => {
      useBillStore.getState().addLineItem({
        name: 'Drink',
        price: 300,
        quantity: 1,
        confidence: 0.8,
        manuallyEdited: false,
      })
      const id = useBillStore.getState().lineItems[0].id
      useBillStore.getState().updateLineItem(id, { price: 450 })
      expect(useBillStore.getState().lineItems[0].price).toBe(450)
    })

    it('sets manuallyEdited to true on update', () => {
      useBillStore.getState().addLineItem({
        name: 'Item',
        price: 500,
        quantity: 1,
        confidence: 0.9,
        manuallyEdited: false,
      })
      const id = useBillStore.getState().lineItems[0].id
      useBillStore.getState().updateLineItem(id, { name: 'Updated' })
      expect(useBillStore.getState().lineItems[0].manuallyEdited).toBe(true)
    })

    it('updates quantity', () => {
      useBillStore.getState().addLineItem({
        name: 'Pizza',
        price: 1600,
        quantity: 1,
        confidence: 1.0,
        manuallyEdited: false,
      })
      const id = useBillStore.getState().lineItems[0].id
      useBillStore.getState().updateLineItem(id, { quantity: 2 })
      expect(useBillStore.getState().lineItems[0].quantity).toBe(2)
    })

    it('does not affect other items', () => {
      useBillStore
        .getState()
        .addLineItem({ name: 'A', price: 100, quantity: 1, confidence: 1.0, manuallyEdited: false })
      useBillStore
        .getState()
        .addLineItem({ name: 'B', price: 200, quantity: 1, confidence: 1.0, manuallyEdited: false })
      const idA = useBillStore.getState().lineItems[0].id
      useBillStore.getState().updateLineItem(idA, { name: 'A Updated' })
      expect(useBillStore.getState().lineItems[1].name).toBe('B')
    })

    it('ignores update for non-existent id', () => {
      useBillStore.getState().addLineItem({
        name: 'Item',
        price: 100,
        quantity: 1,
        confidence: 1.0,
        manuallyEdited: false,
      })
      useBillStore.getState().updateLineItem('nonexistent', { name: 'Ghost' })
      expect(useBillStore.getState().lineItems[0].name).toBe('Item')
    })
  })

  describe('deleteLineItem', () => {
    it('removes an item by id', () => {
      useBillStore.getState().addLineItem({
        name: 'To Delete',
        price: 500,
        quantity: 1,
        confidence: 1.0,
        manuallyEdited: false,
      })
      const id = useBillStore.getState().lineItems[0].id
      useBillStore.getState().deleteLineItem(id)
      expect(useBillStore.getState().lineItems).toHaveLength(0)
    })

    it('removes only the targeted item', () => {
      useBillStore.getState().addLineItem({
        name: 'Keep',
        price: 100,
        quantity: 1,
        confidence: 1.0,
        manuallyEdited: false,
      })
      useBillStore.getState().addLineItem({
        name: 'Delete Me',
        price: 200,
        quantity: 1,
        confidence: 1.0,
        manuallyEdited: false,
      })
      const items = useBillStore.getState().lineItems
      useBillStore.getState().deleteLineItem(items[1].id)
      expect(useBillStore.getState().lineItems).toHaveLength(1)
      expect(useBillStore.getState().lineItems[0].name).toBe('Keep')
    })

    it('is a no-op for non-existent id', () => {
      useBillStore.getState().addLineItem({
        name: 'Item',
        price: 100,
        quantity: 1,
        confidence: 1.0,
        manuallyEdited: false,
      })
      useBillStore.getState().deleteLineItem('nonexistent')
      expect(useBillStore.getState().lineItems).toHaveLength(1)
    })
  })

  describe('setTaxAmount', () => {
    it('sets tax amount in cents', () => {
      useBillStore.getState().setTaxAmount(245)
      expect(useBillStore.getState().taxAmount).toBe(245)
    })

    it('can update tax to a new value', () => {
      useBillStore.getState().setTaxAmount(100)
      useBillStore.getState().setTaxAmount(350)
      expect(useBillStore.getState().taxAmount).toBe(350)
    })

    it('can set tax to zero', () => {
      useBillStore.getState().setTaxAmount(500)
      useBillStore.getState().setTaxAmount(0)
      expect(useBillStore.getState().taxAmount).toBe(0)
    })
  })

  describe('reset', () => {
    it('clears all line items', () => {
      useBillStore.getState().addLineItem({
        name: 'Item',
        price: 100,
        quantity: 1,
        confidence: 1.0,
        manuallyEdited: false,
      })
      useBillStore.getState().reset()
      expect(useBillStore.getState().lineItems).toEqual([])
    })

    it('resets tax amount to zero', () => {
      useBillStore.getState().setTaxAmount(999)
      useBillStore.getState().reset()
      expect(useBillStore.getState().taxAmount).toBe(0)
    })
  })
})
