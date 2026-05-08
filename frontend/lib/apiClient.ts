const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface LLMSettings {
  provider: 'anthropic' | 'proxy'
  api_key_masked: string
  has_api_key: boolean
  base_url: string
  model: string
  available_models: string[]
}

export const api = {
  generateValueChain: (product: string) =>
    fetch(`${BASE}/api/value-chain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product }),
    }),

  assignHSCodes: (product: string, segments: unknown[]) =>
    fetch(`${BASE}/api/hs-codes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product, segments }),
    }),

  downloadBaci: (hsCodes: string[]) =>
    fetch(`${BASE}/api/baci/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hs_codes: hsCodes }),
    }),

  processBaci: (file: File, hsCodes: string[]) => {
    const form = new FormData()
    form.append('file', file)
    form.append('hs_codes', JSON.stringify(hsCodes))
    return fetch(`${BASE}/api/baci/process`, { method: 'POST', body: form })
  },

  prepareSankey: (fileId: string, thresholdPct: number) =>
    fetch(`${BASE}/api/sankey/prepare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId, threshold_pct: thresholdPct }),
    }),

  computeKPIs: (
    fileId: string,
    countryList: string[],
    weights: { sustainability: number; resilience: number; cost: number }
  ) =>
    fetch(`${BASE}/api/kpi/compute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId, country_list: countryList, weights }),
    }),

  computeScenario: (
    fileId: string,
    countryList: string[],
    weights: { sustainability: number; resilience: number; cost: number },
    excludedCountries: string[]
  ) =>
    fetch(`${BASE}/api/kpi/scenario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId, country_list: countryList, weights, excluded_countries: excludedCountries }),
    }),

  getSettings: () =>
    fetch(`${BASE}/api/settings`),

  updateSettings: (data: { provider?: string; api_key?: string; base_url?: string; model?: string }) =>
    fetch(`${BASE}/api/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  testSettings: () =>
    fetch(`${BASE}/api/settings/test`, { method: 'POST' }),
}
