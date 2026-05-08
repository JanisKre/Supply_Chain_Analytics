'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useWorkflowStore } from '@/store/workflowStore'
import { Check, Settings } from 'lucide-react'

const STEPS = [
  { id: 1, label: 'Value Chain', href: '/workflow/step1' },
  { id: 2, label: 'HS Codes', href: '/workflow/step2' },
  { id: 3, label: 'BACI Data', href: '/workflow/step3' },
  { id: 4, label: 'Sankey', href: '/workflow/step4' },
  { id: 5, label: 'KPI Dashboard', href: '/workflow/dashboard' },
]

const LOCK_HINTS: Record<number, string> = {
  2: 'Complete Step 1 first',
  3: 'Complete Step 2 first',
  4: 'Complete Step 3 first',
  5: 'Complete Step 4 first',
}

function getLinkClass(unlocked: boolean) {
  return unlocked ? 'hover:bg-black/5' : 'opacity-40 cursor-not-allowed'
}

export default function WorkflowStepper() {
  const pathname = usePathname()
  const { segments, llmHSAssignments, baciFileId, sankeyNodes } = useWorkflowStore()

  function isUnlocked(stepId: number) {
    if (stepId === 1) return true
    if (stepId === 2) return segments.length > 0
    if (stepId === 3) return llmHSAssignments.length > 0
    if (stepId === 4) return baciFileId !== ''
    if (stepId === 5) return sankeyNodes.length > 0
    return false
  }

  function isComplete(stepId: number) {
    if (stepId === 1) return segments.length > 0
    if (stepId === 2) return llmHSAssignments.length > 0
    if (stepId === 3) return baciFileId !== ''
    if (stepId === 4) return sankeyNodes.length > 0
    return false
  }

  const completedCount = STEPS.filter((s) => isComplete(s.id)).length


  return (
    <div className="border-b" style={{ background: 'var(--surface)', borderColor: 'rgba(0,0,0,.08)' }}>
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-2">
        <span className="text-sm font-semibold mr-4" style={{ color: 'var(--text)' }}>
          Supply Chain Intelligence
        </span>
        {STEPS.map((step, idx) => {
          const unlocked = isUnlocked(step.id)
          const complete = isComplete(step.id)
          const active = pathname === step.href
          const prevComplete = idx > 0 && isComplete(STEPS[idx - 1].id)
          const connectorGreen = idx > 0 && prevComplete && complete
          return (
            <div key={step.id} className="flex items-center gap-2">
              {idx > 0 && (
                <div
                  className="w-6 h-px transition-colors duration-300"
                  style={{ background: connectorGreen ? 'var(--success)' : 'rgba(0,0,0,.15)' }}
                />
              )}
              <Link
                href={unlocked ? step.href : '#'}
                title={unlocked ? undefined : LOCK_HINTS[step.id]}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  active ? 'text-white' : getLinkClass(unlocked)
                }`}
                style={active ? { background: 'var(--accent)' } : { color: 'var(--text-2)' }}
                onClick={(e) => !unlocked && e.preventDefault()}
              >
                {complete && !active ? (
                  <Check size={12} style={{ color: 'var(--success)' }} />
                ) : (
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ background: active ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.1)' }}
                  >
                    {step.id}
                  </span>
                )}
                {step.label}
              </Link>
            </div>
          )
        })}
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-2)' }}>
            <span
              className="font-semibold tabular-nums"
              style={{ color: completedCount > 0 ? 'var(--success)' : 'var(--text-2)' }}
            >
              {completedCount}
            </span>
            <span>/ 5</span>
          </div>
          <Link
            href="/workflow/settings"
            title="LLM Settings"
            className="p-1.5 rounded-full hover:bg-black/5 transition-colors"
            style={{ color: pathname === '/workflow/settings' ? 'var(--accent)' : 'var(--text-2)' }}
          >
            <Settings size={15} />
          </Link>
        </div>
      </div>
    </div>
  )
}
