'use client'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface StepFooterProps {
  prevHref?: string
  prevLabel?: string
  nextHref?: string
  nextLabel?: string
  canProceed?: boolean
  blockedHint?: string
}

export default function StepFooter({
  prevHref,
  prevLabel,
  nextHref,
  nextLabel,
  canProceed = true,
  blockedHint,
}: StepFooterProps) {
  return (
    <div
      className="mt-8 pt-6 flex items-center justify-between"
      style={{ borderTop: '1px solid rgba(0,0,0,.08)' }}
    >
      <div>
        {prevHref ? (
          <Link
            href={prevHref}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors hover:bg-black/5"
            style={{ color: 'var(--text-2)' }}
          >
            <ChevronLeft size={15} />
            {prevLabel ?? 'Back'}
          </Link>
        ) : (
          <div />
        )}
      </div>

      {nextHref && (
        <div className="flex flex-col items-end gap-1.5">
          <Link
            href={canProceed ? nextHref : '#'}
            onClick={(e) => !canProceed && e.preventDefault()}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-medium text-white transition-opacity ${
              canProceed ? 'hover:opacity-90' : 'opacity-40 cursor-not-allowed'
            }`}
            style={{ background: 'var(--accent)' }}
          >
            {nextLabel ?? 'Continue'}
            <ChevronRight size={15} />
          </Link>
          {!canProceed && blockedHint && (
            <p className="text-xs" style={{ color: 'var(--text-2)' }}>{blockedHint}</p>
          )}
        </div>
      )}
    </div>
  )
}
