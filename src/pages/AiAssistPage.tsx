import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Camera,
  ImagePlus,
  Sparkles,
  Clipboard,
  Download,
  ArrowLeft,
  X,
  KeyRound,
  Save,
} from 'lucide-react'
import { parseAiResponse } from '../services/aiImport/parseAiResponse'
import { processReceiptWithAi } from '../services/aiImport/directAiService'
import { useBillStore } from '../store/billStore'
import { useApiKeyStore, type AiProvider } from '../store/apiKeyStore'
import ImageCapture from '../components/camera/ImageCapture'
import { createThumbnailDataUrl, storeReceiptPhotos } from '../utils/photoThumbnail'

const PROMPT = `Read these restaurant bill/receipt photos and extract every line item. If there are multiple photos, they are parts of the same bill — combine them into one list and remove any duplicates from overlapping sections. Return ONLY a JSON object in this exact format, no other text:

{"items":[{"name":"Item Name","price":12.99,"qty":1}]}

Rules:
- price = the LINE TOTAL in £ as shown on the receipt (e.g. "2x Beer £11.00" → price: 11.00, qty: 2)
- qty = quantity (default 1)
- Omit subtotals, tax, tips, totals, payment lines — only food/drink items
- Use the exact item names from the receipt
- price is a number with 2 decimal places, in pounds sterling (not a string, no £ symbol)`

interface CapturedPhoto {
  file: File
  previewUrl: string
}

export default function AiAssistPage() {
  const navigate = useNavigate()
  const setLineItems = useBillStore((s) => s.setLineItems)
  const { apiKey, provider, setProvider, setApiKey, clear } = useApiKeyStore()

  const hasKey = Boolean(apiKey)

  // Manual mode state
  const [copied, setCopied] = useState(false)
  const [response, setResponse] = useState('')
  const [error, setError] = useState('')

  // Direct mode state
  const [photos, setPhotos] = useState<CapturedPhoto[]>([])
  const [triggerCapture, setTriggerCapture] = useState(false)
  const [processing, setProcessing] = useState(false)

  // API key setup state
  const [showKeySetup, setShowKeySetup] = useState(false)
  const [keyDraft, setKeyDraft] = useState('')
  const [providerDraft, setProviderDraft] = useState<AiProvider>(provider)

  // Revoke blob URLs on unmount
  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // --- Manual mode handlers (unchanged) ---

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(PROMPT)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
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

  // --- Direct mode handlers ---

  function handlePhotoCapture(file: File, previewUrl: string) {
    setPhotos((prev) => [...prev, { file, previewUrl }])
    setError('')
  }

  function handleRemovePhoto(index: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  function handleTriggerCapture() {
    setTriggerCapture(true)
    setTimeout(() => setTriggerCapture(false), 100)
  }

  async function handleProcess() {
    if (photos.length === 0 || !apiKey) return
    setError('')
    setProcessing(true)
    try {
      const rawResponse = await processReceiptWithAi(
        photos.map((p) => p.file),
        provider,
        apiKey
      )
      const items = parseAiResponse(rawResponse)
      // Save photo thumbnails for history
      const thumbs = await Promise.all(
        photos.map((p) => createThumbnailDataUrl(p.file))
      )
      storeReceiptPhotos(thumbs)
      setLineItems(items)
      navigate('/editor')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process receipt.')
    } finally {
      setProcessing(false)
    }
  }

  // --- API key setup handlers ---

  function handleSaveKey() {
    const trimmed = keyDraft.trim()
    if (!trimmed) return
    setProvider(providerDraft)
    setApiKey(trimmed)
    setKeyDraft('')
    setShowKeySetup(false)
    setError('')
  }

  function handleRemoveKey() {
    clear()
    setPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl))
      return []
    })
    setShowKeySetup(false)
    setError('')
  }

  // --- Render ---

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-sm flex flex-col gap-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            AI Assistant
          </h1>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
            {hasKey
              ? 'Take a photo and items will be extracted automatically'
              : 'Use ChatGPT or Claude to read your bill photo'}
          </p>
        </div>

        {hasKey ? (
          /* ====== DIRECT MODE ====== */
          <>
            {/* Photo capture area */}
            <div className="flex flex-col gap-3">
              <h2 className="text-base font-medium text-gray-700 dark:text-gray-300">
                {photos.length === 0
                  ? 'Take a photo of your bill'
                  : `${photos.length} photo${photos.length !== 1 ? 's' : ''} ready`}
              </h2>

              {/* Photo thumbnails */}
              {photos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto py-1">
                  {photos.map((photo, index) => (
                    <div key={photo.previewUrl} className="relative flex-shrink-0">
                      <img
                        src={photo.previewUrl}
                        alt={`Photo ${index + 1}`}
                        className="w-16 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                      />
                      <button
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full text-xs flex items-center justify-center active:scale-90 transition-transform"
                        aria-label={`Remove photo ${index + 1}`}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <ImageCapture onCapture={handlePhotoCapture} triggerCapture={triggerCapture} />

              <button
                onClick={handleTriggerCapture}
                className="w-full py-3 px-6 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-base font-medium rounded-xl border border-gray-200 dark:border-gray-600 active:scale-95 transition-transform"
              >
                {photos.length === 0 ? (
                  <>
                    <Camera size={18} className="inline -mt-0.5 mr-1.5" />
                    Take Photo
                  </>
                ) : (
                  <>
                    <ImagePlus size={18} className="inline -mt-0.5 mr-1.5" />
                    Add Another Photo
                  </>
                )}
              </button>

              <button
                onClick={handleProcess}
                disabled={photos.length === 0 || processing}
                className="w-full py-3 px-6 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-base font-medium rounded-xl active:scale-95 transition-transform disabled:opacity-40 disabled:active:scale-100"
              >
                {processing ? (
                  'Processing…'
                ) : (
                  <>
                    <Sparkles size={18} className="inline -mt-0.5 mr-1.5" />
                    Process with AI
                  </>
                )}
              </button>
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            {/* Key info & actions */}
            <div className="flex flex-col gap-2 items-center">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Using{' '}
                {provider === 'openai'
                  ? 'OpenAI'
                  : provider === 'anthropic'
                    ? 'Anthropic'
                    : 'Gemini'}{' '}
                ·{' '}
                <button
                  onClick={handleRemoveKey}
                  className="underline underline-offset-2 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  Remove key
                </button>
              </p>
            </div>
          </>
        ) : (
          /* ====== MANUAL MODE (existing flow, unchanged) ====== */
          <>
            <div className="flex flex-col gap-3">
              <p className="text-sm text-gray-400 dark:text-gray-500">
                You'll need ChatGPT or a similar AI chatbot open in another app or browser tab.
              </p>
            </div>

            {/* Step 1: Copy Prompt */}
            <div className="flex flex-col gap-3">
              <h2 className="text-base font-medium text-gray-700 dark:text-gray-300">
                Step 1: Copy the prompt
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Open ChatGPT or Claude, attach your bill photo(s), and paste the prompt. Multiple
                photos of the same bill are fine.
              </p>
              <button
                onClick={handleCopy}
                className="w-full py-3 px-6 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-base font-medium rounded-xl active:scale-95 transition-transform"
              >
                {copied ? (
                  'Copied!'
                ) : (
                  <>
                    <Clipboard size={18} className="inline -mt-0.5 mr-1.5" />
                    Copy Prompt to Clipboard
                  </>
                )}
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
                <Download size={18} className="inline -mt-0.5 mr-1.5" />
                Import Items
              </button>
            </div>

            {/* API key setup prompt */}
            {!showKeySetup && (
              <button
                onClick={() => setShowKeySetup(true)}
                className="text-sm text-gray-400 dark:text-gray-500 underline-offset-2 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <KeyRound size={14} className="inline -mt-0.5 mr-1" />
                Have an API key? Skip the copy-paste
              </button>
            )}
          </>
        )}

        {/* Inline API key setup */}
        {showKeySetup && !hasKey && (
          <div className="flex flex-col gap-3 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Set up API key</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Your key is stored locally on this device and sent directly to the provider. It never
              touches our servers.
            </p>

            {/* Provider selector */}
            <div className="flex gap-2">
              {(['openai', 'anthropic', 'gemini'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setProviderDraft(p)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                    providerDraft === p
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {p === 'openai' ? 'OpenAI' : p === 'anthropic' ? 'Anthropic' : 'Gemini'}
                </button>
              ))}
            </div>

            {/* Key input */}
            <input
              type="password"
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              placeholder={
                providerDraft === 'openai'
                  ? 'sk-...'
                  : providerDraft === 'anthropic'
                    ? 'sk-ant-...'
                    : 'AIza...'
              }
              className="w-full text-base text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
            />

            <div className="flex gap-2">
              <button
                onClick={handleSaveKey}
                disabled={!keyDraft.trim()}
                className="flex-1 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-xl active:scale-95 transition-transform disabled:opacity-40"
              >
                <Save size={14} className="inline -mt-0.5 mr-1" />
                Save
              </button>
              <button
                onClick={() => {
                  setShowKeySetup(false)
                  setKeyDraft('')
                }}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-medium rounded-xl active:scale-95 transition-transform"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Back link */}
        <button
          onClick={() => navigate('/')}
          className="text-base text-gray-400 dark:text-gray-500 underline-offset-2 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <ArrowLeft size={14} className="inline -mt-0.5 mr-1" />
          Back to Home
        </button>
      </div>
    </div>
  )
}
