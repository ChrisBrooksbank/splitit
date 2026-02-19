import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createHostOrchestrator,
  buildSyncPayload,
} from '../../../src/services/liveSession/hostOrchestrator'
import { useBillStore } from '../../../src/store/billStore'
import { usePeopleStore } from '../../../src/store/peopleStore'
import { useAssignmentStore } from '../../../src/store/assignmentStore'
import { useTipStore } from '../../../src/store/tipStore'
import { useLiveSessionStore } from '../../../src/store/liveSessionStore'
import type { PeerService } from '../../../src/services/liveSession/PeerService'

function createMockPeerService(): PeerService & {
  handlers: Record<string, (...args: unknown[]) => void>
} {
  const handlers: Record<string, (...args: unknown[]) => void> = {}
  return {
    handlers,
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers[event] = handler
    }),
    off: vi.fn(),
    broadcastToAll: vi.fn(),
    sendToGuest: vi.fn(),
    getConnectedPeerIds: vi.fn(() => []),
    destroy: vi.fn(),
  } as unknown as PeerService & { handlers: Record<string, (...args: unknown[]) => void> }
}

describe('hostOrchestrator', () => {
  let mockPeer: ReturnType<typeof createMockPeerService>

  beforeEach(() => {
    vi.useFakeTimers()
    useBillStore.getState().reset()
    usePeopleStore.getState().reset()
    useAssignmentStore.getState().reset()
    useTipStore.getState().reset()
    useLiveSessionStore.getState().endSession()
    mockPeer = createMockPeerService()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('buildSyncPayload', () => {
    it('builds payload from all stores', () => {
      useBillStore.getState().addLineItem({
        name: 'Pizza',
        price: 1200,
        quantity: 1,
        confidence: 1,
        manuallyEdited: false,
      })
      const payload = buildSyncPayload()
      expect(payload.lineItems).toHaveLength(1)
      expect(payload.lineItems[0].name).toBe('Pizza')
      expect(payload.phase).toBe('lobby')
      expect(payload.claimedPersonIds).toEqual([])
    })
  })

  describe('handleGuestMessage', () => {
    it('handles IDENTIFY message', () => {
      const orchestrator = createHostOrchestrator(mockPeer)
      orchestrator.start()

      // Add a guest first
      useLiveSessionStore
        .getState()
        .addGuest({ peerId: 'guest-1', personId: null, displayName: null, connected: true })

      // Simulate IDENTIFY
      mockPeer.handlers['guest-message']('guest-1', {
        type: 'IDENTIFY',
        personId: 'p1',
        displayName: 'Alice',
      })

      const guest = useLiveSessionStore.getState().guests[0]
      expect(guest.personId).toBe('p1')
      expect(guest.displayName).toBe('Alice')
      expect(mockPeer.sendToGuest).toHaveBeenCalledWith(
        'guest-1',
        expect.objectContaining({ type: 'SYNC_STATE' })
      )
    })

    it('handles CLAIM_ITEM message', () => {
      useBillStore.getState().addLineItem({
        name: 'Pizza',
        price: 1200,
        quantity: 1,
        confidence: 1,
        manuallyEdited: false,
      })
      const itemId = useBillStore.getState().lineItems[0].id

      const orchestrator = createHostOrchestrator(mockPeer)
      orchestrator.start()

      mockPeer.handlers['guest-message']('guest-1', { type: 'CLAIM_ITEM', itemId, personId: 'p1' })

      expect(useAssignmentStore.getState().assignments[itemId]).toContain('p1')

      // Debounced broadcast
      vi.advanceTimersByTime(50)
      expect(mockPeer.broadcastToAll).toHaveBeenCalled()
    })

    it('handles UNCLAIM_ITEM message', () => {
      useBillStore.getState().addLineItem({
        name: 'Pizza',
        price: 1200,
        quantity: 1,
        confidence: 1,
        manuallyEdited: false,
      })
      const itemId = useBillStore.getState().lineItems[0].id
      useAssignmentStore.getState().assignPerson(itemId, 'p1')

      const orchestrator = createHostOrchestrator(mockPeer)
      orchestrator.start()

      mockPeer.handlers['guest-message']('guest-1', {
        type: 'UNCLAIM_ITEM',
        itemId,
        personId: 'p1',
      })

      expect(useAssignmentStore.getState().assignments[itemId]).not.toContain('p1')
    })

    it('handles SET_TIP percentage message', () => {
      useTipStore.getState().initializeTips(['p1'])

      const orchestrator = createHostOrchestrator(mockPeer)
      orchestrator.start()

      mockPeer.handlers['guest-message']('guest-1', {
        type: 'SET_TIP',
        personId: 'p1',
        mode: 'percentage',
        value: 20,
      })

      const tip = useTipStore.getState().personTips['p1']
      expect(tip.mode).toBe('percentage')
      expect(tip.percentage).toBe(20)
    })

    it('handles SET_TIP fixed message', () => {
      useTipStore.getState().initializeTips(['p1'])

      const orchestrator = createHostOrchestrator(mockPeer)
      orchestrator.start()

      mockPeer.handlers['guest-message']('guest-1', {
        type: 'SET_TIP',
        personId: 'p1',
        mode: 'fixed',
        value: 500,
      })

      const tip = useTipStore.getState().personTips['p1']
      expect(tip.mode).toBe('fixed')
      expect(tip.fixedAmount).toBe(500)
    })

    it('handles SET_ASSIGNEES message with portions', () => {
      useBillStore.getState().addLineItem({
        name: 'Pizza',
        price: 1200,
        quantity: 1,
        confidence: 1,
        manuallyEdited: false,
      })
      const itemId = useBillStore.getState().lineItems[0].id

      const orchestrator = createHostOrchestrator(mockPeer)
      orchestrator.start()

      mockPeer.handlers['guest-message']('guest-1', {
        type: 'SET_ASSIGNEES',
        itemId,
        personIds: ['p1', 'p2'],
        portions: { p1: 2, p2: 3 },
      })

      expect(useAssignmentStore.getState().assignments[itemId]).toEqual(['p1', 'p2'])
      expect(useAssignmentStore.getState().portions[itemId]).toEqual({ p1: 2, p2: 3 })
    })
  })

  describe('advancePhase', () => {
    it('updates phase and broadcasts', () => {
      const orchestrator = createHostOrchestrator(mockPeer)
      orchestrator.advancePhase('claiming')

      expect(useLiveSessionStore.getState().phase).toBe('claiming')
      expect(mockPeer.broadcastToAll).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'PHASE_CHANGE', phase: 'claiming' })
      )
    })
  })

  describe('guest-connected/disconnected', () => {
    it('adds guest on connection', () => {
      const orchestrator = createHostOrchestrator(mockPeer)
      orchestrator.start()

      mockPeer.handlers['guest-connected']('guest-1')
      expect(useLiveSessionStore.getState().guests).toHaveLength(1)
      expect(useLiveSessionStore.getState().guests[0].peerId).toBe('guest-1')
    })

    it('marks guest disconnected', () => {
      const orchestrator = createHostOrchestrator(mockPeer)
      orchestrator.start()

      mockPeer.handlers['guest-connected']('guest-1')
      mockPeer.handlers['guest-disconnected']('guest-1')
      expect(useLiveSessionStore.getState().guests[0].connected).toBe(false)
    })
  })
})
