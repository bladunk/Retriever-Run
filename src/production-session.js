let ready = false
let updateLocked = false

export const productionSession = {
  prepared() { return ready },
  setPrepared(value) { ready = value },
  lock(value) { updateLocked = value },
  locked() { return updateLocked },
}
