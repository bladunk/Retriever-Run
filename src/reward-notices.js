export function createRewardNotices(capacity = 12) {
  const pending = new Map()
  return {
    add(key, label) {
      if (pending.has(key)) return
      pending.set(key, label)
      if (pending.size > capacity) pending.delete(pending.keys().next().value)
    },
    take() {
      const entry = pending.entries().next().value
      if (!entry) return undefined
      pending.delete(entry[0])
      return entry[1]
    },
    clear() { pending.clear() },
  }
}
