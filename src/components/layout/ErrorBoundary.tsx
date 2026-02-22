import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center px-6 text-center">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Something went wrong
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            An unexpected error occurred. Please try again.
          </p>
          <a
            href="/"
            className="px-6 py-3 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-xl text-sm font-medium min-h-[44px] inline-flex items-center"
          >
            Go Home
          </a>
        </div>
      )
    }

    return this.props.children
  }
}
