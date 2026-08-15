import { useMemo, useState, useEffect } from 'react'
import { useStore, getItem } from '../store'
import { useSearchParams } from 'react-router-dom'
import { dsaProblems, dsaCompanies } from '../lib/registry'
import { StatusPill, ItemDetails, ProgressBar, STATUS_META } from '../components/ui'
import RoadmapGraph from '../components/RoadmapGraph'
import dsaPatterns from '../data/dsa-patterns.json'

const DIFF_CLS = { Easy: 'text-green-400', Medium: 'text-yellow-400', Hard: 'text-red-400' }
const SOURCE_BADGE = {
  'striver-a2z': ['A2Z', 'bg-brand-subtle text-brand border-brand/30'],
  'striver-sde': ['SDE', 'bg-downvote/10 text-downvote border-downvote/30'],
  neetcode150: ['NC150', 'bg-green-500/10 text-green-400 border-green-500/30'],
  blind75: ['B75', 'bg-purple-500/10 text-purple-400 border-purple-500/30'],
  'claude-picks': ['★ pick', 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'],
}

function ProblemRow({ p, highlight }) {
  const { state } = useStore()
  const item = getItem(state, p.id)
  const [open, setOpen] = useState(false)
  return (
    <div id={p.id} className={`rounded-lg border bg-card px-3 py-1.5 ${item.status === 'done' ? 'opacity-50' : ''} ${highlight === p.id ? 'ring-2 ring-brand' : ''}`}>
      <div className="flex items-center gap-2.5">
        <StatusPill id={p.id} size="xs" />
        <button onClick={() => setOpen(!open)} className="flex-1 min-w-0 text-left">
          <span className={`text-sm hover:text-brand transition-colors ${item.status === 'done' ? 'line-through decoration-muted-foreground/50' : ''}`}>{p.title}</span>
          {(item.notes || (item.links || []).length > 0) && <span className="ml-1.5 text-xs text-muted-foreground">✎</span>}
        </button>
        {p.pickNote && <span className="hidden lg:block text-[11px] text-yellow-400/70 max-w-56 truncate" title={p.pickNote}>★ {p.pickNote}</span>}
        <span className={`font-mono text-[11px] w-14 text-right shrink-0 ${DIFF_CLS[p.difficulty] || 'text-muted-foreground/50'}`}>{p.difficulty || '—'}</span>
        <div className="hidden sm:flex gap-1 shrink-0">
          {p.sources.filter((s) => SOURCE_BADGE[s]).map((s) => (
            <span key={s} className={`rounded border px-1 font-mono text-[9px] ${SOURCE_BADGE[s][1]}`}>{SOURCE_BADGE[s][0]}</span>
          ))}
        </div>
        {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="shrink-0 text-xs text-muted-foreground hover:text-brand" title="open problem">↗</a>}
        {p.solutionUrl && <a href={p.solutionUrl} target="_blank" rel="noreferrer" className="shrink-0 text-xs text-muted-foreground hover:text-brand" title="solution video">▶</a>}
      </div>
      {open && (
        <>
          {p.verified === false && <div className="mt-1 text-[11px] text-yellow-400">⚠ URL constructed from Claude's memory (claude-pick added beyond fetched lists) — verify before trusting.</div>}
          {p.companies?.length > 0 && <div className="mt-1 text-[11px] font-mono text-muted-foreground">asked at: {p.companies.join(', ')}</div>}
          <ItemDetails id={p.id} />
        </>
      )}
    </div>
  )
}

function useFiltered(problems, q, diff, status, source, state) {
  return useMemo(() => {
    const needle = q.trim().toLowerCase()
    return problems.filter((p) => {
      if (needle && !p.title.toLowerCase().includes(needle)) return false
      if (diff !== 'all' && p.difficulty !== diff) return false
      if (source !== 'all' && !p.sources.includes(source)) return false
      if (status !== 'all' && getItem(state, p.id).status !== status) return false
      return true
    })
  }, [problems, q, diff, status, source, state])
}

function Grouped({ problems, groupKey, orderKey, highlight, state }) {
  const groups = useMemo(() => {
    const map = new Map()
    for (const p of problems) {
      const g = p[groupKey] || 'Other'
      if (!map.has(g)) map.set(g, [])
      map.get(g).push(p)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.orders[orderKey] ?? 1e9) - (b.orders[orderKey] ?? 1e9))
    }
    // order groups by their first problem's order
    return [...map.entries()].sort(
      (a, b) => Math.min(...a[1].map((p) => p.orders[orderKey] ?? 1e9)) - Math.min(...b[1].map((p) => p.orders[orderKey] ?? 1e9))
    )
  }, [problems, groupKey, orderKey])
  const [openGroups, setOpenGroups] = useState(() => new Set(groups.slice(0, 1).map(([g]) => g)))
  const toggle = (g) => {
    const next = new Set(openGroups)
    next.has(g) ? next.delete(g) : next.add(g)
    setOpenGroups(next)
  }
  return (
    <div className="space-y-2">
      {groups.map(([g, arr]) => {
        const done = arr.filter((p) => getItem(state, p.id).status === 'done').length
        const open = openGroups.has(g) || (highlight && arr.some((p) => p.id === highlight))
        return (
          <div key={g}>
            <button onClick={() => toggle(g)} className="flex w-full flex-wrap items-center gap-2 rounded-lg border bg-surface/60 px-3 py-2 hover:border-brand/40 transition-colors sm:gap-3">
              <span className="text-muted-foreground text-xs">{open ? '▼' : '▶'}</span>
              <span className="font-semibold text-sm flex-1 text-left">{g}</span>
              <ProgressBar value={done} total={arr.length} className="w-full sm:w-48" />
            </button>
            {open && <div className="mt-1.5 mb-3 space-y-1 pl-2">{arr.map((p) => <ProblemRow key={p.id} p={p} highlight={highlight} />)}</div>}
          </div>
        )
      })}
      {groups.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">No problems match the filters.</div>}
    </div>
  )
}

function Companies({ highlight }) {
  const { state } = useStore()
  const [active, setActive] = useState(dsaCompanies.companies[0].key)
  const c = dsaCompanies.companies.find((x) => x.key === active)
  const done = c.problems.filter((p) => getItem(state, `dsa-${p.slug}`).status === 'done').length
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {dsaCompanies.companies.map((co) => (
          <button
            key={co.key}
            onClick={() => setActive(co.key)}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${active === co.key ? 'bg-brand text-white border-brand font-semibold' : 'bg-card hover:border-brand/50'}`}
          >
            {co.name}
          </button>
        ))}
      </div>
      <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <span className="text-xs text-muted-foreground">
          Top {c.problems.length} by LeetCode frequency · window: <span className="font-mono">{c.window}</span> · status syncs with the master list
        </span>
        <ProgressBar value={done} total={c.problems.length} className="w-full sm:w-56" />
      </div>
      <div className="space-y-1">
        {c.problems.map((p, i) => {
          const id = `dsa-${p.slug}`
          const master = dsaProblems.problems.find((m) => m.id === id)
          const row = master || { id, title: p.title, url: p.url, difficulty: p.difficulty, sources: [], orders: {}, companies: [] }
          return (
            <div key={p.slug} className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-muted-foreground w-8 text-right shrink-0">{Math.round(p.frequency)}%</span>
              <div className="flex-1 min-w-0"><ProblemRow p={row} highlight={highlight} /></div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Dsa() {
  const { state } = useStore()
  const [searchParams] = useSearchParams()
  const problems = dsaProblems.problems
  const [view, setView] = useState('topics')
  const [q, setQ] = useState('')
  const [diff, setDiff] = useState('all')
  const [status, setStatus] = useState('all')
  const [source, setSource] = useState('all')
  const [highlight, setHighlight] = useState(null)
  const [showT3, setShowT3] = useState(false)

  // Highlight problem from URL param on mount
  useEffect(() => {
    const highlightId = searchParams.get('highlight')
    if (highlightId) {
      setHighlight(highlightId)
      setTimeout(() => {
        const elem = document.getElementById(highlightId)
        if (elem) {
          elem.scrollIntoView({ behavior: 'smooth', block: 'center' })
          setView('topics') // ensure we're in topics view to show the problem
        }
      }, 100)
    }
  }, [searchParams])

  const filtered = useFiltered(problems, q, diff, status, source, state)
  const doneCount = problems.filter((p) => getItem(state, p.id).status === 'done').length
  const revisits = problems.filter((p) => getItem(state, p.id).status === 'revisit')

  const randomRevisit = () => {
    if (!revisits.length) return
    const pick = revisits[Math.floor(Math.random() * revisits.length)]
    setQ(''); setDiff('all'); setStatus('all'); setSource('all')
    if (view === 'companies') setView('topics')
    setHighlight(pick.id)
    setTimeout(() => document.getElementById(pick.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
  }

  const sel = 'w-full rounded-lg border bg-card px-2 py-1.5 text-sm focus:outline-none focus:border-brand/60 sm:w-auto'
  return (
    <div className="space-y-4">
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">DSA</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Striver A2Z + SDE sheet + NeetCode 150, deduped into {problems.length} problems · {doneCount} done
          </p>
        </div>
        <button
          onClick={randomRevisit}
          disabled={!revisits.length}
          className="w-full rounded-lg bg-brand text-white text-sm font-semibold px-4 py-2 hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed sm:w-auto"
          title={revisits.length ? `${revisits.length} problems marked revisit` : 'Mark problems as revisit first'}
        >
          🎲 random revisit ({revisits.length})
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex w-full gap-1 overflow-x-auto rounded-lg border bg-card p-1 sm:w-auto">
          {[['topics', 'By topic (Striver)'], ['patterns', 'By pattern (Graph)'], ['companies', 'By company']].map(([k, label]) => (
            <button
              key={k}
              onClick={() => { setView(k); setHighlight(null) }}
              className={`shrink-0 whitespace-nowrap rounded px-3 py-1 text-sm transition-colors ${view === k ? 'bg-brand text-white font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {view !== 'companies' && view !== 'patterns' && (
          <>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className={`${sel} sm:w-44`} />
            <select value={diff} onChange={(e) => setDiff(e.target.value)} className={sel}>
              <option value="all">difficulty: all</option>
              {['Easy', 'Medium', 'Hard'].map((d) => <option key={d}>{d}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={sel}>
              <option value="all">status: all</option>
              {Object.keys(STATUS_META).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={source} onChange={(e) => setSource(e.target.value)} className={sel}>
              <option value="all">source: all</option>
              <option value="striver-a2z">Striver A2Z</option>
              <option value="striver-sde">Striver SDE</option>
              <option value="neetcode150">NeetCode 150</option>
              <option value="blind75">Blind 75</option>
              <option value="claude-picks">★ Claude picks</option>
            </select>
            <span className="font-mono text-xs text-muted-foreground ml-auto">{filtered.length} shown</span>
          </>
        )}
        {view === 'patterns' && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showT3} onChange={(e) => setShowT3(e.target.checked)} />
            <span className="text-muted-foreground">show Tier 3</span>
          </label>
        )}
      </div>

      {view === 'topics' && <Grouped problems={filtered} groupKey="topic" orderKey="a2z" highlight={highlight} state={state} />}
      {view === 'patterns' && <div className="h-[70vh] min-h-[420px] border rounded-lg bg-card sm:h-[600px]"><RoadmapGraph patterns={dsaPatterns.patterns} showT3={showT3} /></div>}
      {view === 'companies' && <Companies highlight={highlight} />}
    </div>
  )
}
