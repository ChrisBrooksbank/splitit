import { useState, useRef, useEffect } from 'react'

interface ItemEditorModalProps {
  /** Modal title — e.g. "Add Item" or "Edit Item" */
  title: string
  /** Pre-filled name (empty for add mode) */
  initialName?: string
  /** Pre-filled price as decimal string (empty for add mode) */
  initialPrice?: string
  /** Pre-filled quantity as string */
  initialQty?: string
  /** Label for the primary action button */
  saveLabel: string
  onSave: (name: string, priceCents: number, quantity: number) => void
  onClose: () => void
  /** If provided, renders a delete button */
  onDelete?: () => void
}

export default function ItemEditorModal({
  title,
  initialName = '',
  initialPrice = '',
  initialQty = '1',
  saveLabel,
  onSave,
  onClose,
  onDelete,
}: ItemEditorModalProps) {
  const [name, setName] = useState(initialName)
  const [price, setPrice] = useState(initialPrice)
  const [qty, setQty] = useState(initialQty)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return
    const parsedPrice = Math.round(parseFloat(price) * 100)
    if (isNaN(parsedPrice) || parsedPrice < 0) return
    const parsedQty = Math.max(1, parseInt(qty, 10) || 1)
    onSave(trimmedName, parsedPrice, parsedQty)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      {/* Modal panel */}
      <form
        onSubmit={handleSubmit}
        className="relative w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl px-6 pt-6 pb-8 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 dark:text-gray-500"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M15 5L5 15M5 5l10 10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Item name */}
        <div className="mb-5">
          <label
            htmlFor="item-name"
            className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5"
          >
            Item name
          </label>
          <input
            ref={nameRef}
            id="item-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Margherita Pizza"
            maxLength={100}
            className="w-full px-4 py-3 text-lg text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
          />
        </div>

        {/* Price and Quantity row */}
        <div className="flex gap-4 mb-6">
          {/* Price */}
          <div className="flex-1">
            <label
              htmlFor="item-price"
              className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5"
            >
              Price
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-gray-500 dark:text-gray-400">
                £
              </span>
              <input
                id="item-price"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full pl-9 pr-4 py-3 text-lg text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
              />
            </div>
          </div>

          {/* Quantity */}
          <div className="w-24">
            <label
              htmlFor="item-qty"
              className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5"
            >
              Qty
            </label>
            <input
              id="item-qty"
              type="number"
              inputMode="numeric"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full px-4 py-3 text-lg text-center text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
            />
          </div>
        </div>

        {/* Actions */}
        <button
          type="submit"
          className="w-full py-4 px-6 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-lg font-medium rounded-2xl active:scale-95 transition-transform"
        >
          {saveLabel}
        </button>

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="w-full mt-2 py-3 px-6 text-red-500 text-base font-medium rounded-2xl active:scale-95 transition-transform"
            aria-label="Delete item"
          >
            Delete Item
          </button>
        )}
      </form>
    </div>
  )
}
