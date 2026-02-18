import { useState, useEffect } from 'react'

interface HandoffScreenProps {
  onConfirm: () => void
}

// Brief lockout window to prevent accidental taps during handoff animation
const LOCKOUT_MS = 1500

export default function HandoffScreen({ onConfirm }: HandoffScreenProps) {
  const [locked, setLocked] = useState(true)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Fade in
    const fadeTimer = requestAnimationFrame(() => {
      setTimeout(() => setVisible(true), 10)
    })

    // Unlock after lockout period
    const lockTimer = setTimeout(() => {
      setLocked(false)
    }, LOCKOUT_MS)

    return () => {
      cancelAnimationFrame(fadeTimer)
      clearTimeout(lockTimer)
    }
  }, [])

  return (
    <div
      className={`fixed inset-0 z-40 flex flex-col items-center justify-center px-8 bg-gray-900 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      aria-live="polite"
      aria-label="Pass the phone to the next person"
    >
      {/* Pass icon */}
      <div className="mb-8 opacity-80" aria-hidden="true">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-16 h-16 text-white"
        >
          <path d="M10.5 18.75a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5h-3Z" />
          <path
            fillRule="evenodd"
            d="M8.625.75A3.375 3.375 0 0 0 5.25 4.125v15.75a3.375 3.375 0 0 0 3.375 3.375h6.75a3.375 3.375 0 0 0 3.375-3.375V4.125A3.375 3.375 0 0 0 15.375.75h-6.75ZM7.5 4.125C7.5 3.504 8.004 3 8.625 3H9.75v.375c0 .621.504 1.125 1.125 1.125h2.25c.621 0 1.125-.504 1.125-1.125V3h1.125c.621 0 1.125.504 1.125 1.125v15.75c0 .621-.504 1.125-1.125 1.125h-6.75A1.125 1.125 0 0 1 7.5 19.875V4.125Z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      {/* Instruction */}
      <h1 className="text-white text-3xl font-bold text-center mb-2">Pass the phone</h1>
      <p className="text-white/70 text-lg font-medium mb-12 text-center">to the next person</p>

      {/* Confirm button — disabled during lockout */}
      <button
        onClick={locked ? undefined : onConfirm}
        disabled={locked}
        aria-label={locked ? 'Wait before tapping' : 'Ready to continue'}
        className={`w-full max-w-xs min-h-[56px] rounded-2xl text-base font-semibold transition-all duration-300 ${
          locked
            ? 'bg-white/20 text-white/50 cursor-not-allowed'
            : 'bg-white text-gray-900 active:scale-95 active:bg-white/90'
        }`}
      >
        {locked ? 'Passing...' : 'Ready'}
      </button>

      {/* Lockout progress bar */}
      {locked && (
        <div
          className="mt-4 w-full max-w-xs h-1 rounded-full bg-white/20 overflow-hidden"
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full bg-white/60"
            style={{
              animation: `grow ${LOCKOUT_MS}ms linear forwards`,
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes grow {
          from { width: 0% }
          to   { width: 100% }
        }
      `}</style>
    </div>
  )
}
