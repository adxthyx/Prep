import { useStore, getItem } from '../store'
import { hld } from '../lib/registry'
import { SectionCard, ItemRow, ResourceLink, ProgressBar } from '../components/ui'

export default function Hld() {
  const { state } = useStore()
  const cDone = hld.concepts.filter((c) => getItem(state, c.id).status === 'done').length
  const qDone = hld.questions.filter((q) => getItem(state, q.id).status === 'done').length
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">HLD <span className="text-muted-foreground text-base font-normal">— deliberately light</span></h1>
        <p className="text-sm text-muted-foreground mt-1">{hld.meta.desc}</p>
      </header>

      <SectionCard
        title="Concepts checklist"
        desc="Know each well enough to speak for 60 seconds and draw one diagram."
        right={<ProgressBar value={cDone} total={hld.concepts.length} className="w-48" />}
      >
        <div className="grid md:grid-cols-2 gap-1.5">
          {hld.concepts.map((c) => <ItemRow key={c.id} id={c.id} title={c.title} />)}
        </div>
      </SectionCard>

      <SectionCard
        title="The 8 classics"
        desc="Sketch each on paper in 25 minutes: requirements → estimates → API → data model → diagram → bottlenecks."
        right={<ProgressBar value={qDone} total={hld.questions.length} className="w-48" />}
      >
        <div className="space-y-1.5">
          {hld.questions.map((q) => (
            <ItemRow key={q.id} id={q.id} title={`${q.title} — ${q.hint}`} />
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Resources">
        <div className="space-y-1">
          {hld.resources.map((r, i) => <ResourceLink key={i} r={r} />)}
        </div>
      </SectionCard>
    </div>
  )
}
