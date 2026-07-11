import { createContext, useContext, useEffect, useReducer } from 'react'
import config from './data/config.json'
import { sdeRoadmap } from './lib/registry'
import { todayKey, addDays } from './lib/dates'

const KEY = 'prep-command-center-v1'
const SR = config.spacedRepetitionDays // [3, 7, 21]

export const STATUSES = ['todo', 'in-progress', 'done', 'revisit']

const initial = {
  version: 1,
  items: {}, // id -> { status, notes, links[], revisitStage, revisitDue, updatedAt }
  kanban: {}, // cardId -> columnId (overrides seed column)
  customCards: [], // user-added kanban cards {id,title,phase,column}
  applications: sdeRoadmap.applications, // rows
  mockLog: [], // {id,date,problem,minutes,review}
  stories: {}, // storyId -> field overrides
  decisions: [], // extra decision-log entries {id,date,decision,why}
  archNotes: null, // markdown override (null = seed)
  activity: {}, // 'YYYY-MM-DD' -> count of touches
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return initial
    const parsed = JSON.parse(raw)
    return { ...initial, ...parsed }
  } catch {
    return initial
  }
}

function touch(state) {
  const t = todayKey()
  return { ...state.activity, [t]: (state.activity[t] || 0) + 1 }
}

function reducer(state, action) {
  switch (action.type) {
    case 'item': {
      // patch = {status? notes? links?}
      const prev = state.items[action.id] || { status: 'todo', notes: '', links: [] }
      const next = { ...prev, ...action.patch, updatedAt: Date.now() }
      if (action.patch.status === 'revisit' && prev.status !== 'revisit') {
        next.revisitStage = 0
        next.revisitDue = addDays(todayKey(), SR[0])
      }
      if (action.patch.status && action.patch.status !== 'revisit') {
        delete next.revisitStage
        delete next.revisitDue
      }
      return {
        ...state,
        items: { ...state.items, [action.id]: next },
        activity: action.patch.status ? touch(state) : state.activity,
      }
    }
    case 'reviewed': {
      // spaced repetition: bump 3 -> 7 -> 21 -> 21 ...
      const prev = state.items[action.id]
      if (!prev || prev.status !== 'revisit') return state
      const stage = Math.min((prev.revisitStage ?? 0) + 1, SR.length - 1)
      return {
        ...state,
        items: {
          ...state.items,
          [action.id]: { ...prev, revisitStage: stage, revisitDue: addDays(todayKey(), SR[stage]), updatedAt: Date.now() },
        },
        activity: touch(state),
      }
    }
    case 'kanban':
      return { ...state, kanban: { ...state.kanban, [action.cardId]: action.column }, activity: touch(state) }
    case 'addCard': {
      const id = `til-custom-${Date.now()}`
      return { ...state, customCards: [...state.customCards, { id, title: action.title, phase: action.phase || '—', column: action.column || 'backlog' }], activity: touch(state) }
    }
    case 'applications':
      return { ...state, applications: action.rows }
    case 'mockLog':
      return { ...state, mockLog: action.rows }
    case 'story':
      return { ...state, stories: { ...state.stories, [action.id]: { ...(state.stories[action.id] || {}), ...action.patch } } }
    case 'decision':
      return { ...state, decisions: [...state.decisions, { id: `dl-${Date.now()}`, date: todayKey(), ...action.entry }] }
    case 'archNotes':
      return { ...state, archNotes: action.text }
    case 'import':
      return { ...initial, ...action.state }
    default:
      return state
  }
}

const Ctx = createContext(null)

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state))
  }, [state])
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>
}

export function useStore() {
  return useContext(Ctx)
}

export function getItem(state, id) {
  return state.items[id] || { status: 'todo', notes: '', links: [] }
}

export function exportState(state) {
  const blob = new Blob(
    [JSON.stringify({ exportedAt: new Date().toISOString(), app: 'prep-command-center', ...state }, null, 2)],
    { type: 'application/json' }
  )
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `prep-backup-${todayKey()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importState(file, dispatch) {
  return file.text().then((text) => {
    const parsed = JSON.parse(text)
    if (!parsed.items || typeof parsed.items !== 'object') {
      throw new Error('Not a prep-command-center backup: missing "items"')
    }
    dispatch({ type: 'import', state: parsed })
  })
}

// ---- derived selectors ----
export function dueRevisits(state, itemsMap) {
  const t = todayKey()
  const due = []
  for (const [id, it] of Object.entries(state.items)) {
    if (it.status === 'revisit' && it.revisitDue && it.revisitDue <= t && itemsMap.has(id)) {
      due.push({ id, ...itemsMap.get(id), due: it.revisitDue, stage: it.revisitStage ?? 0 })
    }
  }
  due.sort((a, b) => (a.due < b.due ? -1 : 1))
  return due
}

export function inProgress(state, itemsMap) {
  const rows = []
  for (const [id, it] of Object.entries(state.items)) {
    if (it.status === 'in-progress' && itemsMap.has(id)) {
      rows.push({ id, ...itemsMap.get(id), updatedAt: it.updatedAt || 0 })
    }
  }
  rows.sort((a, b) => b.updatedAt - a.updatedAt)
  return rows
}

export { config }
