import { formatCurrency } from '../../utils/formatCurrency'

interface BillSummaryCardProps {
  subtotalCents: number // sum of (price * qty) for all line items
  detectedTotalCents?: number | null
}

export default function BillSummaryCard({
  subtotalCents,
  detectedTotalCents,
}: BillSummaryCardProps) {
  const hasDifference =
    detectedTotalCents != null && detectedTotalCents !== subtotalCents && subtotalCents > 0
  const diff = hasDifference ? Math.abs(detectedTotalCents - subtotalCents) : 0

  return (
    <div
      className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 px-4 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_12px_rgba(0,0,0,0.3)]"
      role="region"
      aria-label="Bill totals"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {detectedTotalCents != null ? 'Items' : 'Total'}
        </span>
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {formatCurrency(subtotalCents)}
        </span>
      </div>

      {detectedTotalCents != null && (
        <div className="flex items-center justify-between mt-1">
          <span className="text-sm text-gray-500 dark:text-gray-400">Bill total</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {formatCurrency(detectedTotalCents)}
          </span>
        </div>
      )}

      {hasDifference && (
        <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
          Difference: {formatCurrency(diff)} — you may have missing or duplicate items
        </p>
      )}
    </div>
  )
}
