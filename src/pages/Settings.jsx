import { useEffect, useState } from 'react'
import { useStore, config } from '../store'

export default function Settings() {
  const { state, dispatch, sync, history, retrySync, refreshHistory, restoreHistory } = useStore()
  const settings = state.settings || {}
  const [restoreError, setRestoreError] = useState('')

  useEffect(() => {
    void refreshHistory()
  }, [refreshHistory])

  const updateSetting = (key, value) => {
    dispatch({ type: 'settings', patch: { [key]: value } })
  }

  const restoreRevision = async (row) => {
    const confirmed = window.confirm(
      `Restore server revision ${row.previous_revision}? The current cloud state will be archived first and the restore will create a new revision. Any unsynced local changes will be replaced.`
    )
    if (!confirmed) return
    try {
      setRestoreError('')
      await restoreHistory(row.history_id)
    } catch (error) {
      setRestoreError(String(error?.message || error))
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Edit your prep timeline and preferences.</p>
      </header>

      <div className="bg-card border rounded-lg p-6 space-y-6">
        <div>
          <label className="block text-sm font-semibold mb-1">Tier 1 target (DSA + CS core)</label>
          <input
            type="date"
            value={settings.tier1Target || config.tier1Target || '2026-08-31'}
            onChange={(e) => updateSetting('tier1Target', e.target.value)}
            className="w-full max-w-xs rounded-lg border bg-background px-3 py-2"
          />
          <p className="text-xs text-muted-foreground mt-1">Complete Blind 75 + company-frequent DSA + OS/DBMS/CN/OOP by this date.</p>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Tier 2 target (DSA + HLD)</label>
          <input
            type="date"
            value={settings.tier2Target || config.tier2Target || '2026-09-30'}
            onChange={(e) => updateSetting('tier2Target', e.target.value)}
            className="w-full max-w-xs rounded-lg border bg-background px-3 py-2"
          />
          <p className="text-xs text-muted-foreground mt-1">Complete NeetCode 150 + HLD classics by this date.</p>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Interview season end</label>
          <input
            type="date"
            value={settings.seasonEnd || config.interviewSeasonEnd || '2026-10-31'}
            onChange={(e) => updateSetting('seasonEnd', e.target.value)}
            className="w-full max-w-xs rounded-lg border bg-background px-3 py-2"
          />
          <p className="text-xs text-muted-foreground mt-1">Last day before prep winds down.</p>
        </div>

        <div className="border-t pt-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.showT3 || false} onChange={(e) => updateSetting('showT3', e.target.checked)} />
            <span className="text-sm">Show Tier 3 problems in roadmap graph</span>
          </label>
          <p className="text-xs text-muted-foreground mt-1 ml-6">Include additional problems beyond Tier 1/2 in the pattern graph and pacing calculations.</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Cloud sync & recovery</h2>
            <p className="mt-1 text-xs text-muted-foreground">Supabase is the source of truth; this browser keeps an offline cache.</p>
          </div>
          <button
            type="button"
            onClick={() => void retrySync()}
            disabled={sync.status === 'saving' || sync.status === 'loading' || sync.status === 'conflict'}
            className="rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            Sync now
          </button>
        </div>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg bg-surface p-3">
            <dt className="text-xs text-muted-foreground">Status</dt>
            <dd className="mt-1 font-semibold capitalize">{sync.status}</dd>
          </div>
          <div className="rounded-lg bg-surface p-3">
            <dt className="text-xs text-muted-foreground">Current revision</dt>
            <dd className="mt-1 font-mono">{sync.revision ?? 'Not loaded'}</dd>
          </div>
          <div className="rounded-lg bg-surface p-3">
            <dt className="text-xs text-muted-foreground">Last successful cloud sync</dt>
            <dd className="mt-1">{sync.lastSyncedAt ? new Date(sync.lastSyncedAt).toLocaleString() : 'Not yet synced'}</dd>
          </div>
          <div className="rounded-lg bg-surface p-3">
            <dt className="text-xs text-muted-foreground">Realtime</dt>
            <dd className="mt-1 capitalize">{sync.realtime}</dd>
          </div>
        </dl>

        {sync.error && <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">{sync.error}</div>}

        <div className="mt-6 border-t pt-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Recent server versions</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Up to 100 previous states are retained automatically.</p>
            </div>
            <button type="button" onClick={() => void refreshHistory()} className="text-xs text-brand hover:underline">Refresh</button>
          </div>

          {history.loading && <p className="mt-3 text-sm text-muted-foreground">Loading versions…</p>}
          {history.error && <p className="mt-3 text-sm text-red-400">{history.error}</p>}
          {restoreError && <p className="mt-3 text-sm text-red-400">{restoreError}</p>}
          {!history.loading && !history.error && history.rows.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">No previous cloud versions yet.</p>
          )}
          {history.rows.length > 0 && (
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
              {history.rows.map((row) => (
                <div key={row.history_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                  <div>
                    <span className="font-mono">Revision {row.previous_revision}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void restoreRevision(row)}
                    disabled={sync.status === 'saving' || sync.status === 'loading'}
                    className="rounded-md border px-2.5 py-1 text-xs font-semibold disabled:opacity-50"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
