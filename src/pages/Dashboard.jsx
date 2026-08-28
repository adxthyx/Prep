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
  const start = config.studyStart
  const shortDate = (date) => new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }).toUpperCase()
  const marks = [
    { key: start, label: 'study starts', short: shortDate(start) },
    { key: state.settings?.tier1Target || config.tier1Target, label: 'T1 target', short: shortDate(state.settings?.tier1Target || config.tier1Target) },
    { key: state.settings?.tier2Target || config.tier2Target, label: 'T2 target', short: shortDate(state.settings?.tier2Target || config.tier2Target) },
    { key: config.hikesDeadline, label: `${config.hikesTarget} hikes`, short: shortDate(config.hikesDeadline) },
    { key: config.studyDeadline, label: 'study complete', short: shortDate(config.studyDeadline) },
    { key: config.jobSearchStart, label: 'job search starts', short: shortDate(config.jobSearchStart) },
    { key: config.jobSearchEnd, label: 'search window ends', short: shortDate(config.jobSearchEnd) },
  ]
  const total = parseDay(config.jobSearchEnd) - parseDay(start)
  const done = Math.min(Math.max(parseDay(todayKey()) - parseDay(start), 0), total)
  const pct = (done / total) * 100
  return (
    <div className="overflow-hidden rounded-lg border bg-card p-4">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-2">
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
        {marks.map((m, index) => {
          const p = ((parseDay(m.key) - parseDay(start)) / total) * 100
          const labelPosition = index === 0 ? '' : index === marks.length - 1 ? '-translate-x-full' : '-translate-x-1/2'
          return (
            <div key={m.key} className="absolute top-0" style={{ left: `${p}%` }}>
              <div className={`h-3 w-0.5 -mt-1 ${p <= pct ? 'bg-brand' : 'bg-muted-foreground/40'}`} />
              <div className={`absolute top-3.5 text-center whitespace-nowrap ${labelPosition}`}>
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

  const toStudy = daysUntil(config.studyDeadline)
  const toHikes = daysUntil(config.hikesDeadline)
  const toJobSearch = daysUntil(config.jobSearchStart)
  const jobSearchOpen = daysUntil(config.jobSearchEnd) >= 0 && toJobSearch <= 0
  const streak = streakFrom(state.activity)
  const totalDone = Object.values(state.items || {}).filter((i) => i.status === 'done').length

  // Pacing engine (with fallbacks)
  let milestone, quota, planItemIds, burnUp
  try {
    milestone = activeMilestone(state, config)
    quota = dailyQuota(state, milestone)
    planItemIds = todaysPlan(state, milestone)
    burnUp = burnUpSeries(state, milestone)
  } catch (e) {
    console.error('Pacing engine error:', e)
    milestone = { label: 'Error', target: config.studyDeadline, items: [], tier: 3 }
    quota = { quota: 0, remaining: 0, daysLeft: 1, target: config.studyDeadline }
    planItemIds = []
    burnUp = []
  }

  try {
  return (
    <div className="space-y-4">
      <header className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 sm:flex-1">
          <h1 className="text-2xl font-bold">
            Mission Control<span className="text-brand">.</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} — {totalDone} items done all-time
          </p>
        </div>
        <div className="flex self-start items-center gap-2 rounded-lg border bg-card px-3 py-2">
          <span className="text-xl">{streak > 0 ? '🔥' : '🪵'}</span>
          <div>
            <div className="font-mono font-bold leading-none">{streak} day{streak === 1 ? '' : 's'}</div>
            <div className="text-[10px] text-muted-foreground">streak</div>
          </div>
        </div>
      </header>

      <LaunchRail state={state} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        <Countdown
          n={toStudy > 0 ? toStudy : 0}
          unit="DAYS"
          label={toStudy > 0 ? `until study deadline (${formatDate(config.studyDeadline)})` : 'study deadline reached'}
          accent={toStudy > 14 ? 'text-downvote' : 'text-brand'}
        />
        <Countdown
          n={toHikes > 0 ? toHikes : 0}
          unit="DAYS"
          label={toHikes > 0 ? `${config.hikesTarget} hikes by ${formatDate(config.hikesDeadline)}` : `${config.hikesTarget} hikes deadline reached`}
          accent={toHikes > 14 ? 'text-brand' : 'text-yellow-400'}
        />
        <Countdown
          n={toJobSearch > 0 ? toJobSearch : 0}
          unit="DAYS"
          label={toJobSearch > 0 ? `until job search starts (${formatDate(config.jobSearchStart)})` : jobSearchOpen ? 'job search window is open' : 'job search window ended'}
          accent="text-brand"
        />
        <Countdown n={planItemIds.filter((id) => state.items?.[id]?.status === 'revisit' && state.items[id]?.revisitDue <= todayKey()).length} unit="DUE" label="revisits due today" accent="text-yellow-400" />
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
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <div className="min-w-0">
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

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Today's plan */}
        <div className="min-w-0 rounded-lg border bg-card p-4">
          <h2 className="font-bold mb-1">Today's plan</h2>
          <p className="text-xs text-muted-foreground mb-3">{planItemIds.length} items (revisits first, then balanced fill)</p>
          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
            {planItemIds.map((id, i) => {
              const item = ITEMS.get(id)
              if (!item) return null
              const itemState = state.items[id]
              const isDue = itemState?.status === 'revisit' && itemState?.revisitDue <= todayKey()
              return (
                <div key={id} className={`flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2 ${isDue ? 'bg-brand-subtle border-brand/30' : 'bg-background'}`}>
                  {isDue && <span className="font-mono text-[10px] text-brand shrink-0">R{(itemState?.revisitStage ?? 0) + 1}</span>}
                  <span className="font-mono text-[10px] text-muted-foreground shrink-0">{i + 1}.</span>
                  <StatusPill id={id} size="xs" />
                  <Link to={item.module === 'dsa' ? `${item.path}?highlight=${id}` : item.path} className="flex-1 text-sm truncate hover:text-brand" title={item.title}>{item.title}</Link>
                  <span className="hidden font-mono text-[10px] text-muted-foreground shrink-0 sm:inline">{item.moduleName}</span>
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
        <div className="min-w-0 space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <h2 className="font-bold mb-1">Activity</h2>
            <p className="text-xs text-muted-foreground mb-3">Every status change / review counts. Don't break the chain.</p>
            <Heatmap activity={state.activity} />
            <div className="mt-4 space-y-1 text-xs text-muted-foreground font-mono">
              <div>revisit intervals: {config.spacedRepetitionDays.join('d → ')}d → repeat</div>
              <div>study deadline: {formatDate(config.studyDeadline)} · {config.hikesTarget} hikes by: {formatDate(config.hikesDeadline)}</div>
              <div>job search: {formatDate(config.jobSearchStart)} – {formatDate(config.jobSearchEnd)}</div>
            </div>
          </div>

          <BurnUpChart series={burnUp} />
        </div>
      </div>
    </div>
    )
  } catch (err) {
    console.error('Dashboard render error:', err)
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-400">Error loading dashboard</h1>
        <p className="text-sm text-muted-foreground mt-2">{err?.message}</p>
      </div>
    )
  }
}
