import { useState } from 'react'
import ItemEditorModal from './ItemEditorModal'

interface AddItemFormProps {
  onAdd: (name: string, priceCents: number, quantity: number) => void
}

export default function AddItemForm({ onAdd }: AddItemFormProps) {
  const [showModal, setShowModal] = useState(false)

  function handleSave(name: string, priceCents: number, quantity: number) {
    onAdd(name, priceCents, quantity)
    setShowModal(false)
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        aria-label="Add item"
        className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700 transition-colors min-h-[44px]"
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

      {showModal && (
        <ItemEditorModal
          title="Add Item"
          saveLabel="Add Item"
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
