import { formatCurrency } from '../../utils/formatCurrency'

const STANDARD_TIP_PERCENTAGE = 12.5

interface RunningTotalProps {
  /** Person's item subtotal in cents */
  subtotalCents: number
}

export default function RunningTotal({ subtotalCents }: RunningTotalProps) {
  if (subtotalCents === 0) return null

  const tipAmount = Math.round((subtotalCents * STANDARD_TIP_PERCENTAGE) / 100)
  const grossTotal = subtotalCents + tipAmount

  return (
    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">Your items</span>
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {formatCurrency(subtotalCents)}
        </span>
      </div>
      <div className="flex items-baseline justify-between mt-0.5">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          With {STANDARD_TIP_PERCENTAGE}% tip
        </span>
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {formatCurrency(grossTotal)}
        </span>
      </div>
    </div>
  )
}
