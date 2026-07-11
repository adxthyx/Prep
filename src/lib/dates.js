export const DAY = 24 * 60 * 60 * 1000

export function todayKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDay(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function daysUntil(dateKey) {
  const now = parseDay(todayKey())
  return Math.round((parseDay(dateKey) - now) / DAY)
}

export function addDays(dateKey, n) {
  const d = parseDay(dateKey)
  d.setDate(d.getDate() + n)
  return todayKey(d)
}

export function streakFrom(activity) {
  // consecutive days with activity, counting back from today (yesterday-grace)
  let streak = 0
  let cursor = todayKey()
  if (!activity[cursor]) {
    const yesterday = addDays(cursor, -1)
    if (!activity[yesterday]) return 0
    cursor = yesterday
  }
  while (activity[cursor]) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

export function formatDate(key) {
  if (!key) return ''
  return parseDay(key).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
