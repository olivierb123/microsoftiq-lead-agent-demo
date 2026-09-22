import { useState } from 'react'
import { Database, Users, Globe, ChevronDown, ChevronUp, Quote } from 'lucide-react'
import { mockRecords } from './data/mockRecords.js'

const SOURCE_STYLES = {
  'Fabric IQ': {
    icon: Database,
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    glow: 'hover:border-emerald-500/40',
  },
  'Work IQ': {
    icon: Users,
    badge: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    glow: 'hover:border-sky-500/40',
  },
  'Web IQ': {
    icon: Globe,
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    glow: 'hover:border-amber-500/40',
  },
}

function RecordCard({ record }) {
  const [expanded, setExpanded] = useState(false)
  const style = SOURCE_STYLES[record.groundingSource]
  const Icon = style.icon

  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-black/20 transition-colors ${style.glow}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
          {record.domain}
        </span>
        <span
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-mono uppercase tracking-wide ${style.badge}`}
        >
          <Icon size={12} strokeWidth={2.5} />
          {record.groundingSource}
        </span>
      </div>

      <p className="mt-3 text-sm text-slate-200">{record.query}</p>

      <div className="mt-4 flex items-start gap-2 rounded-lg bg-slate-950/60 p-3 text-xs text-slate-400">
        <Quote size={13} className="mt-0.5 shrink-0 text-slate-600" />
        <span className="font-mono">{record.citation}</span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-300">{record.answerPreview}</p>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-4 flex w-full items-center justify-between rounded-lg border border-slate-800 px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-slate-500 transition-colors hover:border-slate-700 hover:text-slate-300"
      >
        Why this source?
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <p className="mt-3 text-xs leading-relaxed text-slate-400">{record.reasoning}</p>
      )}
    </div>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-8">
        <h1 className="text-xl font-semibold tracking-tight text-slate-100">
          Grounded Agent Console
        </h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Three data domains, normalized into agent-ready records — each grounded with a citation and a rationale.
        </p>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {mockRecords.map((record) => (
            <RecordCard key={record.id} record={record} />
          ))}
        </div>
      </main>
    </div>
  )
}
