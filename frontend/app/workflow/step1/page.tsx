'use client'
import { useState } from 'react'
import { useWorkflowStore } from '@/store/workflowStore'
import { api } from '@/lib/apiClient'
import { toast } from 'sonner'
import TransparencyPanel from '@/components/layout/TransparencyPanel'
import StepFooter from '@/components/layout/StepFooter'
import { Loader2, Sparkles } from 'lucide-react'

export default function Step1Page() {
  const {
    product, setProduct, segments, setStep1Result, setStep1Loading,
    step1Loading, step1Prompt, step1RawResponse,
  } = useWorkflowStore()
  const [input, setInput] = useState(product || 'NdFeB permanent magnets')

  async function handleGenerate() {
    if (!input.trim()) return
    setStep1Loading(true)
    setProduct(input)
    try {
      const res = await api.generateValueChain(input)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setStep1Result(data)
      toast.success('Value chain generated')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate value chain')
    } finally {
      setStep1Loading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>Step 1 — Value Chain Generator</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>Enter a product to generate its stylized upstream supply chain via AI.</p>
      </div>

      <div className="rounded-xl p-6 space-y-4" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}>
        <div className="flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            placeholder="e.g. NdFeB permanent magnets"
            className="flex-1 px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
            style={{ borderColor: 'rgba(0,0,0,.12)', background: 'var(--bg)', color: 'var(--text)' }}
          />
          <button
            onClick={handleGenerate}
            disabled={step1Loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white disabled:opacity-50 transition-opacity"
            style={{ background: 'var(--accent)' }}
          >
            {step1Loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            Generate
          </button>
        </div>
      </div>

      {segments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {segments.map((seg) => (
            <div key={seg.id} className="rounded-xl p-5 space-y-3" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'var(--accent)' }}>
                  {seg.id}
                </span>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{seg.name}</h3>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>{seg.description}</p>
              <div>
                <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Key materials</p>
                <div className="flex flex-wrap gap-1">
                  {seg.key_materials.map((m) => (
                    <span key={m} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg)', color: 'var(--text-2)' }}>{m}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Major producers</p>
                <div className="flex flex-wrap gap-1">
                  {seg.major_producing_countries.map((c) => (
                    <span key={c} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,113,227,.08)', color: 'var(--accent)' }}>{c}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(step1Prompt || step1RawResponse) && (
        <TransparencyPanel sections={[
          {
            label: 'Prompt Used',
            content: <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed" style={{ color: 'var(--text-2)' }}>{step1Prompt}</pre>,
            copyText: step1Prompt,
          },
          {
            label: 'Raw LLM Response',
            content: <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed" style={{ color: 'var(--text-2)' }}>{step1RawResponse}</pre>,
          },
        ]} />
      )}

      <StepFooter
        nextHref="/workflow/step2"
        nextLabel="HS Codes"
        canProceed={segments.length > 0}
        blockedHint="Generate a value chain first"
      />
    </div>
  )
}
