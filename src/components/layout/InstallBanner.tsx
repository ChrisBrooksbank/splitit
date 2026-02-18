interface InstallBannerProps {
  onInstall: () => void
  onDismiss: () => void
}

export default function InstallBanner({ onInstall, onDismiss }: InstallBannerProps) {
  return (
    <div className="fixed bottom-6 left-4 right-4 z-50 flex items-center justify-between rounded-2xl bg-indigo-600 px-4 py-3 text-white shadow-lg">
      <p className="text-sm font-medium">Install SplitIt for offline use</p>
      <div className="ml-3 flex shrink-0 items-center gap-2">
        <button
          onClick={onInstall}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-indigo-600 active:scale-95 transition-transform"
        >
          Install
        </button>
        <button
          onClick={onDismiss}
          className="rounded-lg p-1 text-white/80 hover:text-white active:scale-95 transition-transform"
          aria-label="Dismiss install banner"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
