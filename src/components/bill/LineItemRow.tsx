import { useState } from 'react'
import type { LineItem } from '../../types'
import { formatCurrency } from '../../utils/formatCurrency'
import ItemEditorModal from './ItemEditorModal'

interface LineItemRowProps {
  item: LineItem
  onUpdate: (id: string, updates: Partial<Omit<LineItem, 'id'>>) => void
  onDelete: (id: string) => void
}

const LOW_CONFIDENCE_THRESHOLD = 0.7

export default function LineItemRow({ item, onUpdate, onDelete }: LineItemRowProps) {
  const [editing, setEditing] = useState(false)

  const isLowConfidence = !item.manuallyEdited && item.confidence < LOW_CONFIDENCE_THRESHOLD

  function handleRowClick() {
    setEditing(true)
  }

  function handleSave(name: string, priceCents: number, quantity: number) {
    onUpdate(item.id, { name, price: priceCents, quantity })
    setEditing(false)
  }

  function handleDelete() {
    onDelete(item.id)
    setEditing(false)
  }

  return (
    <>
      <div
        className="flex items-start gap-3 px-4 py-3 rounded-xl active:bg-gray-50 dark:active:bg-gray-800 transition-colors cursor-pointer"
        onClick={handleRowClick}
        role="button"
        tabIndex={0}
        aria-label={`Edit ${item.name}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleRowClick()
          }
        }}
      >
        {/* Low-confidence badge */}
        {isLowConfidence && (
          <span
            className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-400"
            title="Low OCR confidence — tap to review"
            aria-label="Low confidence, tap to review"
          />
        )}

        {/* Name */}
        <span className="flex-1 min-w-0 text-base text-gray-900 dark:text-gray-100 break-words">
          {item.quantity > 1 && (
            <span className="text-gray-600 dark:text-gray-300 mr-1">{item.quantity}×</span>
          )}
          {item.name}
        </span>

        {/* Price */}
        <span className="flex-shrink-0 text-sm font-medium text-gray-900 dark:text-gray-100">
          {formatCurrency(item.price * item.quantity)}
        </span>

        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(item.id)
          }}
          aria-label={`Delete ${item.name}`}
          className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-red-400 active:text-red-500 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {editing && (
        <ItemEditorModal
          title="Edit Item"
          initialName={item.name}
          initialPrice={((item.price * item.quantity) / 100).toFixed(2)}
          initialQty={String(item.quantity)}
          saveLabel="Save Changes"
          onSave={handleSave}
          onClose={() => setEditing(false)}
          onDelete={handleDelete}
        />
      )}
    </>
  )
}
