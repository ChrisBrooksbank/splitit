import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseAiResponse } from '../services/aiImport/parseAiResponse'
import { useBillStore } from '../store/billStore'

const PROMPT = `Read these restaurant bill/receipt photos and extract every line item. If there are multiple photos, they are parts of the same bill — combine them into one list and remove any duplicates from overlapping sections. Return ONLY a JSON object in this exact format, no other text:

{"items":[{"name":"Item Name","price":12.99,"qty":1}]}

Rules:
- price = the LINE TOTAL in £ as shown on the receipt (e.g. "2x Beer £11.00" → price: 11.00, qty: 2)
- qty = quantity (default 1)
- Omit subtotals, tax, tips, totals, payment lines — only food/drink items
- Use the exact item names from the receipt
- price is a number with 2 decimal places, in pounds sterling (not a string, no £ symbol)`

export default function AiAssistPage() {
  const navigate = useNavigate()
  const setLineItems = useBillStore((s) => s.setLineItems)
  const [copied, setCopied] = useState(false)
  const [response, setResponse] = useState('')
  const [error, setError] = useState('')

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(PROMPT)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select the text for manual copy
      setError('Could not copy automatically. Please select and copy the prompt text above.')
    }
  }

  function handleImport() {
    setError('')
    try {
      const items = parseAiResponse(response)
      setLineItems(items)
      navigate('/editor')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse response.')
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-sm flex flex-col gap-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            AI Assistant
          </h1>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
            Use ChatGPT or Claude to read your bill photo
          </p>
          <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
            You'll need ChatGPT or a similar AI chatbot open in another app or browser tab.
          </p>
        </div>

        {/* Step 1: Copy Prompt */}
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-medium text-gray-700 dark:text-gray-300">
            Step 1: Copy the prompt
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Open ChatGPT or Claude, attach your bill photo(s), and paste the prompt. Multiple photos
            of the same bill are fine.
          </p>
          <button
            onClick={handleCopy}
            className="w-full py-3 px-6 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-base font-medium rounded-xl active:scale-95 transition-transform"
          >
            {copied ? 'Copied!' : 'Copy Prompt to Clipboard'}
          </button>
        </div>

        {/* Step 2: Paste Response */}
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-medium text-gray-700 dark:text-gray-300">
            Step 2: Paste the AI response
          </h2>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Paste the JSON response here..."
            rows={6}
            className="w-full text-base text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
          />
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button
            onClick={handleImport}
            disabled={!response.trim()}
            className="w-full py-3 px-6 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-base font-medium rounded-xl active:scale-95 transition-transform disabled:opacity-40 disabled:active:scale-100"
          >
            Import Items
          </button>
        </div>

        {/* Back link */}
        <button
          onClick={() => navigate('/')}
          className="text-base text-gray-400 dark:text-gray-500 underline-offset-2 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}
