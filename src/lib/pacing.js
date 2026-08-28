import { todayKey, daysUntil, addDays, DAY } from './dates'
import { dsaProblems, sdeRoadmap, hld, aiRoadmap, aiPapers } from './registry'

export function activeMilestone(state, config) {
  const today = todayKey()
  const settings = state.settings || {}

  // Tier 1: DSA(tier===1) + sde-cs phase
  const dsa1 = dsaProblems.problems.filter((p) => {
    const tier = state.tierOverrides?.[p.id] ?? p.tier ?? 3
    return tier === 1
  })
  const sdecs = sdeRoadmap.phases.find((p) => p.id === 'sde-cs')?.items || []
  const t1Items = [...dsa1.map((p) => ({ id: p.id, tier: 1, module: 'dsa' })), ...sdecs.map((it) => ({ id: it.id, tier: 1, module: 'sde' }))]

  // Tier 2: DSA(tier===2) + HLD(concepts + questions)
  const dsa2 = dsaProblems.problems.filter((p) => {
    const tier = state.tierOverrides?.[p.id] ?? p.tier ?? 3
    return tier === 2
  })
  const hldItems = [...(hld.concepts || []), ...(hld.questions || [])].map((x) => ({ id: x.id, tier: 2, module: 'hld' }))
  const t2Items = [...dsa2.map((p) => ({ id: p.id, tier: 2, module: 'dsa' })), ...hldItems]

  const t1Target = settings.tier1Target || config.tier1Target
  const t2Target = settings.tier2Target || config.tier2Target
  const studyDeadline = settings.studyDeadline || settings.seasonEnd || config.studyDeadline

  // Check which milestone is active (first not done and not past target)
  const t1Done = t1Items.filter((item) => state.items[item.id]?.status === 'done').length
  const t1Target_val = new Date(t1Target)
  const today_val = new Date(today)

  if (t1Done < t1Items.length && today_val <= t1Target_val) {
    return { label: 'Tier 1 DSA + CS core', target: t1Target, items: t1Items, tier: 1 }
  }

  const t2Done = t2Items.filter((item) => state.items[item.id]?.status === 'done').length
  const t2Target_val = new Date(t2Target)
  if (t2Done < t2Items.length && today_val <= t2Target_val) {
    return { label: 'Tier 2 + HLD classics', target: t2Target, items: t2Items, tier: 2 }
  }

  // Fallback: everything not done
  const allItems = [
    ...dsaProblems.problems.map((p) => ({ id: p.id, module: 'dsa' })),
    ...sdeRoadmap.phases.flatMap((ph) => ph.items.map((it) => ({ id: it.id, module: 'sde' }))),
    ...aiRoadmap.phases.flatMap((ph) => ph.items.map((it) => ({ id: it.id, module: 'ai' }))),
    ...aiPapers.categories.flatMap((category) =>
      category.papers
        .filter((paper) => !['optional', 'selected-sections'].includes(paper.priority))
        .map((paper) => ({ id: paper.id, module: 'ai-papers' }))
    ),
    ...hld.concepts.map((c) => ({ id: c.id, module: 'hld' })),
    ...hld.questions.map((q) => ({ id: q.id, module: 'hld' })),
  ]
  return { label: 'Study deadline', target: studyDeadline, items: allItems, tier: 3 }
}

export function dailyQuota(state, milestone) {
  const remaining = milestone.items.filter((item) => !state.items[item.id] || state.items[item.id].status !== 'done')
  const daysLeft = Math.max(daysUntil(milestone.target), 1)
  const quota = Math.ceil(remaining.length / daysLeft)
  return { quota, remaining: remaining.length, daysLeft, target: milestone.target }
}

// Deterministic round-robin across modules for a given day, up to quota
export function todaysPlan(state, milestone) {
  const today = todayKey()

  // Start with due revisits and in-progress (highest priority)
  const dueRevisits = []
  const inProgress = []
  for (const [id, item] of Object.entries(state.items || {})) {
    if (item.status === 'revisit' && item.revisitDue && item.revisitDue <= today) {
      dueRevisits.push({ id, type: 'revisit', due: item.revisitDue, stage: item.revisitStage || 0 })
    }
    if (item.status === 'in-progress') {
      inProgress.push({ id, type: 'in-progress', updated: item.updatedAt })
    }
  }
  dueRevisits.sort((a, b) => a.due.localeCompare(b.due))
  inProgress.sort((a, b) => (b.updated || 0) - (a.updated || 0))

  const baseItems = [...dueRevisits.slice(0, 3), ...inProgress.slice(0, 2)].map((x) => x.id)

  // Compute quota
  const remaining = milestone.items.filter((item) => !state.items?.[item.id] || state.items[item.id].status !== 'done')
  const daysLeft = Math.max(daysUntil(milestone.target), 1)
  const quota = Math.ceil(remaining.length / daysLeft)

  // Fill to quota with round-robin across modules from milestone items, deterministic per day
  const needed = Math.max(0, quota - baseItems.length)
  const availableInMilestone = milestone.items.filter((item) => !baseItems.includes(item.id) && (!state.items?.[item.id] || state.items[item.id].status !== 'done'))

  // Deterministic shuffle seeded by today (not random per-render)
  const dayParts = today.split('-').map((x) => parseInt(x))
  const seed = dayParts[0] * 10000 + dayParts[1] * 100 + dayParts[2]
  const shuffled = [...availableInMilestone].sort((a, b) => {
    const hashA = ((seed * 7919 + (a.id.charCodeAt(0) || 0)) % 10007)
    const hashB = ((seed * 7919 + (b.id.charCodeAt(0) || 0)) % 10007)
    return hashA - hashB
  })

  const added = shuffled.slice(0, needed).map((x) => x.id)
  return baseItems.concat(added)
}

export function burnUpSeries(state, milestone) {
  const target = new Date(milestone.target)
  const today = new Date(todayKey())

  // Start from 30 days ago or milestone target - 30 days, whichever is more recent
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
  const milestoneStart = target < thirtyDaysAgo ? target : thirtyDaysAgo

  const series = []
  const dayMs = 24 * 60 * 60 * 1000

  // Ensure we don't create infinite loops
  const maxIterations = 100
  let iterations = 0

  for (let d = new Date(milestoneStart); d <= target && iterations < maxIterations; d = new Date(d.getTime() + dayMs)) {
    iterations++
    const dateKey = d.toISOString().split('T')[0]
    const actual = milestone.items.filter((item) => {
      const itemData = state.items?.[item.id]
      return itemData?.status === 'done' && itemData?.updatedAt && new Date(itemData.updatedAt).toISOString().split('T')[0] <= dateKey
    }).length
    series.push({ date: dateKey, actual })
  }

  // Add required-pace line
  const totalNeeded = milestone.items.length
  const daysSpan = Math.max(1, (target.getTime() - milestoneStart.getTime()) / dayMs)
  series.forEach((point, i) => {
    point.required = Math.round((i / daysSpan) * totalNeeded)
  })

  return series
}
