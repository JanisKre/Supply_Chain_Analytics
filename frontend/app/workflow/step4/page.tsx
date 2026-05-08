'use client'
import { useEffect, useRef, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useWorkflowStore } from '@/store/workflowStore'
import { api } from '@/lib/apiClient'
import { toast } from 'sonner'
import TransparencyPanel from '@/components/layout/TransparencyPanel'
import StepFooter from '@/components/layout/StepFooter'
import { Loader2, BarChart3, Download, X } from 'lucide-react'
import type { SankeyLink } from '@/types'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

const STAGE_COLORS = ['#FF9F0A', '#0071E3', '#34C759', '#FF3B30', '#AF52DE', '#FF2D55', '#5AC8FA', '#FFCC00']

function computeNodePositions(nodes: string[], links: SankeyLink[], stageOrder: Record<string, number>) {
  const stageCount = Object.keys(stageOrder).length
  const sourcesSet = new Set(links.map((l) => l.source))
  const targetsSet = new Set(links.map((l) => l.target))

  const isSegment = nodes.map((_, i) => sourcesSet.has(i) && targetsSet.has(i))
  const isExporter = nodes.map((_, i) => sourcesSet.has(i) && !targetsSet.has(i))

  const nodeX = nodes.map((name, i) => {
    if (isSegment[i]) {
      const stageIdx = stageOrder[name]
      if (stageIdx !== undefined) {
        return stageCount === 1 ? 0.5 : 0.28 + (stageIdx / (stageCount - 1)) * 0.44
      }
      return 0.5
    }
    return isExporter[i] ? 0.01 : 0.99
  })

  const xBuckets = new Map<number, number[]>()
  nodeX.forEach((xv, i) => {
    const key = Math.round(xv * 1000)
    const bucket = xBuckets.get(key)
    if (bucket) { bucket.push(i) } else { xBuckets.set(key, [i]) }
  })

  const nodeY = new Array(nodes.length).fill(0.5)
  xBuckets.forEach((indices) => {
    const n = indices.length
    indices.forEach((idx, pos) => { nodeY[idx] = n === 1 ? 0.5 : 0.05 + (pos / (n - 1)) * 0.9 })
  })

  return { nodeX, nodeY }
}

function filterByFocusNode(nodes: string[], links: SankeyLink[], focusedNode: string) {
  const focusedIdx = nodes.indexOf(focusedNode)
  if (focusedIdx === -1) return { nodes, links }

  const filtered = links.filter((l) => l.source === focusedIdx || l.target === focusedIdx)
  const used = new Set<number>()
  filtered.forEach((l) => { used.add(l.source); used.add(l.target) })

  const oldToNew = new Map<number, number>()
  const newNodes: string[] = []
  ;[...used].sort((a, b) => a - b).forEach((oldIdx, newIdx) => {
    oldToNew.set(oldIdx, newIdx)
    newNodes.push(nodes[oldIdx])
  })

  return {
    nodes: newNodes,
    links: filtered.map((l) => ({ ...l, source: oldToNew.get(l.source)!, target: oldToNew.get(l.target)! })),
  }
}

export default function Step4Page() {
  const {
    baciFileId, segments, sankeyNodes, sankeyLinks, totalTradeValue,
    sankeyThreshold, step4Loading,
    setStep4Loading, setSankeyResult, setSankeyThreshold,
  } = useWorkflowStore()

  const [focusedNode, setFocusedNode] = useState<string>('')

  const stageOrder = Object.fromEntries(
    [...segments].sort((a, b) => a.id - b.id).map((s, i) => [s.name, i])
  )

  const plotDivRef = useRef<HTMLElement | null>(null)

  async function loadSankey(threshold: number) {
    if (!baciFileId) { toast.error('Process BACI data first'); return }
    setStep4Loading(true)
    try {
      const res = await api.prepareSankey(baciFileId, threshold)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setSankeyResult(data)
      setFocusedNode('')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to prepare Sankey')
    } finally {
      setStep4Loading(false)
    }
  }

  useEffect(() => {
    if (baciFileId && sankeyNodes.length === 0) loadSankey(sankeyThreshold)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baciFileId])

  async function handleExport() {
    if (!plotDivRef.current) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Plotly = await import('plotly.js') as any
      await Plotly.downloadImage(plotDivRef.current, { format: 'png', width: 1800, height: 650, filename: 'sankey_diagram' })
    } catch {
      toast.error('Export failed')
    }
  }

  const { nodes: visNodes, links: visLinks } = useMemo(
    () => focusedNode ? filterByFocusNode(sankeyNodes, sankeyLinks, focusedNode) : { nodes: sankeyNodes, links: sankeyLinks },
    [sankeyNodes, sankeyLinks, focusedNode]
  )

  const nodeColors = visNodes.map((n) => {
    const idx = stageOrder[n]
    return idx === undefined ? '#6E6E73' : STAGE_COLORS[idx % STAGE_COLORS.length]
  })
  const linkColors = visLinks.map((l) => {
    const idx = stageOrder[l.vcs_segment]
    const base = idx === undefined ? '#6E6E73' : STAGE_COLORS[idx % STAGE_COLORS.length]
    return base + '50'
  })

  const { nodeX, nodeY } = visNodes.length > 0
    ? computeNodePositions(visNodes, visLinks, stageOrder)
    : { nodeX: [], nodeY: [] }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>Step 4 — Sankey Diagram</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>Bilateral trade flows across the rare earth value chain segments.</p>
        </div>
        {sankeyNodes.length > 0 && (
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium"
            style={{ background: 'var(--surface)', color: 'var(--text)', boxShadow: 'var(--shadow)' }}
          >
            <Download size={14} />
            Export PNG
          </button>
        )}
      </div>

      <div className="rounded-xl p-5 flex flex-wrap items-center gap-4" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}>
        <label className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--text)' }}>
          Min. flow share: <span style={{ color: 'var(--accent)' }}>{sankeyThreshold}%</span>
        </label>
        <input
          type="range" min={0.5} max={10} step={0.5}
          value={sankeyThreshold}
          onChange={(e) => setSankeyThreshold(Number(e.target.value))}
          className="flex-1 min-w-32"
          style={{ accentColor: 'var(--accent)' }}
        />
        <button
          onClick={() => loadSankey(sankeyThreshold)}
          disabled={step4Loading || !baciFileId}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white disabled:opacity-50 whitespace-nowrap"
          style={{ background: 'var(--accent)' }}
        >
          {step4Loading ? <Loader2 size={15} className="animate-spin" /> : <BarChart3 size={15} />}
          Refresh
        </button>

        {sankeyNodes.length > 0 && (
          <div className="flex items-center gap-2 border-l pl-4" style={{ borderColor: 'rgba(0,0,0,.1)' }}>
            <label className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--text)' }}>Focus node:</label>
            <select
              value={focusedNode}
              onChange={(e) => setFocusedNode(e.target.value)}
              className="text-sm rounded-lg px-2 py-1.5 border"
              style={{ color: 'var(--text)', background: 'var(--bg)', borderColor: 'rgba(0,0,0,.15)' }}
            >
              <option value="">All nodes</option>
              {sankeyNodes.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            {focusedNode && (
              <button onClick={() => setFocusedNode('')} className="p-1 rounded-full hover:bg-black/[.05]" style={{ color: 'var(--text-2)' }}>
                <X size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {totalTradeValue > 0 && (
        <p className="text-xs" style={{ color: 'var(--text-2)' }}>
          Total trade value: <strong>${(totalTradeValue / 1e9).toFixed(2)}B</strong>
          {' · '}{visNodes.length} nodes{focusedNode ? ` (filtered from ${sankeyNodes.length})` : ''}
          {' · '}{visLinks.length} links
        </p>
      )}

      {visNodes.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}>
          <Plot
            data={[{
              type: 'sankey' as const,
              arrangement: 'fixed',
              orientation: 'h' as const,
              node: {
                pad: 15,
                thickness: 20,
                label: visNodes,
                color: nodeColors,
                x: nodeX,
                y: nodeY,
                hovertemplate: '%{label}<br>Total: $%{value:,.0f}<extra></extra>',
              },
              link: {
                source: visLinks.map((l) => l.source),
                target: visLinks.map((l) => l.target),
                value: visLinks.map((l) => l.value),
                color: linkColors,
                hovertemplate: '%{source.label} → %{target.label}<br>$%{value:,.0f}<extra></extra>',
              },
            } as object]}
            layout={{
              font: { family: 'Inter, sans-serif', size: 11, color: '#1D1D1F' },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              margin: { l: 20, r: 20, t: 20, b: 20 },
              height: 520,
            } as object}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%' }}
            onInitialized={(_, graphDiv) => { plotDivRef.current = graphDiv }}
            onUpdate={(_, graphDiv) => { plotDivRef.current = graphDiv }}
          />
        </div>
      )}

      {sankeyLinks.length > 0 && (
        <TransparencyPanel sections={[
          {
            label: 'Node & Link Data',
            content: (
              <pre className="text-xs overflow-x-auto leading-relaxed" style={{ color: 'var(--text-2)' }}>
                {JSON.stringify({ nodes: sankeyNodes, sample_links: sankeyLinks.slice(0, 5) }, null, 2)}
                {sankeyLinks.length > 5 && `\n… +${sankeyLinks.length - 5} more links`}
              </pre>
            ),
          },
          {
            label: 'Transformation Logic',
            content: (
              <ol className="text-xs space-y-1.5 list-decimal list-inside leading-relaxed" style={{ color: 'var(--text-2)' }}>
                <li>Load enriched Parquet from Step 3 (file_id: {baciFileId || '—'})</li>
                <li>Filter rows where trade value v &gt; 0</li>
                <li>Compute total trade value across all filtered rows</li>
                <li>Aggregate: exporter_name × segment_name × importer_name → sum(v)</li>
                <li>Calculate flow_share = group_v / total × 100%</li>
                <li>Drop all flows below <strong>{sankeyThreshold}%</strong> threshold</li>
                <li>Build integer node index; create source→target link pairs</li>
                <li>Stage x-positions distributed evenly across {Object.keys(stageOrder).length || '…'} process steps (x: 0.28–0.72)</li>
              </ol>
            ),
          },
        ]} />
      )}

      <StepFooter
        prevHref="/workflow/step3"
        prevLabel="BACI Data"
        nextHref="/workflow/dashboard"
        nextLabel="KPI Dashboard"
        canProceed={sankeyNodes.length > 0}
        blockedHint="Load the Sankey diagram first"
      />
    </div>
  )
}

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

const STAGE_COLORS = ['#FF9F0A', '#0071E3', '#34C759', '#FF3B30', '#AF52DE', '#FF2D55', '#5AC8FA', '#FFCC00']

function computeNodePositions(nodes: string[], links: SankeyLink[], stageOrder: Record<string, number>) {
  const stageCount = Object.keys(stageOrder).length
  const sourcesSet = new Set(links.map((l) => l.source))
  const targetsSet = new Set(links.map((l) => l.target))

  // Segment nodes appear as both source (→importer) and target (exporter→)
  const isSegment = nodes.map((_, i) => sourcesSet.has(i) && targetsSet.has(i))
  const isExporter = nodes.map((_, i) => sourcesSet.has(i) && !targetsSet.has(i))

  const nodeX = nodes.map((name, i) => {
    if (isSegment[i]) {
      const stageIdx = stageOrder[name]
      if (stageIdx !== undefined) {
        // Stages span x = 0.28 … 0.72, distributed evenly across all process steps
        return stageCount === 1 ? 0.5 : 0.28 + (stageIdx / (stageCount - 1)) * 0.44
      }
      return 0.5
    }
    return isExporter[i] ? 0.01 : 0.99
  })

  // Distribute y evenly within each x-column
  const xBuckets = new Map<number, number[]>()
  nodeX.forEach((xv, i) => {
    const key = Math.round(xv * 1000)
    const bucket = xBuckets.get(key)
    if (bucket) {
      bucket.push(i)
    } else {
      xBuckets.set(key, [i])
    }
  })

  const nodeY = new Array(nodes.length).fill(0.5)
  xBuckets.forEach((indices) => {
    const n = indices.length
    indices.forEach((idx, pos) => {
      nodeY[idx] = n === 1 ? 0.5 : 0.05 + (pos / (n - 1)) * 0.9
    })
  })

  return { nodeX, nodeY }
}

export default function Step4Page() {
  const {
    baciFileId, segments, sankeyNodes, sankeyLinks, totalTradeValue,
    sankeyThreshold, step4Loading,
    setStep4Loading, setSankeyResult, setSankeyThreshold,
  } = useWorkflowStore()

  // Build stage order dynamically from the defined process segments (sorted by id)
  const stageOrder = Object.fromEntries(
    [...segments].sort((a, b) => a.id - b.id).map((s, i) => [s.name, i])
  )

  const plotDivRef = useRef<HTMLElement | null>(null)

  async function loadSankey(threshold: number) {
    if (!baciFileId) { toast.error('Process BACI data first'); return }
    setStep4Loading(true)
    try {
      const res = await api.prepareSankey(baciFileId, threshold)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setSankeyResult(data)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to prepare Sankey')
    } finally {
      setStep4Loading(false)
    }
  }

  useEffect(() => {
    if (baciFileId && sankeyNodes.length === 0) loadSankey(sankeyThreshold)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baciFileId])

  async function handleExport() {
    if (!plotDivRef.current) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Plotly = await import('plotly.js') as any
      await Plotly.downloadImage(plotDivRef.current, {
        format: 'png',
        width: 1800,
        height: 650,
        filename: 'sankey_diagram',
      })
    } catch {
      toast.error('Export failed')
    }
  }

  const nodeColors = sankeyNodes.map((n) => {
    const idx = stageOrder[n]
    return idx === undefined ? '#6E6E73' : STAGE_COLORS[idx % STAGE_COLORS.length]
  })
  const linkColors = sankeyLinks.map((l) => {
    const idx = stageOrder[l.vcs_segment]
    const base = idx === undefined ? '#6E6E73' : STAGE_COLORS[idx % STAGE_COLORS.length]
    return base + '50'
  })

  const { nodeX, nodeY } = sankeyNodes.length > 0
    ? computeNodePositions(sankeyNodes, sankeyLinks, stageOrder)
    : { nodeX: [], nodeY: [] }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>Step 4 — Sankey Diagram</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>Bilateral trade flows across the rare earth value chain segments.</p>
        </div>
        {sankeyNodes.length > 0 && (
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium"
            style={{ background: 'var(--surface)', color: 'var(--text)', boxShadow: 'var(--shadow)' }}
          >
            <Download size={14} />
            Export PNG
          </button>
        )}
      </div>

      <div className="rounded-xl p-5 flex items-center gap-4" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}>
        <label className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--text)' }}>
          Min. flow share: <span style={{ color: 'var(--accent)' }}>{sankeyThreshold}%</span>
        </label>
        <input
          type="range" min={0.5} max={10} step={0.5}
          value={sankeyThreshold}
          onChange={(e) => setSankeyThreshold(Number(e.target.value))}
          className="flex-1"
          style={{ accentColor: 'var(--accent)' }}
        />
        <button
          onClick={() => loadSankey(sankeyThreshold)}
          disabled={step4Loading || !baciFileId}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white disabled:opacity-50 whitespace-nowrap"
          style={{ background: 'var(--accent)' }}
        >
          {step4Loading ? <Loader2 size={15} className="animate-spin" /> : <BarChart3 size={15} />}
          Refresh
        </button>
      </div>

      {totalTradeValue > 0 && (
        <p className="text-xs" style={{ color: 'var(--text-2)' }}>
          Total trade value: <strong>${(totalTradeValue / 1e9).toFixed(2)}B</strong>
          {' · '}{sankeyNodes.length} nodes{' · '}{sankeyLinks.length} links
        </p>
      )}

      {sankeyNodes.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}>
          <Plot
            data={[{
              type: 'sankey' as const,
              arrangement: 'fixed',
              orientation: 'h' as const,
              node: {
                pad: 15,
                thickness: 20,
                label: sankeyNodes,
                color: nodeColors,
                x: nodeX,
                y: nodeY,
                hovertemplate: '%{label}<br>Total: $%{value:,.0f}<extra></extra>',
              },
              link: {
                source: sankeyLinks.map((l) => l.source),
                target: sankeyLinks.map((l) => l.target),
                value: sankeyLinks.map((l) => l.value),
                color: linkColors,
                hovertemplate: '%{source.label} → %{target.label}<br>$%{value:,.0f}<extra></extra>',
              },
            } as object]}
            layout={{
              font: { family: 'Inter, sans-serif', size: 11, color: '#1D1D1F' },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              margin: { l: 20, r: 20, t: 20, b: 20 },
              height: 520,
            } as object}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%' }}
            onInitialized={(_, graphDiv) => { plotDivRef.current = graphDiv }}
            onUpdate={(_, graphDiv) => { plotDivRef.current = graphDiv }}
          />
        </div>
      )}

      {sankeyLinks.length > 0 && (
        <TransparencyPanel sections={[
          {
            label: 'Node & Link Data',
            content: (
              <pre className="text-xs overflow-x-auto leading-relaxed" style={{ color: 'var(--text-2)' }}>
                {JSON.stringify({ nodes: sankeyNodes, sample_links: sankeyLinks.slice(0, 5) }, null, 2)}
                {sankeyLinks.length > 5 && `\n… +${sankeyLinks.length - 5} more links`}
              </pre>
            ),
          },
          {
            label: 'Transformation Logic',
            content: (
              <ol className="text-xs space-y-1.5 list-decimal list-inside leading-relaxed" style={{ color: 'var(--text-2)' }}>
                <li>Load enriched Parquet from Step 3 (file_id: {baciFileId || '—'})</li>
                <li>Filter rows where trade value v &gt; 0</li>
                <li>Compute total trade value across all filtered rows</li>
                <li>Aggregate: exporter_name × segment_name × importer_name → sum(v)</li>
                <li>Calculate flow_share = group_v / total × 100%</li>
                <li>Drop all flows below <strong>{sankeyThreshold}%</strong> threshold</li>
                <li>Build integer node index; create source→target link pairs</li>
                <li>Stage x-positions distributed evenly across {Object.keys(stageOrder).length || '…'} process steps (x: 0.28–0.72)</li>
              </ol>
            ),
          },
        ]} />
      )}

      <StepFooter
        prevHref="/workflow/step3"
        prevLabel="BACI Data"
        nextHref="/workflow/dashboard"
        nextLabel="KPI Dashboard"
        canProceed={sankeyNodes.length > 0}
        blockedHint="Load the Sankey diagram first"
      />
    </div>
  )
}
