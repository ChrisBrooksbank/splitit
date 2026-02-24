import { useEffect, useRef, useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface ReceiptPhotoViewerProps {
  photos: string[]
  initialIndex?: number
  onClose: () => void
}

export default function ReceiptPhotoViewer({
  photos,
  initialIndex = 0,
  onClose,
}: ReceiptPhotoViewerProps) {
  const [index, setIndex] = useState(initialIndex)
  const backdropRef = useRef<HTMLDivElement>(null)
  const total = photos.length

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(total - 1, i + 1))
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, total])

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose()
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="Receipt photo viewer"
    >
      {/* Top bar: counter + close */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3">
        {total > 1 ? (
          <span className="text-white/80 text-sm font-medium">
            {index + 1} of {total}
          </span>
        ) : (
          <span />
        )}
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 active:bg-white/20 transition-colors"
          aria-label="Close photo viewer"
        >
          <X size={22} className="text-white" />
        </button>
      </div>

      {/* Photo */}
      <img
        src={photos[index]}
        alt={`Receipt photo ${index + 1}`}
        className="max-w-full max-h-full object-contain"
        style={{ touchAction: 'pinch-zoom' }}
      />

      {/* Navigation arrows (multi-photo only) */}
      {total > 1 && (
        <>
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 active:bg-white/20 transition-colors disabled:opacity-20"
            aria-label="Previous photo"
          >
            <ChevronLeft size={24} className="text-white" />
          </button>
          <button
            onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
            disabled={index === total - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 active:bg-white/20 transition-colors disabled:opacity-20"
            aria-label="Next photo"
          >
            <ChevronRight size={24} className="text-white" />
          </button>
        </>
      )}

      {/* Dot indicators (multi-photo only) */}
      {total > 1 && (
        <div className="absolute bottom-6 flex gap-2">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === index ? 'bg-white' : 'bg-white/40'
              }`}
              aria-label={`View photo ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
