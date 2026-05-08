import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useWorkflowStore } from '@/store/workflowStore'

// Reset store state between tests
beforeEach(() => {
  useWorkflowStore.setState({
    product: '',
    segments: [],
    step1Prompt: '',
    step1RawResponse: '',
    step1Loading: false,
    llmHSAssignments: [],
    manualHSAssignments: [],
    agreementRate: 0,
    step2Prompt: '',
    step2Loading: false,
    baciFileId: '',
    processingLog: [],
    rowCount: 0,
    baciPreview: [],
    columnDtypes: {},
    step3Loading: false,
    sankeyNodes: [],
    sankeyLinks: [],
    totalTradeValue: 0,
    sankeyThreshold: 2,
    step4Loading: false,
    kpiWeights: { sustainability: 0.33, resilience: 0.34, cost: 0.33 },
    countryScores: [],
    pathAnalysis: [],
    dashboardLoading: false,
  })
})

describe('workflowStore', () => {
  it('sets product', () => {
    act(() => useWorkflowStore.getState().setProduct('NdFeB magnets'))
    expect(useWorkflowStore.getState().product).toBe('NdFeB magnets')
  })

  it('setStep1Result stores segments and prompt', () => {
    const segments = [{ id: 1, name: 'Mining', description: 'desc', key_materials: [], major_producing_countries: [] }]
    act(() => useWorkflowStore.getState().setStep1Result({ segments, prompt_used: 'p', raw_llm_response: 'r' }))
    expect(useWorkflowStore.getState().segments).toHaveLength(1)
    expect(useWorkflowStore.getState().step1Prompt).toBe('p')
    expect(useWorkflowStore.getState().step1RawResponse).toBe('r')
  })

  it('appendLog accumulates entries', () => {
    const log1 = { type: 'log' as const, message: 'first', timestamp: 1 }
    const log2 = { type: 'log' as const, message: 'second', timestamp: 2 }
    act(() => { useWorkflowStore.getState().appendLog(log1); useWorkflowStore.getState().appendLog(log2) })
    expect(useWorkflowStore.getState().processingLog).toHaveLength(2)
    expect(useWorkflowStore.getState().processingLog[1].message).toBe('second')
  })

  it('setStep3Complete stores file_id and row_count', () => {
    act(() => useWorkflowStore.getState().setStep3Complete({ file_id: 'abc123', row_count: 5000, preview: [], column_dtypes: {} }))
    expect(useWorkflowStore.getState().baciFileId).toBe('abc123')
    expect(useWorkflowStore.getState().rowCount).toBe(5000)
  })

  it('setSankeyThreshold updates threshold', () => {
    act(() => useWorkflowStore.getState().setSankeyThreshold(5))
    expect(useWorkflowStore.getState().sankeyThreshold).toBe(5)
  })

  it('setKPIWeights updates all weights', () => {
    const weights = { sustainability: 0.5, resilience: 0.3, cost: 0.2 }
    act(() => useWorkflowStore.getState().setKPIWeights(weights))
    expect(useWorkflowStore.getState().kpiWeights).toEqual(weights)
  })

  it('setDashboardResult stores country scores and path analysis', () => {
    const score = { iso3: 'CHN', sustainability: 50, resilience: 40, cost_efficiency: 60, composite: 50, hhi: 2000, betweenness_centrality: 0.1, lpi: 3.5, polstab: 0.5, epi: 45 }
    const path = { segment: 'Mining', exporter_iso3: 'CHN', trade_value: 1e9, share_pct: 60, composite_score: 50 }
    act(() => useWorkflowStore.getState().setDashboardResult({ country_scores: [score], path_analysis: [path] }))
    expect(useWorkflowStore.getState().countryScores).toHaveLength(1)
    expect(useWorkflowStore.getState().pathAnalysis[0].segment).toBe('Mining')
  })

  it('loading setters toggle correctly', () => {
    act(() => useWorkflowStore.getState().setStep1Loading(true))
    expect(useWorkflowStore.getState().step1Loading).toBe(true)
    act(() => useWorkflowStore.getState().setStep1Loading(false))
    expect(useWorkflowStore.getState().step1Loading).toBe(false)
  })
})
