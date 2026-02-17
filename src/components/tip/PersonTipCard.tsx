import { formatCurrency } from '../../utils/formatCurrency'
import TipSelector from './TipSelector'
import type { Person } from '../../types'
import type { PersonTip } from '../../store/tipStore'

interface PersonTipCardProps {
  person: Person
  // Pre-tip subtotal: items assigned + proportional tax share (integer cents)
  subtotalCents: number
  tip: PersonTip
  onSelectPercentage: (percentage: number) => void
  onSelectFixed: (fixedAmount: number) => void
}

export default function PersonTipCard({
  person,
  subtotalCents,
  tip,
  onSelectPercentage,
  onSelectFixed,
}: PersonTipCardProps) {
  const tipAmountCents =
    tip.mode === 'percentage' ? Math.round((subtotalCents * tip.percentage) / 100) : tip.fixedAmount

  const totalCents = subtotalCents + tipAmountCents

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Person header */}
      <div
        className="px-4 py-3 flex items-center gap-3"
        style={{ borderLeftWidth: 4, borderLeftColor: person.color }}
      >
        <span
          className="w-8 h-8 rounded-full flex-shrink-0"
          style={{ backgroundColor: person.color }}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-gray-900 truncate">{person.name}</p>
          <p className="text-xs text-gray-500">
            Subtotal:{' '}
            <span className="font-medium text-gray-700">{formatCurrency(subtotalCents)}</span>
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-base font-bold text-gray-900">{formatCurrency(totalCents)}</p>
        </div>
      </div>

      {/* Tip selector */}
      <div className="px-4 pb-4 pt-2">
        <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Choose tip</p>
        <TipSelector
          tip={tip}
          subtotalCents={subtotalCents}
          onSelectPercentage={onSelectPercentage}
          onSelectFixed={onSelectFixed}
        />
      </div>
    </div>
  )
}
