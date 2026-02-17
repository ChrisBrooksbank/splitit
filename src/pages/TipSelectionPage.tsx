import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePeopleStore } from '../store/peopleStore'
import { useBillStore } from '../store/billStore'
import { useAssignmentStore } from '../store/assignmentStore'
import { useTipStore } from '../store/tipStore'
import PersonTipCard from '../components/tip/PersonTipCard'
import StepIndicator from '../components/layout/StepIndicator'

/**
 * Calculate each person's pre-tip subtotal (items + proportional tax share).
 * All values in integer cents.
 */
function usePersonSubtotals() {
  const { people } = usePeopleStore()
  const { lineItems, taxAmount } = useBillStore()
  const { getPersonShare } = useAssignmentStore()

  return useMemo(() => {
    // Compute item subtotal per person
    const itemSubtotals: Record<string, number> = {}
    for (const person of people) {
      let subtotal = 0
      for (const item of lineItems) {
        const share = getPersonShare(item.id, person.id)
        if (share > 0) {
          subtotal += Math.round(item.price * item.quantity * share)
        }
      }
      itemSubtotals[person.id] = subtotal
    }

    // Total bill subtotal (sum of all item subtotals)
    const billSubtotal = Object.values(itemSubtotals).reduce((a, b) => a + b, 0)

    // Proportional tax share per person + pre-tip subtotal (items + tax)
    const preTipSubtotals: Record<string, number> = {}
    for (const person of people) {
      const personItemSubtotal = itemSubtotals[person.id] ?? 0
      const taxShare =
        billSubtotal > 0 ? Math.round((taxAmount * personItemSubtotal) / billSubtotal) : 0
      preTipSubtotals[person.id] = personItemSubtotal + taxShare
    }

    return preTipSubtotals
  }, [people, lineItems, taxAmount, getPersonShare])
}

export default function TipSelectionPage() {
  const navigate = useNavigate()
  const { people } = usePeopleStore()
  const {
    personTips,
    tipMode,
    initializeTips,
    setPersonTipPercentage,
    setPersonTipFixed,
    setTipMode,
    setAllPercentage,
  } = useTipStore()

  const preTipSubtotals = usePersonSubtotals()

  // Initialize tips for all people on mount
  useEffect(() => {
    if (people.length > 0) {
      initializeTips(people.map((p) => p.id))
    }
  }, [people, initializeTips])

  function handleCalculate() {
    navigate('/summary')
  }

  if (people.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <p className="text-gray-500 text-base">No people found. Please set up people first.</p>
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

  // "Everyone" mode: show a single tip selector that applies to all
  const firstPersonTip = people.length > 0 ? personTips[people[0].id] : null

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Progress */}
      <StepIndicator currentRoute="/tips" />

      {/* Header */}
      <div className="bg-white px-4 pt-2 pb-4 border-b border-gray-100">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Tip</h1>
        <p className="mt-0.5 text-sm text-gray-500">Each person picks their own tip.</p>

        {/* Mode toggle */}
        <div
          role="group"
          aria-label="Tip mode"
          className="mt-3 flex rounded-xl overflow-hidden border border-gray-200"
        >
          <button
            onClick={() => setTipMode('pass-around')}
            className={[
              'flex-1 py-2 text-sm font-medium transition-colors min-h-[44px]',
              tipMode === 'pass-around' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600',
            ].join(' ')}
            aria-pressed={tipMode === 'pass-around'}
            aria-label="Each person picks their own tip (pass around)"
          >
            Pass around
          </button>
          <button
            onClick={() => setTipMode('everyone')}
            className={[
              'flex-1 py-2 text-sm font-medium transition-colors min-h-[44px]',
              tipMode === 'everyone' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600',
            ].join(' ')}
            aria-pressed={tipMode === 'everyone'}
            aria-label="Set one tip percentage for everyone"
          >
            Set for everyone
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {tipMode === 'everyone' && firstPersonTip ? (
          /* One tip for all */
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Choose one tip % for everyone</p>
            <div className="flex gap-2">
              {[15, 18, 20, 25].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setAllPercentage(pct)}
                  className={[
                    'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                    firstPersonTip.mode === 'percentage' && firstPersonTip.percentage === pct
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 active:bg-gray-200',
                  ].join(' ')}
                  aria-label={`${pct}% for everyone`}
                  aria-pressed={
                    firstPersonTip.mode === 'percentage' && firstPersonTip.percentage === pct
                  }
                >
                  {pct}%
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-500 text-center">
              This tip % will be applied to each person's subtotal.
            </p>
          </div>
        ) : null}

        {/* Person cards */}
        {people.map((person) => {
          const tip = personTips[person.id]
          if (!tip) return null
          const subtotal = preTipSubtotals[person.id] ?? 0

          return (
            <PersonTipCard
              key={person.id}
              person={person}
              subtotalCents={subtotal}
              tip={tip}
              onSelectPercentage={(pct) => setPersonTipPercentage(person.id, pct)}
              onSelectFixed={(amount) => setPersonTipFixed(person.id, amount)}
            />
          )
        })}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-100 px-4 pb-8 pt-3">
        <button
          onClick={handleCalculate}
          className="w-full py-4 px-6 bg-gray-900 text-white text-base font-medium rounded-2xl active:scale-95 transition-transform"
          aria-label="Calculate final split and go to summary"
        >
          Calculate Final Split →
        </button>
      </div>
    </div>
  )
}
