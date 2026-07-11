import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useStore, exportState, importState, config } from '../store'
import { daysUntil } from '../lib/dates'
// import CommandPalette from './CommandPalette'

const NAV = [
  { to: '/', label: 'Dashboard', icon: '◉', end: true },
  { to: '/project', label: 'Morning TIL', icon: '🌅' },
  { to: '/sde', label: 'SDE1 Roadmap', icon: '🛠' },
  { to: '/ai', label: 'AI / FDE', icon: '🤖' },
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
  const { state, dispatch } = useStore()
  const fileRef = useRef(null)
  const navigate = useNavigate()
  const [dark, setDark] = useState(true)
  const [importErr, setImportErr] = useState('')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  // keyboard shortcuts: g then key
  useEffect(() => {
    let pendingG = false
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'g') { pendingG = true; setTimeout(() => (pendingG = false), 800); return }
      if (!pendingG) return
      const map = { d: '/', p: '/project', s: '/sde', a: '/ai', q: '/dsa', h: '/hld', l: '/lld' }
      if (map[e.key]) navigate(map[e.key])
      pendingG = false
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  const phase = phaseNow()

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 w-56 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <div className="font-bold text-lg leading-tight">
            <span className="text-brand-gradient">Prep</span> Command
          </div>
          <div className={`font-mono text-[11px] mt-1 ${phase.color}`}>{phase.label}</div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
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
                if (f)
                  importState(f, dispatch)
                    .then(() => setImportErr(''))
                    .catch((err) => setImportErr(String(err.message || err)))
                e.target.value = ''
              }}
            />
          </div>
          {importErr && <div className="text-[11px] text-red-400">{importErr}</div>}
          <button
            onClick={() => setDark(!dark)}
            className="w-full rounded-lg border text-xs py-1.5 text-muted-foreground hover:bg-surface transition-colors"
          >
            {dark ? '☀ light mode' : '● dark mode'}
          </button>
          <div className="font-mono text-[10px] text-muted-foreground/60 text-center">
            g+d dash · g+q dsa · g+p til
          </div>
        </div>
      </aside>
      <main className="ml-56 flex-1 p-6 max-w-6xl">
        <Outlet />
      </main>
      {/* <CommandPalette /> */}
    </div>
  )
}
