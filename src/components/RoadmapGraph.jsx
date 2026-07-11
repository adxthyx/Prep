import { useCallback, useState, useMemo } from 'react'
import { ReactFlow, Background, Controls } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useStore, getItem } from '../store'
import { dsaProblems, aiRoadmap } from '../lib/registry'
import PatternNode from './PatternNode'
import SlideOver from './SlideOver'
import { ItemRow } from './ui'

const nodeTypes = { pattern: PatternNode }

export default function RoadmapGraph({ patterns, showT3 = false, type = 'dsa' }) {
  const { state } = useStore()
  const [selectedPattern, setSelectedPattern] = useState(null)
  const [openSlide, setOpenSlide] = useState(false)

  const patternMap = useMemo(
    () => {
      const map = {}
      patterns.forEach((p) => {
        map[p.id] = p.label
      })
      return map
    },
    [patterns]
  )

  const nodes = useMemo(
    () =>
      patterns.map((p) => ({
        id: p.id,
        data: { label: p.label, prereqs: p.prereqs, patternMap },
        position: { x: p.x, y: p.y },
        type: 'pattern',
        draggable: false,
      })),
    [patterns, patternMap]
  )

  const edges = useMemo(
    () =>
      patterns.flatMap((p) =>
        (p.prereqs || []).map((prereq) => ({
          id: `${prereq}-${p.id}`,
          source: prereq,
          target: p.id,
          animated: false,
          style: { stroke: 'hsl(var(--muted-foreground) / 0.3)', strokeWidth: 2 },
        }))
      ),
    [patterns]
  )

  const onNodeClick = useCallback((_, node) => {
    const pattern = patterns.find((p) => p.id === node.id)
    if (pattern) {
      setSelectedPattern(pattern)
      setOpenSlide(true)
    }
  }, [patterns])

  const selectedPatternData = useMemo(() => {
    if (!selectedPattern) return null

    if (type === 'ai') {
      // For AI phases, just show the phase items
      const phase = aiRoadmap.phases.find((p) => p.id === selectedPattern.id)
      if (!phase) return null
      return { pattern: selectedPattern, items: phase.items || [] }
    }

    // For DSA patterns
    const problems = dsaProblems.problems.filter((p) => p.pattern === selectedPattern.label)
    const byTier = { 1: [], 2: [], 3: [] }
    problems.forEach((p) => {
      const tier = state.tierOverrides?.[p.id] ?? p.tier ?? 3
      if (tier >= 1 && tier <= 3) byTier[tier].push(p)
    })
    return { pattern: selectedPattern, byTier }
  }, [selectedPattern, state.tierOverrides, type])

  return (
    <>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodeClick={onNodeClick} fitView>
        <Background gap={12} size={1} color="hsl(var(--muted-foreground) / 0.1)" />
        <Controls showInteractive={false} />
      </ReactFlow>

      {selectedPatternData && (
        <SlideOver open={openSlide} onClose={() => setOpenSlide(false)} title={selectedPatternData.pattern.label}>
          <div className="p-4 space-y-2">
            {type === 'ai' ? (
              <>
                {selectedPatternData.items.map((it) => (
                  <ItemRow key={it.id} id={it.id} title={it.title} resources={it.resources || []} hideTier={true} />
                ))}
              </>
            ) : (
              <>
                {[1, 2].map((tier) => (
                  <div key={tier}>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">Tier {tier}</h3>
                    <div className="space-y-1">
                      {selectedPatternData.byTier[tier].map((p) => (
                        <ItemRow key={p.id} id={p.id} title={p.title} mono={false} />
                      ))}
                      {selectedPatternData.byTier[tier].length === 0 && <p className="text-xs text-muted-foreground">—</p>}
                    </div>
                  </div>
                ))}

                {showT3 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">Tier 3</h3>
                    <div className="space-y-1">
                      {selectedPatternData.byTier[3].map((p) => (
                        <ItemRow key={p.id} id={p.id} title={p.title} mono={false} />
                      ))}
                      {selectedPatternData.byTier[3].length === 0 && <p className="text-xs text-muted-foreground">—</p>}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </SlideOver>
      )}
    </>
  )
}
