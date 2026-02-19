import { useState } from 'react'
import type { SyncPayload } from '../../services/liveSession/types'
import AssignableItem from '../assignment/AssignableItem'
import SharedItemSplitter from '../assignment/SharedItemSplitter'

interface GuestClaimingViewProps {
  syncedState: SyncPayload
  myPersonId: string
  onClaim: (itemId: string) => void
  onUnclaim: (itemId: string) => void
  onSetAssignees: (itemId: string, personIds: string[], portions: Record<string, number>) => void
}

export default function GuestClaimingView({
  syncedState,
  myPersonId,
  onClaim,
  onUnclaim,
  onSetAssignees,
}: GuestClaimingViewProps) {
  const [splitterItemId, setSplitterItemId] = useState<string | null>(null)

  const { lineItems, people, assignments, portions } = syncedState
  const currentPerson = people.find((p) => p.id === myPersonId)

  if (!currentPerson) return null

  const handleToggle = (itemId: string) => {
    const assignees = assignments[itemId] ?? []
    if (assignees.includes(myPersonId)) {
      onUnclaim(itemId)
    } else {
      onClaim(itemId)
    }
  }

  const splitterItem = splitterItemId ? lineItems.find((i) => i.id === splitterItemId) : null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: currentPerson.color }}
        />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Claim your items</h2>
      </div>

      {lineItems.map((item) => {
        const itemAssignees = assignments[item.id] ?? []
        const assigneePeople = itemAssignees
          .map((pid) => people.find((p) => p.id === pid))
          .filter(Boolean) as typeof people

        return (
          <AssignableItem
            key={item.id}
            item={item}
            assignees={assigneePeople}
            currentPerson={currentPerson}
            isAssigned={itemAssignees.includes(myPersonId)}
            isUnassigned={itemAssignees.length === 0}
            onToggle={handleToggle}
            onShareClick={setSplitterItemId}
          />
        )
      })}

      {splitterItem && (
        <SharedItemSplitter
          item={splitterItem}
          people={people}
          currentAssignees={assignments[splitterItem.id] ?? []}
          currentPortions={portions[splitterItem.id] ?? {}}
          onConfirm={(personIds, portionWeights) => {
            onSetAssignees(splitterItem.id, personIds, portionWeights)
            setSplitterItemId(null)
          }}
          onClose={() => setSplitterItemId(null)}
        />
      )}
    </div>
  )
}
