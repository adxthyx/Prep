import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ITEMS, MODULES, dsaProblems } from '../lib/registry'
import { useStore, getItem } from '../store'

function fuzzyMatch(needle, haystack) {
  let j = 0
  for (let i = 0; i < needle.length; i++) {
    const idx = haystack.toLowerCase().indexOf(needle[i].toLowerCase(), j)
    if (idx === -1) return null
    j = idx + 1
  }
  return j - needle.length
}

export default function CommandPalette() {
  const navigate = useNavigate()
  const { state, dispatch } = useStore()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef(null)

  // Build searchable items: ITEMS registry + MODULES + DSA patterns
  const allItems = useMemo(() => {
    const items = []

    // All trackable items from registry
    for (const [id, item] of ITEMS) {
      items.push({
        type: 'item',
        id,
        title: item.title,
        desc: item.moduleName,
        icon: '◆',
        action: () => {
          navigate(item.path)
          setOpen(false)
        },
      })
    }

    // Modules
    MODULES.forEach((m) => {
      items.push({
        type: 'module',
        id: m.key,
        title: m.name,
        desc: 'module',
        icon: '📦',
        action: () => {
          navigate(m.path)
          setOpen(false)
        },
      })
    })

    // DSA patterns
    dsaProblems.problems.forEach((p) => {
      if (p.pattern && !items.find((i) => i.title === p.pattern && i.type === 'pattern')) {
        items.push({
          type: 'pattern',
          id: `pattern-${p.pattern}`,
          title: p.pattern,
          desc: 'pattern',
          icon: '🧩',
          action: () => {
            navigate('/dsa')
            setOpen(false)
          },
        })
      }
    })

    return items
  }, [navigate])

  // Filter & rank by match quality
  const results = useMemo(() => {
    if (!search.trim()) return allItems.slice(0, 8)

    const needle = search.trim()
    const ranked = allItems
      .map((item) => {
        const titleScore = fuzzyMatch(needle, item.title)
        const descScore = fuzzyMatch(needle, item.desc)
        const score = Math.min(titleScore ?? 1000, descScore ?? 1000)
        return { ...item, score }
      })
      .filter((item) => item.score < 1000)
      .sort((a, b) => a.score - b.score)

    return ranked.slice(0, 8)
  }, [search, allItems])

  // Keyboard nav
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelected((s) => Math.min(s + 1, results.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelected((s) => Math.max(s - 1, 0))
      }
      if (e.key === 'Enter' && results[selected]) {
        e.preventDefault()
        results[selected].action()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, results, selected])

  // Global cmd/ctrl+k listener
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
        setSearch('')
        setSelected(0)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  return (
    <>
      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 bg-black/50 z-40" />}
      <div
        className={`
          fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl
          bg-card border rounded-lg shadow-xl z-50
          transition-all duration-150
          ${open ? 'mt-24 opacity-100' : '-mt-96 opacity-0 pointer-events-none'}
        `}
      >
        <div className="p-3 border-b">
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setSelected(0)
            }}
            placeholder="Search items, modules, patterns... (cmd+k)"
            className="w-full bg-transparent outline-none text-sm"
          />
        </div>

        <div className="max-h-80 overflow-y-auto">
          {results.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {search.trim() ? 'No results found' : 'Type to search'}
            </div>
          )}

          {results.map((item, i) => (
            <button
              key={item.id}
              onClick={() => item.action()}
              className={`w-full px-4 py-2 text-left text-sm transition-colors ${i === selected ? 'bg-brand text-white' : 'hover:bg-surface'}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-base">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{item.title}</div>
                  <div className="text-xs opacity-70 truncate">{item.desc}</div>
                </div>
                {i === selected && <span className="text-xs text-white/60">↵</span>}
              </div>
            </button>
          ))}
        </div>

        <div className="p-2 border-t text-xs text-muted-foreground/60 space-y-0.5">
          <div>↑↓ navigate · ↵ select · esc close</div>
        </div>
      </div>
    </>
  )
}
