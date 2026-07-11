import { useMemo } from 'react'
import { todayKey, daysUntil } from '../lib/dates'

export default function BurnUpChart({ series }) {
  if (!series || series.length < 2) return <div className="text-sm text-muted-foreground text-center py-8">No burn-up data available.</div>

  const maxActual = Math.max(...series.map((s) => s.actual || 0))
  const maxRequired = Math.max(...series.map((s) => s.required || 0))
  const maxY = Math.max(maxActual, maxRequired) * 1.1 || 10
  const width = 800
  const height = 300
  const padding = 40
  const plotWidth = width - 2 * padding
  const plotHeight = height - 2 * padding

  const today = todayKey()
  return (
    <div className="w-full bg-card rounded-lg border p-4">
      <h3 className="text-sm font-semibold mb-4">Burn-up progress</h3>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[500px]" style={{ fontFamily: 'monospace', fontSize: '11px' }}>
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((frac) => (
            <g key={`grid-${frac}`}>
              <line x1={padding} y1={padding + plotHeight * (1 - frac)} x2={width - padding} y2={padding + plotHeight * (1 - frac)} stroke="hsl(var(--muted-foreground) / 0.1)" strokeWidth="1" />
              <text x={padding - 5} y={padding + plotHeight * (1 - frac) + 4} textAnchor="end" fill="hsl(var(--muted-foreground))">
                {Math.round(maxY * frac)}
              </text>
            </g>
          ))}

          {/* Axes */}
          <line x1={padding} y1={padding} x2={padding} y2={padding + plotHeight} stroke="hsl(var(--border))" strokeWidth="1" />
          <line x1={padding} y1={padding + plotHeight} x2={width - padding} y2={padding + plotHeight} stroke="hsl(var(--border))" strokeWidth="1" />

          {/* Required pace (lighter line) */}
          {series.length > 1 && (
            <polyline
              points={series.map((s, i) => `${padding + (i / (series.length - 1)) * plotWidth},${padding + plotHeight - (s.required / maxY) * plotHeight}`).join(' ')}
              fill="none"
              stroke="hsl(var(--muted-foreground) / 0.5)"
              strokeWidth="2"
              strokeDasharray="4,4"
            />
          )}

          {/* Actual progress (brand color) */}
          {series.length > 1 && (
            <polyline
              points={series.map((s, i) => `${padding + (i / (series.length - 1)) * plotWidth},${padding + plotHeight - (s.actual / maxY) * plotHeight}`).join(' ')}
              fill="none"
              stroke="hsl(18 100% 50%)"
              strokeWidth="2"
            />
          )}

          {/* Today marker */}
          {series.length > 1 && (
            <line
              x1={padding + series.findIndex((s) => s.date >= today) / (series.length - 1) * plotWidth}
              y1={padding}
              x2={padding + series.findIndex((s) => s.date >= today) / (series.length - 1) * plotWidth}
              y2={padding + plotHeight}
              stroke="hsl(var(--brand))"
              strokeWidth="1"
              strokeDasharray="2,2"
              opacity="0.5"
            />
          )}

          {/* Y-axis label */}
          <text x={10} y={padding} fill="hsl(var(--muted-foreground))" className="text-xs">
            done
          </text>
        </svg>
      </div>

      <div className="flex gap-6 mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-brand" />
          <span>actual</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-muted-foreground/50" style={{ backgroundImage: 'repeating-linear-gradient(90deg, currentColor 0, currentColor 2px, transparent 2px, transparent 4px)' }} />
          <span>required pace</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 border-l border-brand/50" />
          <span>today</span>
        </div>
      </div>
    </div>
  )
}
