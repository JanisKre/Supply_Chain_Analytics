'use client'
import { useWorkflowStore } from '@/store/workflowStore'
import { api } from '@/lib/apiClient'
import { toast } from 'sonner'
import TransparencyPanel from '@/components/layout/TransparencyPanel'
import StepFooter from '@/components/layout/StepFooter'
import { Loader2, Tag } from 'lucide-react'

export default function Step2Page() {
  const {
    product, segments,
    llmHSAssignments, manualHSAssignments, agreementRate,
    step2Prompt, step2Loading,
    setStep2Result, setStep2Loading,
  } = useWorkflowStore()

  async function handleAssign() {
    if (!segments.length) { toast.error('Generate value chain first'); return }
    setStep2Loading(true)
    try {
      const res = await api.assignHSCodes(product, segments)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setStep2Result(data)
      toast.success('HS codes assigned')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to assign HS codes')
    } finally {
      setStep2Loading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>Step 2 — HS Code Assignment</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>Compare AI-assigned HS codes with the REPM teaching case reference.</p>
      </div>

      <div className="rounded-xl p-6 flex items-center justify-between" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}>
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            Product: <span style={{ color: 'var(--accent)' }}>{product || 'Not set — complete Step 1 first'}</span>
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>{segments.length} segments loaded</p>
        </div>
        <button
          onClick={handleAssign}
          disabled={step2Loading || segments.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white disabled:opacity-50"
          style={{ background: 'var(--accent)' }}
        >
          {step2Loading ? <Loader2 size={15} className="animate-spin" /> : <Tag size={15} />}
          Assign HS Codes
        </button>
      </div>

      {llmHSAssignments.length > 0 && (
        <div className="space-y-4">
          {agreementRate > 0 && (
            <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: 'rgba(52,199,89,.06)', border: '1px solid rgba(52,199,89,.2)' }}>
              <span className="text-3xl font-bold" style={{ color: 'var(--success)' }}>{Math.round(agreementRate * 100)}%</span>
              <p className="text-sm" style={{ color: 'var(--text)' }}>agreement between AI and REPM reference assignments</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--text-2)' }}>AI Assignment</h3>
              {llmHSAssignments.map((a) => (
                <div key={a.segment_id} className="rounded-xl p-4 mb-3" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}>
                  <p className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>{a.segment_name}</p>
                  <div className="flex flex-wrap gap-1">
                    {a.hs_codes.map((c) => (
                      <span key={c} className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: 'rgba(0,113,227,.08)', color: 'var(--accent)' }}>{c}</span>
                    ))}
                  </div>
                  {a.rationale && <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-2)' }}>{a.rationale}</p>}
                </div>
              ))}
            </div>
            <div>
              <h3 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--text-2)' }}>REPM Reference</h3>
              {manualHSAssignments.map((a) => (
                <div key={a.segment_id} className="rounded-xl p-4 mb-3" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}>
                  <p className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>{a.segment_name}</p>
                  <div className="flex flex-wrap gap-1">
                    {a.hs_codes.map((c) => (
                      <span key={c} className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: 'rgba(52,199,89,.08)', color: 'var(--success)' }}>{c}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {step2Prompt && (
        <TransparencyPanel sections={[
          {
            label: 'Prompt Used',
            content: <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed" style={{ color: 'var(--text-2)' }}>{step2Prompt}</pre>,
            copyText: step2Prompt,
          },
        ]} />
      )}

      <StepFooter
        prevHref="/workflow/step1"
        prevLabel="Value Chain"
        nextHref="/workflow/step3"
        nextLabel="BACI Data"
        canProceed={llmHSAssignments.length > 0}
        blockedHint="Assign HS codes first"
      />
    </div>
  )
}
