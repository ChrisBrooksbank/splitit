interface ImagePreviewProps {
  previewUrl: string
  onRetake: () => void
  onUse: () => void
}

/**
 * Shows the captured receipt image with "Retake" and "Use This Photo" actions.
 */
export default function ImagePreview({ previewUrl, onRetake, onUse }: ImagePreviewProps) {
  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Receipt image preview */}
      <div className="flex-1 relative overflow-hidden">
        <img src={previewUrl} alt="Captured receipt" className="w-full h-full object-contain" />
      </div>

      {/* Action buttons */}
      <div className="bg-black px-6 py-8 flex flex-col gap-3 safe-area-bottom">
        <button
          onClick={onUse}
          className="w-full py-4 px-6 bg-white text-gray-900 text-base font-medium rounded-2xl active:scale-95 transition-transform"
        >
          Use This Photo
        </button>
        <button
          onClick={onRetake}
          className="w-full py-4 px-6 bg-transparent text-white text-base font-medium rounded-2xl border border-white/30 active:scale-95 transition-transform"
        >
          Retake
        </button>
      </div>
    </div>
  )
}
