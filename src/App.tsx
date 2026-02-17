import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'

const HomePage = lazy(() => import('./pages/HomePage'))
const ProcessingPage = lazy(() => import('./pages/ProcessingPage'))
const ItemEditorPage = lazy(() => import('./pages/ItemEditorPage'))
const PeopleSetupPage = lazy(() => import('./pages/PeopleSetupPage'))
const AssignmentPage = lazy(() => import('./pages/AssignmentPage'))
const TipSelectionPage = lazy(() => import('./pages/TipSelectionPage'))
const SummaryPage = lazy(() => import('./pages/SummaryPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-800" />
        <p className="text-sm text-gray-500">Loading…</p>
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
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <AnimatedRoutes />
      </Suspense>
    </BrowserRouter>
  )
}
