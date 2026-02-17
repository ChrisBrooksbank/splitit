import { formatCurrency } from '../../utils/formatCurrency'

interface BillSummaryCardProps {
  subtotalCents: number // sum of (price * qty) for all line items
}

export default function BillSummaryCard({ subtotalCents }: BillSummaryCardProps) {
  return (
    <div
      className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 px-4 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_12px_rgba(0,0,0,0.3)]"
      role="region"
      aria-label="Bill totals"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Total</span>
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {formatCurrency(subtotalCents)}
        </span>
      </div>
    </div>
  )
}
