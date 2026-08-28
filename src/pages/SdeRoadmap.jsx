import { useState } from 'react'
import { useStore, getItem, config } from '../store'
import { sdeRoadmap } from '../lib/registry'
import { SectionCard, ItemRow, ResourceLink, ProgressBar } from '../components/ui'
import { todayKey, formatDate } from '../lib/dates'

const STATUS_COLORS = {
  wishlist: 'text-muted-foreground', applied: 'text-downvote', OA: 'text-yellow-400',
  phone: 'text-yellow-400', onsite: 'text-brand', offer: 'text-green-400',
  rejected: 'text-red-400', ghosted: 'text-muted-foreground/60',
}

function Applications() {
  const { state, dispatch } = useStore()
  const rows = state.applications
  const setRows = (r) => dispatch({ type: 'applications', rows: r })
  const update = (i, field, value) => setRows(rows.map((r, j) => (j === i ? { ...r, [field]: value } : r)))
  const addRow = () =>
    setRows([...rows, { id: `app-${Date.now()}`, company: '', role: 'SDE1', source: '', referral: '', status: 'wishlist', appliedDate: todayKey(), nextDate: '', notes: '' }])

  const cell = 'bg-transparent px-2 py-1.5 text-sm w-full focus:outline-none focus:bg-surface rounded'
  return (
    <SectionCard
      title="Applications & OA tracker"
      desc="One row per application. Everything editable inline."
      right={<button onClick={addRow} className="rounded-lg bg-brand text-white text-xs font-semibold px-3 py-1.5 hover:bg-brand-hover">+ application</button>}
    >
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full min-w-[820px] text-left">
          <thead>
            <tr className="border-b font-mono text-[11px] uppercase text-muted-foreground">
              <th className="px-2 py-2">Company</th><th className="px-2">Role</th><th className="px-2">Source</th>
              <th className="px-2">Referral</th><th className="px-2">Status</th><th className="px-2">Applied</th>
              <th className="px-2">Next date</th><th className="px-2">Notes</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-b border-border/50 hover:bg-surface/40">
                <td><input className={`${cell} font-medium`} value={r.company} onChange={(e) => update(i, 'company', e.target.value)} placeholder="…" /></td>
                <td><input className={cell} value={r.role} onChange={(e) => update(i, 'role', e.target.value)} /></td>
                <td><input className={cell} value={r.source} onChange={(e) => update(i, 'source', e.target.value)} placeholder="LinkedIn / Naukri…" /></td>
                <td><input className={cell} value={r.referral} onChange={(e) => update(i, 'referral', e.target.value)} placeholder="no" /></td>
                <td>
                  <select
                    value={r.status}
                    onChange={(e) => update(i, 'status', e.target.value)}
                    className={`bg-transparent px-1 py-1.5 text-sm font-mono focus:outline-none ${STATUS_COLORS[r.status] || ''}`}
                  >
                    {sdeRoadmap.applicationStatuses.map((s) => <option key={s} value={s} className="bg-card text-foreground">{s}</option>)}
                  </select>
                </td>
                <td><input type="date" className={`${cell} font-mono text-xs`} value={r.appliedDate} onChange={(e) => update(i, 'appliedDate', e.target.value)} /></td>
                <td><input type="date" className={`${cell} font-mono text-xs`} value={r.nextDate} onChange={(e) => update(i, 'nextDate', e.target.value)} /></td>
                <td><input className={cell} value={r.notes} onChange={(e) => update(i, 'notes', e.target.value)} /></td>
                <td>
                  <button onClick={() => setRows(rows.filter((_, j) => j !== i))} className="px-2 text-muted-foreground hover:text-red-400" title="delete row">×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="text-sm text-muted-foreground py-4 text-center">No applications yet — job search starts {formatDate(config.jobSearchStart)}.</div>}
      </div>
    </SectionCard>
  )
}

export default function SdeRoadmap() {
  const { state } = useStore()
  const [openPhase, setOpenPhase] = useState(sdeRoadmap.phases[0].id)
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">SDE1 Roadmap</h1>
        <p className="text-sm text-muted-foreground max-w-3xl mt-1">{sdeRoadmap.meta.basedOn}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {sdeRoadmap.meta.sources.map((r, i) => <ResourceLink key={i} r={r} />)}
        </div>
      </header>

      {sdeRoadmap.phases.map((p) => {
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
                    <ItemRow key={it.id} id={it.id} title={it.title} resources={it.resources || []} />
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

      <Applications />
    </div>
  )
}
