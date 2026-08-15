import { useMemo, useState } from 'react'
import { useStore, getItem } from '../store'
import { aiPapers } from '../lib/registry'
import { ItemRow, ProgressBar, SectionCard, STATUS_META } from '../components/ui'

const PRIORITY_META = {
  'must-read': { label: 'must read', cls: 'border-brand/40 bg-brand-subtle text-brand' },
  core: { label: 'core', cls: 'border-blue-500/30 bg-blue-500/10 text-blue-400' },
  'very-useful': { label: 'very useful', cls: 'border-green-500/30 bg-green-500/10 text-green-400' },
  'selected-sections': { label: 'selected sections', cls: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400' },
  optional: { label: 'optional', cls: 'border-border bg-surface text-muted-foreground' },
}

function PaperTitle({ paper }) {
  const priority = PRIORITY_META[paper.priority] || PRIORITY_META.core
  return (
    <span className="block">
      <span className="flex flex-wrap items-baseline gap-2">
        <span className="font-mono text-xs text-brand">{String(paper.order).padStart(2, '0')}</span>
        <span className={`rounded-full border px-1.5 py-0.5 font-mono text-[9px] uppercase ${priority.cls}`}>{priority.label}</span>
        <span className="font-semibold">{paper.title}</span>
      </span>
      <span className="mt-1 block text-xs text-muted-foreground">
        {paper.authors} · {paper.year} · ~{paper.readingMinutes} min
      </span>
      <span className="mt-1 block text-xs text-foreground/75">{paper.why}</span>
      <span className="mt-1.5 flex flex-wrap gap-1.5">
        {paper.concepts.map((concept) => (
          <span key={concept} className="rounded-full border bg-surface px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
            {concept}
          </span>
        ))}
      </span>
    </span>
  )
}

export default function AiPapers() {
  const { state } = useStore()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [priority, setPriority] = useState('all')

  const papers = useMemo(
    () => aiPapers.categories.flatMap((group) => group.papers.map((paper) => ({ ...paper, categoryId: group.id, categoryName: group.name }))),
    []
  )

  const counts = Object.fromEntries(
    Object.keys(STATUS_META).map((key) => [key, papers.filter((paper) => getItem(state, paper.id).status === key).length])
  )
  const totalMinutes = papers.reduce((sum, paper) => sum + paper.readingMinutes, 0)
  const mainPapers = papers.filter((paper) => !['optional', 'selected-sections'].includes(paper.priority))
  const mainDone = mainPapers.filter((paper) => getItem(state, paper.id).status === 'done').length
  const normalizedQuery = query.trim().toLowerCase()
  const filtered = papers.filter((paper) => {
    const haystack = [paper.title, paper.authors, paper.why, paper.categoryName, PRIORITY_META[paper.priority]?.label, ...paper.concepts].join(' ').toLowerCase()
    return (
      (!normalizedQuery || haystack.includes(normalizedQuery)) &&
      (category === 'all' || paper.categoryId === category) &&
      (priority === 'all' || paper.priority === priority) &&
      (status === 'all' || getItem(state, paper.id).status === status)
    )
  })
  const filteredIds = new Set(filtered.map((paper) => paper.id))
  const controlClass = 'w-full rounded-lg border bg-card px-3 py-2 text-sm focus:outline-none focus:border-brand/60 sm:w-auto'

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <h1 className="text-2xl font-bold">AI Papers</h1>
          <p className="mt-1 text-sm text-muted-foreground">{aiPapers.meta.desc}</p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground/80">{aiPapers.meta.selectionNote}</p>
        </div>
        <div className="w-full sm:w-auto">
          <div className="mb-1 font-mono text-[10px] text-muted-foreground sm:text-right">main path</div>
          <ProgressBar value={mainDone} total={mainPapers.length} className="w-full sm:w-64" />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="min-w-0 rounded-lg border bg-card p-3">
          <div className="font-mono text-xl font-bold text-brand">{papers.length}</div>
          <div className="break-words text-xs text-muted-foreground">{mainPapers.length} main · {papers.length - mainPapers.length} supplemental · ~{Math.round(totalMinutes / 60)}h</div>
        </div>
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <div key={key} className="min-w-0 rounded-lg border bg-card p-3">
            <div className="font-mono text-xl font-bold">{counts[key]}</div>
            <div className="text-xs text-muted-foreground">{meta.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search titles, authors, or concepts…"
          className={`${controlClass} min-w-0 flex-1 sm:min-w-64`}
        />
        <select value={category} onChange={(event) => setCategory(event.target.value)} className={controlClass}>
          <option value="all">category: all</option>
          {aiPapers.categories.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className={controlClass}>
          <option value="all">status: all</option>
          {Object.entries(STATUS_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
        </select>
        <select value={priority} onChange={(event) => setPriority(event.target.value)} className={controlClass}>
          <option value="all">priority: all</option>
          {Object.entries(PRIORITY_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
        </select>
        <span className="ml-auto font-mono text-xs text-muted-foreground">{filtered.length} shown</span>
      </div>

      {aiPapers.categories.map((group) => {
        const categoryPapers = group.papers.filter((paper) => paper.priority !== 'optional')
        const visiblePapers = categoryPapers.filter((paper) => filteredIds.has(paper.id))
        if (!visiblePapers.length) return null
        const done = categoryPapers.filter((paper) => getItem(state, paper.id).status === 'done').length
        return (
          <SectionCard
            key={group.id}
            title={group.name}
            desc={group.desc}
            right={<ProgressBar value={done} total={categoryPapers.length} className="w-full sm:w-48" />}
          >
            <div className="space-y-1.5">
              {visiblePapers.map((paper) => (
                <ItemRow
                  key={paper.id}
                  id={paper.id}
                  title={<PaperTitle paper={paper} />}
                  hideTier
                  resources={[{
                    title: 'Read the paper on arXiv',
                    type: 'paper',
                    url: paper.paperUrl,
                    free: true,
                    verified: true,
                    note: 'Primary paper record with PDF access',
                  }]}
                  right={(
                    <a
                      href={paper.paperUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-lg border border-brand/30 bg-brand-subtle px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand hover:text-white transition-colors"
                    >
                      Read paper ↗
                    </a>
                  )}
                />
              ))}
            </div>
          </SectionCard>
        )
      })}

      {(() => {
        const optionalPapers = papers.filter((paper) => paper.priority === 'optional')
        const visibleOptionalPapers = optionalPapers.filter((paper) => filteredIds.has(paper.id))
        if (!visibleOptionalPapers.length) return null
        const done = optionalPapers.filter((paper) => getItem(state, paper.id).status === 'done').length
        return (
          <SectionCard
            title="Optional papers"
            desc="Historical context and specialized techniques to read after the main path, or when a project makes them relevant."
            right={<ProgressBar value={done} total={optionalPapers.length} className="w-full sm:w-48" />}
          >
            <div className="space-y-1.5">
              {visibleOptionalPapers.map((paper) => (
                <ItemRow
                  key={paper.id}
                  id={paper.id}
                  title={<PaperTitle paper={paper} />}
                  hideTier
                  resources={[{
                    title: 'Read the paper on arXiv',
                    type: 'paper',
                    url: paper.paperUrl,
                    free: true,
                    verified: true,
                    note: 'Primary paper record with PDF access',
                  }]}
                  right={(
                    <a
                      href={paper.paperUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-lg border border-brand/30 bg-brand-subtle px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand hover:text-white transition-colors"
                    >
                      Read paper ↗
                    </a>
                  )}
                />
              ))}
            </div>
          </SectionCard>
        )
      })()}

      {filtered.length === 0 && (
        <div className="rounded-lg border bg-card py-12 text-center text-sm text-muted-foreground">
          No papers match those filters.
        </div>
      )}
    </div>
  )
}
