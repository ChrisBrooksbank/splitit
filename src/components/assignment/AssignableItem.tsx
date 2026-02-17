import type { LineItem, Person } from '../../types'
import { formatCurrency } from '../../utils/formatCurrency'
import PersonChip from './PersonChip'

interface AssignableItemProps {
  item: LineItem
  assignees: Person[] // people who have claimed this item
  currentPerson: Person // the active person whose turn it is
  isAssigned: boolean // true if currentPerson has claimed this item
  isUnassigned: boolean // true if nobody has claimed this item (highlighted)
  onToggle: (itemId: string) => void // tap to claim/unclaim
  onShareClick: (itemId: string) => void // open shared-item bottom sheet
}

export default function AssignableItem({
  item,
  assignees,
  currentPerson,
  isAssigned,
  isUnassigned,
  onToggle,
  onShareClick,
}: AssignableItemProps) {
  const totalPrice = item.price * item.quantity

  function handleRowClick() {
    onToggle(item.id)
  }

  function handleShareClick(e: React.MouseEvent) {
    e.stopPropagation()
    onShareClick(item.id)
  }

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer select-none ${
        isAssigned
          ? 'bg-gray-50 dark:bg-gray-800'
          : isUnassigned
            ? 'bg-amber-50 border border-amber-200'
            : 'active:bg-gray-50 dark:active:bg-gray-800'
      }`}
      onClick={handleRowClick}
      role="checkbox"
      aria-checked={isAssigned}
      tabIndex={0}
      aria-label={`${item.name} — ${formatCurrency(totalPrice)}${isAssigned ? ', claimed' : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleRowClick()
        }
      }}
    >
      {/* Claim indicator — colored dot for current person when claimed */}
      <div
        className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
        style={
          isAssigned
            ? { backgroundColor: currentPerson.color, borderColor: currentPerson.color }
            : { borderColor: isUnassigned ? '#D97706' : '#D1D5DB' }
        }
        aria-hidden="true"
      >
        {isAssigned && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 12 12"
            fill="currentColor"
            className="w-3 h-3 text-white"
          >
            <path
              fillRule="evenodd"
              d="M10.22 2.97a.75.75 0 0 1 0 1.06l-5.25 5.25a.75.75 0 0 1-1.06 0L1.53 6.47a.75.75 0 0 1 1.06-1.06l1.85 1.85 4.72-4.72a.75.75 0 0 1 1.06 0Z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>

      {/* Item name + quantity */}
      <div className="flex-1 min-w-0">
        <span className="text-sm text-gray-900 dark:text-gray-100 truncate block">
          {item.quantity > 1 && (
            <span className="text-gray-500 dark:text-gray-400 mr-1">{item.quantity}×</span>
          )}
          {item.name}
        </span>

        {/* Assignment badges — show who has already claimed this item */}
        {assignees.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1" aria-label="Claimed by">
            {assignees.map((person) => (
              <PersonChip key={person.id} person={person} />
            ))}
          </div>
        )}

        {isUnassigned && (
          <span className="text-xs text-amber-600 font-medium mt-0.5 block">Unassigned</span>
        )}
      </div>

      {/* Price */}
      <span className="flex-shrink-0 text-sm font-medium text-gray-900 dark:text-gray-100">
        {formatCurrency(totalPrice)}
      </span>

      {/* Share button — opens SharedItemSplitter */}
      <button
        onClick={handleShareClick}
        aria-label={`Split ${item.name} among multiple people`}
        className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 active:text-gray-800 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4"
          aria-hidden="true"
        >
          <path d="M13 4.5a2.5 2.5 0 1 1 .702 1.737L6.97 9.604a2.518 2.518 0 0 1 0 .792l6.733 3.367a2.5 2.5 0 1 1-.671 1.341l-6.733-3.367a2.5 2.5 0 1 1 0-3.474L13 4.5Z" />
        </svg>
      </button>
    </div>
  )
}
