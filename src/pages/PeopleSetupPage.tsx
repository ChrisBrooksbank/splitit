import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePeopleStore } from '../store/peopleStore'
import PersonChip from '../components/assignment/PersonChip'
import StepIndicator from '../components/layout/StepIndicator'

export default function PeopleSetupPage() {
  const navigate = useNavigate()
  const { people, addPerson, updatePerson, removePerson } = usePeopleStore()

  const [inputValue, setInputValue] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const editRef = useRef<HTMLInputElement>(null)

  // Focus add-name input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingId) {
      editRef.current?.focus()
    }
  }, [editingId])

  function handleAdd() {
    const name = inputValue.trim()
    if (!name) return
    addPerson(name)
    setInputValue('')
    inputRef.current?.focus()
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  function handleStartEdit(id: string, currentName: string) {
    setEditingId(id)
    setEditValue(currentName)
  }

  function handleSaveEdit(id: string) {
    const name = editValue.trim()
    if (name) {
      updatePerson(id, name)
    }
    setEditingId(null)
    setEditValue('')
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLInputElement>, id: string) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSaveEdit(id)
    } else if (e.key === 'Escape') {
      setEditingId(null)
      setEditValue('')
    }
  }

  function handleContinue() {
    navigate('/assign')
  }

  const canContinue = people.length >= 2

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Progress */}
      <StepIndicator currentRoute="/people" />

      {/* Header */}
      <div className="px-4 pt-2 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Who's at the table?</h1>
        <p className="mt-1 text-sm text-gray-500">
          Add everyone splitting this bill. Minimum 2 people.
        </p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-4">
        {/* Add person input */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Name"
            aria-label="Person's name"
            maxLength={40}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
          <button
            onClick={handleAdd}
            disabled={!inputValue.trim()}
            aria-label="Add person"
            className="px-5 py-3 bg-gray-900 text-white text-sm font-medium rounded-xl active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed min-w-[64px]"
          >
            Add
          </button>
        </div>

        {/* People list */}
        {people.length > 0 && (
          <ul className="flex flex-col gap-2" role="list" aria-label="People at the table">
            {people.map((person) => (
              <li
                key={person.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50"
              >
                {/* Color swatch */}
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: person.color }}
                  aria-hidden="true"
                />

                {/* Name / edit field */}
                {editingId === person.id ? (
                  <input
                    ref={editRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => handleEditKeyDown(e, person.id)}
                    onBlur={() => handleSaveEdit(person.id)}
                    aria-label={`Edit name for ${person.name}`}
                    maxLength={40}
                    className="flex-1 px-2 py-1 rounded-lg border border-gray-300 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                ) : (
                  <button
                    onClick={() => handleStartEdit(person.id, person.name)}
                    aria-label={`Edit ${person.name}`}
                    className="flex-1 text-left text-base text-gray-900 font-medium focus:outline-none"
                  >
                    {person.name}
                  </button>
                )}

                {/* PersonChip preview (hidden on small screens) */}
                <PersonChip person={person} className="flex-shrink-0 hidden sm:inline-flex" />

                {/* Remove button */}
                <button
                  onClick={() => removePerson(person.id)}
                  aria-label={`Remove ${person.name}`}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 active:scale-90 transition-all rounded-full focus:outline-none focus:ring-2 focus:ring-red-300"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path
                      d="M12 4L4 12M4 4l8 8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Empty state hint */}
        {people.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">
            Add at least 2 people to split the bill.
          </p>
        )}

        {/* "Need 2" reminder */}
        {people.length === 1 && (
          <p className="text-center text-sm text-gray-400">Add one more person to continue.</p>
        )}
      </div>

      {/* Sticky continue button */}
      <div className="px-4 pb-8 pt-3 bg-white border-t border-gray-100">
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          aria-label="Continue to assignment"
          className="w-full py-4 px-6 bg-gray-900 text-white text-base font-medium rounded-2xl active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue to Assignment
        </button>
      </div>
    </div>
  )
}
