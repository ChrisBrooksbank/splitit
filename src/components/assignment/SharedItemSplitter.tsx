import { useState, useEffect, useRef, useMemo } from 'react'
import type { LineItem, Person } from '../../types'
import { formatCurrency } from '../../utils/formatCurrency'

interface SharedItemSplitterProps {
  item: LineItem
  people: Person[]
  currentAssignees: string[] // personIds currently assigned
  currentPortions: Record<string, number> // personId -> portion weight (empty = equal split)
  onConfirm: (personIds: string[], portions: Record<string, number>) => void
  onClose: () => void
}

const DIALOG_TITLE_ID = 'shared-item-splitter-title'

export default function SharedItemSplitter({
  item,
  people,
  currentAssignees,
  currentPortions,
  onConfirm,
  onClose,
}: SharedItemSplitterProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(currentAssignees))
  const [useCustom, setUseCustom] = useState(Object.keys(currentPortions).length > 0)
  const [portions, setPortions] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    for (const p of people) {
      init[p.id] = currentPortions[p.id] ?? 1
    }
    return init
  })

  const dialogRef = useRef<HTMLDivElement>(null)

  // Focus the dialog panel on mount, restore focus on unmount
  // Also handle Escape key to close dialog
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('keydown', handleEscape)
      previouslyFocused?.focus()
    }
  }, [onClose])

  // Focus trap: keep Tab key inside the dialog panel
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Tab') return
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    if (!focusable || focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  const totalPrice = item.price * item.quantity
  const selectedArray = Array.from(selected)

  function togglePerson(personId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(personId)) {
        next.delete(personId)
      } else {
        next.add(personId)
      }
      return next
    })
  }

  function handleConfirm() {
    const personIds = selectedArray
    const portionResult = useCustom
      ? Object.fromEntries(personIds.map((id) => [id, portions[id] ?? 1]))
      : {}
    onConfirm(personIds, portionResult)
  }

  const evenShare = useMemo(() => {
    if (selectedArray.length === 0) return formatCurrency(0)
    return formatCurrency(Math.round(totalPrice / selectedArray.length))
  }, [selectedArray.length, totalPrice])

  const customShares = useMemo(() => {
    if (selectedArray.length === 0) return {} as Record<string, string>
    const totalWeight = selectedArray.reduce((sum, id) => sum + (portions[id] ?? 1), 0)
    const result: Record<string, string> = {}
    for (const id of selectedArray) {
      const personWeight = portions[id] ?? 1
      result[id] = formatCurrency(
        totalWeight > 0 ? Math.round((totalPrice * personWeight) / totalWeight) : 0
      )
    }
    return result
  }, [selectedArray, portions, totalPrice])

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby={DIALOG_TITLE_ID}
    >
      {/* Dimmed overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      {/* Bottom sheet */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative w-full bg-white dark:bg-gray-900 rounded-t-2xl shadow-xl max-h-[80vh] flex flex-col"
        onKeyDown={handleKeyDown}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" aria-hidden="true" />
        </div>

        {/* Header */}
        <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700">
          <h2
            id={DIALOG_TITLE_ID}
            className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate"
          >
            {item.name}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {formatCurrency(totalPrice)} total
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {/* Person checkboxes */}
          {people.map((person) => {
            const isChecked = selected.has(person.id)
            return (
              <div key={person.id} className="flex items-center gap-3">
                {/* Checkbox */}
                <button
                  role="checkbox"
                  aria-checked={isChecked}
                  onClick={() => togglePerson(person.id)}
                  className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label={`Include ${person.name}`}
                >
                  <div
                    className="w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors"
                    style={
                      isChecked
                        ? { backgroundColor: person.color, borderColor: person.color }
                        : { borderColor: '#D1D5DB' }
                    }
                  >
                    {isChecked && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 12 12"
                        fill="currentColor"
                        className="w-3.5 h-3.5 text-white"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10.22 2.97a.75.75 0 0 1 0 1.06l-5.25 5.25a.75.75 0 0 1-1.06 0L1.53 6.47a.75.75 0 0 1 1.06-1.06l1.85 1.85 4.72-4.72a.75.75 0 0 1 1.06 0Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </button>

                {/* Person name */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: person.color }}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {person.name}
                    </span>
                  </div>

                  {/* Custom portion selector */}
                  {useCustom && isChecked && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <label
                        className="text-xs text-gray-500 dark:text-gray-400"
                        htmlFor={`portion-${person.id}`}
                      >
                        Portions:
                      </label>
                      <input
                        id={`portion-${person.id}`}
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max="99"
                        value={portions[person.id] ?? 1}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value, 10) || 1)
                          setPortions((prev) => ({ ...prev, [person.id]: val }))
                        }}
                        className="w-14 text-sm text-center border border-gray-300 dark:border-gray-600 rounded-lg py-1 focus:border-gray-500 dark:focus:border-gray-400 focus:outline-none"
                        aria-label={`${person.name} portion count`}
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {customShares[person.id] ?? formatCurrency(0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Share amount (even split mode) */}
                {!useCustom && isChecked && (
                  <span className="flex-shrink-0 text-sm text-gray-500 dark:text-gray-400">
                    {evenShare}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Custom split toggle */}
        <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={() => setUseCustom((v) => !v)}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 min-h-[44px]"
            aria-pressed={useCustom}
          >
            <div
              className={`relative w-10 h-6 rounded-full transition-colors ${useCustom ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${useCustom ? 'translate-x-5' : 'translate-x-1'}`}
              />
            </div>
            Custom portions
          </button>
        </div>

        {/* Actions */}
        <div className="px-6 pb-safe pb-6 flex gap-3">
          <button
            onClick={onClose}
            aria-label="Cancel and close"
            className="flex-1 min-h-[48px] rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 active:bg-gray-50 dark:active:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selected.size === 0}
            className="flex-1 min-h-[48px] rounded-xl bg-gray-900 dark:bg-white text-sm font-medium text-white dark:text-gray-900 disabled:opacity-40 active:bg-gray-700 dark:active:bg-gray-600 transition-colors"
          >
            {selected.size === 0 ? 'Select people' : `Split ${selected.size} ways`}
          </button>
        </div>
      </div>
    </div>
  )
}
