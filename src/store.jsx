import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import config from './data/config.json'
import { sdeRoadmap } from './lib/registry'
import { todayKey, addDays } from './lib/dates'
import {
  fetchCloudState,
  fetchStateHistory,
  initializeCloudState,
  isValidPrepState,
  parseBackupFile,
  readLocalCache,
  restoreCloudHistory,
  saveCloudState,
  subscribeToCloudState,
  unsubscribeFromCloudState,
  writeLocalCache,
} from './lib/prepPersistence'

const CLOUD_SAVE_DEBOUNCE_MS = 750
const SR = config.spacedRepetitionDays // [3, 7, 21]

export const STATUSES = ['todo', 'in-progress', 'done', 'revisit']

export function createInitialState() {
  return {
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
    tierOverrides: {}, // problemId -> 1|2|3
    settings: {
      tier1Target: config.tier1Target || '2026-08-31',
      tier2Target: config.tier2Target || '2026-09-30',
      seasonEnd: config.interviewSeasonEnd,
      showT3: false,
    },
  }
}

function normalizeState(value) {
  const defaults = createInitialState()
  if (!isValidPrepState(value)) return defaults
  return {
    ...defaults,
    ...value,
    settings: { ...defaults.settings, ...(value.settings || {}) },
  }
}

function touch(state) {
  const t = todayKey()
  return { ...state.activity, [t]: (state.activity[t] || 0) + 1 }
}

function reducer(state, action) {
  switch (action.type) {
    case 'item': {
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
    case 'tier':
      return { ...state, tierOverrides: { ...state.tierOverrides, [action.id]: action.tier } }
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } }
    default:
      return state
  }
}

function errorMessage(error) {
  return String(error?.message || error || 'Unknown sync error')
}

function isOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

const Ctx = createContext(null)

export function StoreProvider({ user, children }) {
  const initialCacheRef = useRef(null)
  if (!initialCacheRef.current) initialCacheRef.current = readLocalCache(user.id)
  const initialCache = initialCacheRef.current
  const cachedMeta = initialCache.usable ? initialCache.meta : null
  const initialState = initialCache.usable ? normalizeState(initialCache.data) : createInitialState()

  const [state, setState] = useState(initialState)
  const [sync, setSync] = useState({
    ready: false,
    status: 'loading',
    revision: cachedMeta?.revision ?? null,
    lastSyncedAt: cachedMeta?.lastSyncedAt ?? null,
    error: initialCache.error ? errorMessage(initialCache.error) : null,
    conflict: null,
    realtime: 'connecting',
  })
  const [history, setHistory] = useState({ rows: [], loading: false, error: null })

  const stateRef = useRef(state)
  const readyRef = useRef(false)
  const revisionRef = useRef(cachedMeta?.revision ?? null)
  const lastSyncedAtRef = useRef(cachedMeta?.lastSyncedAt ?? null)
  const dirtyRef = useRef(Boolean(initialCache.usable && cachedMeta?.dirty))
  const conflictRef = useRef(null)
  const changeSequenceRef = useRef(0)
  const inFlightRef = useRef(null)
  const deferredRealtimeRef = useRef(null)
  const pendingAfterFlightRef = useRef(false)
  const debounceTimerRef = useRef(null)
  const retryTimerRef = useRef(null)
  const retryDelayRef = useRef(2000)
  const loadingCloudRef = useRef(false)
  const flushRef = useRef(() => Promise.resolve(null))
  const syncFromCloudRef = useRef(() => Promise.resolve(null))

  const updateSync = useCallback((patch) => {
    setSync((current) => ({ ...current, ...(typeof patch === 'function' ? patch(current) : patch) }))
  }, [])

  const cacheState = useCallback((data = stateRef.current) => {
    const result = writeLocalCache(data, {
      userId: user.id,
      revision: revisionRef.current,
      dirty: dirtyRef.current,
      lastSyncedAt: lastSyncedAtRef.current,
    })
    if (!result.ok) {
      updateSync((current) => ({ ...current, error: `Local cache failed: ${errorMessage(result.error)}` }))
    }
    return result
  }, [updateSync, user.id])

  const scheduleSave = useCallback((delay = CLOUD_SAVE_DEBOUNCE_MS) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null
      void flushRef.current()
    }, delay)
  }, [])

  const scheduleRetry = useCallback(() => {
    if (retryTimerRef.current || conflictRef.current || isOffline()) return
    const delay = retryDelayRef.current
    retryDelayRef.current = Math.min(delay * 2, 30000)
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null
      if (dirtyRef.current && Number.isSafeInteger(revisionRef.current)) void flushRef.current()
      else void syncFromCloudRef.current()
    }, delay)
  }, [])

  const applyCloudRow = useCallback((row) => {
    if (!row || !isValidPrepState(row.data) || !Number.isSafeInteger(row.revision)) {
      throw new Error('The cloud state is invalid and was not applied.')
    }
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    debounceTimerRef.current = null
    retryTimerRef.current = null
    retryDelayRef.current = 2000
    conflictRef.current = null
    dirtyRef.current = false
    revisionRef.current = row.revision
    lastSyncedAtRef.current = row.updatedAt || new Date().toISOString()
    readyRef.current = true
    changeSequenceRef.current += 1
    const nextState = normalizeState(row.data)
    stateRef.current = nextState
    setState(nextState)
    writeLocalCache(row.data, {
      userId: user.id,
      revision: row.revision,
      dirty: false,
      lastSyncedAt: lastSyncedAtRef.current,
    })
    updateSync({
      ready: true,
      status: 'synced',
      revision: row.revision,
      lastSyncedAt: lastSyncedAtRef.current,
      error: null,
      conflict: null,
    })
  }, [updateSync, user.id])

  const enterConflict = useCallback((row, message = 'A newer cloud revision exists. Your local changes are preserved.') => {
    if (!row || !isValidPrepState(row.data) || !Number.isSafeInteger(row.revision)) {
      updateSync({ ready: true, status: 'error', error: 'A sync conflict occurred, but the cloud response was invalid.' })
      return
    }
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    debounceTimerRef.current = null
    retryTimerRef.current = null
    conflictRef.current = row
    dirtyRef.current = true
    readyRef.current = true
    cacheState()
    updateSync({
      ready: true,
      status: 'conflict',
      revision: revisionRef.current,
      error: message,
      conflict: {
        revision: row.revision,
        updatedAt: row.updatedAt,
      },
    })
  }, [cacheState, updateSync])

  const flushPending = useCallback(async () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = null
    if (!readyRef.current || !dirtyRef.current || conflictRef.current) return null
    if (!Number.isSafeInteger(revisionRef.current)) return null
    if (inFlightRef.current) {
      pendingAfterFlightRef.current = true
      return null
    }

    const snapshot = stateRef.current
    const expectedRevision = revisionRef.current
    const sequence = changeSequenceRef.current
    inFlightRef.current = { expectedRevision, sequence }
    updateSync({ status: 'saving', error: null })

    let outcome = null
    let saveFailed = false
    try {
      const result = await saveCloudState(snapshot, expectedRevision)
      outcome = result
      if (result?.status === 'saved') {
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
        revisionRef.current = result.revision
        lastSyncedAtRef.current = result.updatedAt || new Date().toISOString()
        const hasNewerLocalChanges = sequence !== changeSequenceRef.current
        dirtyRef.current = hasNewerLocalChanges
        cacheState()
        retryDelayRef.current = 2000
        updateSync({
          ready: true,
          status: hasNewerLocalChanges ? 'unsynced' : 'synced',
          revision: result.revision,
          lastSyncedAt: lastSyncedAtRef.current,
          error: null,
          conflict: null,
        })
      } else if (result?.status === 'conflict') {
        enterConflict(result)
      } else {
        saveFailed = true
        revisionRef.current = null
        cacheState()
        updateSync({ status: 'error', revision: null, error: 'The cloud state row is missing. Local changes remain unsynced.' })
      }
    } catch (error) {
      saveFailed = true
      dirtyRef.current = true
      cacheState()
      updateSync({
        ready: true,
        status: isOffline() ? 'offline' : 'error',
        error: `Cloud save failed: ${errorMessage(error)}`,
      })
      scheduleRetry()
    } finally {
      inFlightRef.current = null
      const deferred = deferredRealtimeRef.current
      deferredRealtimeRef.current = null
      if (deferred && (!outcome || deferred.revision > (revisionRef.current ?? 0))) {
        if (dirtyRef.current || conflictRef.current) enterConflict(deferred)
        else applyCloudRow(deferred)
      }
      if (!saveFailed && (pendingAfterFlightRef.current || dirtyRef.current) && !conflictRef.current) {
        pendingAfterFlightRef.current = false
        scheduleSave(0)
      }
    }
    return outcome
  }, [applyCloudRow, cacheState, enterConflict, scheduleRetry, scheduleSave, updateSync])
  flushRef.current = flushPending

  const commitLocalState = useCallback((nextState) => {
    const normalized = normalizeState(nextState)
    stateRef.current = normalized
    setState(normalized)
    dirtyRef.current = true
    changeSequenceRef.current += 1
    cacheState(normalized)
    updateSync((current) => ({
      ...current,
      ready: true,
      status: conflictRef.current ? 'conflict' : isOffline() ? 'offline' : 'unsynced',
      error: conflictRef.current ? current.error : null,
    }))
    if (readyRef.current && !conflictRef.current) scheduleSave()
  }, [cacheState, scheduleSave, updateSync])

  const dispatch = useCallback((action) => {
    const nextState = reducer(stateRef.current, action)
    if (nextState !== stateRef.current) commitLocalState(nextState)
  }, [commitLocalState])

  const syncFromCloud = useCallback(async () => {
    if (loadingCloudRef.current) return
    if (isOffline()) {
      readyRef.current = true
      updateSync({ ready: true, status: 'offline', error: 'Offline. Using the local cache.' })
      return
    }

    loadingCloudRef.current = true
    if (!readyRef.current) updateSync({ status: 'loading', error: null })
    try {
      const cloud = await fetchCloudState()
      if (cloud) {
        if (dirtyRef.current) {
          if (revisionRef.current === cloud.revision) {
            readyRef.current = true
            updateSync({
              ready: true,
              status: 'unsynced',
              revision: revisionRef.current,
              lastSyncedAt: lastSyncedAtRef.current,
              error: null,
            })
            scheduleSave(0)
          } else {
            enterConflict(cloud)
          }
        } else {
          applyCloudRow(cloud)
        }
        return
      }

      const currentCache = readLocalCache(user.id)
      const seedData = currentCache.usable ? currentCache.data : stateRef.current
      const initialized = await initializeCloudState(isValidPrepState(seedData) ? seedData : createInitialState())
      if (!initialized.created && dirtyRef.current) enterConflict(initialized)
      else applyCloudRow(initialized)
    } catch (error) {
      readyRef.current = true
      updateSync({
        ready: true,
        status: isOffline() ? 'offline' : 'error',
        revision: revisionRef.current,
        error: `Cloud load failed: ${errorMessage(error)}. Using the local cache.`,
      })
      scheduleRetry()
    } finally {
      loadingCloudRef.current = false
    }
  }, [applyCloudRow, enterConflict, scheduleRetry, scheduleSave, updateSync, user.id])
  syncFromCloudRef.current = syncFromCloud

  useEffect(() => {
    void syncFromCloud()
  }, [syncFromCloud])

  useEffect(() => {
    let active = true
    let channel = null
    try {
      channel = subscribeToCloudState(
        user.id,
        (payload) => {
          if (!active) return
          if (payload.eventType === 'DELETE') {
            updateSync({ status: 'error', error: 'The cloud state was deleted. The local cache was retained.' })
            return
          }
          const next = payload.new
          const row = {
            data: next?.data,
            revision: Number(next?.revision),
            createdAt: next?.created_at ?? null,
            updatedAt: next?.updated_at ?? null,
          }
          if (!isValidPrepState(row.data) || !Number.isSafeInteger(row.revision)) return
          const inFlight = inFlightRef.current
          if (inFlight) {
            if (!deferredRealtimeRef.current || row.revision > deferredRealtimeRef.current.revision) {
              deferredRealtimeRef.current = row
            }
            return
          }
          if (row.revision <= (revisionRef.current ?? 0)) return
          if (dirtyRef.current || inFlight || conflictRef.current) enterConflict(row)
          else applyCloudRow(row)
        },
        (realtimeStatus) => {
          if (!active) return
          const mapped = realtimeStatus === 'SUBSCRIBED'
            ? 'connected'
            : realtimeStatus === 'CHANNEL_ERROR' || realtimeStatus === 'TIMED_OUT'
              ? 'error'
              : 'connecting'
          updateSync({ realtime: mapped })
        }
      )
    } catch (error) {
      updateSync({ realtime: 'error', error: `Realtime unavailable: ${errorMessage(error)}` })
    }

    return () => {
      active = false
      void unsubscribeFromCloudState(channel)
    }
  }, [applyCloudRow, enterConflict, updateSync, user.id])

  useEffect(() => {
    const onOnline = () => void syncFromCloud()
    const onOffline = () => updateSync((current) => ({
      ...current,
      status: current.status === 'conflict' ? 'conflict' : 'offline',
      error: current.status === 'conflict' ? current.error : 'Offline. Local changes will retry later.',
    }))
    const flushIfHidden = () => {
      if (document.visibilityState === 'hidden') void flushRef.current()
    }
    const flushOnPageHide = () => void flushRef.current()
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    document.addEventListener('visibilitychange', flushIfHidden)
    window.addEventListener('pagehide', flushOnPageHide)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      document.removeEventListener('visibilitychange', flushIfHidden)
      window.removeEventListener('pagehide', flushOnPageHide)
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    }
  }, [syncFromCloud, updateSync])

  const acceptCloudState = useCallback(() => {
    if (!conflictRef.current) return
    applyCloudRow(conflictRef.current)
  }, [applyCloudRow])

  const retrySync = useCallback(async () => {
    if (conflictRef.current) return null
    if (dirtyRef.current && Number.isSafeInteger(revisionRef.current)) return flushPending()
    return syncFromCloud()
  }, [flushPending, syncFromCloud])

  const restoreBackup = useCallback(async (backupState) => {
    if (!isValidPrepState(backupState)) throw new Error('Backup data is invalid.')
    commitLocalState(backupState)
    return flushRef.current()
  }, [commitLocalState])

  const refreshHistory = useCallback(async () => {
    setHistory((current) => ({ ...current, loading: true, error: null }))
    try {
      const rows = await fetchStateHistory(20)
      setHistory({ rows, loading: false, error: null })
      return rows
    } catch (error) {
      setHistory((current) => ({ ...current, loading: false, error: errorMessage(error) }))
      return []
    }
  }, [])

  const restoreHistory = useCallback(async (historyId) => {
    if (!Number.isSafeInteger(revisionRef.current)) throw new Error('Cloud revision is not available yet.')
    if (inFlightRef.current) throw new Error('Wait for the current cloud save to finish, then retry the restore.')
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = null
    updateSync({ status: 'saving', error: null })
    try {
      const result = await restoreCloudHistory(historyId, revisionRef.current)
      if (result?.status === 'saved') {
        applyCloudRow(result)
        await refreshHistory()
        return result
      }
      if (result?.status === 'conflict') {
        enterConflict(result)
        return result
      }
      throw new Error('That recovery version was not found.')
    } catch (error) {
      updateSync({ status: isOffline() ? 'offline' : 'error', error: `Restore failed: ${errorMessage(error)}` })
      throw error
    }
  }, [applyCloudRow, enterConflict, refreshHistory, updateSync])

  const value = {
    state,
    dispatch,
    sync,
    history,
    flushPending,
    retrySync,
    acceptCloudState,
    restoreBackup,
    refreshHistory,
    restoreHistory,
  }

  return (
    <Ctx.Provider value={value}>
      {sync.ready ? children : (
        <main className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
          Checking cloud state…
        </main>
      )}
    </Ctx.Provider>
  )
}

export function useStore() {
  const value = useContext(Ctx)
  if (!value) throw new Error('useStore must be used inside StoreProvider')
  return value
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

export { parseBackupFile }

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
