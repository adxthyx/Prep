import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useStore, exportState, parseBackupFile, config } from '../store'
import { useAuth } from '../auth'
import { daysUntil } from '../lib/dates'
// import CommandPalette from './CommandPalette'

const NAV = [
  { to: '/', label: 'Dashboard', icon: '◉', end: true },
  { to: '/project', label: 'Anchor', icon: '⚓' },
  { to: '/sde', label: 'SDE1 Roadmap', icon: '🛠' },
  { to: '/ai', label: 'AI / FDE', icon: '🤖' },
  { to: '/ai-papers', label: 'AI Papers', icon: '📚' },
  { to: '/dsa', label: 'DSA', icon: '🧩' },
  { to: '/hld', label: 'HLD', icon: '🏗' },
  { to: '/lld', label: 'LLD', icon: '📐' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

function phaseNow() {
  const toApps = daysUntil(config.applicationsOpen)
  const toEnd = daysUntil(config.interviewSeasonEnd)
  if (toApps > 0) return { label: 'PHASE: PREP', color: 'text-downvote' }
  if (toEnd >= 0) return { label: 'PHASE: INTERVIEW SEASON', color: 'text-brand' }
  return { label: 'PHASE: JOINING', color: 'text-green-400' }
}

export default function Layout() {
  const { state, sync, flushPending, retrySync, acceptCloudState, restoreBackup } = useStore()
  const { user, signOut, isLocalMode } = useAuth()
  const fileRef = useRef(null)
  const navigate = useNavigate()
  const [dark, setDark] = useState(true)
  const [importErr, setImportErr] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  useEffect(() => {
    if (!navOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setNavOpen(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [navOpen])

  // keyboard shortcuts: g then key
  useEffect(() => {
    let pendingG = false
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'g') { pendingG = true; setTimeout(() => (pendingG = false), 800); return }
      if (!pendingG) return
      const map = { d: '/', p: '/project', s: '/sde', a: '/ai', r: '/ai-papers', q: '/dsa', h: '/hld', l: '/lld' }
      if (map[e.key]) navigate(map[e.key])
      pendingG = false
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  const phase = phaseNow()

  const handleImport = async (file) => {
    try {
      const backup = await parseBackupFile(file)
      const when = backup.exportedAt ? new Date(backup.exportedAt).toLocaleString() : 'an unknown date'
      const confirmed = window.confirm(
        `Restore the backup from ${when}? This is a recovery action. The current cloud state will be saved in server history and the restore will create a new revision.`
      )
      if (!confirmed) return
      await restoreBackup(backup.state)
      setImportErr('')
      setImportMsg('Backup restore accepted. Check the sync status for cloud confirmation.')
    } catch (error) {
      setImportMsg('')
      setImportErr(String(error?.message || error))
    }
  }

  const handleSignOut = async () => {
    await flushPending()
    await signOut()
  }

  return (
    <div className="flex min-h-screen">
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b bg-card px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setNavOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border text-xl"
          aria-label="Open navigation"
          aria-expanded={navOpen}
        >
          ☰
        </button>
        <div className="min-w-0 flex-1 font-bold leading-tight">
          <span className="text-brand-gradient">Prep</span> Command
        </div>
        <div className={`hidden shrink-0 font-mono text-[9px] sm:block ${phase.color}`}>{phase.label}</div>
      </header>

      {navOpen && (
        <button
          type="button"
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-label="Close navigation"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r bg-card transition-transform duration-200 lg:w-56 lg:max-w-none lg:translate-x-0 ${navOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-start justify-between border-b p-4">
          <div>
            <div className="font-bold text-lg leading-tight">
              <span className="text-brand-gradient">Prep</span> Command
            </div>
            <div className={`font-mono text-[11px] mt-1 ${phase.color}`}>{phase.label}</div>
          </div>
          <button
            type="button"
            onClick={() => setNavOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-xl text-muted-foreground lg:hidden"
            aria-label="Close navigation"
          >
            ×
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              onClick={() => setNavOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive ? 'bg-brand-subtle text-brand font-semibold border border-brand/30' : 'hover:bg-surface text-foreground/80'
                }`
              }
            >
              <span className="w-5 text-center">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => exportState(state)}
              className="flex-1 rounded-lg bg-brand text-white text-xs font-semibold py-1.5 hover:bg-brand-hover transition-colors"
              title="Download all progress as JSON"
            >
              Export
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex-1 rounded-lg border text-xs font-semibold py-1.5 hover:bg-surface transition-colors"
              title="Restore from a JSON backup"
            >
              Import
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleImport(f)
                e.target.value = ''
              }}
            />
          </div>
          {importErr && <div className="text-[11px] text-red-400">{importErr}</div>}
          {importMsg && <div className="text-[11px] text-green-400">{importMsg}</div>}
          <button
            onClick={() => setDark(!dark)}
            className="w-full rounded-lg border text-xs py-1.5 text-muted-foreground hover:bg-surface transition-colors"
          >
            {dark ? '☀ light mode' : '● dark mode'}
          </button>
          <div className="truncate text-center font-mono text-[10px] text-muted-foreground" title={user.email}>
            {user.email}
          </div>
          {isLocalMode ? (
            <div className="text-center font-mono text-[10px] text-muted-foreground">local mode · no account</div>
          ) : (
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="w-full rounded-lg border py-1.5 text-xs text-muted-foreground transition-colors hover:bg-surface"
            >
              Sign out
            </button>
          )}
          <div className="font-mono text-[10px] text-muted-foreground/60 text-center">
            g+d dash · g+q dsa · g+p til
          </div>
        </div>
      </aside>
      <main className="w-full min-w-0 flex-1 px-4 pb-6 pt-20 sm:px-6 lg:ml-56 lg:max-w-6xl lg:p-6">
        {sync.status !== 'synced' && sync.status !== 'local' && (
          <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${sync.status === 'conflict' ? 'border-red-500/50 bg-red-500/10' : 'bg-card'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                <strong className="capitalize">{sync.status}.</strong>{' '}
                {sync.error || (sync.status === 'saving' ? 'Saving to Supabase…' : 'Local changes are retained.')}
              </span>
              <div className="flex gap-2">
                {sync.status === 'conflict' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Use the newer cloud state? Your unsynced local changes will be replaced. Export first if you want to keep a copy.')) {
                        acceptCloudState()
                      }
                    }}
                    className="rounded-md bg-brand px-2.5 py-1 text-xs font-semibold text-white"
                  >
                    Use cloud revision {sync.conflict?.revision}
                  </button>
                )}
                {sync.status !== 'conflict' && sync.status !== 'saving' && (
                  <button type="button" onClick={() => void retrySync()} className="rounded-md border px-2.5 py-1 text-xs font-semibold">
                    Retry sync
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        <Outlet />
      </main>
      {/* <CommandPalette /> */}
    </div>
  )
}
