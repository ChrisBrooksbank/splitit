import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useAppearanceEffect } from './hooks/useAppearanceEffect'
import { useInstallPrompt } from './hooks/useInstallPrompt'
import { useSWUpdate } from './hooks/useSWUpdate'
import AppearanceToggle from './components/layout/AppearanceToggle'
import InstallBanner from './components/layout/InstallBanner'
import UpdateToast from './components/layout/UpdateToast'

const HomePage = lazy(() => import('./pages/HomePage'))
const ProcessingPage = lazy(() => import('./pages/ProcessingPage'))
const ItemEditorPage = lazy(() => import('./pages/ItemEditorPage'))
const PeopleSetupPage = lazy(() => import('./pages/PeopleSetupPage'))
const AssignmentPage = lazy(() => import('./pages/AssignmentPage'))
const TipSelectionPage = lazy(() => import('./pages/TipSelectionPage'))
const SummaryPage = lazy(() => import('./pages/SummaryPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const AiAssistPage = lazy(() => import('./pages/AiAssistPage'))
const LiveSessionPage = lazy(() => import('./pages/LiveSessionPage'))
const JoinPage = lazy(() => import('./pages/JoinPage'))
const ShareQRPage = lazy(() => import('./pages/ShareQRPage'))
const ImportQRPage = lazy(() => import('./pages/ImportQRPage'))

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-900">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700 border-t-gray-800 dark:border-t-gray-200" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      </div>
    </div>
  )
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <div key={location.pathname} className="page-transition">
      <Routes location={location}>
        <Route path="/" element={<HomePage />} />
        <Route path="/processing" element={<ProcessingPage />} />
        <Route path="/editor" element={<ItemEditorPage />} />
        <Route path="/people" element={<PeopleSetupPage />} />
        <Route path="/assign" element={<AssignmentPage />} />
        <Route path="/tips" element={<TipSelectionPage />} />
        <Route path="/summary" element={<SummaryPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/ai-assist" element={<AiAssistPage />} />
        <Route path="/live-session" element={<LiveSessionPage />} />
        <Route path="/join/:roomCode" element={<JoinPage />} />
        <Route path="/share" element={<ShareQRPage />} />
        <Route path="/import-qr" element={<ImportQRPage />} />
      </Routes>
    </div>
  )
}

export default function App() {
  useAppearanceEffect()
  const { needsRefresh, updateSW } = useSWUpdate()
  const { canInstall, promptInstall, dismiss } = useInstallPrompt()

  return (
    <BrowserRouter>
      <div className="fixed top-3 right-3 z-40">
        <AppearanceToggle />
      </div>
      <Suspense fallback={<PageLoader />}>
        <AnimatedRoutes />
      </Suspense>
      {needsRefresh ? (
        <UpdateToast onUpdate={updateSW} />
      ) : (
        canInstall && <InstallBanner onInstall={promptInstall} onDismiss={dismiss} />
      )}
    </BrowserRouter>
  )
}
