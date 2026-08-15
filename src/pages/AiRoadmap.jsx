import { useState } from 'react'
import { useStore, getItem } from '../store'
import { aiRoadmap } from '../lib/registry'
import { SectionCard, ItemRow, ResourceLink, ProgressBar } from '../components/ui'
import RoadmapGraph from '../components/RoadmapGraph'

const STORY_FIELDS = [
  ['pitch', '2-min pitch', 4],
  ['architectureLink', 'Architecture diagram link', 1],
  ['metrics', 'Metrics (cost, latency, scale, accuracy)', 2],
  ['hardestBug', 'Hardest bug', 2],
  ['whatIdChange', "What I'd change", 2],
]

function Stories() {
  const { state, dispatch } = useStore()
  const [open, setOpen] = useState('story-til')
  return (
    <SectionCard title="Project storytelling" desc="One entry per portfolio project — these fields ARE your interview answers. Morning TIL is pre-filled; 3 slots wait for the next builds.">
      <div className="space-y-2">
        {aiRoadmap.projectStories.map((s, idx) => {
          const overlay = state.stories[s.id] || {}
          const story = { ...s, ...overlay }
          const isOpen = open === s.id
          const set = (field, value) => dispatch({ type: 'story', id: s.id, patch: { [field]: value } })
          return (
            <div key={s.id} className="rounded-lg border bg-background">
              <button onClick={() => setOpen(isOpen ? null : s.id)} className="w-full flex items-center gap-3 p-3 text-left">
                <span className="font-mono text-brand text-xs">#{idx + 1}</span>
                <input
                  value={story.name}
                  onChange={(e) => set('name', e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="(empty slot — name your next project)"
                  className="flex-1 bg-transparent font-semibold text-sm focus:outline-none placeholder:text-muted-foreground/50 placeholder:font-normal"
                />
                <span className="text-muted-foreground text-xs">{isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && (
                <div className="px-3 pb-3 space-y-2">
                  {STORY_FIELDS.map(([field, label, rows]) => (
                    <div key={field}>
                      <div className="font-mono text-[11px] uppercase text-muted-foreground mb-0.5">{label}</div>
                      <textarea
                        value={story[field] || ''}
                        onChange={(e) => set(field, e.target.value)}
                        rows={rows}
                        className="w-full resize-y rounded bg-card border px-2 py-1.5 text-sm focus:outline-none focus:border-brand/60"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}

export default function AiRoadmap() {
  const { state } = useStore()
  const [openPhase, setOpenPhase] = useState(aiRoadmap.phases[0].id)
  const [view, setView] = useState('accordion')

  // Convert phases to graph node format with computed layout (horizontal chain)
  const phaseGraphNodes = aiRoadmap.phases
    .filter((p) => p.id !== 'ai-storytelling')
    .map((p, i) => ({
      id: p.id,
      label: p.name,
      prereqs: p.prereqs || [],
      x: i * 200,
      y: 0,
    }))

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">AI Engineer / FDE Roadmap <span className="block text-brand text-sm font-mono sm:inline sm:align-middle">PRIMARY TRACK</span></h1>
        <p className="text-sm text-muted-foreground mt-1">{aiRoadmap.meta.desc}</p>
      </header>

      <div className="flex gap-2">
        {['accordion', 'graph'].map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded px-3 py-1 text-sm transition-colors ${view === v ? 'bg-brand text-white font-semibold' : 'border bg-card text-muted-foreground hover:text-foreground'}`}
          >
            {v === 'accordion' ? 'Accordion' : 'Phase Graph'}
          </button>
        ))}
      </div>

      {view === 'graph' && <div className="h-[400px] border rounded-lg bg-card"><RoadmapGraph patterns={phaseGraphNodes} showT3={false} type="ai" /></div>}

      {view === 'accordion' && (
        <div className="space-y-4">
          {aiRoadmap.phases.map((p) => {
            if (p.id === 'ai-storytelling') return <Stories key={p.id} />
            const done = p.items.filter((it) => getItem(state, it.id).status === 'done').length
            const open = openPhase === p.id
            return (
              <div key={p.id} className="rounded-lg border bg-card">
                <button onClick={() => setOpenPhase(open ? null : p.id)} className="w-full text-left p-4">
                  <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <h2 className="font-bold">{p.name}</h2>
                    <ProgressBar value={done} total={p.items.length} className="w-full sm:w-56" />
                  </div>
                  {!open && <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{p.desc}</p>}
                </button>
                {open && (
                  <div className="px-4 pb-4 space-y-3">
                    <p className="text-sm text-muted-foreground -mt-2">{p.desc}</p>
                    <div className="space-y-1.5">
                      {p.items.map((it) => (
                        <ItemRow key={it.id} id={it.id} title={it.title} resources={it.resources || []} hideTier={true} />
                      ))}
                    </div>
                    {p.resources?.length > 0 && (
                      <div className="rounded-lg bg-background border p-3">
                        <div className="font-mono text-[11px] uppercase text-muted-foreground mb-1">Phase resources</div>
                        {p.resources.map((r, i) => <ResourceLink key={i} r={r} />)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
