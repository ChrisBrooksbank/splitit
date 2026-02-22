import { useState } from 'react'
import { formatCurrency } from '../../utils/formatCurrency'
import type { PersonTip } from '../../store/tipStore'

const PRESET_PERCENTAGES = [0, 10, 12.5, 15]

interface TipSelectorProps {
  tip: PersonTip
  subtotalCents: number // the base amount to calculate tip on
  onSelectPercentage: (percentage: number) => void
  onSelectFixed: (fixedAmount: number) => void
}

export default function TipSelector({
  tip,
  subtotalCents,
  onSelectPercentage,
  onSelectFixed,
}: TipSelectorProps) {
  const [showCustom, setShowCustom] = useState(false)
  const [customMode, setCustomMode] = useState<'percent' | 'amount'>('percent')
  const [customInput, setCustomInput] = useState('')

  // Compute current tip amount in cents for display
  const tipAmountCents =
    tip.mode === 'percentage' ? Math.round((subtotalCents * tip.percentage) / 100) : tip.fixedAmount

  function handlePresetClick(pct: number) {
    setShowCustom(false)
    setCustomInput('')
    onSelectPercentage(pct)
  }

  function handleCustomConfirm() {
    const value = parseFloat(customInput)
    if (isNaN(value) || value < 0) return

    if (customMode === 'percent') {
      onSelectPercentage(Math.round(value))
    } else {
      // Fixed amount → convert to cents
      onSelectFixed(Math.round(value * 100))
    }
    setShowCustom(false)
    setCustomInput('')
  }

  const isPresetActive = (pct: number) => tip.mode === 'percentage' && tip.percentage === pct

  return (
    <div className="space-y-3">
      {/* Preset buttons */}
      <div className="flex gap-2">
        {PRESET_PERCENTAGES.map((pct) => (
          <button
            key={pct}
            onClick={() => handlePresetClick(pct)}
            className={[
              'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors',
              isPresetActive(pct)
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 active:bg-gray-200 dark:active:bg-gray-600',
            ].join(' ')}
            aria-label={`${pct}% tip`}
            aria-pressed={isPresetActive(pct)}
          >
            {pct}%
          </button>
        ))}
        <button
          onClick={() => setShowCustom((v) => !v)}
          className={[
            'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors',
            showCustom ||
            (!PRESET_PERCENTAGES.includes(tip.percentage) && tip.mode === 'percentage') ||
            tip.mode === 'fixed'
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 active:bg-gray-200 dark:active:bg-gray-600',
          ].join(' ')}
          aria-label="Custom tip"
          aria-expanded={showCustom}
        >
          Custom
        </button>
      </div>

      {/* Real-time tip amount */}
      <p className="text-center text-sm text-gray-500 dark:text-gray-400" aria-live="polite">
        Tip:{' '}
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {formatCurrency(tipAmountCents)}
        </span>
      </p>

      {/* Custom input */}
      {showCustom && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3">
          {/* Mode toggle */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
            <button
              onClick={() => setCustomMode('percent')}
              className={[
                'flex-1 py-2 text-sm font-medium transition-colors',
                customMode === 'percent'
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400',
              ].join(' ')}
              aria-pressed={customMode === 'percent'}
            >
              Percentage
            </button>
            <button
              onClick={() => setCustomMode('amount')}
              className={[
                'flex-1 py-2 text-sm font-medium transition-colors',
                customMode === 'amount'
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400',
              ].join(' ')}
              aria-pressed={customMode === 'amount'}
            >
              Fixed amount
            </button>
          </div>

          {/* Input */}
          <div className="flex gap-2 items-center">
            <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">
              {customMode === 'percent' ? '%' : '£'}
            </span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step={customMode === 'percent' ? '1' : '0.01'}
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder={customMode === 'percent' ? 'e.g. 22' : 'e.g. 5.00'}
              className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
              aria-label={customMode === 'percent' ? 'Custom tip percentage' : 'Custom tip amount'}
            />
            <button
              onClick={handleCustomConfirm}
              disabled={!customInput || isNaN(parseFloat(customInput))}
              className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg disabled:opacity-40"
              aria-label="Apply custom tip"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
