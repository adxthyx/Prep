import { useStore, config } from '../store'

export default function Settings() {
  const { state, dispatch } = useStore()
  const settings = state.settings || {}

  const updateSetting = (key, value) => {
    dispatch({ type: 'settings', patch: { [key]: value } })
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
    </div>
  )
}
