import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Receipt, FileEdit, ImageIcon } from 'lucide-react'
import { useHistoryStore } from '../store/historyStore'
import { useBillStore } from '../store/billStore'
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
  const { subtotal, tipAmount, tipPercentage, total } = personTotal
  const assignees = (itemId: string) => {
    const a = session.assignments.get(itemId)
    return a ?? []
  }
  const items = session.lineItems.filter((item) => assignees(item.id).includes(person.id))

  return (
    <div
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
      aria-label={`${person.name}'s summary`}
    >
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
      <div className="px-4 py-3 space-y-1.5">
        {items.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">No items</p>
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
                <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 mr-2 break-words">
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
// SessionDetailView — read-only summary of a past bill
// ---------------------------------------------------------------------------

interface SessionDetailProps {
  session: BillSession
  onBack: () => void
}

function SessionDetailView({ session, onBack }: SessionDetailProps) {
  const grandTotal = session.totals.reduce((sum, t) => sum + t.total, 0)
  const dateStr = new Date(session.date).toLocaleDateString('en-GB', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800 flex flex-col">
      <div className="bg-white dark:bg-gray-900 px-4 pt-12 pb-4 border-b border-gray-100 dark:border-gray-700">
        <button
          onClick={onBack}
          className="text-sm text-gray-600 dark:text-gray-300 mb-3 flex items-center gap-1 active:opacity-70 min-h-[44px] -ml-1 px-1"
          aria-label="Back to history"
        >
          <ArrowLeft size={14} className="inline -mt-0.5 mr-1" />
          Back
        </button>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
          {session.restaurantName ?? 'Bill Summary'}
        </h1>
        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">{dateStr}</p>

        {/* Receipt photos */}
        {session.photoDataUrls && session.photoDataUrls.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto py-1">
            {session.photoDataUrls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Receipt photo ${i + 1}`}
                className="w-16 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600 flex-shrink-0"
              />
            ))}
          </div>
        )}
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
          className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-4 py-4"
          aria-label="Grand total"
        >
          <div className="flex justify-between font-semibold text-gray-900 dark:text-gray-100 text-lg">
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
  const { setLineItems } = useBillStore()
  const [selectedSession, setSelectedSession] = useState<BillSession | null>(null)

  function handleResumeDraft(session: BillSession) {
    setLineItems(session.lineItems)
    sessionStorage.setItem('draftSessionId', session.id)
    navigate('/editor')
  }

  if (selectedSession) {
    return <SessionDetailView session={selectedSession} onBack={() => setSelectedSession(null)} />
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 px-4 pt-12 pb-4 border-b border-gray-100 dark:border-gray-700">
        <button
          onClick={() => navigate('/')}
          className="text-sm text-gray-600 dark:text-gray-300 mb-3 flex items-center gap-1 active:opacity-70 min-h-[44px] -ml-1 px-1"
          aria-label="Back to home"
        >
          <ArrowLeft size={14} className="inline -mt-0.5 mr-1" />
          Back
        </button>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
          History
        </h1>
        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">Your past bills</p>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Receipt size={32} className="text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-base">No bills yet.</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Your completed splits will appear here.
            </p>
          </div>
        ) : (
          <ul className="space-y-3" aria-label="Bill history">
            {sessions.map((session) => {
              const isDraft = session.status === 'draft'
              const grandTotal = isDraft
                ? session.lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
                : session.totals.reduce((sum, t) => sum + t.total, 0)
              const dateStr = new Date(session.date).toLocaleDateString('en-GB', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })

              return (
                <li key={session.id}>
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                    <button
                      onClick={() =>
                        isDraft ? handleResumeDraft(session) : setSelectedSession(session)
                      }
                      className="w-full px-4 py-4 text-left active:bg-gray-50 dark:active:bg-gray-800 transition-colors"
                      aria-label={
                        isDraft
                          ? `Resume draft bill from ${dateStr}`
                          : `View ${session.restaurantName ?? 'bill'} from ${dateStr}`
                      }
                    >
                      <div className="flex justify-between items-start">
                        {/* Receipt thumbnail */}
                        {session.photoDataUrls && session.photoDataUrls.length > 0 ? (
                          <img
                            src={session.photoDataUrls[0]}
                            alt="Receipt"
                            className="w-12 h-14 object-cover rounded-lg border border-gray-200 dark:border-gray-600 flex-shrink-0 mr-3"
                          />
                        ) : (
                          <div className="w-12 h-14 rounded-lg border border-gray-200 dark:border-gray-600 flex-shrink-0 mr-3 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                            <ImageIcon size={16} className="text-gray-300 dark:text-gray-600" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 break-words">
                              {session.restaurantName ?? 'Bill'}
                            </p>
                            {isDraft && (
                              <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                                Draft
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                            {dateStr}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                            {isDraft
                              ? `${session.lineItems.length} item${session.lineItems.length !== 1 ? 's' : ''}`
                              : `${session.people.length} ${session.people.length === 1 ? 'person' : 'people'}`}
                          </p>
                        </div>
                        <span className="font-bold text-gray-900 dark:text-gray-100 text-lg ml-4 tabular-nums flex-shrink-0">
                          {formatCurrency(grandTotal)}
                        </span>
                      </div>
                    </button>

                    {/* Action buttons */}
                    <div className="border-t border-gray-50 dark:border-gray-700 px-4 py-2 flex items-center gap-4">
                      {isDraft && (
                        <button
                          onClick={() => handleResumeDraft(session)}
                          className="text-sm text-indigo-500 active:text-indigo-700 transition-colors"
                          aria-label={`Resume draft bill from ${dateStr}`}
                        >
                          <FileEdit size={14} className="inline -mt-0.5 mr-1" />
                          Resume
                        </button>
                      )}
                      <button
                        onClick={() => deleteSession(session.id)}
                        className="text-sm text-red-400 active:text-red-600 transition-colors"
                        aria-label={`Delete bill from ${dateStr}`}
                      >
                        <Trash2 size={14} className="inline -mt-0.5 mr-1" />
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
