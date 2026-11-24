export function createResourcePool(load, dispose = () => {}) {
  const loaded = new Map()
  return {
    request(key) {
      if (loaded.has(key)) return loaded.get(key).promise
      const entry = { value: null }
      entry.promise = Promise.resolve().then(() => load(key)).then(value => {
        if (loaded.get(key) !== entry) {
          dispose(value)
          return null
        }
        entry.value = value
        return value
      }, () => null)
      loaded.set(key, entry)
      return entry.promise
    },
    get(key) { return loaded.get(key)?.value ?? null },
    release(key) {
      const entry = loaded.get(key)
      if (!entry) return
      loaded.delete(key)
      if (entry.value) dispose(entry.value)
    },
    count() { return loaded.size },
  }
}
