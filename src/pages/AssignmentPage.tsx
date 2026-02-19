import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Users } from 'lucide-react'
import { usePeopleStore } from '../store/peopleStore'
import { useBillStore } from '../store/billStore'
import { useAssignmentStore } from '../store/assignmentStore'
import { useLiveSessionStore } from '../store/liveSessionStore'
import AssignableItem from '../components/assignment/AssignableItem'
import HandoffScreen from '../components/assignment/HandoffScreen'
import SharedItemSplitter from '../components/assignment/SharedItemSplitter'
import HostLiveAssignmentView from '../components/liveSession/HostLiveAssignmentView'
import StepIndicator from '../components/layout/StepIndicator'
import type { LineItem, Person } from '../types'

type Step = 'who-are-you' | 'claiming' | 'handoff'

export default function AssignmentPage() {
  const navigate = useNavigate()
  const { people } = usePeopleStore()
  const { lineItems } = useBillStore()
  const { assignments, portions, toggleAssignment, setAssignees, setPortions, clearPortions } =
    useAssignmentStore()
  const { isLive, role, advancePhaseFn } = useLiveSessionStore()

  // Flexible order: track who has finished their turn, and who is currently claiming
  const [claimedPersonIds, setClaimedPersonIds] = useState<string[]>([])
  const [currentPersonId, setCurrentPersonId] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('who-are-you')
  const [splitterItemId, setSplitterItemId] = useState<string | null>(null)
  const [showUnassignedWarning, setShowUnassignedWarning] = useState(false)

  const currentPerson: Person | undefined = people.find((p) => p.id === currentPersonId)

  // People who haven't finished their turn yet, in original array order
  const remainingPeople = useMemo(
    () => people.filter((p) => !claimedPersonIds.includes(p.id)),
    [people, claimedPersonIds]
  )

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

  function handleSelectPerson(personId: string) {
    setCurrentPersonId(personId)
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
    if (!currentPersonId) return
    const newClaimed = [...claimedPersonIds, currentPersonId]
    setClaimedPersonIds(newClaimed)

    // Check if everyone has gone
    const newRemaining = people.filter((p) => !newClaimed.includes(p.id))
    if (newRemaining.length === 0) {
      // Last person — check unassigned
      if (unassignedItems.length > 0) {
        setShowUnassignedWarning(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        // Undo the claim so they stay on the claiming screen
        setClaimedPersonIds(claimedPersonIds)
        return
      }
      navigate('/tips')
    } else {
      setStep('handoff')
    }
  }

  function handleHandoffConfirm() {
    setCurrentPersonId(null)
    setStep('who-are-you')
  }

  function handleFinish() {
    if (unassignedItems.length > 0) {
      // Shouldn't happen — button is hidden when items are unassigned
      return
    }
    navigate('/tips')
  }

  // ── Render ────────────────────────────────────────────────────────────────

  // Live session host view
  if (isLive && role === 'host') {
    return (
      <HostLiveAssignmentView
        onAdvanceToTips={() => {
          advancePhaseFn?.('tips')
          navigate('/tips')
        }}
      />
    )
  }

  if (people.length < 2) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-gray-500 dark:text-gray-400 text-base">
          Please add at least 2 people first.
        </p>
        <button
          onClick={() => navigate('/people')}
          aria-label="Go to people setup"
          className="mt-4 px-6 py-3 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-xl text-sm font-medium min-h-[44px]"
        >
          <Users size={16} className="inline -mt-0.5 mr-1" />
          Set up people
        </button>
      </div>
    )
  }

  // ── Handoff screen ────────────────────────────────────────────────────────

  if (step === 'handoff') {
    return <HandoffScreen onConfirm={handleHandoffConfirm} />
  }

  // ── "Who are you?" ────────────────────────────────────────────────────────

  if (step === 'who-are-you') {
    const allItemsAssigned = unassignedItems.length === 0

    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
        {/* Progress */}
        <StepIndicator currentRoute="/assign" />

        {/* Header */}
        <div className="px-4 pt-2 pb-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {claimedPersonIds.length === 0 ? 'First up' : 'Next up'}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            Who are you?
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Tap your name to start claiming your items.
          </p>
        </div>

        {/* Person buttons */}
        <div className="flex-1 px-4 flex flex-col gap-3 pb-4">
          {remainingPeople.map((person) => (
            <button
              key={person.id}
              onClick={() => handleSelectPerson(person.id)}
              className="w-full py-5 px-6 rounded-2xl text-white text-xl font-bold tracking-tight active:scale-95 transition-transform shadow-sm"
              style={{ backgroundColor: person.color }}
              aria-label={`I am ${person.name}`}
            >
              {person.name}
            </button>
          ))}
        </div>

        {/* "Everyone's done" button — only when all items assigned */}
        {allItemsAssigned && (
          <div className="px-4 pb-4">
            <button
              onClick={handleFinish}
              className="w-full py-4 px-6 bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-base font-medium rounded-2xl active:scale-95 transition-transform"
              aria-label="Everyone's done, continue to tips"
            >
              <CheckCircle2 size={18} className="inline -mt-0.5 mr-1.5" />
              Everyone's Done
            </button>
          </div>
        )}

        {/* Progress dots */}
        <div className="px-4 pb-8 flex justify-center gap-1.5">
          {people.map((p) => {
            const isClaimed = claimedPersonIds.includes(p.id)
            return (
              <div
                key={p.id}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: 8,
                  backgroundColor: isClaimed ? '#9CA3AF' : '#E5E7EB',
                }}
                aria-hidden="true"
              />
            )
          })}
        </div>
      </div>
    )
  }

  // ── Item claiming ─────────────────────────────────────────────────────────

  if (!currentPerson) {
    return null
  }

  const splitterItem = splitterItemId ? lineItems.find((i) => i.id === splitterItemId) : null

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
      {/* Progress */}
      <StepIndicator currentRoute="/assign" />

      {/* Header */}
      <div className="px-4 pt-2 pb-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-1">
          <span
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: currentPerson.color }}
            aria-hidden="true"
          />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {claimedPersonIds.length + 1} of {people.length}
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
          {currentPerson.name}'s items
        </h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Tap to claim what you ordered.
        </p>
      </div>

      {/* Unassigned warning */}
      {showUnassignedWarning && unassignedItems.length > 0 && (
        <div
          role="alert"
          className="mx-4 mt-4 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-700"
        >
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            {unassignedItems.length} item{unassignedItems.length > 1 ? 's' : ''} still unassigned
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
            Assign all items before continuing to tips.
          </p>
        </div>
      )}

      {/* Item list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1">
        {lineItems.length === 0 && (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-12">
            No items on the bill.
          </p>
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

      {/* Footer — always "I'm Done" */}
      <div className="px-4 pb-8 pt-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={handleDone}
          className="w-full py-4 px-6 bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-base font-medium rounded-2xl active:scale-95 transition-transform"
          aria-label="I'm done, pass phone to next person"
        >
          <CheckCircle2 size={18} className="inline -mt-0.5 mr-1.5" />
          I'm Done
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
