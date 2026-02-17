import { formatCurrency } from '../../utils/formatCurrency'

interface BillSummaryCardProps {
  subtotalCents: number // sum of (price * qty) for all line items
  taxCents: number // integer cents
}

export default function BillSummaryCard({ subtotalCents, taxCents }: BillSummaryCardProps) {
  const grandTotal = subtotalCents + taxCents

  return (
    <div
      className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
      role="region"
      aria-label="Bill totals"
    >
      <div className="flex flex-col gap-1.5">
        {/* Subtotal row */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Subtotal</span>
          <span className="text-sm text-gray-900">{formatCurrency(subtotalCents)}</span>
        </div>

        {/* Tax row */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Tax</span>
          <span className="text-sm text-gray-900">{formatCurrency(taxCents)}</span>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100 my-0.5" aria-hidden="true" />

        {/* Grand total row */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">Total</span>
          <span className="text-sm font-semibold text-gray-900">{formatCurrency(grandTotal)}</span>
        </div>
      </div>
    </div>
  )
}
