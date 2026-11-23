import { act } from './runner.js'

export function createRunControls() {
  const queue = []
  let buffered
  let expires = 0

  return {
    enqueue(move) {
      if (queue.length >= 16) return false
      queue.push(move)
      return true
    },
    reset() {
      queue.length = 0
      buffered = undefined
    },
    apply(run, onAction) {
      for (const move of queue) {
        const vertical = move === 'jump' || move === 'slide'
        if (act(run, move)) {
          onAction(move)
          if (vertical) buffered = undefined
        } else if (vertical && Math.max(run.jump, run.slide) < .16) {
          buffered = move
          expires = run.elapsed + .18
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
