interface UpdateToastProps {
  onUpdate: () => void
}

export default function UpdateToast({ onUpdate }: UpdateToastProps) {
  return (
    <div className="fixed bottom-6 left-4 right-4 z-50 flex items-center justify-between rounded-2xl bg-indigo-600 px-4 py-3 text-white shadow-lg">
      <p className="text-sm font-medium">A new version is available</p>
      <button
        onClick={onUpdate}
        className="ml-3 shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-indigo-600 active:scale-95 transition-transform"
      >
        Refresh
      </button>
    </div>
  )
}
