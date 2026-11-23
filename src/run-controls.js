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
        if (act(run, move)) {
          onAction(move)
          buffered = undefined
        } else if ((move === 'jump' || move === 'slide') &&
          (run.jump > 0 && run.jump < .13 || run.slide > 0 && run.slide < .13)) {
          buffered = move
          expires = run.elapsed + .14
        }
      }
      queue.length = 0
      if (buffered && run.elapsed >= expires) buffered = undefined
      if (buffered && act(run, buffered)) {
        onAction(buffered)
        buffered = undefined
      }
    },
  }
}
