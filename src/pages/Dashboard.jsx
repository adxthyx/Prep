import { Link } from 'react-router-dom'
import { useStore, getItem, dueRevisits, inProgress, config } from '../store'
import { ITEMS, MODULES, moduleItemIds, dsaProblems, sdeRoadmap, hld } from '../lib/registry'
import { daysUntil, streakFrom, todayKey, formatDate, parseDay, DAY } from '../lib/dates'
import { activeMilestone, todaysPlan, burnUpSeries, dailyQuota } from '../lib/pacing'
import Heatmap from '../components/Heatmap'
import BurnUpChart from '../components/BurnUpChart'
import { StatusPill } from '../components/ui'

/** Signature element: the Launch Rail — the whole 4-month sprint as one burn line. */
function LaunchRail({ state }) {
  const start = '2026-07-01'
  const marks = [
    { key: start, label: 'prep', short: 'JUL' },
    { key: config.applicationsOpen, label: 'applications open', short: 'AUG 1' },
    { key: state.settings?.tier1Target || '2026-08-31', label: 'T1 target', short: 'AUG 31' },
    { key: state.settings?.tier2Target || '2026-09-30', label: 'T2 target', short: 'SEP 30' },
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
  const totalDone = Object.values(state.items).filter((i) => i.status === 'done').length

  // Pacing engine
  const milestone = activeMilestone(state, config)
  const quota = dailyQuota(state, milestone)
  const planItemIds = todaysPlan(state, milestone)
  const burnUp = burnUpSeries(state, milestone)

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

      <LaunchRail state={state} />

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

      {/* Pacing metrics */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <h2 className="font-bold">{milestone.label}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Target: {formatDate(milestone.target)}</p>
          </div>
          <div className="text-right">
            <div className="font-mono text-2xl font-bold text-brand">{quota.quota}</div>
            <div className="text-xs text-muted-foreground">items/day needed</div>
          </div>
        </div>
        <div className="space-y-1 text-xs text-muted-foreground font-mono">
          <div>{quota.remaining} remaining · {quota.daysLeft} days left</div>
          <div className="text-foreground">{Math.round((quota.remaining / milestone.items.length) * 100)}% of milestone</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Today's plan */}
        <div className="rounded-lg border bg-card p-4">
          <h2 className="font-bold mb-1">Today's plan</h2>
          <p className="text-xs text-muted-foreground mb-3">{planItemIds.length} items (revisits first, then balanced fill)</p>
          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
            {planItemIds.map((id, i) => {
              const item = ITEMS.get(id)
              if (!item) return null
              const itemState = state.items[id]
              const isDue = itemState?.status === 'revisit' && itemState?.revisitDue <= todayKey()
              return (
                <div key={id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${isDue ? 'bg-brand-subtle border-brand/30' : 'bg-background'}`}>
                  {isDue && <span className="font-mono text-[10px] text-brand shrink-0">R{(itemState?.revisitStage ?? 0) + 1}</span>}
                  <span className="font-mono text-[10px] text-muted-foreground shrink-0">{i + 1}.</span>
                  <StatusPill id={id} size="xs" />
                  <Link to={item.path} className="flex-1 text-sm truncate hover:text-brand" title={item.title}>{item.title}</Link>
                  <span className="font-mono text-[10px] text-muted-foreground shrink-0">{item.moduleName}</span>
                  {isDue && (
                    <button
                      onClick={() => dispatch({ type: 'reviewed', id })}
                      className="shrink-0 rounded bg-brand text-white text-[10px] font-semibold px-2 py-0.5 hover:bg-brand-hover"
                    >
                      reviewed ✓
                    </button>
                  )}
                </div>
              )
            })}
            {planItemIds.length === 0 && (
              <div className="text-sm text-muted-foreground py-6 text-center">
                Milestone complete! <Link to="/settings" className="text-brand hover:underline">adjust targets</Link> or pick next milestone.
              </div>
            )}
          </div>
        </div>

        {/* Activity + Burn-up */}
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <h2 className="font-bold mb-1">Activity</h2>
            <p className="text-xs text-muted-foreground mb-3">Every status change / review counts. Don't break the chain.</p>
            <Heatmap activity={state.activity} />
            <div className="mt-4 space-y-1 text-xs text-muted-foreground font-mono">
              <div>revisit intervals: {config.spacedRepetitionDays.join('d → ')}d → repeat</div>
              <div>applications open: {formatDate(config.applicationsOpen)} · season ends: {formatDate(config.interviewSeasonEnd)}</div>
            </div>
          </div>

          <BurnUpChart series={burnUp} />
        </div>
      </div>
    </div>
  )
}
