import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePeopleStore } from '../store/peopleStore'
import { useBillStore } from '../store/billStore'
import { useAssignmentStore } from '../store/assignmentStore'
import AssignableItem from '../components/assignment/AssignableItem'
import HandoffScreen from '../components/assignment/HandoffScreen'
import SharedItemSplitter from '../components/assignment/SharedItemSplitter'
import StepIndicator from '../components/layout/StepIndicator'
import type { LineItem, Person } from '../types'

type Step = 'who-are-you' | 'claiming' | 'handoff' | 'done'

export default function AssignmentPage() {
  const navigate = useNavigate()
  const { people } = usePeopleStore()
  const { lineItems } = useBillStore()
  const { assignments, portions, toggleAssignment, setAssignees, setPortions, clearPortions } =
    useAssignmentStore()

  // Index into people[] for whose turn it is
  const [personIndex, setPersonIndex] = useState(0)
  const [step, setStep] = useState<Step>('who-are-you')
  const [splitterItemId, setSplitterItemId] = useState<string | null>(null)
  // Track which items are highlighted as unassigned (after last-person check)
  const [showUnassignedWarning, setShowUnassignedWarning] = useState(false)

  const currentPerson: Person | undefined = people[personIndex]
  const nextPerson: Person | undefined = people[personIndex + 1]

  // Compute unassigned items
  const unassignedItems = useMemo(
    () => lineItems.filter((item) => (assignments[item.id] ?? []).length === 0),
    [lineItems, assignments]
  )

  // For each item, get list of Person objects assigned
  function getAssignees(item: LineItem): Person[] {
    const ids = assignments[item.id] ?? []
    return ids.map((id) => people.find((p) => p.id === id)).filter(Boolean) as Person[]
  }

  // ── Step: "Who are you?" ──────────────────────────────────────────────────

  function handleSelectPerson(index: number) {
    setPersonIndex(index)
    setStep('claiming')
    setShowUnassignedWarning(false)
  }

  // ── Step: Item claiming ───────────────────────────────────────────────────

  function handleToggle(itemId: string) {
    if (!currentPerson) return
    toggleAssignment(itemId, currentPerson.id)
  }

  function handleShareClick(itemId: string) {
    setSplitterItemId(itemId)
  }

  function handleSplitterConfirm(personIds: string[], portionResult: Record<string, number>) {
    if (!splitterItemId) return
    setAssignees(splitterItemId, personIds)
    if (Object.keys(portionResult).length > 0) {
      setPortions(splitterItemId, portionResult)
    } else {
      clearPortions(splitterItemId)
    }
    setSplitterItemId(null)
  }

  function handleDone() {
    const isLastPerson = personIndex >= people.length - 1
    if (isLastPerson) {
      // Check for unassigned items
      if (unassignedItems.length > 0) {
        setShowUnassignedWarning(true)
        // Scroll to top so user can see the warning
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      // All assigned — proceed to tips
      navigate('/tips')
    } else {
      setStep('handoff')
    }
  }

  function handleHandoffConfirm() {
    setPersonIndex((prev) => prev + 1)
    setStep('who-are-you')
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (people.length < 2) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <p className="text-gray-500 text-base">Please add at least 2 people first.</p>
        <button
          onClick={() => navigate('/people')}
          aria-label="Go to people setup"
          className="mt-4 px-6 py-3 bg-gray-900 text-white rounded-xl text-sm font-medium min-h-[44px]"
        >
          Set up people
        </button>
      </div>
    )
  }

  if (!currentPerson) {
    return null
  }

  // ── Handoff screen ────────────────────────────────────────────────────────

  if (step === 'handoff' && nextPerson) {
    return <HandoffScreen nextPerson={nextPerson} onConfirm={handleHandoffConfirm} />
  }

  // ── "Who are you?" ────────────────────────────────────────────────────────

  if (step === 'who-are-you') {
    // Show people who haven't gone yet (from personIndex onwards)
    const remainingPeople = people.slice(personIndex)

    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* Progress */}
        <StepIndicator currentRoute="/assign" />

        {/* Header */}
        <div className="px-4 pt-2 pb-6">
          <p className="text-sm text-gray-500 mb-1">
            {personIndex === 0 ? 'First up' : 'Your turn'}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Who are you?</h1>
          <p className="mt-1 text-sm text-gray-500">Tap your name to start claiming your items.</p>
        </div>

        {/* Person buttons */}
        <div className="flex-1 px-4 flex flex-col gap-3 pb-8">
          {remainingPeople.map((person, idx) => (
            <button
              key={person.id}
              onClick={() => handleSelectPerson(personIndex + idx)}
              className="w-full py-5 px-6 rounded-2xl text-white text-xl font-bold tracking-tight active:scale-95 transition-transform shadow-sm"
              style={{ backgroundColor: person.color }}
              aria-label={`I am ${person.name}`}
            >
              {person.name}
            </button>
          ))}
        </div>

        {/* Progress indicator */}
        <div className="px-4 pb-8 flex justify-center gap-1.5">
          {people.map((_, idx) => (
            <div
              key={idx}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: idx === personIndex ? 24 : 8,
                backgroundColor:
                  idx < personIndex ? '#9CA3AF' : idx === personIndex ? '#111827' : '#E5E7EB',
              }}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>
    )
  }

  // ── Item claiming ─────────────────────────────────────────────────────────

  const splitterItem = splitterItemId ? lineItems.find((i) => i.id === splitterItemId) : null

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Progress */}
      <StepIndicator currentRoute="/assign" />

      {/* Header */}
      <div className="px-4 pt-2 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-1">
          <span
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: currentPerson.color }}
            aria-hidden="true"
          />
          <span className="text-sm text-gray-500">
            {personIndex + 1} of {people.length}
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          {currentPerson.name}'s items
        </h1>
        <p className="mt-0.5 text-sm text-gray-500">Tap to claim what you ordered.</p>
      </div>

      {/* Unassigned warning */}
      {showUnassignedWarning && unassignedItems.length > 0 && (
        <div
          role="alert"
          className="mx-4 mt-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200"
        >
          <p className="text-sm font-semibold text-amber-800">
            {unassignedItems.length} item{unassignedItems.length > 1 ? 's' : ''} still unassigned
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            Assign all items before continuing to tips.
          </p>
        </div>
      )}

      {/* Item list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1">
        {lineItems.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-12">No items on the bill.</p>
        )}
        {lineItems.map((item) => {
          const assignees = getAssignees(item)
          const isAssigned = (assignments[item.id] ?? []).includes(currentPerson.id)
          const isUnassigned = showUnassignedWarning && (assignments[item.id] ?? []).length === 0

          return (
            <AssignableItem
              key={item.id}
              item={item}
              assignees={assignees}
              currentPerson={currentPerson}
              isAssigned={isAssigned}
              isUnassigned={isUnassigned}
              onToggle={handleToggle}
              onShareClick={handleShareClick}
            />
          )
        })}
      </div>

      {/* Footer — I'm Done */}
      <div className="px-4 pb-8 pt-3 bg-white border-t border-gray-100">
        <button
          onClick={handleDone}
          className="w-full py-4 px-6 bg-gray-900 text-white text-base font-medium rounded-2xl active:scale-95 transition-transform"
          aria-label={
            personIndex >= people.length - 1
              ? 'Finish and calculate split'
              : "I'm done, pass phone to next person"
          }
        >
          {personIndex >= people.length - 1 ? 'Calculate Split →' : "I'm Done"}
        </button>
      </div>

      {/* Shared item bottom sheet */}
      {splitterItem && (
        <SharedItemSplitter
          item={splitterItem}
          people={people}
          currentAssignees={assignments[splitterItem.id] ?? []}
          currentPortions={portions[splitterItem.id] ?? {}}
          onConfirm={handleSplitterConfirm}
          onClose={() => setSplitterItemId(null)}
        />
      )}
    </div>
  )
}
