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

  // Only connected guests hold a name; a dropped guest must be able to reclaim theirs
  const claimedPersonIds = guests
    .filter((g) => g.personId !== null && g.connected)
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
    const knownItem = (id: string) => useBillStore.getState().lineItems.some((i) => i.id === id)
    const knownPerson = (id: string) => usePeopleStore.getState().people.some((p) => p.id === id)

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
        if (!knownItem(message.itemId) || !knownPerson(message.personId)) break
        assignmentStore.assignPerson(message.itemId, message.personId)
        debouncedBroadcast()
        break
      }

      case 'UNCLAIM_ITEM': {
        if (!knownItem(message.itemId) || !knownPerson(message.personId)) break
        assignmentStore.unassignPerson(message.itemId, message.personId)
        debouncedBroadcast()
        break
      }

      case 'SET_ASSIGNEES': {
        if (!knownItem(message.itemId)) break
        const personIds = [...new Set(message.personIds)].filter(knownPerson)
        const portions = Object.fromEntries(
          Object.entries(message.portions).filter(([id]) => personIds.includes(id))
        )
        assignmentStore.setAssignees(message.itemId, personIds)
        if (Object.keys(portions).length > 0) {
          assignmentStore.setPortions(message.itemId, portions)
        } else {
          assignmentStore.clearPortions(message.itemId)
        }
        debouncedBroadcast()
        break
      }

      case 'SET_TIP': {
        if (!knownPerson(message.personId)) break
        if (message.mode === 'percentage') {
          tipStore.setPersonTipPercentage(message.personId, message.value)
        } else {
          tipStore.setPersonTipFixed(message.personId, message.value)
        }
        debouncedBroadcast()
        break
      }

      case 'ADD_PERSON': {
        const name = message.name.trim()
        if (name) {
          usePeopleStore.getState().addPerson(name)
          broadcastState()
        }
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

  // Subscribed in start() and released in destroy() so the pair can be re-run after a reconnect
  let unsubscribers: Array<() => void> = []

  const start = () => {
    if (unsubscribers.length > 0) return
    unsubscribers = [
      // Host's own edits broadcast to guests
      useAssignmentStore.subscribe(() => debouncedBroadcast()),
      useTipStore.subscribe(() => debouncedBroadcast()),
      usePeopleStore.subscribe(() => debouncedBroadcast()),
    ]
    peerService.on('guest-message', handleGuestMessage)
    peerService.on('guest-connected', handleGuestConnected)
    peerService.on('guest-disconnected', handleGuestDisconnected)
  }

  const destroy = () => {
    debouncedBroadcast.flush()
    unsubscribers.forEach((unsub) => unsub())
    unsubscribers = []
    peerService.off('guest-message', handleGuestMessage)
    peerService.off('guest-connected', handleGuestConnected)
    peerService.off('guest-disconnected', handleGuestDisconnected)
  }

  return { start, broadcastState, advancePhase, destroy }
}
