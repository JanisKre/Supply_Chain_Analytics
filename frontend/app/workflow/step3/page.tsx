'use client'
import { useRef, useState } from 'react'
import { useWorkflowStore } from '@/store/workflowStore'
import { api } from '@/lib/apiClient'
import { toast } from 'sonner'
import TransparencyPanel from '@/components/layout/TransparencyPanel'
import StepFooter from '@/components/layout/StepFooter'
import { Download, Upload, CheckCircle2, Loader2 } from 'lucide-react'

export default function Step3Page() {
  const {
    manualHSAssignments, llmHSAssignments,
    processingLog, baciFileId, rowCount, baciPreview,
    step3Loading, setStep3Loading, appendLog, setStep3Complete,
  } = useWorkflowStore()

  const [dragOver, setDragOver] = useState(false)
  const [downloadPct, setDownloadPct] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const allHSCodes = Array.from(new Set([
    ...manualHSAssignments.flatMap((a) => a.hs_codes),
    ...llmHSAssignments.flatMap((a) => a.hs_codes),
  ]))

  async function streamSSE(response: Response) {
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue
        try {
          const data = JSON.parse(line.slice(6))
          if (data.type === 'error') {
            toast.error(data.message)
            return
          }
          if (data.type === 'complete') {
            setStep3Complete(data)
            toast.success(`Fertig: ${data.row_count.toLocaleString()} Zeilen verarbeitet`)
          } else {
            if (data.step === 1 && typeof data.pct === 'number') setDownloadPct(data.pct)
            appendLog({ ...data, timestamp: Date.now() })
          }
        } catch { /* ignore malformed events */ }
      }
    }
  }

  async function handleAutoDownload() {
    if (allHSCodes.length === 0) { toast.error('Zuerst Schritt 2 abschließen'); return }
    setStep3Loading(true)
    setDownloadPct(0)
    try {
      const res = await api.downloadBaci(allHSCodes)
      if (!res.ok) throw new Error(await res.text())
      await streamSSE(res)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Download fehlgeschlagen')
    } finally {
      setStep3Loading(false)
      setDownloadPct(null)
    }
  }

  async function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) { toast.error('Bitte eine CSV-Datei hochladen'); return }
    if (allHSCodes.length === 0) { toast.error('Zuerst Schritt 2 abschließen'); return }
    setStep3Loading(true)
    try {
      const res = await api.processBaci(file, allHSCodes)
      if (!res.ok) throw new Error(await res.text())
      await streamSSE(res)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Verarbeitung fehlgeschlagen')
    } finally {
      setStep3Loading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>Step 3 — BACI Trade Data</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>
          Automatischer Download von CEPII · HS22 · Jahr 2023 · ~300 MB
        </p>
      </div>

      {/* HS codes info */}
      <div className="rounded-xl px-4 py-3 text-xs" style={{ background: 'rgba(0,113,227,.04)', border: '1px solid rgba(0,113,227,.12)', color: 'var(--text-2)' }}>
        HS-Codes: <span className="font-mono font-medium" style={{ color: 'var(--accent)' }}>
          {allHSCodes.length ? allHSCodes.join(', ') : '(Schritt 2 zuerst abschließen)'}
        </span>
      </div>

      {/* Auto-download card */}
      <div className="rounded-xl p-6 space-y-4" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>BACI HS22 V202601 — automatisch</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
              Quelle: cepii.fr · BACI_HS22_Y2023_V202601.csv · öffentlich zugänglich
            </p>
          </div>
          <button
            onClick={handleAutoDownload}
            disabled={step3Loading || allHSCodes.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white disabled:opacity-50 transition-opacity shrink-0"
            style={{ background: 'var(--accent)' }}
          >
            {step3Loading && downloadPct !== null
              ? <Loader2 size={15} className="animate-spin" />
              : <Download size={15} />}
            {step3Loading && downloadPct !== null ? `${downloadPct}%` : 'Jetzt herunterladen'}
          </button>
        </div>

        {/* Download progress bar */}
        {downloadPct !== null && (
          <div className="space-y-1">
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${downloadPct}%`, background: 'var(--accent)' }}
              />
            </div>
            <p className="text-xs" style={{ color: 'var(--text-2)' }}>
              {downloadPct < 100 ? `Download: ${downloadPct}%` : 'Extrahiere & verarbeite…'}
            </p>
          </div>
        )}
      </div>

      {/* Manual upload fallback */}
      <details className="group">
        <summary
          className="cursor-pointer text-xs font-medium px-1 select-none"
          style={{ color: 'var(--text-2)' }}
        >
          <span className="group-open:hidden">▸ CSV manuell hochladen (Fallback)</span>
          <span className="hidden group-open:inline">▾ CSV manuell hochladen (Fallback)</span>
        </summary>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          onClick={() => inputRef.current?.click()}
          className="mt-3 rounded-xl border-2 border-dashed p-10 flex flex-col items-center gap-2 cursor-pointer transition-colors"
          style={{
            borderColor: dragOver ? 'var(--accent)' : 'rgba(0,0,0,.12)',
            background: dragOver ? 'rgba(0,113,227,.03)' : 'var(--surface)',
          }}
        >
          <Upload size={28} style={{ color: 'var(--text-2)' }} />
          <p className="text-sm" style={{ color: 'var(--text)' }}>BACI CSV hier ablegen oder klicken</p>
          <p className="text-xs" style={{ color: 'var(--text-2)' }}>BACI_HS22_Y2023_V202601.csv</p>
          <input
            ref={inputRef} type="file" accept=".csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
        </div>
      </details>

      {/* Processing log */}
      {processingLog.length > 0 && (
        <div
          className="rounded-xl p-4 font-mono text-xs space-y-1 max-h-72 overflow-y-auto"
          style={{ background: '#1D1D1F', color: '#34C759' }}
        >
          {processingLog.map((l, i) => (
            <div key={i}>
              <span style={{ color: '#6E6E73' }}>[{new Date(l.timestamp).toLocaleTimeString()}] </span>
              {l.step && <span style={{ color: '#FF9F0A' }}>Step {l.step}: </span>}
              <span>{l.message}</span>
              {l.rows_before != null && l.rows_after != null && l.rows_before !== l.rows_after && (
                <span style={{ color: '#0071E3' }}> ({l.rows_before.toLocaleString()} → {l.rows_after.toLocaleString()})</span>
              )}
            </div>
          ))}
          {baciFileId && (
            <div className="flex items-center gap-2 mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,.1)' }}>
              <CheckCircle2 size={13} style={{ color: 'var(--success)' }} />
              <span style={{ color: 'var(--success)' }}>
                File ID: {baciFileId} — {rowCount.toLocaleString()} Zeilen gespeichert
              </span>
            </div>
          )}
        </div>
      )}

      {baciPreview.length > 0 && (
        <TransparencyPanel sections={[
          {
            label: `Datenvorschau (erste ${Math.min(baciPreview.length, 10)} Zeilen)`,
            content: (
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr>
                      {Object.keys(baciPreview[0]).slice(0, 10).map((k) => (
                        <th key={k} className="text-left py-1.5 pr-4 font-semibold whitespace-nowrap" style={{ color: 'var(--text-2)' }}>{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {baciPreview.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-t" style={{ borderColor: 'rgba(0,0,0,.06)' }}>
                        {Object.values(row).slice(0, 10).map((v, j) => (
                          <td key={j} className="py-1.5 pr-4 whitespace-nowrap" style={{ color: 'var(--text)' }}>{String(v ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ),
          },
        ]} />
      )}

      <StepFooter
        prevHref="/workflow/step2"
        prevLabel="HS Codes"
        nextHref="/workflow/step4"
        nextLabel="Sankey Diagram"
        canProceed={baciFileId !== ''}
        blockedHint="Download and process BACI data first"
      />
    </div>
  )
}
