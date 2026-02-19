import { useBillStore } from '../../store/billStore'
import { usePeopleStore } from '../../store/peopleStore'
import { useAssignmentStore } from '../../store/assignmentStore'
import { useLiveSessionStore } from '../../store/liveSessionStore'
import PersonChip from '../assignment/PersonChip'
import StepIndicator from '../layout/StepIndicator'
import { formatCurrency } from '../../utils/formatCurrency'

interface HostLiveAssignmentViewProps {
  onAdvanceToTips: () => void
}

export default function HostLiveAssignmentView({ onAdvanceToTips }: HostLiveAssignmentViewProps) {
  const lineItems = useBillStore((s) => s.lineItems)
  const people = usePeopleStore((s) => s.people)
  const assignments = useAssignmentStore((s) => s.assignments)
  const guests = useLiveSessionStore((s) => s.guests)

  const unassignedItems = lineItems.filter((item) => {
    const assignees = assignments[item.id] ?? []
    return assignees.length === 0
  })

  const hasUnassignedItems = unassignedItems.length > 0

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 px-4 pt-4 pb-24">
      <StepIndicator currentRoute="/assign" />

      <div className="max-w-lg mx-auto mt-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Live Assignment</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Guests are claiming items from their phones
        </p>

        {/* Guest presence */}
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Connected guests
          </h2>
          <div className="flex flex-wrap gap-2">
            {guests.map((guest) => {
              const person = guest.personId ? people.find((p) => p.id === guest.personId) : null
              return (
                <div
                  key={guest.peerId}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${
                    guest.connected
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      guest.connected ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  {person?.name ?? guest.displayName ?? 'Connecting...'}
                </div>
              )
            })}
            {guests.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                No guests connected yet
              </p>
            )}
          </div>
        </div>

        {/* Items overview */}
        <div className="space-y-2 mb-6">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Items</h2>
          {lineItems.map((item) => {
            const assignees = assignments[item.id] ?? []
            const assigneePeople = assignees
              .map((pid) => people.find((p) => p.id === pid))
              .filter(Boolean) as typeof people
            const isUnassigned = assignees.length === 0

            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
                  isUnassigned
                    ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                    : 'bg-gray-50 dark:bg-gray-800'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-900 dark:text-gray-100 truncate block">
                    {item.quantity > 1 && (
                      <span className="text-gray-500 dark:text-gray-400 mr-1">
                        {item.quantity}x
                      </span>
                    )}
                    {item.name}
                  </span>
                  {assigneePeople.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {assigneePeople.map((person) => (
                        <PersonChip key={person.id} person={person} />
                      ))}
                    </div>
                  )}
                  {isUnassigned && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5 block">
                      Unassigned
                    </span>
                  )}
                </div>
                <span className="flex-shrink-0 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            )
          })}
        </div>

        {/* Advance button */}
        <button
          onClick={onAdvanceToTips}
          disabled={hasUnassignedItems}
          className={`w-full py-3 rounded-xl text-white font-semibold transition-colors ${
            hasUnassignedItems
              ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
          }`}
        >
          Move to Tips
        </button>
        {hasUnassignedItems && (
          <p className="text-xs text-amber-600 dark:text-amber-400 text-center mt-2">
            {unassignedItems.length} item{unassignedItems.length > 1 ? 's' : ''} still unassigned
          </p>
        )}
      </div>
    </div>
  )
}
