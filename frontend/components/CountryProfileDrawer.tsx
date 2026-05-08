import type { CountryKPI } from '@/types'
import { X } from 'lucide-react'

interface Props {
  country: CountryKPI | null
  onClose: () => void
}

const SCORE_BARS: { key: keyof CountryKPI; label: string; color: string }[] = [
  { key: 'composite', label: 'Composite Score', color: 'var(--accent)' },
  { key: 'sustainability', label: 'Sustainability', color: '#34C759' },
  { key: 'resilience', label: 'Resilience', color: '#0071E3' },
  { key: 'cost_efficiency', label: 'Cost Efficiency', color: '#FF9F0A' },
]

const INDICATORS: { key: keyof CountryKPI; label: string; suffix?: string }[] = [
  { key: 'epi', label: 'EPI Score', suffix: '/ 100' },
  { key: 'lpi', label: 'Logistics Performance (LPI)', suffix: '/ 5' },
  { key: 'polstab', label: 'Political Stability', suffix: '(−2.5 – +2.5)' },
  { key: 'hhi', label: 'Market Concentration (HHI)' },
  { key: 'betweenness_centrality', label: 'Betweenness Centrality' },
]

export default function CountryProfileDrawer({ country, onClose }: Props) {
  if (!country) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="fixed right-0 top-0 bottom-0 z-50 w-96 overflow-y-auto flex flex-col"
        style={{ background: 'var(--surface)', boxShadow: '-4px 0 24px rgba(0,0,0,.12)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(0,0,0,.08)' }}>
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Country Profile</p>
            <h2 className="text-xl font-bold font-mono" style={{ color: 'var(--text)' }}>{country.iso3}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/[.05] transition-colors"
            style={{ color: 'var(--text-2)' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {/* Score bars */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-2)' }}>KPI Scores</h3>
            {SCORE_BARS.map(({ key, label, color }) => {
              const val = country[key] as number
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: 'var(--text)' }}>{label}</span>
                    <span className="font-semibold font-mono" style={{ color }}>{val}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,.08)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(val, 100)}%`, background: color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Raw indicators */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-2)' }}>Raw Indicators</h3>
            <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'rgba(0,0,0,.08)' }}>
              {INDICATORS.map(({ key, label, suffix }, i) => (
                <div
                  key={key}
                  className="flex items-center justify-between px-3 py-2.5 text-xs border-b last:border-0"
                  style={{ borderColor: 'rgba(0,0,0,.06)', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,.01)' }}
                >
                  <span style={{ color: 'var(--text-2)' }}>{label}</span>
                  <span className="font-mono font-semibold" style={{ color: 'var(--text)' }}>
                    {country[key]}{suffix ? <span className="font-normal text-[10px] ml-1" style={{ color: 'var(--text-2)' }}>{suffix}</span> : null}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
            Data sources: Yale EPI 2024 · World Bank LPI & Governance Indicators · IEA energy & labor cost indices
          </p>
        </div>
      </div>
    </>
  )
}
