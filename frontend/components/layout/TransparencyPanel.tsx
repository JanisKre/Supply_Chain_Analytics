'use client'
import * as Collapsible from '@radix-ui/react-collapsible'
import { ChevronDown, Copy } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface TransparencySection {
  label: string
  content: React.ReactNode
  copyText?: string
}

export default function TransparencyPanel({ sections }: { sections: TransparencySection[] }) {
  return (
    <div
      className="mt-4 rounded-xl border divide-y overflow-hidden"
      style={{ borderColor: 'rgba(0,0,0,.08)', background: 'var(--surface)' }}
    >
      <div className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-2)' }}>
        Transparency
      </div>
      {sections.map((section) => (
        <Section key={section.label} {...section} />
      ))}
    </div>
  )
}

function Section({ label, content, copyText }: TransparencySection) {
  const [open, setOpen] = useState(false)
  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <Collapsible.Trigger className="w-full flex items-center justify-between px-4 py-3 hover:bg-black/[.02] transition-colors text-left">
        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{label}</span>
        <div className="flex items-center gap-2">
          {copyText && open && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                navigator.clipboard.writeText(copyText)
                toast.success('Copied to clipboard')
              }}
              className="p-1 rounded hover:bg-black/5"
            >
              <Copy size={13} style={{ color: 'var(--text-2)' }} />
            </button>
          )}
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            style={{ color: 'var(--text-2)' }}
          />
        </div>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <div className="px-4 pb-4">{content}</div>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}
