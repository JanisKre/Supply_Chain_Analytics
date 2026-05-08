export interface ValueChainSegment {
  id: number
  name: string
  description: string
  key_materials: string[]
  major_producing_countries: string[]
}

export interface HSAssignment {
  segment_id: number
  segment_name: string
  hs_codes: string[]
  rationale?: string
  source?: string
}

export interface LogLine {
  type: 'log' | 'complete'
  step?: number
  message: string
  rows_before?: number | null
  rows_after?: number | null
  timestamp: number
}

export interface SankeyLink {
  source: number
  target: number
  value: number
  vcs_segment: string
}

export interface CountryKPI {
  iso3: string
  sustainability: number
  resilience: number
  cost_efficiency: number
  composite: number
  hhi: number
  betweenness_centrality: number
  lpi: number
  polstab: number
  epi: number
}

export interface PathScore {
  segment: string
  exporter_iso3: string
  trade_value: number
  share_pct: number
  composite_score: number | null
}
