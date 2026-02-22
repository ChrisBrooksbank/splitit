import { useBillStore } from '../../store/billStore'
import { usePeopleStore } from '../../store/peopleStore'
import { useAssignmentStore } from '../../store/assignmentStore'
import { useTipStore } from '../../store/tipStore'
import { useLiveSessionStore } from '../../store/liveSessionStore'
import type { RelayService } from './RelayService'
import type { GuestMessage, HostMessage, SessionPhase, SyncPayload } from './types'
import { debounce } from '../../utils/debounce'

export function buildSyncPayload(): SyncPayload {
  const { lineItems } = useBillStore.getState()
  const { people } = usePeopleStore.getState()
  const { assignments, portions } = useAssignmentStore.getState()
  const { personTips } = useTipStore.getState()
  const { phase, guests } = useLiveSessionStore.getState()

  const claimedPersonIds = guests
    .filter((g) => g.personId !== null)
    .map((g) => g.personId as string)

  return {
    lineItems,
    people,
    assignments,
    portions,
    personTips,
    phase,
    claimedPersonIds,
  }
}

export function createHostOrchestrator(peerService: RelayService) {
  const broadcastState = () => {
    const payload = buildSyncPayload()
    const msg: HostMessage = { type: 'SYNC_STATE', payload }
    peerService.broadcastToAll(msg)
  }

  const debouncedBroadcast = debounce(broadcastState, 50)

  const handleGuestMessage = (peerId: string, message: GuestMessage) => {
    const sessionStore = useLiveSessionStore.getState()
    const assignmentStore = useAssignmentStore.getState()
    const tipStore = useTipStore.getState()

    switch (message.type) {
      case 'IDENTIFY': {
        sessionStore.identifyGuest(peerId, message.personId, message.displayName)
        // Send immediate sync to the newly identified guest
        const payload = buildSyncPayload()
        peerService.sendToGuest(peerId, { type: 'SYNC_STATE', payload })
        // Also broadcast to everyone so they see updated claimedPersonIds
        broadcastState()
        break
      }

      case 'CLAIM_ITEM': {
        assignmentStore.assignPerson(message.itemId, message.personId)
        debouncedBroadcast()
        break
      }

      case 'UNCLAIM_ITEM': {
        assignmentStore.unassignPerson(message.itemId, message.personId)
        debouncedBroadcast()
        break
      }

      case 'SET_ASSIGNEES': {
        assignmentStore.setAssignees(message.itemId, message.personIds)
        if (Object.keys(message.portions).length > 0) {
          assignmentStore.setPortions(message.itemId, message.portions)
        } else {
          assignmentStore.clearPortions(message.itemId)
        }
        debouncedBroadcast()
        break
      }

      case 'SET_TIP': {
        if (message.mode === 'percentage') {
          tipStore.setPersonTipPercentage(message.personId, message.value)
        } else {
          tipStore.setPersonTipFixed(message.personId, message.value)
        }
        debouncedBroadcast()
        break
      }
    }
  }

  const advancePhase = (phase: SessionPhase) => {
    useLiveSessionStore.getState().setPhase(phase)
    peerService.broadcastToAll({ type: 'PHASE_CHANGE', phase })
    broadcastState()
  }

  const handleGuestConnected = (peerId: string) => {
    useLiveSessionStore.getState().addGuest({
      peerId,
      personId: null,
      displayName: null,
      connected: true,
    })
    // Send current state so the guest can show the "Who are you?" list
    const payload = buildSyncPayload()
    peerService.sendToGuest(peerId, { type: 'SYNC_STATE', payload })
  }

  const handleGuestDisconnected = (peerId: string) => {
    useLiveSessionStore.getState().disconnectGuest(peerId)
  }

  // Subscribe to store changes so host's own edits broadcast to guests
  const unsubAssignments = useAssignmentStore.subscribe(() => {
    debouncedBroadcast()
  })
  const unsubTips = useTipStore.subscribe(() => {
    debouncedBroadcast()
  })

  const start = () => {
    peerService.on('guest-message', handleGuestMessage)
    peerService.on('guest-connected', handleGuestConnected)
    peerService.on('guest-disconnected', handleGuestDisconnected)
  }

  const destroy = () => {
    debouncedBroadcast.flush()
    unsubAssignments()
    unsubTips()
    peerService.off('guest-message', handleGuestMessage)
    peerService.off('guest-connected', handleGuestConnected)
    peerService.off('guest-disconnected', handleGuestDisconnected)
  }

  return { start, broadcastState, advancePhase, destroy }
}
