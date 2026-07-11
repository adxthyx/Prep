import { Link } from 'react-router-dom'
import { useStore, getItem, dueRevisits, inProgress, config } from '../store'
import { ITEMS, MODULES, moduleItemIds } from '../lib/registry'
import { daysUntil, streakFrom, todayKey, formatDate, parseDay, DAY } from '../lib/dates'
import Heatmap from '../components/Heatmap'
import { StatusPill } from '../components/ui'

/** Signature element: the Launch Rail — the whole 4-month sprint as one burn line. */
function LaunchRail() {
  const start = '2026-07-01'
  const marks = [
    { key: start, label: 'prep', short: 'JUL' },
    { key: config.applicationsOpen, label: 'applications open', short: 'AUG 1' },
    { key: '2026-09-15', label: 'peak interviews', short: 'SEP' },
    { key: config.interviewSeasonEnd, label: 'season ends', short: 'OCT 31' },
    { key: config.targetJoining, label: 'joining', short: 'NOV' },
  ]
  const total = parseDay(config.targetJoining) - parseDay(start)
  const done = Math.min(Math.max(parseDay(todayKey()) - parseDay(start), 0), total)
  const pct = (done / total) * 100
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-bold">Mission timeline</h2>
        <span className="font-mono text-xs text-muted-foreground">{Math.round(pct)}% of runway burned</span>
      </div>
      <div className="relative mx-2 mb-8">
        <div className="h-1 rounded-full bg-surface" />
        <div className="absolute top-0 h-1 rounded-full bg-brand-gradient" style={{ width: `${pct}%` }} />
        {/* today marker */}
        <div className="absolute -top-1.5" style={{ left: `${pct}%` }}>
          <div className="h-4 w-4 -ml-2 rounded-full bg-brand ring-4 ring-brand/20 animate-pulse" />
        </div>
        {marks.map((m) => {
          const p = ((parseDay(m.key) - parseDay(start)) / total) * 100
          return (
            <div key={m.key} className="absolute top-0" style={{ left: `${p}%` }}>
              <div className={`h-3 w-0.5 -mt-1 ${p <= pct ? 'bg-brand' : 'bg-muted-foreground/40'}`} />
              <div className="absolute top-3.5 -translate-x-1/2 text-center whitespace-nowrap">
                <div className="font-mono text-[10px] text-foreground/80">{m.short}</div>
                <div className="text-[10px] text-muted-foreground hidden sm:block">{m.label}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Countdown({ n, unit, label, accent }) {
  return (
    <div className="rounded-lg border bg-card p-4 text-center">
      <div className={`font-mono text-4xl font-bold ${accent}`}>{n}</div>
      <div className="font-mono text-[11px] text-muted-foreground mt-1">{unit}</div>
      <div className="text-xs text-foreground/80 mt-1">{label}</div>
    </div>
  )
}

export default function Dashboard() {
  const { state, dispatch } = useStore()
  const toApps = daysUntil(config.applicationsOpen)
  const seasonEnd = daysUntil(config.interviewSeasonEnd)
  const seasonDays = Math.max(seasonEnd, 0)
  const streak = streakFrom(state.activity)
  const due = dueRevisits(state, ITEMS)
  const wip = inProgress(state, ITEMS)
  const totalDone = Object.values(state.items).filter((i) => i.status === 'done').length

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Mission Control<span className="text-brand">.</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} — {totalDone} items done all-time
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
          <span className="text-xl">{streak > 0 ? '🔥' : '🪵'}</span>
          <div>
            <div className="font-mono font-bold leading-none">{streak} day{streak === 1 ? '' : 's'}</div>
            <div className="text-[10px] text-muted-foreground">streak</div>
          </div>
        </div>
      </header>

      <LaunchRail />

      <div className="grid grid-cols-3 gap-4">
        <Countdown
          n={toApps > 0 ? toApps : 0}
          unit="DAYS"
          label={toApps > 0 ? 'until applications open (Aug 1)' : 'applications are OPEN — go'}
          accent={toApps > 14 ? 'text-downvote' : 'text-brand'}
        />
        <Countdown
          n={seasonDays}
          unit="DAYS"
          label={daysUntil(config.interviewSeasonStart) > 0 ? 'of interview season (Aug–Oct) ahead' : seasonEnd >= 0 ? 'left in interview season' : 'season over — joining time'}
          accent="text-brand"
        />
        <Countdown n={due.length} unit="DUE" label="revisits due today" accent={due.length ? 'text-yellow-400' : 'text-green-400'} />
      </div>

      {/* per-module progress */}
      <div className="rounded-lg border bg-card p-4">
        <h2 className="font-bold mb-3">Modules</h2>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
          {MODULES.map((m) => {
            const ids = moduleItemIds(m.key)
            const done = ids.filter((id) => getItem(state, id).status === 'done').length
            const pct = ids.length ? Math.round((done / ids.length) * 100) : 0
            return (
              <Link key={m.key} to={m.path} className="group py-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="group-hover:text-brand transition-colors font-medium">{m.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{done}/{ids.length}</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                  <div className="h-full bg-brand-gradient rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Today queue */}
        <div className="rounded-lg border bg-card p-4">
          <h2 className="font-bold mb-1">Today</h2>
          <p className="text-xs text-muted-foreground mb-3">Due revisits first, then whatever's in flight.</p>
          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
            {due.map((d) => (
              <div key={d.id} className="flex items-center gap-2 rounded-lg bg-brand-subtle border border-brand/30 px-3 py-2">
                <span className="font-mono text-[10px] text-brand shrink-0">R{(d.stage ?? 0) + 1}</span>
                <Link to={d.path} className="flex-1 text-sm truncate hover:text-brand" title={d.title}>{d.title}</Link>
                <span className="font-mono text-[10px] text-muted-foreground shrink-0">{d.moduleName}</span>
                <button
                  onClick={() => dispatch({ type: 'reviewed', id: d.id })}
                  className="shrink-0 rounded bg-brand text-white text-[11px] font-semibold px-2 py-0.5 hover:bg-brand-hover"
                  title="Reviewed — push to the next interval (3→7→21d)"
                >
                  reviewed ✓
                </button>
              </div>
            ))}
            {wip.map((w) => (
              <div key={w.id} className="flex items-center gap-2 rounded-lg bg-background border px-3 py-2">
                <StatusPill id={w.id} size="xs" />
                <Link to={w.path} className="flex-1 text-sm truncate hover:text-brand" title={w.title}>{w.title}</Link>
                <span className="font-mono text-[10px] text-muted-foreground shrink-0">{w.moduleName}</span>
              </div>
            ))}
            {due.length === 0 && wip.length === 0 && (
              <div className="text-sm text-muted-foreground py-6 text-center">
                Nothing queued. Mark something <span className="text-downvote">in progress</span> or hit the DSA module.
              </div>
            )}
          </div>
        </div>

        {/* activity */}
        <div className="rounded-lg border bg-card p-4">
          <h2 className="font-bold mb-1">Activity</h2>
          <p className="text-xs text-muted-foreground mb-3">Every status change / review counts. Don't break the chain.</p>
          <Heatmap activity={state.activity} />
          <div className="mt-4 space-y-1 text-xs text-muted-foreground font-mono">
            <div>revisit intervals: {config.spacedRepetitionDays.join('d → ')}d → repeat</div>
            <div>applications open: {formatDate(config.applicationsOpen)} · season ends: {formatDate(config.interviewSeasonEnd)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
