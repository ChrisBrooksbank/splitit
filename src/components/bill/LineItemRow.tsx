import { useState, useRef, useEffect } from 'react'
import type { LineItem } from '../../types'
import { formatCurrency } from '../../utils/formatCurrency'

interface LineItemRowProps {
  item: LineItem
  onUpdate: (id: string, updates: Partial<Omit<LineItem, 'id'>>) => void
  onDelete: (id: string) => void
}

const LOW_CONFIDENCE_THRESHOLD = 0.7

export default function LineItemRow({ item, onUpdate, onDelete }: LineItemRowProps) {
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(item.name)
  const [draftPrice, setDraftPrice] = useState((item.price / 100).toFixed(2))
  const [draftQty, setDraftQty] = useState(String(item.quantity))
  const nameInputRef = useRef<HTMLInputElement>(null)

  const isLowConfidence = !item.manuallyEdited && item.confidence < LOW_CONFIDENCE_THRESHOLD

  useEffect(() => {
    if (editing) {
      nameInputRef.current?.focus()
    }
  }, [editing])

  function handleRowClick() {
    if (!editing) {
      setDraftName(item.name)
      setDraftPrice((item.price / 100).toFixed(2))
      setDraftQty(String(item.quantity))
      setEditing(true)
    }
  }

  function handleSave() {
    const parsedPrice = Math.round(parseFloat(draftPrice) * 100)
    const parsedQty = Math.max(1, parseInt(draftQty, 10) || 1)
    onUpdate(item.id, {
      name: draftName.trim() || item.name,
      price: isNaN(parsedPrice) ? item.price : parsedPrice,
      quantity: parsedQty,
    })
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') setEditing(false)
  }

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation()
    onDelete(item.id)
  }

  if (editing) {
    return (
      <div
        className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200"
        role="group"
        aria-label="Edit item"
      >
        {/* Name */}
        <input
          ref={nameInputRef}
          type="text"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Item name"
          className="flex-1 min-w-0 text-sm text-gray-900 bg-transparent border-b border-gray-400 focus:border-gray-900 outline-none py-0.5"
        />

        {/* Quantity */}
        <input
          type="number"
          inputMode="numeric"
          min="1"
          value={draftQty}
          onChange={(e) => setDraftQty(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Quantity"
          className="w-10 text-sm text-center text-gray-900 bg-transparent border-b border-gray-400 focus:border-gray-900 outline-none py-0.5"
        />

        {/* Price */}
        <div className="flex items-center">
          <span className="text-sm text-gray-500">$</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={draftPrice}
            onChange={(e) => setDraftPrice(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Price in dollars"
            className="w-16 text-sm text-right text-gray-900 bg-transparent border-b border-gray-400 focus:border-gray-900 outline-none py-0.5"
          />
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          aria-label="Save changes"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-900 font-medium text-sm"
        >
          Done
        </button>
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl active:bg-gray-50 transition-colors cursor-pointer"
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
      <span className="flex-1 min-w-0 text-sm text-gray-900 truncate">
        {item.quantity > 1 && <span className="text-gray-500 mr-1">{item.quantity}×</span>}
        {item.name}
      </span>

      {/* Price */}
      <span className="flex-shrink-0 text-sm font-medium text-gray-900">
        {formatCurrency(item.price * item.quantity)}
      </span>

      {/* Delete button */}
      <button
        onClick={handleDeleteClick}
        aria-label={`Delete ${item.name}`}
        className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-300 hover:text-red-400 active:text-red-500 transition-colors"
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
  )
}
