import { confirmedRival, rivalGap } from './camp-rivals.js'
import { meters, node, number } from './lodge-elements.js'

const metricText = (metric, value) => metric === 'distance' ? meters(value)
  : number(value) + (metric === 'score' ? ' pts' : value === 1 ? ' retrieve' : ' retrieves')
const checkedAt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

function currentness(result) {
  return (result.offline ? 'Offline · Last checked ' : 'Last checked ') + checkedAt.format(result.at)
}

function startButton(onStart) {
  const run = node('button', 'Start a run')
  run.type = 'button'
  run.addEventListener('click', onStart)
  return run
}

export function renderRival(card, result, metric, onStart) {
  card.replaceChildren()
  card.hidden = false
  if (result.status !== 'ok' || !result.mine) {
    const message = {
      ok: 'Post a completed run to see your next rival.',
      offline: 'You’re offline. Your local runs and records still work.',
      reconnect: 'Reconnect your Worldwide identity to see your rival.',
      unavailable: 'Rivals are temporarily unavailable. Your local records are safe.',
    }
    card.append(node('h4', 'Camp Rivals'), node('p', message[result.status] ?? message.unavailable))
    return
  }
  if (!result.rival) {
    card.append(node('h4', result.stale ? 'Last recorded at the top of Camp' : 'Top of the Camp'),
      node('p', result.stale ? currentness(result) : 'No player is ranked above you in this category.'), startButton(onStart))
    return
  }
  const { mine, rival } = result
  const gap = rivalGap(mine[metric], rival[metric])
  card.append(node('p', 'Your next rival', 'lodge-kicker'), node('h4', rival.nickname),
    node('p', 'Your best ' + metricText(metric, mine[metric]) + ' · #' + number(mine.rank) +
      '  /  ' + metricText(metric, rival[metric]) + ' · #' + number(rival.rank)))
  const track = node('progress')
  track.max = rival[metric] + 1
  track.value = mine[metric]
  track.setAttribute('aria-label', 'Progress toward passing ' + rival.nickname)
  card.append(track, node('strong', metricText(metric, gap) + ' to pass'))
  if (result.stale) card.append(node('p', currentness(result), 'room-note'))
  card.append(startButton(onStart))
}

export function createReportRival(spot, camp) {
  let displayed
  return function render(profile, metric, report, prior, posting) {
    const issue = displayed = {}
    spot.replaceChildren()
    spot.hidden = !camp.member(profile)
    if (spot.hidden) return
    const value = metric === 'distance' ? Math.floor(report.distance) : report[metric]
    const localBest = report.improved.includes(metric)
    const heading = node('h3', 'Camp Rivals')
    const summary = node('p', 'This run · ' + metricText(metric, value) + (localBest ? ' · Local personal best' : ''))
    const comparison = node('p', 'Looking up your rival…')
    spot.append(heading, summary, comparison)
    if (prior?.rival) {
      const gap = rivalGap(value, prior.rival[metric])
      comparison.textContent = gap ? metricText(metric, gap) + ' from passing ' + prior.rival.nickname + '’s last checked best.'
        : 'Beat ' + prior.rival.nickname + '’s last checked best. Worldwide position is unconfirmed.'
    }
    const target = prior?.rival
    void Promise.resolve(posting?.done).then(async status => {
      if (displayed !== issue || spot.closest('#field-report')?.hidden) return
      const result = await camp.rival(profile, metric, status === 'sent' ? target : undefined)
      if (displayed !== issue || spot.closest('#field-report')?.hidden) return
      if (status === 'sent' && confirmedRival(prior, result, metric, value)) {
        heading.textContent = 'Rival overtaken'
        comparison.textContent = 'Worldwide confirmed · #' + number(prior.mine.rank) + ' to #' + number(result.mine.rank) +
          (result.rival ? ' · Next rival ' + result.rival.nickname : ' · Top of the Camp')
      } else if (result.status === 'ok' && result.rival) {
        comparison.textContent = (result.stale || status === 'pending' || status === 'reconnect' ? 'Last checked target · ' : '') +
          result.rival.nickname + ' · ' + metricText(metric, rivalGap(result.mine[metric], result.rival[metric])) + ' to pass'
      } else if (result.status === 'ok' && result.mine?.rank === 1) {
        comparison.textContent = result.stale ? currentness(result) + ' · #1' : 'Top of the Camp · #1'
      } else {
        comparison.textContent = result.status === 'ok' ? 'Post a Worldwide best to find your next rival.'
          : 'Worldwide position is unavailable. Your local result is saved.'
      }
      if (target && value >= target[metric] + 1 && heading.textContent !== 'Rival overtaken') {
        comparison.textContent += ' · Beat your previous target locally.'
      }
    })
  }
}
