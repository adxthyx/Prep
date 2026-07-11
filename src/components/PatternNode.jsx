import { memo } from 'react'
import { useStore, getItem } from '../store'
import { dsaProblems } from '../lib/registry'

function PatternNode({ data, isConnecting, selected }) {
  const { state } = useStore()

  const problems = dsaProblems.problems.filter((p) => p.pattern === data.label)
  const done = problems.filter((p) => getItem(state, p.id).status === 'done').length
  const total = problems.length

  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const isComplete = pct === 100 && total > 0
  const prereqIds = data.prereqs || []
  const allPrereqsDone = prereqIds.length === 0 || prereqIds.every((id) => {
    const prereqPattern = state._patternCache?.[id]?.label
    if (!prereqPattern) return false
    const prereqProblems = dsaProblems.problems.filter((p) => p.pattern === prereqPattern)
    return prereqProblems.every((p) => getItem(state, p.id).status === 'done')
  })

  const fillStop = Math.max(30, pct)
  const r = 40
  const circumference = 2 * Math.PI * r

  return (
    <div
      className={`
        nodrag
        flex items-center justify-center flex-col
        w-24 h-24 rounded-lg border-2 transition-all
        ${isComplete ? 'border-brand bg-brand/10 shadow-lg shadow-brand/50' : 'border-surface bg-card'}
        ${!allPrereqsDone ? 'opacity-60' : ''}
        ${selected ? 'ring-2 ring-brand' : ''}
      `}
      style={{
        animation: isComplete && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'node-glow 2s ease-in-out infinite' : 'none',
      }}
    >
      <div className="relative w-16 h-16 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={isComplete ? 'text-brand' : 'text-muted-foreground'}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (circumference * fillStop) / 100}
            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          />
        </svg>
        <span className="absolute font-mono text-xs font-semibold text-center text-foreground">{pct}%</span>
      </div>
      <span className="text-[10px] font-semibold text-center px-1 mt-1 leading-tight line-clamp-2 text-muted-foreground">{data.label}</span>
      <span className="text-[8px] text-muted-foreground/70 mt-0.5">{done}/{total}</span>
    </div>
  )
}

export default memo(PatternNode)
