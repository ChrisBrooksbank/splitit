import { useState, useEffect } from 'react'
import { formatCurrency } from '../../utils/formatCurrency'

interface TaxConfigProps {
  taxAmount: number // integer cents
  onTaxChange: (cents: number) => void
}

export default function TaxConfig({ taxAmount, onTaxChange }: TaxConfigProps) {
  const [draft, setDraft] = useState((taxAmount / 100).toFixed(2))

  // Sync draft when taxAmount changes externally (e.g. pre-filled from OCR)
  useEffect(() => {
    setDraft((taxAmount / 100).toFixed(2))
  }, [taxAmount])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDraft(e.target.value)
    const parsed = Math.round(parseFloat(e.target.value) * 100)
    if (!isNaN(parsed) && parsed >= 0) {
      onTaxChange(parsed)
    }
  }

  function handleBlur() {
    // Normalize display on blur
    const parsed = Math.round(parseFloat(draft) * 100)
    if (!isNaN(parsed) && parsed >= 0) {
      setDraft((parsed / 100).toFixed(2))
      onTaxChange(parsed)
    } else {
      setDraft((taxAmount / 100).toFixed(2))
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50">
      <label htmlFor="tax-input" className="text-sm font-medium text-gray-700">
        Tax
      </label>
      <div className="flex items-center gap-1">
        <span className="text-sm text-gray-500" aria-hidden="true">
          $
        </span>
        <input
          id="tax-input"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={draft}
          onChange={handleChange}
          onBlur={handleBlur}
          aria-label={`Tax amount, currently ${formatCurrency(taxAmount)}`}
          className="w-20 text-sm text-right text-gray-900 bg-transparent border-b border-gray-400 focus:border-gray-900 outline-none py-0.5"
        />
      </div>
    </div>
  )
}
