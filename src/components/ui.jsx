import { useState } from 'react'
import { useStore, getItem, STATUSES } from '../store'

export const STATUS_META = {
  todo: { label: 'todo', cls: 'bg-surface text-muted-foreground border' },
  'in-progress': { label: 'in progress', cls: 'bg-downvote/15 text-downvote border border-downvote/40' },
  done: { label: 'done', cls: 'bg-green-500/15 text-green-400 border border-green-500/40' },
  revisit: { label: 'revisit', cls: 'bg-brand-subtle text-brand border border-brand/40' },
}

export function StatusPill({ id, size = 'sm' }) {
  const { state, dispatch } = useStore()
  const item = getItem(state, id)
  const meta = STATUS_META[item.status] || STATUS_META.todo
  const next = () => {
    const i = STATUSES.indexOf(item.status)
    dispatch({ type: 'item', id, patch: { status: STATUSES[(i + 1) % STATUSES.length] } })
  }
  return (
    <button
      onClick={next}
      title="Click to cycle: todo → in progress → done → revisit"
      className={`shrink-0 rounded-full font-mono ${size === 'xs' ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-xs'} ${meta.cls} hover:brightness-125 transition`}
    >
      {meta.label}
    </button>
  )
}

export function TierChip({ id, hidden = false }) {
  const { state, dispatch } = useStore()
  if (hidden) return null
  const nextTier = (t) => (t === 1 ? 2 : t === 2 ? 3 : 1)
  const tier = state.tierOverrides?.[id] ?? 3
  const onClick = () => {
    const next = nextTier(tier)
    dispatch({ type: 'tier', id, tier: next })
  }
  const tierCls = { 1: 'bg-purple-500/15 text-purple-400 border-purple-500/30', 2: 'bg-blue-500/15 text-blue-400 border-blue-500/30', 3: 'bg-muted/50 text-muted-foreground border-muted' }
  return (
    <button
      onClick={onClick}
      title="Click to cycle: T1 → T2 → T3"
      className={`shrink-0 rounded-full font-mono px-2 py-0.5 text-xs border ${tierCls[tier]} hover:brightness-125 transition`}
    >
      T{tier}
    </button>
  )
}

export function ProgressBar({ value, total, className = '' }) {
  const pct = total ? Math.round((value / total) * 100) : 0
  return (
    <div className={`flex min-w-0 max-w-full items-center gap-2 ${className}`}>
      <div className="h-1.5 flex-1 rounded-full bg-surface overflow-hidden">
        <div className="h-full bg-brand-gradient rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs text-muted-foreground w-16 text-right">{value}/{total} · {pct}%</span>
    </div>
  )
}

const TYPE_ICON = { yt: '▶', udemy: '🎓', leetcode: '🧩', github: '⌥', blog: '✍', book: '📕', course: '🎓', docs: '📄', paper: '▤' }

export function ResourceLink({ r }) {
  const inner = (
    <>
      <span className="text-muted-foreground">{TYPE_ICON[r.type] || '↗'}</span>
      <span className="break-words group-hover:text-brand transition-colors">{r.title}</span>
      {r.free === false && <span className="text-[10px] font-mono text-yellow-500/80 border border-yellow-500/30 rounded px-1">paid</span>}
      {r.verified === false && (
        <span className="text-[10px] font-mono text-yellow-500/80 border border-yellow-500/30 rounded px-1" title="URL not verified at build time — double-check">unverified</span>
      )}
      {r.note && <span className="text-xs text-muted-foreground">— {r.note}</span>}
    </>
  )
  return r.url ? (
    <a href={r.url} target="_blank" rel="noreferrer" className="group flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm py-0.5">
      {inner}
    </a>
  ) : (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm py-0.5">{inner}</div>
  )
}

/** Expandable notes + links editor for any trackable item */
export function ItemDetails({ id }) {
  const { state, dispatch } = useStore()
  const item = getItem(state, id)
  const [newLink, setNewLink] = useState('')
  return (
    <div className="mt-2 space-y-2 rounded-lg bg-canvas/60 border p-3">
      <textarea
        value={item.notes}
        onChange={(e) => dispatch({ type: 'item', id, patch: { notes: e.target.value } })}
        placeholder="Notes…"
        rows={item.notes ? Math.min(8, item.notes.split('\n').length + 1) : 2}
        className="w-full resize-y rounded bg-card border px-2 py-1.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-brand/60"
      />
      <div className="flex flex-wrap items-center gap-2">
        {(item.links || []).map((l, i) => (
          <span key={i} className="flex items-center gap-1 rounded-full bg-surface border px-2 py-0.5 text-xs">
            <a href={l} target="_blank" rel="noreferrer" className="text-downvote hover:underline max-w-48 truncate">{l.replace(/^https?:\/\//, '')}</a>
            <button
              onClick={() => dispatch({ type: 'item', id, patch: { links: item.links.filter((_, j) => j !== i) } })}
              className="text-muted-foreground hover:text-brand"
            >×</button>
          </span>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!newLink.trim()) return
            const url = newLink.trim().startsWith('http') ? newLink.trim() : `https://${newLink.trim()}`
            dispatch({ type: 'item', id, patch: { links: [...(item.links || []), url] } })
            setNewLink('')
          }}
          className="flex w-full min-w-0 items-center gap-1 sm:w-auto"
        >
          <input
            value={newLink}
            onChange={(e) => setNewLink(e.target.value)}
            placeholder="+ add link"
            className="min-w-0 flex-1 rounded bg-card border px-2 py-0.5 text-xs focus:outline-none focus:border-brand/60 sm:w-32 sm:flex-none"
          />
        </form>
      </div>
    </div>
  )
}

/** One trackable row: status pill + tier chip + title + optional resources + expandable notes */
export function ItemRow({ id, title, resources = [], right = null, mono = false, hideTier = false }) {
  const { state } = useStore()
  const item = getItem(state, id)
  const [open, setOpen] = useState(false)
  const hasMeta = item.notes || (item.links || []).length > 0
  return (
    <div className={`rounded-lg border bg-card px-3 py-2 ${item.status === 'done' ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-start gap-2 sm:items-center sm:gap-3">
        <StatusPill id={id} />
        <TierChip id={id} hidden={hideTier} />
        <button onClick={() => setOpen(!open)} className={`min-w-0 flex-1 text-left text-sm leading-snug hover:text-brand transition-colors ${mono ? 'font-mono' : ''} ${item.status === 'done' ? 'line-through decoration-muted-foreground/50' : ''}`}>
          {title}
          {hasMeta && !open && <span className="ml-2 text-xs text-muted-foreground">✎</span>}
        </button>
        {right}
      </div>
      {open && (
        <>
          {resources.length > 0 && (
            <div className="mt-2 pl-1 border-l-2 border-brand/30 ml-1 space-y-0.5">
              {resources.map((r, i) => <ResourceLink key={i} r={r} />)}
            </div>
          )}
          <ItemDetails id={id} />
        </>
      )}
    </div>
  )
}

export function SectionCard({ title, desc, children, right = null }) {
  return (
    <section className="rounded-lg border bg-card p-3 sm:p-4">
      <div className="mb-1 flex flex-col items-start justify-between gap-2 sm:flex-row sm:gap-4">
        <h2 className="font-bold text-base">{title}</h2>
        {right && <div className="max-w-full sm:shrink-0">{right}</div>}
      </div>
      {desc && <p className="text-sm text-muted-foreground mb-3">{desc}</p>}
      {children}
    </section>
  )
}

export function fireConfetti(n = 60) {
  const colors = ['#FF4500', '#FF6B35', '#7193FF', '#FFD635', '#46D160']
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div')
    el.className = 'confetti-piece'
    el.style.left = `${Math.random() * 100}vw`
    el.style.background = colors[Math.floor(Math.random() * colors.length)]
    el.style.animationDelay = `${Math.random() * 0.6}s`
    el.style.transform = `rotate(${Math.random() * 360}deg)`
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 3200)
  }
}
