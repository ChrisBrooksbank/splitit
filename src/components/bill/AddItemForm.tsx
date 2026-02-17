import { useState, useRef, useEffect } from 'react'

interface AddItemFormProps {
  onAdd: (name: string, priceCents: number, quantity: number) => void
  onCancel: () => void
}

export default function AddItemForm({ onAdd, onCancel }: AddItemFormProps) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [qty, setQty] = useState('1')
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return
    const parsedPrice = Math.round(parseFloat(price) * 100)
    if (isNaN(parsedPrice) || parsedPrice < 0) return
    const parsedQty = Math.max(1, parseInt(qty, 10) || 1)
    onAdd(trimmedName, parsedPrice, parsedQty)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onCancel()
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200"
      aria-label="Add item"
    >
      {/* Name */}
      <input
        ref={nameRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Item name"
        aria-label="Item name"
        maxLength={100}
        className="flex-1 min-w-0 text-sm text-gray-900 bg-transparent border-b border-gray-400 focus:border-gray-900 outline-none py-0.5 placeholder:text-gray-400"
      />

      {/* Quantity */}
      <input
        type="number"
        inputMode="numeric"
        min="1"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
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
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0.00"
          aria-label="Price in dollars"
          className="w-16 text-sm text-right text-gray-900 bg-transparent border-b border-gray-400 focus:border-gray-900 outline-none py-0.5 placeholder:text-gray-400"
        />
      </div>

      {/* Add button */}
      <button
        type="submit"
        aria-label="Add item"
        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-900 font-medium text-sm"
      >
        Add
      </button>

      {/* Cancel button */}
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel"
        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 text-sm"
      >
        ✕
      </button>
    </form>
  )
}
