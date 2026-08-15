import { supabase, supabaseConfigError } from './supabase'

export const PREP_STATE_KEY = 'prep-command-center-v1'
export const PREP_CACHE_META_KEY = 'prep-command-center-v1-sync'

function requireSupabase() {
  if (!supabase) throw new Error(supabaseConfigError || 'Supabase is unavailable.')
  return supabase
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function isValidPrepState(value) {
  return isObject(value) && isObject(value.items)
}

function normalizeMeta(value) {
  if (!isObject(value)) return null
  return {
    version: 1,
    userId: typeof value.userId === 'string' ? value.userId : null,
    revision: Number.isSafeInteger(value.revision) ? value.revision : null,
    dirty: value.dirty === true,
    lastSyncedAt: typeof value.lastSyncedAt === 'string' ? value.lastSyncedAt : null,
  }
}

export function readLocalCache(userId = null) {
  if (typeof window === 'undefined') {
    return { data: null, meta: null, valid: false, usable: false, error: null }
  }

  let data = null
  try {
    const raw = window.localStorage.getItem(PREP_STATE_KEY)
    data = raw ? JSON.parse(raw) : null
  } catch (error) {
    return { data: null, meta: null, valid: false, usable: false, error }
  }

  const valid = isValidPrepState(data)
  let meta = null
  try {
    const metaRaw = window.localStorage.getItem(PREP_CACHE_META_KEY)
    meta = metaRaw ? normalizeMeta(JSON.parse(metaRaw)) : null
  } catch (error) {
    return { data, meta: null, valid, usable: false, error }
  }
  const ownedByAnotherUser = Boolean(userId && meta?.userId && meta.userId !== userId)
  return { data, meta, valid, usable: valid && !ownedByAnotherUser, error: null }
}

export function writeLocalCache(data, meta) {
  if (typeof window === 'undefined') return { ok: true, error: null }
  try {
    window.localStorage.setItem(PREP_STATE_KEY, JSON.stringify(data))
    window.localStorage.setItem(
      PREP_CACHE_META_KEY,
      JSON.stringify({
        version: 1,
        userId: meta.userId,
        revision: meta.revision ?? null,
        dirty: meta.dirty === true,
        lastSyncedAt: meta.lastSyncedAt ?? null,
      })
    )
    return { ok: true, error: null }
  } catch (error) {
    return { ok: false, error }
  }
}

function mapStateRow(row) {
  if (!row) return null
  const rawRevision = row.revision ?? row.current_revision
  return {
    data: row.data ?? row.current_data,
    revision: rawRevision == null ? null : Number(rawRevision),
    createdAt: row.created_at ?? row.current_created_at ?? null,
    updatedAt: row.updated_at ?? row.current_updated_at ?? null,
    created: row.created ?? false,
    status: row.result_status ?? null,
  }
}

export async function fetchCloudState() {
  const client = requireSupabase()
  const { data, error } = await client
    .from('prep_state')
    .select('data, revision, created_at, updated_at')
    .maybeSingle()
  if (error) throw error
  return mapStateRow(data)
}

export async function initializeCloudState(data) {
  const client = requireSupabase()
  const response = await client.rpc('initialize_prep_state', { p_data: data }).single()
  if (response.error) throw response.error
  return mapStateRow(response.data)
}

export async function saveCloudState(data, expectedRevision) {
  const client = requireSupabase()
  const response = await client
    .rpc('save_prep_state', {
      p_data: data,
      p_expected_revision: expectedRevision,
    })
    .single()
  if (response.error) throw response.error
  return mapStateRow(response.data)
}

export async function fetchStateHistory(limit = 20) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('prep_state_history')
    .select('history_id, previous_revision, created_at')
    .order('created_at', { ascending: false })
    .order('history_id', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function restoreCloudHistory(historyId, expectedRevision) {
  const client = requireSupabase()
  const response = await client
    .rpc('restore_prep_state', {
      p_history_id: historyId,
      p_expected_revision: expectedRevision,
    })
    .single()
  if (response.error) throw response.error
  return mapStateRow(response.data)
}

export function subscribeToCloudState(userId, onChange, onStatus) {
  const client = requireSupabase()
  return client
    .channel(`prep-state-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'prep_state',
        filter: `user_id=eq.${userId}`,
      },
      onChange
    )
    .subscribe(onStatus)
}

export async function unsubscribeFromCloudState(channel) {
  if (supabase && channel) await supabase.removeChannel(channel)
}

export async function parseBackupFile(file) {
  const text = await file.text()
  const parsed = JSON.parse(text)
  if (!isValidPrepState(parsed)) {
    throw new Error('Not a prep-command-center backup: missing "items"')
  }

  const { exportedAt = null, app: _app, ...state } = parsed
  return { state, exportedAt }
}
