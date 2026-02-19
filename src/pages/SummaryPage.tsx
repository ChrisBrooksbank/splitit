import { useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { nanoid } from 'nanoid'
import { Copy, PlusCircle } from 'lucide-react'
import { usePeopleStore } from '../store/peopleStore'
import { useBillStore } from '../store/billStore'
import { useAssignmentStore } from '../store/assignmentStore'
import { useTipStore } from '../store/tipStore'
import { useHistoryStore } from '../store/historyStore'
import { calculateSplit } from '../services/calculator/splitCalculator'
import { formatCurrency } from '../utils/formatCurrency'
import { consumeReceiptPhotos } from '../utils/photoThumbnail'
import StepIndicator from '../components/layout/StepIndicator'
import type { Person, LineItem, PersonTotal } from '../types'

// ---------------------------------------------------------------------------
// PersonSummaryCard
// ---------------------------------------------------------------------------

interface PersonSummaryCardProps {
  person: Person
  personTotal: PersonTotal
  items: { item: LineItem; shareCount: number }[]
}

function PersonSummaryCard({ person, personTotal, items }: PersonSummaryCardProps) {
  const { subtotal, tipAmount, tipPercentage, total } = personTotal

  return (
    <div
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
      aria-label={`${person.name}'s summary`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-50 dark:border-gray-700">
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: person.color }}
          aria-hidden="true"
        />
        <span className="font-semibold text-gray-900 dark:text-gray-100 text-base">
          {person.name}
        </span>
        <span className="ml-auto font-bold text-gray-900 dark:text-gray-100 text-lg">
          {formatCurrency(total)}
        </span>
      </div>

      {/* Item lines */}
      <div className="px-4 py-3 space-y-1.5">
        {items.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">No items</p>
        ) : (
          items.map(({ item, shareCount }) => {
            const itemTotal = Math.round((item.price * item.quantity) / shareCount)
            const label =
              item.quantity > 1 || shareCount > 1
                ? `${item.name}${item.quantity > 1 ? ` ×${item.quantity}` : ''}${shareCount > 1 ? ` (÷${shareCount})` : ''}`
                : item.name
            return (
              <div key={item.id} className="flex justify-between items-baseline">
                <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 mr-2 truncate">
                  {label}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300 tabular-nums flex-shrink-0">
                  {formatCurrency(itemTotal)}
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* Subtotals */}
      <div className="px-4 pb-4 pt-1 border-t border-gray-50 dark:border-gray-700 space-y-1">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
          <span>Tip ({tipPercentage}%)</span>
          <span className="tabular-nums">{formatCurrency(tipAmount)}</span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Copy summary text builder
// ---------------------------------------------------------------------------

function buildCopyText(
  people: Person[],
  personTotals: PersonTotal[],
  itemsByPerson: Map<string, { item: LineItem; shareCount: number }[]>,
  grandTotal: number,
  restaurantName?: string
): string {
  const dateStr = new Date().toLocaleDateString('en-GB', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const lines: string[] = ['SplitIt Summary']
  lines.push(`${restaurantName ? `${restaurantName} - ` : ''}${dateStr}`)
  lines.push('')

  for (const person of people) {
    const pt = personTotals.find((t) => t.personId === person.id)
    if (!pt) continue
    lines.push(`${person.name}: ${formatCurrency(pt.total)}`)
    const items = itemsByPerson.get(person.id) ?? []
    for (const { item, shareCount } of items) {
      const itemTotal = Math.round((item.price * item.quantity) / shareCount)
      const suffix = shareCount > 1 ? ` (÷${shareCount})` : ''
      lines.push(`  - ${item.name}${suffix} (${formatCurrency(itemTotal)})`)
    }
    lines.push(`  - Tip (${pt.tipPercentage}%): ${formatCurrency(pt.tipAmount)}`)
    lines.push('')
  }

  lines.push(`Total: ${formatCurrency(grandTotal)}`)
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// SummaryPage
// ---------------------------------------------------------------------------

export default function SummaryPage() {
  const navigate = useNavigate()
  const { people } = usePeopleStore()
  const { lineItems } = useBillStore()
  const { assignments, portions } = useAssignmentStore()
  const { personTips } = useTipStore()
  const { saveSession } = useHistoryStore()

  const savedRef = useRef(false)

  // Calculate split
  const splitResult = useMemo(
    () =>
      calculateSplit({
        people,
        lineItems,
        assignments,
        portions,
        personTips,
      }),
    [people, lineItems, assignments, portions, personTips]
  )

  // Build per-person item lists
  const itemsByPerson = useMemo(() => {
    const map = new Map<string, { item: LineItem; shareCount: number }[]>()
    for (const person of people) {
      const personItems: { item: LineItem; shareCount: number }[] = []
      for (const item of lineItems) {
        const assignees = assignments[item.id] ?? []
        if (assignees.includes(person.id)) {
          personItems.push({ item, shareCount: assignees.length })
        }
      }
      map.set(person.id, personItems)
    }
    return map
  }, [people, lineItems, assignments])

  // Auto-save to history on mount (once)
  useEffect(() => {
    if (savedRef.current) return
    if (people.length === 0) return
    savedRef.current = true

    const draftId = sessionStorage.getItem('draftSessionId')
    const sessionId = draftId ?? nanoid()
    sessionStorage.removeItem('draftSessionId')

    const photos = consumeReceiptPhotos()
    const session = {
      id: sessionId,
      date: new Date().toISOString(),
      status: 'complete' as const,
      people,
      lineItems,
      assignments: new Map(Object.entries(assignments)),
      tipConfig: {
        mode: 'per-person' as const,
        percentage: 12.5,
        fixedAmount: 0,
      },
      totals: splitResult.personTotals,
      ...(photos ? { photoDataUrls: photos } : {}),
    }
    saveSession(session)
  }, [people, lineItems, assignments, splitResult.personTotals, saveSession])

  function handleCopySummary() {
    const text = buildCopyText(
      people,
      splitResult.personTotals,
      itemsByPerson,
      splitResult.grandTotal
    )
    navigator.clipboard.writeText(text).catch(() => {
      // Clipboard write failed silently — no destructive fallback
    })
  }

  function handleStartNewBill() {
    // Reset all stores
    useBillStore.getState().reset()
    usePeopleStore.getState().reset()
    useAssignmentStore.getState().reset()
    useTipStore.getState().reset()
    navigate('/')
  }

  if (people.length === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-gray-500 dark:text-gray-400 text-base">No bill data found.</p>
        <button
          onClick={() => navigate('/')}
          aria-label="Start a new bill"
          className="mt-4 px-6 py-3 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-xl text-sm font-medium min-h-[44px]"
        >
          Start a new bill
        </button>
      </div>
    )
  }

  const { personTotals, billSubtotal, grandTotal, totalTip } = splitResult

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800 flex flex-col">
      {/* Progress */}
      <StepIndicator currentRoute="/summary" />

      {/* Header */}
      <div className="bg-white dark:bg-gray-900 px-4 pt-2 pb-4 border-b border-gray-100 dark:border-gray-700">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
          Summary
        </h1>
        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">
          Here's what everyone owes.
        </p>
      </div>

      {/* Person cards */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {people.map((person) => {
          const pt = personTotals.find((t) => t.personId === person.id)
          if (!pt) return null
          return (
            <PersonSummaryCard
              key={person.id}
              person={person}
              personTotal={pt}
              items={itemsByPerson.get(person.id) ?? []}
            />
          )
        })}

        {/* Grand total verification row */}
        <div
          className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-4 py-4"
          aria-label="Grand total"
        >
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
            <span>Bill subtotal</span>
            <span className="tabular-nums">{formatCurrency(billSubtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-3">
            <span>Total tips</span>
            <span className="tabular-nums">{formatCurrency(totalTip)}</span>
          </div>
          <div className="flex justify-between font-semibold text-gray-900 dark:text-gray-100 text-lg border-t border-gray-100 dark:border-gray-700 pt-3">
            <span>Grand Total</span>
            <span className="tabular-nums">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 px-4 pb-8 pt-3 space-y-2">
        <button
          onClick={handleCopySummary}
          className="w-full py-4 px-6 bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-base font-medium rounded-2xl active:scale-95 transition-transform"
          aria-label="Copy summary to clipboard"
        >
          <Copy size={18} className="inline -mt-0.5 mr-1.5" />
          Copy Summary
        </button>
        <button
          onClick={handleStartNewBill}
          className="w-full py-3 px-6 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-base font-medium rounded-2xl active:scale-95 transition-transform"
          aria-label="Clear session and start a new bill"
        >
          <PlusCircle size={18} className="inline -mt-0.5 mr-1.5" />
          Start New Bill
        </button>
      </div>
    </div>
  )
}
