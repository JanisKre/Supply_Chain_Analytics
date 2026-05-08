'use client'
import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div className="rounded-xl p-8 flex flex-col items-center gap-3 text-center" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}>
          <AlertTriangle size={24} style={{ color: '#FF3B30' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Something went wrong</p>
          <p className="text-xs" style={{ color: 'var(--text-2)' }}>{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-2 px-4 py-2 rounded-full text-sm font-medium text-white"
            style={{ background: 'var(--accent)' }}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
