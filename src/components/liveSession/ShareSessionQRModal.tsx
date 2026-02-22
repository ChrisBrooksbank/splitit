import { useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { X, Copy, UserPlus } from 'lucide-react'

interface ShareSessionQRModalProps {
  joinUrl: string
  onClose: () => void
}

export default function ShareSessionQRModal({ joinUrl, onClose }: ShareSessionQRModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose()
  }

  function handleCopyUrl() {
    navigator.clipboard.writeText(joinUrl).catch(() => {
      // Clipboard write failed silently
    })
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6"
      role="dialog"
      aria-modal="true"
      aria-label="Share session QR code"
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Close"
        >
          <X size={20} className="text-gray-500 dark:text-gray-400" />
        </button>

        <div className="flex justify-center mb-2">
          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <UserPlus size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 text-center mb-1">
          Join Session
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-5">
          Others can scan this to join the live session and claim their items
        </p>

        {/* QR Code */}
        <div className="flex justify-center mb-5">
          <div className="bg-white p-3 rounded-xl border border-gray-100">
            <QRCodeSVG value={joinUrl} size={200} />
          </div>
        </div>

        {/* URL with copy button */}
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2">
          <span className="flex-1 text-xs text-gray-600 dark:text-gray-300 break-all select-all">
            {joinUrl}
          </span>
          <button
            onClick={handleCopyUrl}
            className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Copy link"
          >
            <Copy size={16} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  )
}
