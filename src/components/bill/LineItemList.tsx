import { useState } from 'react'
import type { LineItem } from '../../types'
import LineItemRow from './LineItemRow'
import AddItemForm from './AddItemForm'

interface LineItemListProps {
  items: LineItem[]
  onUpdate: (id: string, updates: Partial<Omit<LineItem, 'id'>>) => void
  onDelete: (id: string) => void
  onAdd: (name: string, priceCents: number, quantity: number) => void
}

export default function LineItemList({ items, onUpdate, onDelete, onAdd }: LineItemListProps) {
  const [showAddForm, setShowAddForm] = useState(false)

  function handleAdd(name: string, priceCents: number, quantity: number) {
    onAdd(name, priceCents, quantity)
    setShowAddForm(false)
  }

  return (
    <div className="flex flex-col gap-1">
      {items.length === 0 && !showAddForm && (
        <p className="py-6 text-center text-sm text-gray-400">
          No items yet. Add items manually or scan a receipt.
        </p>
      )}

      {items.map((item) => (
        <LineItemRow key={item.id} item={item} onUpdate={onUpdate} onDelete={onDelete} />
      ))}

      {showAddForm ? (
        <AddItemForm onAdd={handleAdd} onCancel={() => setShowAddForm(false)} />
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          aria-label="Add item"
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[44px]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
            aria-hidden="true"
          >
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          Add Item
        </button>
      )}
    </div>
  )
}
