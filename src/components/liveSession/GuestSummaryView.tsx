import type { SyncPayload } from '../../services/liveSession/types'
import { calculateSplit } from '../../services/calculator/splitCalculator'
import { formatCurrency } from '../../utils/formatCurrency'

interface GuestSummaryViewProps {
  syncedState: SyncPayload
  myPersonId: string
}

export default function GuestSummaryView({ syncedState, myPersonId }: GuestSummaryViewProps) {
  const { lineItems, people, assignments, portions, personTips } = syncedState
  const person = people.find((p) => p.id === myPersonId)

  if (!person) return null

  const result = calculateSplit({
    people,
    lineItems,
    assignments,
    portions,
    personTips,
  })

  const myTotal = result.personTotals.find((t) => t.personId === myPersonId)
  if (!myTotal) return null

  // Get items assigned to this person with their share amounts
  const myItems = lineItems
    .filter((item) => {
      const assignees = assignments[item.id] ?? []
      return assignees.includes(myPersonId)
    })
    .map((item) => {
      const assignees = assignments[item.id] ?? []
      const itemPortions = portions[item.id]
      let share: number
      if (!itemPortions || Object.keys(itemPortions).length === 0) {
        share = 1 / assignees.length
      } else {
        const totalWeight = assignees.reduce((sum, id) => sum + (itemPortions[id] ?? 1), 0)
        const personWeight = itemPortions[myPersonId] ?? 1
        share = totalWeight > 0 ? personWeight / totalWeight : 1 / assignees.length
      }
      return { ...item, shareAmount: Math.round(item.price * item.quantity * share) }
    })

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
          style={{ backgroundColor: person.color + '20', color: person.color }}
        >
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: person.color }} />
          <span className="font-semibold">{person.name}</span>
        </div>

        <div className="text-4xl font-bold text-gray-900 dark:text-gray-100">
          {formatCurrency(myTotal.total)}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your total</p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Your items
        </h3>
        {myItems.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-gray-700 dark:text-gray-300">
              {item.quantity > 1 && <span className="text-gray-400 mr-1">{item.quantity}x</span>}
              {item.name}
            </span>
            <span className="text-gray-900 dark:text-gray-100 font-medium">
              {formatCurrency(item.shareAmount)}
            </span>
          </div>
        ))}

        <div className="border-t border-gray-200 dark:border-gray-700 pt-2 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
            <span className="text-gray-900 dark:text-gray-100">
              {formatCurrency(myTotal.subtotal)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Tip ({myTotal.tipPercentage}%)</span>
            <span className="text-gray-900 dark:text-gray-100">
              {formatCurrency(myTotal.tipAmount)}
            </span>
          </div>
          <div className="flex justify-between text-base font-semibold pt-1 border-t border-gray-200 dark:border-gray-700">
            <span className="text-gray-900 dark:text-gray-100">Total</span>
            <span className="text-gray-900 dark:text-gray-100">
              {formatCurrency(myTotal.total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
