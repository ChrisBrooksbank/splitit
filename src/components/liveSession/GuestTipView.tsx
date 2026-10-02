import type { SyncPayload } from '../../services/liveSession/types'
import PersonTipCard from '../tip/PersonTipCard'
import { personSubtotalCents } from '../../services/calculator/splitCalculator'

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
  const subtotalCents = personSubtotalCents(lineItems, myPersonId, assignments, portions)

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
