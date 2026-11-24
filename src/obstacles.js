const shared = [2.6, 2.2, 2.1, 1.8, 1.7, 2.2, 1.8, 2, 2.25, 1.9]

// Weights follow the migration order. A zero excludes that territory.
// Signature and moving hazards are scheduled separately from these weights.
export const obstacles = {
  log: { name: 'Fallen log', family: 'timber', route: 'jump', weights: shared },
  root: { name: 'Exposed root', family: 'timber', route: 'jump', weights: [1.9, 2.7, 1.4, 2.5, 1.7, 1.65, 1.8, 1.8, 1.85, 1.7] },
  puddle: { name: 'Puddle', family: 'water', route: 'jump', weights: [1.8, 1.9, 2.4, 1.8, 1.3, 1.8, 1.75, 1.3, .85, 1] },
  branch: { name: 'Storm-bent timber', family: 'canopy', route: 'slide', weights: [.65, .90, .60, 1.1, .55, .55, .65, .92, 1.15, .86] },
  fence: { name: 'Fence', family: 'farming', route: 'jump', weights: [1.5, .61, 1.1, .62, 2, 1.57, 1.4, 1, .72, .56] },
  tree: { name: 'Tree trunk', family: 'timber', route: 'dodge', weights: [.68, 1.2, .68, 1.5, .80, .62, .80, 1.63, 1.70, 1.30] },
  drift: { name: 'Lodged driftwood', family: 'timber', route: 'jump', weights: [.70, .65, 1.4, 1.1, .25, .45, .65, .80, .60, .35] },
  fallen: { name: 'Uprooted tree', family: 'timber', route: 'dodge', weights: [.32, .55, .75, 1.65, 1.10, 1.7, 1.8, 2.2, 2.3, 2] },
  tractor: { name: 'Farm tractor', family: 'farming', route: 'dodge', weights: [0, 0, 0, 0, 2.4, .24, 0, 0, 0, 0] },
  rock: { name: 'Rock or boulder', family: 'stone', route: 'variant', weights: [1.45, 1.76, 1.95, 1.95, 2.23, 2.30, 2.4, 2.6, 2.45, 3] },
  stream: { name: 'Creek crossing', family: 'water', route: 'jump' },
  washout: { name: 'Flooded lane', family: 'water', route: 'dodge' },
  goose: { name: 'Diving goose', family: 'wildlife', route: 'dodge', moving: true },
  'leaning-tree': { name: 'Fallen tree against a fork', family: 'timber', route: ['jump', 'slide', 'run'],
    weights: [.35, 1, .72, 1, .17, .21, .32, .85, 1, .78], signature: true },
}

// Biome multipliers preserve eligibility through the expanded route.
const legacySlot = [0, 1, 2, 3, 8, 4, 2, 5, 5, 6, 7, 7, 8, 9, 9]
for (const hazard of Object.values(obstacles)) {
  if (hazard.weights) hazard.weights = legacySlot.map(index => hazard.weights[index])
}
obstacles.tractor.weights = [0, 0, .12, 0, 0, 2.40, .28, .15, .22, .40, 0, 0, 0, 0, 0]
obstacles.fence.weights[7] = 3.1
obstacles.drift.weights[6] = 2.6
obstacles.fallen.weights[7] = .10
obstacles.branch.weights[7] = .18

obstacles.snowmobile = { name: 'Parked snowmobile', family: 'equipment', route: 'dodge',
  minimumStage: 27, weights: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, .56, 1.12] }

export const obstaclePool = Object.keys(obstacles).filter(key => obstacles[key].weights && !obstacles[key].signature)
export const fallTreeRoutes = obstacles['leaning-tree'].route
