import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ValueChainSegment, HSAssignment, LogLine, SankeyLink, CountryKPI, PathScore } from '@/types'

interface KPIWeights { sustainability: number; resilience: number; cost: number }

interface WorkflowState {
  product: string
  segments: ValueChainSegment[]
  step1Prompt: string
  step1RawResponse: string
  step1Loading: boolean

  llmHSAssignments: HSAssignment[]
  manualHSAssignments: HSAssignment[]
  agreementRate: number
  step2Prompt: string
  step2Loading: boolean

  baciFileId: string
  processingLog: LogLine[]
  rowCount: number
  baciPreview: Record<string, unknown>[]
  columnDtypes: Record<string, string>
  step3Loading: boolean

  sankeyNodes: string[]
  sankeyLinks: SankeyLink[]
  totalTradeValue: number
  sankeyThreshold: number
  step4Loading: boolean

  kpiWeights: KPIWeights
  countryScores: CountryKPI[]
  pathAnalysis: PathScore[]
  dashboardLoading: boolean

  setProduct: (p: string) => void
  setStep1Result: (r: { segments: ValueChainSegment[]; prompt_used: string; raw_llm_response: string }) => void
  setStep1Loading: (v: boolean) => void
  setStep2Result: (r: { llm_assignments: HSAssignment[]; manual_assignments: HSAssignment[]; agreement_rate: number; prompt_used: string }) => void
  setStep2Loading: (v: boolean) => void
  appendLog: (l: LogLine) => void
  setStep3Complete: (r: { file_id: string; row_count: number; preview: Record<string, unknown>[]; column_dtypes: Record<string, string> }) => void
  setStep3Loading: (v: boolean) => void
  setSankeyResult: (r: { nodes: string[]; links: SankeyLink[]; total_trade_value: number }) => void
  setSankeyThreshold: (v: number) => void
  setStep4Loading: (v: boolean) => void
  setKPIWeights: (w: KPIWeights) => void
  setDashboardResult: (r: { country_scores: CountryKPI[]; path_analysis: PathScore[] }) => void
  setDashboardLoading: (v: boolean) => void
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set) => ({
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

      setProduct: (p) => set({ product: p }),
      setStep1Result: (r) => set({ segments: r.segments, step1Prompt: r.prompt_used, step1RawResponse: r.raw_llm_response }),
      setStep1Loading: (v) => set({ step1Loading: v }),
      setStep2Result: (r) => set({ llmHSAssignments: r.llm_assignments, manualHSAssignments: r.manual_assignments, agreementRate: r.agreement_rate, step2Prompt: r.prompt_used }),
      setStep2Loading: (v) => set({ step2Loading: v }),
      appendLog: (l) => set((s) => ({ processingLog: [...s.processingLog, l] })),
      setStep3Complete: (r) => set({ baciFileId: r.file_id, rowCount: r.row_count, baciPreview: r.preview, columnDtypes: r.column_dtypes }),
      setStep3Loading: (v) => set({ step3Loading: v }),
      setSankeyResult: (r) => set({ sankeyNodes: r.nodes, sankeyLinks: r.links, totalTradeValue: r.total_trade_value }),
      setSankeyThreshold: (v) => set({ sankeyThreshold: v }),
      setStep4Loading: (v) => set({ step4Loading: v }),
      setKPIWeights: (w) => set({ kpiWeights: w }),
      setDashboardResult: (r) => set({ countryScores: r.country_scores, pathAnalysis: r.path_analysis }),
      setDashboardLoading: (v) => set({ dashboardLoading: v }),
    }),
    {
      name: 'supply-chain-workflow',
      partialize: (state) => ({
        product: state.product,
        segments: state.segments,
        step1Prompt: state.step1Prompt,
        step1RawResponse: state.step1RawResponse,
        llmHSAssignments: state.llmHSAssignments,
        manualHSAssignments: state.manualHSAssignments,
        agreementRate: state.agreementRate,
        step2Prompt: state.step2Prompt,
        baciFileId: state.baciFileId,
        rowCount: state.rowCount,
        baciPreview: state.baciPreview,
        columnDtypes: state.columnDtypes,
        sankeyNodes: state.sankeyNodes,
        sankeyLinks: state.sankeyLinks,
        totalTradeValue: state.totalTradeValue,
        sankeyThreshold: state.sankeyThreshold,
        kpiWeights: state.kpiWeights,
        countryScores: state.countryScores,
        pathAnalysis: state.pathAnalysis,
      }),
    }
  )
)
