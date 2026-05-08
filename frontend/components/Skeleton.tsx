import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  rows?: number
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-lg', className)}
      style={{ background: 'rgba(0,0,0,.06)' }}
    />
  )
}

export function SkeletonCard({ rows = 4 }: SkeletonProps) {
  return (
    <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}>
      <Skeleton className="h-4 w-32" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" style={{ opacity: 1 - i * 0.12 }} />
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 6 }: SkeletonProps) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}>
      <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(0,0,0,.08)' }}>
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="divide-y" style={{ borderColor: 'rgba(0,0,0,.06)' }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex gap-4">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 flex-1" style={{ opacity: 1 - i * 0.08 }} />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
