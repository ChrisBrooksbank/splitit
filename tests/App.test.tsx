import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// Mock all page components as simple stubs
vi.mock('../src/pages/HomePage', () => ({ default: () => <div>HomePage</div> }))
vi.mock('../src/pages/ProcessingPage', () => ({ default: () => <div>ProcessingPage</div> }))
vi.mock('../src/pages/ItemEditorPage', () => ({ default: () => <div>ItemEditorPage</div> }))
vi.mock('../src/pages/PeopleSetupPage', () => ({ default: () => <div>PeopleSetupPage</div> }))
vi.mock('../src/pages/AssignmentPage', () => ({ default: () => <div>AssignmentPage</div> }))
vi.mock('../src/pages/TipSelectionPage', () => ({ default: () => <div>TipSelectionPage</div> }))
vi.mock('../src/pages/SummaryPage', () => ({ default: () => <div>SummaryPage</div> }))
vi.mock('../src/pages/HistoryPage', () => ({ default: () => <div>HistoryPage</div> }))

// Import App after mocks are set up
import App from '../src/App'

describe('App routing with React.lazy', () => {
  it('renders HomePage at /', async () => {
    window.history.pushState({}, '', '/')
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('HomePage')).toBeInTheDocument()
    })
  })

  it('renders ProcessingPage at /processing', async () => {
    window.history.pushState({}, '', '/processing')
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('ProcessingPage')).toBeInTheDocument()
    })
  })

  it('renders ItemEditorPage at /editor', async () => {
    window.history.pushState({}, '', '/editor')
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('ItemEditorPage')).toBeInTheDocument()
    })
  })

  it('renders HistoryPage at /history', async () => {
    window.history.pushState({}, '', '/history')
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('HistoryPage')).toBeInTheDocument()
    })
  })
})
