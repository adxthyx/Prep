import { useStore, getItem } from '../store'
import { lld } from '../lib/registry'
import { SectionCard, ItemRow, ResourceLink, ProgressBar } from '../components/ui'
import { todayKey } from '../lib/dates'

function MockLog() {
  const { state, dispatch } = useStore()
  const rows = state.mockLog
  const setRows = (r) => dispatch({ type: 'mockLog', rows: r })
  const update = (i, field, value) => setRows(rows.map((r, j) => (j === i ? { ...r, [field]: value } : r)))
  const cell = 'bg-transparent px-2 py-1.5 text-sm w-full focus:outline-none focus:bg-surface rounded'
  return (
    <SectionCard
      title="Timed-mock log"
      desc={lld.mockTarget}
      right={
        <button
          onClick={() => setRows([...rows, { id: `mock-${Date.now()}`, date: todayKey(), problem: '', minutes: '', review: '' }])}
          className="rounded-lg bg-brand text-white text-xs font-semibold px-3 py-1.5 hover:bg-brand-hover"
        >
          + mock
        </button>
      }
    >
      {rows.length > 0 ? (
        <table className="w-full text-left">
          <thead>
            <tr className="border-b font-mono text-[11px] uppercase text-muted-foreground">
              <th className="px-2 py-2 w-36">Date</th><th className="px-2 w-64">Problem</th><th className="px-2 w-20">Min</th><th className="px-2">Self-review</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-b border-border/50 hover:bg-surface/40">
                <td><input type="date" className={`${cell} font-mono text-xs`} value={r.date} onChange={(e) => update(i, 'date', e.target.value)} /></td>
                <td><input className={cell} value={r.problem} onChange={(e) => update(i, 'problem', e.target.value)} placeholder="parking lot…" /></td>
                <td><input className={`${cell} font-mono`} value={r.minutes} onChange={(e) => update(i, 'minutes', e.target.value)} placeholder="90" /></td>
                <td><input className={cell} value={r.review} onChange={(e) => update(i, 'review', e.target.value)} placeholder="what went well / what broke" /></td>
                <td><button onClick={() => setRows(rows.filter((_, j) => j !== i))} className="px-2 text-muted-foreground hover:text-red-400">×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="text-sm text-muted-foreground py-3 text-center">No mocks yet. First one is the hardest — set a 90-min timer and pick the parking lot.</div>
      )}
    </SectionCard>
  )
}

export default function Lld() {
  const { state } = useStore()
  const fDone = lld.fundamentals.filter((f) => getItem(state, f.id).status === 'done').length
  const pDone = lld.problems.filter((p) => getItem(state, p.id).status === 'done').length
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">LLD / Machine Coding</h1>
        <p className="text-sm text-muted-foreground mt-1">{lld.meta.desc}</p>
      </header>

      <SectionCard
        title="Fundamentals — SOLID + core patterns"
        right={<ProgressBar value={fDone} total={lld.fundamentals.length} className="w-48" />}
      >
        <div className="grid md:grid-cols-2 gap-1.5">
          {lld.fundamentals.map((f) => (
            <ItemRow key={f.id} id={f.id} title={f.title} resources={f.resources || []} />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Problem set"
        desc="Each links to a reference solution in ashishps1/awesome-low-level-design where one exists. Do them cold first, then compare."
        right={<ProgressBar value={pDone} total={lld.problems.length} className="w-48" />}
      >
        <div className="space-y-1.5">
          {lld.problems.map((p) => (
            <ItemRow
              key={p.id}
              id={p.id}
              title={p.title}
              resources={p.referenceUrl ? [{ title: 'Reference solution', type: 'github', url: p.referenceUrl, free: true, note: p.note, verified: p.verified }] : (p.note ? [{ title: 'How to approach', type: 'docs', url: '', free: true, note: p.note, verified: true }] : [])}
            />
          ))}
        </div>
      </SectionCard>

      <MockLog />

      <SectionCard title="Resources">
        <div className="space-y-1">
          {lld.resources.map((r, i) => <ResourceLink key={i} r={r} />)}
        </div>
      </SectionCard>
    </div>
  )
}
