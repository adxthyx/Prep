// Flattens every trackable item across all seed JSONs into one registry:
// id -> { title, module, moduleName, path, group }
// Used by the dashboard (Today queue, revisit queue, progress bars) and search.
import projectTil from '../data/project-til.json'
import sdeRoadmap from '../data/sde-roadmap.json'
import aiRoadmap from '../data/ai-roadmap.json'
import aiPapers from '../data/ai-papers.json'
import dsaProblems from '../data/dsa-problems.json'
import dsaCompanies from '../data/dsa-companies.json'
import hld from '../data/hld.json'
import lld from '../data/lld.json'

const registry = new Map()

function reg(id, title, module_, moduleName, path, group) {
  if (!registry.has(id)) registry.set(id, { id, title, module: module_, moduleName, path, group })
}

// 1. Project TIL — kanban cards + demo checklist
projectTil.kanban.cards.forEach((c) =>
  reg(c.id, c.title, 'project', 'Anchor', '/project', c.phase)
)
projectTil.demoChecklist.forEach((c) =>
  reg(c.id, c.title, 'project', 'Anchor', '/project', 'MVP readiness')
)

// 2. SDE roadmap — all phase items
sdeRoadmap.phases.forEach((p) =>
  p.items.forEach((it) => reg(it.id, it.title, 'sde', 'SDE1 Roadmap', '/sde', p.name))
)

// 3. AI roadmap — all phase items
aiRoadmap.phases.forEach((p) =>
  p.items.forEach((it) => reg(it.id, it.title, 'ai', 'AI / FDE Roadmap', '/ai', p.name))
)

// 4. AI papers — curated reading list
aiPapers.categories.forEach((category) =>
  category.papers.forEach((paper) => reg(paper.id, paper.title, 'ai-papers', 'AI Papers', '/ai-papers', category.name))
)

// 5. DSA — master problems only (company list is a display view, not a registry extension)
dsaProblems.problems.forEach((p) =>
  reg(p.id, p.title, 'dsa', 'DSA', '/dsa', p.topic)
)

// 6. HLD — concepts + questions
hld.concepts.forEach((c) => reg(c.id, c.title, 'hld', 'HLD', '/hld', 'Concepts'))
hld.questions.forEach((q) => reg(q.id, q.title, 'hld', 'HLD', '/hld', 'Classic questions'))

// 7. LLD — fundamentals + problems
lld.fundamentals.forEach((f) => reg(f.id, f.title, 'lld', 'LLD', '/lld', 'Fundamentals'))
lld.problems.forEach((p) => reg(p.id, p.title, 'lld', 'LLD', '/lld', 'Problems'))

export const ITEMS = registry

export const MODULES = [
  { key: 'project', name: 'Anchor', path: '/project' },
  { key: 'sde', name: 'SDE1 Roadmap', path: '/sde' },
  { key: 'ai', name: 'AI / FDE Roadmap', path: '/ai' },
  { key: 'ai-papers', name: 'AI Papers', path: '/ai-papers' },
  { key: 'dsa', name: 'DSA', path: '/dsa' },
  { key: 'hld', name: 'HLD', path: '/hld' },
  { key: 'lld', name: 'LLD', path: '/lld' },
]

export function moduleItemIds(moduleKey) {
  const ids = []
  for (const [id, item] of registry) if (item.module === moduleKey) ids.push(id)
  return ids
}

export { projectTil, sdeRoadmap, aiRoadmap, aiPapers, dsaProblems, dsaCompanies, hld, lld }
