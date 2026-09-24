import { useState } from 'react'
import { Database, Users, Globe, FileText, ChevronDown, ChevronUp, Quote } from 'lucide-react'
import { mockRecords } from './data/mockRecords.js'
import { matchRecords } from './lib/matchRecords.js'
import { accounts, opportunities, leads } from './data/raw/crm.js'
import { rows as salesPerformanceRows } from './data/raw/salesPerformance.js'
import { docs as productDocs } from './data/raw/productDocs.js'
import { calendarEvents, emails, messages } from './data/raw/m365.js'
import { permits } from './data/raw/permits.js'
import { riskRecords } from './data/raw/climateRisk.js'
import { usageRecords } from './data/raw/telemetry.js'
import { cases as supportCases } from './data/raw/supportCases.js'

const IQ_STYLES = {
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
  'Foundry IQ': {
    icon: FileText,
    badge: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30',
    glow: 'hover:border-fuchsia-500/40',
  },
}

const CLASSIFICATION_STYLES = {
  Structured: 'bg-slate-500/10 text-slate-300 border-slate-600/40',
  'Semi-structured': 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  Unstructured: 'bg-pink-500/10 text-pink-300 border-pink-500/30',
}

const DOMAINS = [
  {
    name: 'CRM',
    iq: 'Fabric IQ',
    classification: 'Structured',
    tables: [
      { label: 'accounts', rows: accounts },
      { label: 'opportunities', rows: opportunities },
      { label: 'leads', rows: leads },
    ],
  },
  {
    name: 'Sales Performance',
    iq: 'Fabric IQ',
    classification: 'Structured',
    tables: [{ label: 'rows', rows: salesPerformanceRows }],
  },
  {
    name: 'Product Docs',
    iq: 'Foundry IQ',
    classification: 'Unstructured',
    tables: [{ label: 'docs', rows: productDocs }],
  },
  {
    name: 'M365',
    iq: 'Work IQ',
    classification: 'Semi-structured',
    tables: [
      { label: 'calendarEvents', rows: calendarEvents },
      { label: 'emails', rows: emails },
      { label: 'messages', rows: messages },
    ],
  },
  {
    name: 'Permits',
    iq: 'Web IQ',
    classification: 'Structured',
    tables: [{ label: 'permits', rows: permits }],
  },
  {
    name: 'Climate / Disaster Risk',
    iq: 'Web IQ',
    classification: 'Structured',
    tables: [{ label: 'riskRecords', rows: riskRecords }],
  },
  {
    name: 'Telemetry',
    iq: 'Fabric IQ',
    classification: 'Structured',
    tables: [{ label: 'usageRecords', rows: usageRecords }],
  },
  {
    name: 'Support Cases',
    iq: 'Fabric IQ',
    classification: 'Semi-structured',
    tables: [{ label: 'cases', rows: supportCases }],
  },
]

function RecordCard({ record }) {
  const [expanded, setExpanded] = useState(false)
  const primaryStyle = IQ_STYLES[record.groundingSources[0]]

  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-black/20 transition-colors ${primaryStyle.glow}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
          {record.domain}
        </span>
        <div className="flex flex-wrap justify-end gap-1.5">
          {record.groundingSources.map((source) => {
            const style = IQ_STYLES[source]
            const Icon = style.icon
            return (
              <span
                key={source}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-mono uppercase tracking-wide ${style.badge}`}
              >
                <Icon size={12} strokeWidth={2.5} />
                {source}
              </span>
            )
          })}
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-200">{record.query}</p>

      <div className="mt-4 space-y-2">
        {record.citations.map((citation, i) => (
          <div
            key={i}
            className="flex items-start gap-2 rounded-lg bg-slate-950/60 p-3 text-xs text-slate-400"
          >
            <Quote size={13} className="mt-0.5 shrink-0 text-slate-600" />
            <span className="font-mono">{citation}</span>
          </div>
        ))}
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

function DataTable({ rows }) {
  if (!rows || rows.length === 0) {
    return <p className="text-xs italic text-slate-600">No records.</p>
  }
  const columns = Object.keys(rows[0])

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900/80">
            {columns.map((col) => (
              <th
                key={col}
                className="whitespace-nowrap px-3 py-2 font-mono uppercase tracking-wide text-slate-500"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-900 odd:bg-slate-950/40 last:border-0">
              {columns.map((col) => {
                const val = row[col]
                const display =
                  val === null || val === undefined
                    ? '—'
                    : typeof val === 'object'
                    ? JSON.stringify(val)
                    : String(val)
                return (
                  <td key={col} className="whitespace-nowrap px-3 py-2 text-slate-300">
                    {display}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DomainSection({ domain }) {
  const style = IQ_STYLES[domain.iq]
  const Icon = style.icon

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-100">{domain.name}</h2>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 text-[11px] font-mono uppercase tracking-wide ${CLASSIFICATION_STYLES[domain.classification]}`}
          >
            {domain.classification}
          </span>
          <span
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-mono uppercase tracking-wide ${style.badge}`}
          >
            <Icon size={12} strokeWidth={2.5} />
            {domain.iq}
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {domain.tables.map((t) => (
          <div key={t.label}>
            <p className="mb-1.5 text-[11px] font-mono uppercase tracking-wider text-slate-600">
              {t.label}
            </p>
            <DataTable rows={t.rows} />
          </div>
        ))}
      </div>
    </section>
  )
}

export default function App() {
  const [tab, setTab] = useState('raw')
  const [question, setQuestion] = useState('')

  const isFiltered = question.trim().length > 0
  const matches = isFiltered ? matchRecords(mockRecords, question) : mockRecords

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-8">
        <h1 className="text-xl font-semibold tracking-tight text-slate-100">
          Grounded Agent Console
        </h1>
        <p className="mt-1.5 text-sm text-slate-400">
          {tab === 'raw'
            ? 'Stage 1 — raw, source-shaped data as it actually lives in each system of record.'
            : 'Stage 2 — normalized into agent-ready, citable records. Ask a question below to see which grounded source(s) an agent would retrieve.'}
        </p>

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => setTab('raw')}
            className={`rounded-lg border px-3 py-1.5 text-xs font-mono uppercase tracking-wide transition-colors ${
              tab === 'raw'
                ? 'border-slate-600 bg-slate-800 text-slate-100'
                : 'border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            Stage 1: Raw Data
          </button>
          <button
            onClick={() => setTab('grounded')}
            className={`rounded-lg border px-3 py-1.5 text-xs font-mono uppercase tracking-wide transition-colors ${
              tab === 'grounded'
                ? 'border-slate-600 bg-slate-800 text-slate-100'
                : 'border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            Stage 2: Grounded Console
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {tab === 'raw' ? (
          <div className="space-y-5">
            {DOMAINS.map((domain) => (
              <DomainSection key={domain.name} domain={domain} />
            ))}
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask a question, e.g. &ldquo;Is Coastal Grade & Pave at renewal risk?&rdquo;"
                  className="flex-1 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-slate-600 focus:outline-none"
                />
                {isFiltered && (
                  <button
                    onClick={() => setQuestion('')}
                    className="rounded-lg border border-slate-800 px-3 py-2 text-xs font-mono uppercase tracking-wide text-slate-500 transition-colors hover:border-slate-700 hover:text-slate-300"
                  >
                    Clear
                  </button>
                )}
              </div>
              {isFiltered && (
                <p className="mt-2 text-xs text-slate-500">
                  {matches.length > 0
                    ? `Matched ${matches.length} of ${mockRecords.length} grounded records`
                    : 'No grounded source matches that yet.'}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {matches.map((record) => (
                <RecordCard key={record.id} record={record} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
