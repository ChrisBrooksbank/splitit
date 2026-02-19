import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { nanoid } from 'nanoid'
import { ArrowRight } from 'lucide-react'
import { useBillStore } from '../store/billStore'
import { useHistoryStore } from '../store/historyStore'
import { parseReceipt, mergeReceipts, type ParsedReceipt } from '../services/ocr/receiptParser'
import { peekReceiptPhotos } from '../utils/photoThumbnail'
import LineItemList from '../components/bill/LineItemList'
import BillSummaryCard from '../components/bill/BillSummaryCard'
import StepIndicator from '../components/layout/StepIndicator'

/** Read and consume OCR data from sessionStorage (called once). */
function consumeOcrData(): ParsedReceipt | null {
  const ocrTexts = sessionStorage.getItem('ocrResults')
  const ocrText = sessionStorage.getItem('ocrResult')

  sessionStorage.removeItem('ocrResult')
  sessionStorage.removeItem('ocrResults')

  if (ocrTexts) {
    const texts: string[] = JSON.parse(ocrTexts)
    const receipts = texts.filter((t) => t.trim().length > 0).map((t) => parseReceipt(t))
    return receipts.length > 0 ? mergeReceipts(receipts) : null
  }
  if (ocrText) {
    return parseReceipt(ocrText)
  }
  return null
}

export default function ItemEditorPage() {
  const navigate = useNavigate()
  const { lineItems, setLineItems, addLineItem, updateLineItem, deleteLineItem } = useBillStore()
  const { saveSession } = useHistoryStore()
  const didInit = useRef(false)
  const sessionIdRef = useRef(sessionStorage.getItem('draftSessionId') ?? nanoid())

  // Lazy-initialize OCR-derived state (runs once, during first render)
  const [ocrInit] = useState(() => {
    const parsed = consumeOcrData()
    return {
      detectedTotal: parsed?.detectedTotal ?? null,
      hadOcrInput: parsed !== null,
      parsedItems: parsed?.lineItems ?? [],
    }
  })

  // Populate store from OCR results once, only if the store is currently empty
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true

    if (lineItems.length > 0) return
    if (ocrInit.parsedItems.length > 0) {
      setLineItems(ocrInit.parsedItems)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Save draft to history whenever items change
  useEffect(() => {
    if (lineItems.length === 0) return
    sessionStorage.setItem('draftSessionId', sessionIdRef.current)
    const photos = peekReceiptPhotos()
    saveSession({
      id: sessionIdRef.current,
      date: new Date().toISOString(),
      status: 'draft',
      people: [],
      lineItems,
      assignments: new Map(),
      tipConfig: { mode: 'percentage', percentage: 12.5, fixedAmount: 0 },
      totals: [],
      ...(photos ? { photoDataUrls: photos } : {}),
    })
  }, [lineItems, saveSession])

  const ocrEmpty = ocrInit.hadOcrInput && lineItems.length === 0
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
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Tap any item to edit. Add or remove items as needed.
        </p>
      </div>

      {/* OCR-empty feedback banner */}
      {ocrEmpty && (
        <div className="mx-4 mb-4 rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 p-3">
          <p className="text-sm text-amber-900 dark:text-amber-100">
            No items could be extracted from the scan. Try closer photos or add items manually.
          </p>
        </div>
      )}

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
        <BillSummaryCard subtotalCents={subtotal} detectedTotalCents={ocrInit.detectedTotal} />
        <div className="px-4 pb-8 pt-3 bg-white dark:bg-gray-900">
          <button
            onClick={handleContinue}
            disabled={lineItems.length === 0}
            aria-label="Continue to people setup"
            className="w-full py-4 px-6 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-base font-medium rounded-2xl active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue <ArrowRight size={18} className="inline -mt-0.5 ml-1" />
          </button>
        </div>
      </div>
    </div>
  )
}
