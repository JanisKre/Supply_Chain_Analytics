'use client'
import { useEffect, useState } from 'react'
import { api, type LLMSettings } from '@/lib/apiClient'
import { toast } from 'sonner'
import { Loader2, Save, FlaskConical, Check, Eye, EyeOff } from 'lucide-react'
import StepFooter from '@/components/layout/StepFooter'

const PROVIDER_LABELS = {
  anthropic: 'Anthropic (direct)',
  proxy: 'Custom Proxy',
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<LLMSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; model?: string; error?: string } | null>(null)
  const [showKey, setShowKey] = useState(false)

  const [provider, setProvider] = useState<'anthropic' | 'proxy'>('proxy')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [model, setModel] = useState('claude-sonnet-4-6')

  useEffect(() => {
    api.getSettings()
      .then((r) => r.json())
      .then((data: LLMSettings) => {
        setSettings(data)
        setProvider(data.provider)
        setBaseUrl(data.base_url)
        setModel(data.model)
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setTestResult(null)
    try {
      const body: Record<string, string> = { provider, base_url: baseUrl, model }
      if (apiKey) body.api_key = apiKey
      const res = await api.updateSettings(body)
      if (!res.ok) throw new Error(await res.text())
      const updated: LLMSettings = await res.json()
      setSettings(updated)
      setApiKey('')
      toast.success('Settings saved')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await api.testSettings()
      const data = await res.json()
      setTestResult(data)
      if (data.ok) toast.success(`Connection OK — ${data.model}`)
      else toast.error(`Connection failed: ${data.error}`)
    } catch {
      toast.error('Test request failed')
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
        <Loader2 size={14} className="animate-spin" /> Loading settings…
      </div>
    )
  }

  const isDirty = provider !== settings?.provider || apiKey !== '' || baseUrl !== settings?.base_url || model !== settings?.model

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>LLM Settings</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>
          Configure which AI provider powers the value chain and HS code generation.
        </p>
      </div>

      <div className="rounded-xl p-5 space-y-5" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}>
        {/* Provider */}
        <div className="space-y-2">
          <label className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Provider</label>
          <div className="flex gap-3">
            {(['anthropic', 'proxy'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className="flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all"
                style={{
                  background: provider === p ? 'var(--accent)' : 'transparent',
                  color: provider === p ? '#fff' : 'var(--text-2)',
                  borderColor: provider === p ? 'var(--accent)' : 'rgba(0,0,0,.15)',
                }}
              >
                {PROVIDER_LABELS[p]}
              </button>
            ))}
          </div>
          <p className="text-xs" style={{ color: 'var(--text-2)' }}>
            {provider === 'anthropic'
              ? 'Connects directly to api.anthropic.com with your API key.'
              : 'Uses a custom base URL (e.g. Hyperspace proxy) with an auth token as the API key.'}
          </p>
        </div>

        {/* API Key */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            {provider === 'proxy' ? 'Auth Token' : 'API Key'}
          </label>
          {settings?.has_api_key && !apiKey && (
            <p className="text-xs font-mono px-3 py-1.5 rounded-lg" style={{ background: 'rgba(0,0,0,.04)', color: 'var(--text-2)' }}>
              Current: {settings.api_key_masked}
            </p>
          )}
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              placeholder={settings?.has_api_key ? 'Enter new key to replace…' : 'Enter API key…'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2.5 pr-10 rounded-lg border text-sm font-mono"
              style={{ borderColor: 'rgba(0,0,0,.15)', background: 'var(--bg)', color: 'var(--text)' }}
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-70"
              style={{ color: 'var(--text)' }}
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {/* Base URL — only for proxy */}
        {provider === 'proxy' && (
          <div className="space-y-1.5">
            <label className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Base URL</label>
            <input
              type="url"
              placeholder="http://localhost:6655/anthropic/"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border text-sm font-mono"
              style={{ borderColor: 'rgba(0,0,0,.15)', background: 'var(--bg)', color: 'var(--text)' }}
            />
          </div>
        )}

        {/* Model */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border text-sm"
            style={{ borderColor: 'rgba(0,0,0,.15)', background: 'var(--bg)', color: 'var(--text)' }}
          >
            {(settings?.available_models ?? [model]).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white disabled:opacity-40 transition-opacity"
            style={{ background: 'var(--accent)' }}
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Save
          </button>
          <button
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium border transition-all disabled:opacity-40"
            style={{ color: 'var(--text)', borderColor: 'rgba(0,0,0,.2)' }}
          >
            {testing ? <Loader2 size={13} className="animate-spin" /> : <FlaskConical size={13} />}
            Test Connection
          </button>

          {testResult && (
            <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: testResult.ok ? 'var(--success)' : '#FF3B30' }}>
              {testResult.ok ? <Check size={12} /> : null}
              {testResult.ok ? `OK · ${testResult.model}` : testResult.error?.slice(0, 60)}
            </span>
          )}
        </div>
      </div>

      <StepFooter prevHref="/workflow/step1" prevLabel="Back to Workflow" />
    </div>
  )
}
