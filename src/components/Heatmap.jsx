import { todayKey, addDays, parseDay } from '../lib/dates'

/** GitHub-style activity heatmap for the last ~15 weeks */
export default function Heatmap({ activity }) {
  const weeks = 15
  const end = todayKey()
  // start on the Sunday `weeks` back
  let start = addDays(end, -(weeks * 7 - 1))
  start = addDays(start, -parseDay(start).getDay())
  const cols = []
  let cursor = start
  for (let w = 0; w < weeks + 1; w++) {
    const col = []
    for (let d = 0; d < 7; d++) {
      if (cursor <= end) col.push({ key: cursor, count: activity[cursor] || 0 })
      cursor = addDays(cursor, 1)
    }
    if (col.length) cols.push(col)
  }
  const shade = (c) =>
    c === 0 ? 'bg-surface' : c < 3 ? 'bg-brand/25' : c < 8 ? 'bg-brand/55' : 'bg-brand'
  return (
    <div className="flex gap-[3px] overflow-x-auto pb-1">
      {cols.map((col, i) => (
        <div key={i} className="flex flex-col gap-[3px]">
          {col.map((day) => (
            <div
              key={day.key}
              title={`${day.key}: ${day.count} touches`}
              className={`h-2.5 w-2.5 rounded-[2px] ${shade(day.count)}`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
