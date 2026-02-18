import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettingsStore } from '../store/settingsStore'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { geminiApiKey, setGeminiApiKey, clearGeminiApiKey } = useSettingsStore()
  const [input, setInput] = useState(geminiApiKey)
  const [saved, setSaved] = useState(false)

  const hasKey = geminiApiKey.length > 0
  const isDirty = input.trim() !== geminiApiKey

  function handleSave() {
    setGeminiApiKey(input)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleClear() {
    clearGeminiApiKey()
    setInput('')
    setSaved(false)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          aria-label="Go back"
        >
          &larr; Back
        </button>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
          Settings
        </h1>
      </div>

      <div className="px-4 flex flex-col gap-6 max-w-sm">
        {/* Gemini API Key section */}
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
            AI-Powered OCR
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Add a Google Gemini API key to use AI vision for better receipt scanning. The key is
            stored only on your device. Without a key, the app uses local OCR (Tesseract).
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Get a free key at{' '}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              aistudio.google.com/apikey
            </a>
          </p>

          <label htmlFor="gemini-key" className="sr-only">
            Gemini API Key
          </label>
          <input
            id="gemini-key"
            type="password"
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setSaved(false)
            }}
            placeholder="AIza..."
            className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
            autoComplete="off"
          />

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!isDirty || input.trim().length === 0}
              className="flex-1 py-3 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-xl active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saved ? 'Saved' : 'Save Key'}
            </button>
            {hasKey && (
              <button
                onClick={handleClear}
                className="py-3 px-4 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-600 active:scale-95 transition-transform"
              >
                Remove
              </button>
            )}
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${hasKey ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {hasKey ? 'Gemini AI OCR enabled (Tesseract as fallback)' : 'Using local OCR only (Tesseract)'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
