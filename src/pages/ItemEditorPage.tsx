import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBillStore } from '../store/billStore'
import { parseReceipt } from '../services/ocr/receiptParser'
import LineItemList from '../components/bill/LineItemList'
import BillSummaryCard from '../components/bill/BillSummaryCard'
import StepIndicator from '../components/layout/StepIndicator'

export default function ItemEditorPage() {
  const navigate = useNavigate()
  const { lineItems, setLineItems, addLineItem, updateLineItem, deleteLineItem } = useBillStore()
  const didInit = useRef(false)

  // Populate from OCR results once, only if the store is currently empty
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true

    const ocrText = sessionStorage.getItem('ocrResult')
    if (!ocrText) return

    // Only auto-populate if the store has no items yet (don't overwrite a persisted session)
    if (lineItems.length > 0) return

    const { lineItems: parsed } = parseReceipt(ocrText)
    if (parsed.length > 0) {
      setLineItems(parsed)
    }

    // Consume the OCR result so refreshing the editor doesn't re-parse
    sessionStorage.removeItem('ocrResult')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const subtotal = lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  function handleAdd(name: string, priceCents: number, quantity: number) {
    addLineItem({ name, price: priceCents, quantity, confidence: 1.0, manuallyEdited: true })
  }

  function handleContinue() {
    navigate('/people')
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
      {/* Progress */}
      <StepIndicator currentRoute="/editor" />

      {/* Header */}
      <div className="px-4 pt-2 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
          Review Items
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Tap any item to edit. Add or remove items as needed.
        </p>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-4">
        {/* Line item list */}
        <LineItemList
          items={lineItems}
          onUpdate={updateLineItem}
          onDelete={deleteLineItem}
          onAdd={handleAdd}
        />
      </div>

      {/* Sticky footer: totals + continue */}
      <div>
        <BillSummaryCard subtotalCents={subtotal} />
        <div className="px-4 pb-8 pt-3 bg-white dark:bg-gray-900">
          <button
            onClick={handleContinue}
            disabled={lineItems.length === 0}
            aria-label="Continue to people setup"
            className="w-full py-4 px-6 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-base font-medium rounded-2xl active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
