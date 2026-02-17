import { useBillStore } from '../store/billStore'
import { usePeopleStore } from '../store/peopleStore'
import { useAssignmentStore } from '../store/assignmentStore'
import { useTipStore } from '../store/tipStore'

/**
 * Returns the route to continue from based on current session state.
 * Returns null if no incomplete session exists.
 */
export function getRecoveryRoute(
  lineItemCount: number,
  peopleCount: number,
  assignmentCount: number
): string | null {
  if (lineItemCount === 0) return null
  if (peopleCount === 0) return '/editor'
  if (assignmentCount === 0) return '/assign'
  return '/assign'
}

/**
 * Hook that detects an incomplete session and provides helpers to
 * continue or discard it.
 */
export function useSessionRecovery() {
  const lineItems = useBillStore((s) => s.lineItems)
  const people = usePeopleStore((s) => s.people)
  const assignments = useAssignmentStore((s) => s.assignments)

  const resetBill = useBillStore((s) => s.reset)
  const resetPeople = usePeopleStore((s) => s.reset)
  const resetAssignments = useAssignmentStore((s) => s.reset)
  const resetTips = useTipStore((s) => s.reset)

  const hasIncompleteSession = lineItems.length > 0

  const assignmentCount = Object.values(assignments).filter((ids) => ids.length > 0).length

  const recoveryRoute = getRecoveryRoute(lineItems.length, people.length, assignmentCount)

  function discardSession() {
    resetBill()
    resetPeople()
    resetAssignments()
    resetTips()
  }

  return {
    hasIncompleteSession,
    recoveryRoute,
    lineItemCount: lineItems.length,
    peopleCount: people.length,
    discardSession,
  }
}
