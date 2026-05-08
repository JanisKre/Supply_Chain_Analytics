'use client'
import WorkflowStepper from '@/components/layout/WorkflowStepper'
import ErrorBoundary from '@/components/ErrorBoundary'

export default function WorkflowLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <WorkflowStepper />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
    </div>
  )
}
