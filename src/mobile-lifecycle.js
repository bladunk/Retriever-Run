export function createWakeLock(request, visible) {
  let active = false
  let pending
  let lock
  function release() {
    const current = lock
    lock = undefined
    if (current && !current.released) return current.release().catch(() => {})
  }
  async function set(value) {
    active = value
    if (!active || !visible()) return release()
    if (!request || pending || (lock && !lock.released)) return
    pending = Promise.resolve().then(request)
    try {
      const acquired = await pending
      if (active && visible()) lock = acquired
      else await acquired.release()
    } catch { /* Wake lock support depends on the browser, battery and permission. */ }
    finally { pending = undefined }
  }
  return { set }
}
