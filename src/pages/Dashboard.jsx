import { Link } from 'react-router-dom'
import { useStore, getItem, dueRevisits, config } from '../store'
import { ITEMS, MODULES, moduleItemIds } from '../lib/registry'
import { streakFrom, todayKey, formatDate } from '../lib/dates'
import { activeMilestone, todaysPlan, burnUpSeries, dailyQuota } from '../lib/pacing'
import Heatmap from '../components/Heatmap'
import BurnUpChart from '../components/BurnUpChart'
import { StatusPill } from '../components/ui'

export default function Dashboard() {
  const { state, dispatch } = useStore()

  const streak = streakFrom(state.activity)
  const revisitsDue = dueRevisits(state, ITEMS).length

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
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
          <span className="text-xl">{streak > 0 ? '🔥' : '🪵'}</span>
          <div>
            <div className="font-mono font-bold leading-none">{streak} day{streak === 1 ? '' : 's'}</div>
            <div className="text-[10px] text-muted-foreground">streak</div>
          </div>
        </div>
        <span className={`rounded-full border px-2 py-0.5 font-mono text-[11px] ${revisitsDue > 0 ? 'border-yellow-400/40 bg-yellow-400/10 text-yellow-400' : 'text-muted-foreground'}`}>
          {revisitsDue} revisit{revisitsDue === 1 ? '' : 's'} due today
        </span>
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
        <div className="text-xs text-muted-foreground font-mono">{quota.remaining} remaining · {quota.daysLeft} days left</div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Today's plan */}
        <div className="min-w-0 rounded-lg border bg-card p-4">
          <h2 className="font-bold mb-1">Today's plan</h2>
          <p className="text-xs text-muted-foreground mb-3">{planItemIds.length} items</p>
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
            <p className="text-xs text-muted-foreground mb-3">Every status change / review counts.</p>
            <Heatmap activity={state.activity} />
            <div className="mt-4 text-xs text-muted-foreground font-mono">revisit intervals: {config.spacedRepetitionDays.join('d → ')}d → repeat</div>
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
