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
  return (
    <div className="flex flex-col gap-1">
      {items.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          No items yet. Add items manually or scan a receipt.
        </p>
      )}

      {items.map((item) => (
        <LineItemRow key={item.id} item={item} onUpdate={onUpdate} onDelete={onDelete} />
      ))}

      <AddItemForm onAdd={onAdd} />
    </div>
  )
}
