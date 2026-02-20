import type { SyncPayload } from '../../services/liveSession/types'
import PersonTipCard from '../tip/PersonTipCard'

interface GuestTipViewProps {
  syncedState: SyncPayload
  myPersonId: string
  onSetTip: (mode: 'percentage' | 'fixed', value: number) => void
  disabled?: boolean
}

export default function GuestTipView({
  syncedState,
  myPersonId,
  onSetTip,
  disabled = false,
}: GuestTipViewProps) {
  const { lineItems, people, assignments, portions, personTips } = syncedState
  const person = people.find((p) => p.id === myPersonId)
  const tip = personTips[myPersonId]

  if (!person || !tip) return null

  // Compute subtotal for this person (same math as splitCalculator)
  let subtotalCents = 0
  for (const item of lineItems) {
    const assignees = assignments[item.id] ?? []
    if (!assignees.includes(myPersonId)) continue

    const itemPortions = portions[item.id]
    let share: number
    if (!itemPortions || Object.keys(itemPortions).length === 0) {
      share = 1 / assignees.length
    } else {
      const totalWeight = assignees.reduce((sum, id) => sum + (itemPortions[id] ?? 1), 0)
      const personWeight = itemPortions[myPersonId] ?? 1
      share = totalWeight > 0 ? personWeight / totalWeight : 1 / assignees.length
    }
    subtotalCents += Math.round(item.price * item.quantity * share)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Choose your tip</h2>

      <div className={disabled ? 'opacity-50 pointer-events-none' : ''}>
        <PersonTipCard
          person={person}
          subtotalCents={subtotalCents}
          tip={tip}
          onSelectPercentage={(percentage) => onSetTip('percentage', percentage)}
          onSelectFixed={(fixedAmount) => onSetTip('fixed', fixedAmount)}
        />
      </div>
    </div>
  )
}
