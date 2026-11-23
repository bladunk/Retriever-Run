import { beatSeconds, composeBar, loopBeats } from './marshland.js'

const notes = Array.from({ length: loopBeats / 4 }, (_, bar) =>
  composeBar(bar).map(note => ({ ...note, at: (bar * 4 + note.beat) * beatSeconds }))).flat()
export const loopSeconds = loopBeats * beatSeconds

export function createMusicTransport() {
  let origin
  let cycle = 0
  let index = 0
  return (now, schedule) => {
    origin ??= now + .055
    let at = origin + cycle * loopSeconds + notes[index].at
    if (at < now - .28) {
      cycle = Math.max(0, Math.floor((now - origin) / loopSeconds))
      index = 0
      at = origin + cycle * loopSeconds + notes[index].at
    }
    while (at < now + .24) {
      if (at >= now - .02) schedule(notes[index], Math.max(at, now + .002))
      if (++index === notes.length) {
        index = 0
        cycle++
      }
      at = origin + cycle * loopSeconds + notes[index].at
    }
  }
}
