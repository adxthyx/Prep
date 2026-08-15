import { useState } from 'react'
import { useStore, getItem } from '../store'
import { projectTil } from '../lib/registry'
import { SectionCard, ResourceLink, ItemRow, ItemDetails, fireConfetti } from '../components/ui'

const COL_STATUS = { backlog: 'todo', inprogress: 'in-progress', blocked: 'todo', done: 'done' }
const COL_CYCLE = ['backlog', 'inprogress', 'done', 'backlog'] // blocked skipped
const COL_ACCENT = {
  backlog: 'border-t-muted-foreground/40',
  inprogress: 'border-t-downvote',
  blocked: 'border-t-yellow-500',
  done: 'border-t-green-500',
}
const COL_BADGE = { backlog: '◯', inprogress: '→', done: '✓' }

function cardColumn(state, card) {
  return state.kanban[card.id] || card.column
}

function Kanban() {
  const { state, dispatch } = useStore()
  const cards = [...projectTil.kanban.cards, ...state.customCards]
  const [dragId, setDragId] = useState(null)
  const [openCard, setOpenCard] = useState(null)
  const [adding, setAdding] = useState('')

  const moveCard = (cardId, toCol) => {
    const prevCol = cardColumn(state, cards.find((c) => c.id === cardId))
    dispatch({ type: 'kanban', cardId, column: toCol })
    dispatch({ type: 'item', id: cardId, patch: { status: COL_STATUS[toCol] } })
    if (toCol === 'done' && prevCol !== 'done') {
      const phase = cards.find((c) => c.id === cardId)?.phase
      const phaseCards = cards.filter((c) => c.phase === phase)
      const phaseDone = phaseCards.filter((c) => (c.id === cardId ? toCol : cardColumn(state, c)) === 'done').length
      fireConfetti(phaseDone === phaseCards.length ? 160 : 25)
    }
  }

  const cycleColumn = (cardId) => {
    const currentCol = cardColumn(state, cards.find((c) => c.id === cardId))
    const idx = COL_CYCLE.indexOf(currentCol)
    const nextCol = COL_CYCLE[(idx + 1) % COL_CYCLE.length]
    moveCard(cardId, nextCol)
  }

  const drop = (col) => {
    if (!dragId) return
    moveCard(dragId, col)
    setDragId(null)
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
      {projectTil.kanban.columns.map((col) => {
        const colCards = cards.filter((c) => cardColumn(state, c) === col.id)
        return (
          <div
            key={col.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => drop(col.id)}
            className={`rounded-lg border border-t-2 ${COL_ACCENT[col.id]} bg-card/60 p-2 min-h-64`}
          >
            <div className="flex justify-between items-baseline px-1 mb-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wide">{col.title}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{colCards.length}</span>
            </div>
            <div className="space-y-2">
              {colCards.map((c) => {
                const notes = getItem(state, c.id).notes
                return (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={() => setDragId(c.id)}
                    className={`cursor-grab active:cursor-grabbing rounded-lg border bg-card p-2.5 text-sm leading-snug hover:border-brand/50 transition-colors ${col.id === 'done' ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); cycleColumn(c.id) }}
                        className="rounded-full px-2 py-0.5 text-xs font-semibold bg-surface hover:bg-brand hover:text-white transition-colors border border-brand/30"
                        title="Click to move through columns"
                      >
                        {COL_BADGE[col.id] || '—'}
                      </button>
                      <span className="font-mono text-[10px] text-brand">{c.phase}</span>
                    </div>
                    <button onClick={() => setOpenCard(openCard === c.id ? null : c.id)} className="w-full text-left hover:text-brand transition-colors">
                      {c.title}
                      {notes && <span className="ml-1 text-xs text-muted-foreground">✎</span>}
                    </button>
                    {openCard === c.id && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <ItemDetails id={c.id} />
                      </div>
                    )}
                  </div>
                )
              })}
              {col.id === 'backlog' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (adding.trim()) dispatch({ type: 'addCard', title: adding.trim() })
                    setAdding('')
                  }}
                >
                  <input
                    value={adding}
                    onChange={(e) => setAdding(e.target.value)}
                    placeholder="+ add card"
                    className="w-full rounded-lg border border-dashed bg-transparent px-2.5 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-brand/60"
                  />
                </form>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Milestones() {
  const { state } = useStore()
  const cards = [...projectTil.kanban.cards, ...state.customCards]
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {projectTil.milestones.map((m) => {
        const phaseCards = cards.filter((c) => c.phase === m.phase)
        const done = phaseCards.filter((c) => cardColumn(state, c) === 'done').length
        const complete = phaseCards.length > 0 && done === phaseCards.length
        return (
          <div key={m.id} className={`rounded-lg border p-3 ${complete ? 'border-green-500/50 bg-green-500/5' : 'bg-card'}`}>
            <div className="flex justify-between items-baseline">
              <span className="font-mono font-bold text-brand">{m.phase}</span>
              <span className="font-mono text-xs text-muted-foreground">{done}/{phaseCards.length}{complete && ' ✓'}</span>
            </div>
            <div className="font-semibold text-sm mt-0.5">{m.name}</div>
            <p className="text-xs text-muted-foreground mt-1 leading-snug">{m.goal}</p>
          </div>
        )
      })}
    </div>
  )
}

export default function ProjectTIL() {
  const { state, dispatch } = useStore()
  const [tab, setTab] = useState('board')
  const arch = state.archNotes ?? projectTil.architectureNotes
  const decisions = [...projectTil.decisionLog, ...state.decisions]
  const [newDecision, setNewDecision] = useState({ decision: '', why: '' })

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Morning TIL <span className="block text-muted-foreground font-normal text-lg sm:inline">— LangGraph multi-agent</span></h1>
        <p className="text-sm text-muted-foreground max-w-3xl mt-1">{projectTil.meta.oneLiner}</p>
      </header>

      <div className="flex gap-1 overflow-x-auto border-b pb-px">
        {[['board', 'Board'], ['milestones', 'Milestones'], ['arch', 'Architecture'], ['decisions', 'Decision log'], ['demo', 'Demo readiness'], ['resources', 'Resources']].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`shrink-0 whitespace-nowrap px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === k ? 'border-brand text-brand' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'board' && <Kanban />}
      {tab === 'milestones' && <Milestones />}

      {tab === 'arch' && (
        <SectionCard title="Architecture notes" desc="Markdown-ish scratchpad. Auto-saved.">
          <textarea
            value={arch}
            onChange={(e) => dispatch({ type: 'archNotes', text: e.target.value })}
            rows={22}
            className="w-full resize-y rounded-lg bg-canvas border p-3 font-mono text-xs leading-relaxed focus:outline-none focus:border-brand/60"
          />
        </SectionCard>
      )}

      {tab === 'decisions' && (
        <SectionCard title="Decision log" desc="Every non-obvious choice + why. This is interview gold — 'walk me through a tradeoff you made'.">
          <div className="space-y-2 mb-4">
            {decisions.map((d) => (
              <div key={d.id} className="rounded-lg border bg-background p-3">
                <div className="flex justify-between">
                  <span className="font-semibold text-sm">{d.decision}</span>
                  <span className="font-mono text-[10px] text-muted-foreground shrink-0 ml-2">{d.date}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{d.why}</p>
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!newDecision.decision.trim()) return
              dispatch({ type: 'decision', entry: newDecision })
              setNewDecision({ decision: '', why: '' })
            }}
            className="space-y-2"
          >
            <input
              value={newDecision.decision}
              onChange={(e) => setNewDecision({ ...newDecision, decision: e.target.value })}
              placeholder="Decision…"
              className="w-full rounded-lg border bg-card px-3 py-2 text-sm focus:outline-none focus:border-brand/60"
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={newDecision.why}
                onChange={(e) => setNewDecision({ ...newDecision, why: e.target.value })}
                placeholder="Why…"
                className="flex-1 rounded-lg border bg-card px-3 py-2 text-sm focus:outline-none focus:border-brand/60"
              />
              <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">Log it</button>
            </div>
          </form>
        </SectionCard>
      )}

      {tab === 'demo' && (
        <SectionCard title="Interview demo readiness" desc="If all six are green, this project is interview-weaponized.">
          <div className="space-y-1.5">
            {projectTil.demoChecklist.map((c) => (
              <ItemRow key={c.id} id={c.id} title={c.title} />
            ))}
          </div>
        </SectionCard>
      )}

      {tab === 'resources' && (
        <SectionCard title="Resources">
          <div className="space-y-1">
            {projectTil.resources.map((r, i) => (
              <ResourceLink key={i} r={r} />
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}
