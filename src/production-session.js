let ready = false
let updateLocked = false

export const productionSession = {
  prepared() { return ready },
  gateRanked() { return import.meta.env.PROD && !ready },
  setPrepared(value) { ready = value },
  lock(value) { updateLocked = value },
  locked() { return updateLocked },
}
