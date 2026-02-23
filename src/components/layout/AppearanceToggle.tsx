import { useAppearanceStore } from '../../store/appearanceStore'
import type { ThemePreference } from '../../store/appearanceStore'

const themeCycle: ThemePreference[] = ['light', 'dark', 'system']

const themeIcons: Record<ThemePreference, { label: string; icon: React.ReactNode }> = {
  light: {
    label: 'Theme: Light (tap for Dark)',
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="3" />
        <path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M3.4 12.6l.7-.7M11.9 4.1l.7-.7" />
      </svg>
    ),
  },
  dark: {
    label: 'Theme: Dark (tap for System)',
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M13.5 9.2A5.5 5.5 0 1 1 6.8 2.5 4.5 4.5 0 0 0 13.5 9.2Z" />
      </svg>
    ),
  },
  system: {
    label: 'Theme: System (tap for Light)',
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="2" y="3" width="12" height="9" rx="1.5" />
        <path d="M5.5 14.5h5M8 12v2.5" />
      </svg>
    ),
  },
}

export default function AppearanceToggle() {
  const { preference, setPreference, fontSize, setFontSize } = useAppearanceStore()

  function cycleTheme() {
    const currentIdx = themeCycle.indexOf(preference)
    const nextIdx = (currentIdx + 1) % themeCycle.length
    setPreference(themeCycle[nextIdx])
  }

  const current = themeIcons[preference]

  return (
    <div className="inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-0.5 shadow-sm">
      <button
        aria-label="Decrease font size"
        disabled={fontSize <= 14}
        onClick={() => setFontSize(fontSize - 2)}
        className="flex items-center justify-center w-8 h-8 rounded-md transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ fontSize: '14px' }}
      >
        A&minus;
      </button>
      <button
        aria-label="Increase font size"
        disabled={fontSize >= 20}
        onClick={() => setFontSize(fontSize + 2)}
        className="flex items-center justify-center w-8 h-8 rounded-md transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ fontSize: '14px' }}
      >
        A+
      </button>

      <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-0.5" />

      <button
        aria-label={current.label}
        onClick={cycleTheme}
        className="flex items-center justify-center w-8 h-8 rounded-md transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        {current.icon}
      </button>
    </div>
  )
}
