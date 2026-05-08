'use client'
import { useEffect, useState } from 'react'
import { useWorkflowStore } from '@/store/workflowStore'
import { api } from '@/lib/apiClient'
import { toast } from 'sonner'
import TransparencyPanel from '@/components/layout/TransparencyPanel'
import StepFooter from '@/components/layout/StepFooter'
import { Loader2, RefreshCw, FlaskConical, Download } from 'lucide-react'
import type { CountryKPI } from '@/types'
import { downloadCSV } from '@/lib/utils'
import CountryProfileDrawer from '@/components/CountryProfileDrawer'
import { SkeletonTable, SkeletonCard } from '@/components/Skeleton'

const WEIGHT_LABELS: Record<string, string> = {
  sustainability: 'Sustainability',
  resilience: 'Resilience',
  cost: 'Cost Efficiency',
}
const WEIGHT_COLORS: Record<string, string> = {
  sustainability: '#34C759',
  resilience: '#0071E3',
  cost: '#FF9F0A',
}

const TOP_COUNTRIES = ['CHN', 'DEU', 'USA', 'JPN', 'KOR', 'FRA', 'GBR', 'AUS', 'BRA', 'RUS', 'IND', 'ZAF', 'MYS', 'THA', 'CZE']

function DeltaBadge({ delta }: { readonly delta: number }) {
  if (delta === 0) return <span style={{ color: 'var(--text-2)' }}>—</span>
  const color = delta > 0 ? '#34C759' : '#FF3B30'
  return <span className="font-semibold" style={{ color }}>{delta > 0 ? '+' : ''}{delta.toFixed(1)}</span>
}

export default function DashboardPage() {
  const {
    baciFileId, countryScores, pathAnalysis, kpiWeights,
    dashboardLoading, setDashboardLoading, setDashboardResult, setKPIWeights,
  } = useWorkflowStore()

  const [excluded, setExcluded] = useState<string[]>([])
  const [scenarioScores, setScenarioScores] = useState<CountryKPI[]>([])
  const [scenarioLoading, setScenarioLoading] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState<CountryKPI | null>(null)

  async function loadKPIs() {
    if (!baciFileId) { toast.error('Process BACI data first'); return }
    setDashboardLoading(true)
    try {
      const res = await api.computeKPIs(baciFileId, TOP_COUNTRIES, kpiWeights)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setDashboardResult(data)
      toast.success('KPIs computed')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to compute KPIs')
    } finally {
      setDashboardLoading(false)
    }
  }

  async function runScenario() {
    if (!baciFileId || excluded.length === 0) return
    setScenarioLoading(true)
    try {
      const res = await api.computeScenario(baciFileId, TOP_COUNTRIES, kpiWeights, excluded)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setScenarioScores(data.country_scores)
      toast.success(`Scenario computed (${excluded.join(', ')} excluded)`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Scenario computation failed')
    } finally {
      setScenarioLoading(false)
    }
  }

  function toggleExcluded(iso3: string) {
    setExcluded((prev) => prev.includes(iso3) ? prev.filter((c) => c !== iso3) : [...prev, iso3])
    setScenarioScores([])
  }

  useEffect(() => {
    if (baciFileId && countryScores.length === 0) loadKPIs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baciFileId])

  function updateWeight(key: string, val: number) {
    const others = Object.keys(kpiWeights).filter((k) => k !== key) as (keyof typeof kpiWeights)[]
    const remainder = 1 - val
    const otherSum = others.reduce((s, k) => s + kpiWeights[k], 0)
    const newW = { ...kpiWeights, [key]: val }
    others.forEach((k) => {
      newW[k] = otherSum > 0 ? (kpiWeights[k] / otherSum) * remainder : remainder / others.length
    })
    setKPIWeights(newW)
  }

  const sorted = [...countryScores].sort((a, b) => b.composite - a.composite)
  const baselineMap = Object.fromEntries(countryScores.map((s) => [s.iso3, s]))

  return (
    <>
      <CountryProfileDrawer country={selectedCountry} onClose={() => setSelectedCountry(null)} />
      <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>KPI Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>Multi-criteria scoring: sustainability · resilience · cost efficiency</p>
        </div>
        <button
          onClick={loadKPIs}
          disabled={dashboardLoading || !baciFileId}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium text-white disabled:opacity-50"
          style={{ background: 'var(--accent)' }}
        >
          {dashboardLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Refresh
        </button>
      </div>

      {/* Weight sliders */}
      <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Weight Sliders</h3>
        {Object.keys(kpiWeights).map((key) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-sm w-36 shrink-0" style={{ color: 'var(--text)' }}>{WEIGHT_LABELS[key]}</span>
            <input
              type="range" min={0.05} max={0.9} step={0.01}
              value={kpiWeights[key as keyof typeof kpiWeights]}
              onChange={(e) => updateWeight(key, Number(e.target.value))}
              className="flex-1"
              style={{ accentColor: WEIGHT_COLORS[key] }}
            />
            <span className="text-sm font-mono w-10 text-right shrink-0" style={{ color: 'var(--text-2)' }}>
              {Math.round(kpiWeights[key as keyof typeof kpiWeights] * 100)}%
            </span>
          </div>
        ))}
      </div>

      {/* Country scores table */}
      {sorted.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'rgba(0,0,0,.08)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Country Scores</h3>
            <button
              onClick={() => downloadCSV(sorted as unknown as Record<string, unknown>[], 'kpi_scores.csv')}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border"
              style={{ color: 'var(--text-2)', borderColor: 'rgba(0,0,0,.12)' }}
            >
              <Download size={11} /> Export CSV
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'rgba(0,0,0,.08)' }}>
                {['Rank', 'Country', 'Composite', 'Sustainability', 'Resilience', 'Cost Eff.', 'EPI', 'LPI'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-2)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, i) => (
                <tr
                  key={s.iso3}
                  onClick={() => setSelectedCountry(s)}
                  className="border-b last:border-0 hover:bg-black/[.02] transition-colors cursor-pointer"
                  style={{ borderColor: 'rgba(0,0,0,.06)' }}
                >
                  <td className="px-4 py-3 text-xs font-bold" style={{ color: 'var(--text-2)' }}>#{i + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: 'var(--text)' }}>{s.iso3}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,.08)' }}>
                        <div className="h-full rounded-full" style={{ width: `${s.composite}%`, background: 'var(--accent)' }} />
                      </div>
                      <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{s.composite}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text)' }}>{s.sustainability}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text)' }}>{s.resilience}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text)' }}>{s.cost_efficiency}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text)' }}>{s.epi}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text)' }}>{s.lpi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Path analysis */}
      {pathAnalysis.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'rgba(0,0,0,.08)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Top Exporters by Segment</h3>
            <button
              onClick={() => downloadCSV(pathAnalysis as unknown as Record<string, unknown>[], 'path_analysis.csv')}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border"
              style={{ color: 'var(--text-2)', borderColor: 'rgba(0,0,0,.12)' }}
            >
              <Download size={11} /> Export CSV
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'rgba(0,0,0,.08)' }}>
                {['Segment', 'Exporter', 'Trade Value', 'Share', 'Composite Score'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-2)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pathAnalysis.map((p) => (
                <tr key={`${p.segment}-${p.exporter_iso3}`} className="border-b last:border-0 hover:bg-black/[.01]" style={{ borderColor: 'rgba(0,0,0,.06)' }}>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-2)' }}>{p.segment}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: 'var(--text)' }}>{p.exporter_iso3}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text)' }}>${(p.trade_value / 1e6).toFixed(1)}M</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text)' }}>{p.share_pct}%</td>
                  <td className="px-4 py-3 text-xs" style={{ color: p.composite_score != null ? 'var(--text)' : 'var(--text-2)' }}>
                    {p.composite_score ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Scenario Analysis */}
      {countryScores.length > 0 && (
        <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <FlaskConical size={14} />
                Scenario Analysis
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
                Select countries to exclude and see how composite scores shift
              </p>
            </div>
            <button
              onClick={runScenario}
              disabled={scenarioLoading || excluded.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white shrink-0 disabled:opacity-40"
              style={{ background: 'var(--accent)' }}
            >
              {scenarioLoading ? <Loader2 size={13} className="animate-spin" /> : <FlaskConical size={13} />}
              Run Scenario
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {TOP_COUNTRIES.map((iso3) => {
              const isExcluded = excluded.includes(iso3)
              return (
                <button
                  key={iso3}
                  onClick={() => toggleExcluded(iso3)}
                  className="px-3 py-1 rounded-full text-xs font-mono font-semibold border transition-colors"
                  style={{
                    background: isExcluded ? 'var(--accent)' : 'transparent',
                    color: isExcluded ? '#fff' : 'var(--text)',
                    borderColor: isExcluded ? 'var(--accent)' : 'rgba(0,0,0,.15)',
                  }}
                >
                  {iso3}
                </button>
              )
            })}
          </div>

          {scenarioScores.length > 0 && (
            <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'rgba(0,0,0,.08)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ background: 'rgba(0,0,0,.02)', borderColor: 'rgba(0,0,0,.08)' }}>
                    {['Country', 'Baseline', 'Scenario', 'Δ Composite', 'Δ Resilience'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: 'var(--text-2)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scenarioScores
                    .slice()
                    .sort((a, b) => {
                      const da = a.composite - (baselineMap[a.iso3]?.composite ?? a.composite)
                      const db = b.composite - (baselineMap[b.iso3]?.composite ?? b.composite)
                      return db - da
                    })
                    .map((s) => {
                      const base = baselineMap[s.iso3]
                      const deltaComp = base ? +(s.composite - base.composite).toFixed(1) : 0
                      const deltaRes = base ? +(s.resilience - base.resilience).toFixed(1) : 0
                      return (
                        <tr key={s.iso3} className="border-b last:border-0" style={{ borderColor: 'rgba(0,0,0,.06)' }}>
                          <td className="px-4 py-2.5 font-mono text-xs font-semibold" style={{ color: 'var(--text)' }}>{s.iso3}</td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-2)' }}>{base?.composite ?? '—'}</td>
                          <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: 'var(--text)' }}>{s.composite}</td>
                          <td className="px-4 py-2.5 text-xs"><DeltaBadge delta={deltaComp} /></td>
                          <td className="px-4 py-2.5 text-xs"><DeltaBadge delta={deltaRes} /></td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <TransparencyPanel sections={[
        {
          label: 'KPI Formulas & Data Sources',
          content: (
            <div className="text-xs space-y-2 leading-relaxed" style={{ color: 'var(--text-2)' }}>
              <p><strong>EPI</strong> — Yale Environmental Performance Index 2024 (bundled CSV, 0–100)</p>
              <p><strong>LPI</strong> — World Bank Logistics Performance Index, indicator LP.LPI.OVRL.XQ (live API, 1–5 → normalized 0–100)</p>
              <p><strong>Political Stability</strong> — World Bank PV.EST Governance Indicator (live API, −2.5…+2.5 → normalized 0–100)</p>
              <p><strong>Sustainability</strong> = (EPI + Political Stability norm) / 2</p>
              <p><strong>Resilience</strong> = 100 − betweenness_centrality × 100 (networkx, directed graph weighted by v)</p>
              <p><strong>HHI</strong> = Σ(export_share²) × 10,000 — market concentration across all HS codes</p>
              <p><strong>Cost Efficiency</strong> = 100 − (labor_cost_index + energy_cost_index) / 2 (bundled indices)</p>
              <p><strong>Composite</strong> = w_sust × sustainability + w_res × resilience + w_cost × cost_efficiency</p>
              <p><strong>Scenario Analysis</strong> — excludes selected countries as exporters and recomputes all scores</p>
            </div>
          ),
        },
      ]} />

      <StepFooter
        prevHref="/workflow/step4"
        prevLabel="Sankey Diagram"
      />
    </div>
    </>
  )
}
