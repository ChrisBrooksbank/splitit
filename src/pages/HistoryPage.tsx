import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHistoryStore } from '../store/historyStore'
import { formatCurrency } from '../utils/formatCurrency'
import type { BillSession, Person, LineItem, PersonTotal } from '../types'

// ---------------------------------------------------------------------------
// Read-only PersonSummaryCard (reused from SummaryPage pattern)
// ---------------------------------------------------------------------------

interface ReadOnlyPersonCardProps {
  person: Person
  personTotal: PersonTotal
  session: BillSession
}

function ReadOnlyPersonCard({ person, personTotal, session }: ReadOnlyPersonCardProps) {
  const { subtotal, taxShare, tipAmount, tipPercentage, total } = personTotal
  const assignees = (itemId: string) => {
    const a = session.assignments.get(itemId)
    return a ?? []
  }
  const items = session.lineItems.filter((item) => assignees(item.id).includes(person.id))

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
      aria-label={`${person.name}'s summary`}
    >
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-50">
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: person.color }}
          aria-hidden="true"
        />
        <span className="font-semibold text-gray-900 text-base">{person.name}</span>
        <span className="ml-auto font-bold text-gray-900 text-lg">{formatCurrency(total)}</span>
      </div>
      <div className="px-4 py-3 space-y-1.5">
        {items.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No items</p>
        ) : (
          items.map((item: LineItem) => {
            const shareCount = assignees(item.id).length
            const itemTotal = Math.round((item.price * item.quantity) / shareCount)
            const label =
              item.quantity > 1 || shareCount > 1
                ? `${item.name}${item.quantity > 1 ? ` ×${item.quantity}` : ''}${shareCount > 1 ? ` (÷${shareCount})` : ''}`
                : item.name
            return (
              <div key={item.id} className="flex justify-between items-baseline">
                <span className="text-sm text-gray-700 flex-1 mr-2 truncate">{label}</span>
                <span className="text-sm text-gray-700 tabular-nums flex-shrink-0">
                  {formatCurrency(itemTotal)}
                </span>
              </div>
            )
          })
        )}
      </div>
      <div className="px-4 pb-4 pt-1 border-t border-gray-50 space-y-1">
        <div className="flex justify-between text-sm text-gray-500">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-500">
          <span>Tax</span>
          <span className="tabular-nums">{formatCurrency(taxShare)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-500">
          <span>Tip ({tipPercentage}%)</span>
          <span className="tabular-nums">{formatCurrency(tipAmount)}</span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SessionDetailView — read-only summary of a past bill
// ---------------------------------------------------------------------------

interface SessionDetailProps {
  session: BillSession
  onBack: () => void
}

function SessionDetailView({ session, onBack }: SessionDetailProps) {
  const grandTotal = session.totals.reduce((sum, t) => sum + t.total, 0)
  const dateStr = new Date(session.date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <button
          onClick={onBack}
          className="text-sm text-gray-500 mb-3 flex items-center gap-1 active:opacity-70 min-h-[44px] -ml-1 px-1"
          aria-label="Back to history"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          {session.restaurantName ?? 'Bill Summary'}
        </h1>
        <p className="mt-0.5 text-sm text-gray-500">{dateStr}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {session.people.map((person) => {
          const pt = session.totals.find((t) => t.personId === person.id)
          if (!pt) return null
          return (
            <ReadOnlyPersonCard
              key={person.id}
              person={person}
              personTotal={pt}
              session={session}
            />
          )
        })}

        {/* Grand total */}
        <div
          className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4"
          aria-label="Grand total"
        >
          <div className="flex justify-between font-semibold text-gray-900 text-lg">
            <span>Grand Total</span>
            <span className="tabular-nums">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// HistoryPage
// ---------------------------------------------------------------------------

export default function HistoryPage() {
  const navigate = useNavigate()
  const { sessions, deleteSession } = useHistoryStore()
  const [selectedSession, setSelectedSession] = useState<BillSession | null>(null)

  if (selectedSession) {
    return <SessionDetailView session={selectedSession} onBack={() => setSelectedSession(null)} />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <button
          onClick={() => navigate('/')}
          className="text-sm text-gray-500 mb-3 flex items-center gap-1 active:opacity-70 min-h-[44px] -ml-1 px-1"
          aria-label="Back to home"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">History</h1>
        <p className="mt-0.5 text-sm text-gray-500">Your past bills</p>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="text-gray-400 text-base">No bills yet.</p>
            <p className="text-gray-400 text-sm mt-1">Your completed splits will appear here.</p>
          </div>
        ) : (
          <ul className="space-y-3" aria-label="Bill history">
            {sessions.map((session) => {
              const grandTotal = session.totals.reduce((sum, t) => sum + t.total, 0)
              const dateStr = new Date(session.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })

              return (
                <li key={session.id}>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <button
                      onClick={() => setSelectedSession(session)}
                      className="w-full px-4 py-4 text-left active:bg-gray-50 transition-colors"
                      aria-label={`View ${session.restaurantName ?? 'bill'} from ${dateStr}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {session.restaurantName ?? 'Bill'}
                          </p>
                          <p className="text-sm text-gray-500 mt-0.5">{dateStr}</p>
                          <p className="text-sm text-gray-400 mt-0.5">
                            {session.people.length}{' '}
                            {session.people.length === 1 ? 'person' : 'people'}
                          </p>
                        </div>
                        <span className="font-bold text-gray-900 text-lg ml-4 tabular-nums flex-shrink-0">
                          {formatCurrency(grandTotal)}
                        </span>
                      </div>
                    </button>

                    {/* Delete button */}
                    <div className="border-t border-gray-50 px-4 py-2">
                      <button
                        onClick={() => deleteSession(session.id)}
                        className="text-sm text-red-400 active:text-red-600 transition-colors"
                        aria-label={`Delete bill from ${dateStr}`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
