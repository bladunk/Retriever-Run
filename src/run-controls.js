import { act } from './runner.js'

const moves = new Set(['left', 'right', 'jump', 'slide'])
const verticalBuffer = .15

export function createRunControls() {
  const queue = []
  let buffered
  let expires = 0

  return {
    enqueue(move) {
      if (!moves.has(move) || queue.length >= 16) return false
      queue.push(move)
      return true
    },
    reset() {
      queue.length = 0
      buffered = undefined
    },
    apply(run, onAction) {
      let usedVertical = false
      for (const move of queue) {
        const vertical = move === 'jump' || move === 'slide'
        if (vertical && usedVertical) continue
        if (act(run, move)) {
          onAction(move)
          if (vertical) {
            usedVertical = true
            buffered = undefined
          }
        } else if (vertical && Math.max(run.jump, run.slide) <= verticalBuffer) {
          buffered = move
          expires = run.elapsed + verticalBuffer + .02
        }
      }
      queue.length = 0
      if (buffered && run.elapsed > expires) buffered = undefined
      if (buffered && act(run, buffered)) {
        onAction(buffered)
        buffered = undefined
      }
    },
  }
}
