import { causes, causeNames, hazardName } from './field-stats.js'
import { fieldHonors, hallOfShame, medals, patches } from './honors.js'
import { categories, personalRecordLabels } from './lodge-save.js'
import { campSwitch, worldwideBoard } from './camp-ui.js'
import { node, number, meters, date } from './lodge-elements.js'
import { careerRoom } from './career-ui.js'
import { kennelRoom } from './kennel-ui.js'

function duration(seconds) {
  const total = Math.floor(seconds)
  const minutes = Math.floor(total / 60)
  return (minutes >= 60 ? Math.floor(minutes / 60) + 'h ' : '') +
    (minutes ? (minutes % 60) + 'm ' : '') + total % 60 + 's'
}

function rows(items) {
  return items.map(([name, value]) => {
    const row = node('div')
    row.append(node('dt', name), node('dd', value))
    return row
  })
}

function cards(items) {
  return items.map(([name, value]) => {
    const card = node('div', null, 'record-card')
    card.append(node('strong', value), node('span', name))
    return card
  })
}

const emblems = {
  paw: 'M7 17c1-2 3-4 5-4s4 2 5 4c1 2 0 4-2 4-1 0-2-1-3-1s-2 1-3 1c-2 0-3-2-2-4ZM4 10a1.5 2 0 1 0 3 0 1.5 2 0 1 0-3 0Zm4-4a1.5 2 0 1 0 3 0 1.5 2 0 1 0-3 0Zm5 0a1.5 2 0 1 0 3 0 1.5 2 0 1 0-3 0Zm4 4a1.5 2 0 1 0 3 0 1.5 2 0 1 0-3 0Z',
  timber: 'M4 14 14 6a4 4 0 0 1 6 5L10 19m-6-5a4 4 0 1 1 6 5 4 4 0 0 1-6-5Zm2 1.5 1 1.5 1.5-1M12 12l4-3',
  branch: 'M3 8h18M5 8v12m14-12v12M5 12l4-4m10 8-4-8m-6 8 3 3 3-3m-3-5v8',
  bird: 'M3 8c4 0 7 2 9 5 2-3 5-5 9-5-1 4-4 7-7 8l-2 3-2-3c-3-1-6-4-7-8Z',
  trail: 'M3 20c4-1 9-2 9-5 0-4-6-3-6-6s5-4 11-5M12 21c4-1 7-3 7-6 0-5-6-5-6-6s3-2 8-3',
  star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9L12 3Z',
  reeds: 'M7 21c0-7-1-11-3-14m8 14V4m5 17c0-6 1-10 3-13M7 15l-4-2m9 4 4-5m-2 9 6-4',
  water: 'M3 13c3-3 5 3 9 0s6 2 9 0M3 18c3-3 5 3 9 0s6 2 9 0m-9-15c-2 3-4 4-4 6 0 1 1 2 4 2s4-1 4-2c0-2-2-3-4-6Z',
}

export function insignia(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const path = document.createElementNS(svg.namespaceURI, 'path')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('aria-hidden', 'true')
  path.setAttribute('d', emblems[name])
  svg.append(path)
  return svg
}

export function patchName(patch, level) {
  return patch.name + (patch.goals.length > 1 ? ' · ' + medals[level] : '')
}

function patchCard(patch, player, shame) {
  const earned = player.patches[patch.id] ?? []
  const tier = earned.length - 1
  const goal = patch.goals[Math.min(tier + 1, patch.goals.length - 1)]
  const progress = Math.min(goal, patch.measure(player.stats, { ...player.records, score: player.profile.best }))
  const card = node('article', null, 'patch-card')
  card.dataset.tier = earned.length ? medals[tier].toLowerCase() : 'locked'
  if (shame) card.classList.add('patch-shame')
  const badge = node('div', null, 'patch-badge')
  badge.append(insignia(patch.emblem))
  const state = tier < 0 ? 'Locked' : patch.goals.length > 1 ? medals[tier] : 'Earned'
  card.append(badge, node('p', state, 'patch-state'), node('h4', patch.name), node('p', patch.description, 'patch-copy'))
  const track = node('progress')
  track.max = goal
  track.value = progress
  track.setAttribute('aria-label', patch.name + ' progress')
  const footer = node('div', null, 'patch-progress')
  const suffix = patch.id === 'clean-paws' ? ' s' : ['marathon', 'marsh-legend'].includes(patch.id) ? ' m' : ''
  footer.append(track, node('span', number(progress) + ' / ' + number(goal) + suffix))
  if (tier >= 0) {
    const unlocked = node('time', date(earned[tier]))
    unlocked.dateTime = earned[tier]
    footer.append(unlocked)
  }
  card.append(footer)
  return card
}

function trophies(player) {
  return [[fieldHonors, 'Field Honors', 'Good Dog', false], [hallOfShame, 'Hall of Shame', 'Bad Dog', true]]
    .map(([group, heading, subtitle, shame]) => {
      const section = node('section', null, 'patch-section')
      const headingRow = node('div', null, 'room-heading')
      headingRow.append(node('h3', heading), node('p', subtitle))
      const grid = node('div', null, 'patch-grid')
      grid.append(...group.map(patch => patchCard(patch, player, shame)))
      section.append(headingRow, grid)
      return section
    })
}

function personalRecords(player) {
  const { profile, records } = player
  const grid = node('div', null, 'record-grid')
  const stats = [
    ['Highest score', profile.best ? number(profile.best) : '—'],
    ['Longest run', profile.farthest ? meters(profile.farthest) : '—'],
    ['Best treat streak', profile.streak ? number(profile.streak) : '—'],
    ...Object.keys(records).map(key => [personalRecordLabels[key],
      records[key] ? (key === 'duration' ? duration(records[key]) : number(records[key])) : '—']),
  ]
  grid.append(...cards(stats))
  return [node('h3', 'Personal Records', 'section-title'), grid]
}

function journal(player) {
  const s = player.stats
  const most = Math.max(...causes.map(cause => s.deathsBy[cause]))
  const cause = most ? causes.filter(cause => s.deathsBy[cause] === most).map(cause => causeNames[cause]).join(' / ') : '—'
  const progress = patches.filter(patch => player.patches[patch.id]?.length).length
  const grid = node('div', null, 'record-grid')
  grid.append(...cards([
    ['Lifetime distance', meters(s.distance)], ['Completed runs', number(s.runs)],
    ['Playtime', duration(s.playtime)], ['Lifetime points', number(s.points)],
    ['Highest score', number(player.profile.best)], ['Longest run', meters(player.profile.farthest)],
    ['Treats collected', number(s.treats)], ['Logs jumped', number(s.logs)],
    ['Branches cleared', number(s.slidesCleared)], ['Geese dodged', number(s.geese)],
    ['Total retrieves', number(player.profile.retrieves)], ['Deaths', number(s.deaths)],
    ['Most common cause', cause], ['Patches earned', Math.round(progress * 100 / patches.length) + '%'],
  ]))
  const breakdown = node('dl', null, 'field-list')
  breakdown.append(...rows([
    ['Mallards retrieved', number(s.ducks)], ['Pheasants retrieved', number(s.pheasants)],
    ['Jump actions', number(s.jumps)], ['Slide actions', number(s.slides)],
    ...causes.map(cause => ['Deaths · ' + causeNames[cause], number(s.deathsBy[cause])]),
    ['Consecutive losses', number(s.failureStreak)],
    ['Same hazard streak', number(s.sameHazardStreak)], ['Under 20 s streak', number(s.earlyStreak)],
  ]))
  return [node('h3', 'Lifetime Field Journal', 'section-title'),
    node('p', 'Lifetime totals start with this update. Earlier saved records and total retrieves carry over.', 'room-note'),
    grid, node('h3', 'Field breakdown', 'section-title section-break'), breakdown, ...personalRecords(player)]
}

function leaderboard(lodge, metric, selectMetric) {
  const controls = node('div', null, 'board-filters')
  for (const [id, label] of Object.entries(categories)) {
    const button = node('button', label)
    button.type = 'button'
    button.dataset.metric = id
    button.setAttribute('aria-pressed', String(metric === id))
    button.addEventListener('click', () => selectMetric(id))
    controls.append(button)
  }
  const entries = lodge.board(metric)
  const list = node('ol', null, 'camp-board')
  entries.forEach((entry, index) => {
    const row = node('li')
    const rank = node('span', String(index + 1), 'board-rank')
    rank.setAttribute('aria-label', 'Rank ' + (index + 1))
    const who = node('div', null, 'board-runner')
    who.append(node('strong', lodge.nameFor(entry.player)), node('time', date(entry.date)))
    const highlight = node('strong', metric === 'distance' ? meters(entry.distance) : number(entry[metric]), 'board-score')
    const detail = node('p', [
      number(entry.score) + ' pts', meters(entry.distance), number(entry.retrieves) + ' retrieves',
      number(entry.treats) + ' treats', number(entry.logs) + ' logs', number(entry.geese) + ' geese',
    ].join(' · '), 'board-detail')
    row.append(rank, who, highlight, detail)
    list.append(row)
  })
  const empty = node('p', 'Finish a run to post the first score.', 'empty-board')
  return [node('h3', 'Camp Leaderboard', 'section-title'),
    node('p', 'Local to this device · Top 20 per category', 'room-note'), controls, entries.length ? list : empty]
}

const messages = {
  water: 'The marsh claimed another one.',
  logs: 'Should’ve cleared that timber.',
  geese: 'The goose won this round.',
  other: 'The trail had the last word.',
}

export function fillReport(ui, report) {
  ui['report-nickname'].textContent = report.nickname
  const record = report.improved.includes('score') || report.improved.includes('distance')
  const placement = Object.entries(report.placements).filter(([, rank]) => rank)
    .map(([metric, rank]) => '#' + rank + ' · ' + categories[metric])
  ui['report-message'].textContent = record ? 'That’s a fine day’s work.' : messages[report.cause]
  ui['report-headline'].replaceChildren(...cards([
    ['Score', number(report.score)], ['Distance', meters(report.distance)], ['Time', duration(report.duration)],
  ]))
  ui['report-tallies'].replaceChildren(...rows([
    ['Cause of death', hazardName(report.hazard)], ['Treats collected', number(report.treats)],
    ['Logs jumped', number(report.logs)], ['Branches cleared', number(report.slidesCleared)],
    ['Geese dodged', number(report.geese)], ['Retrieves', number(report.retrieves)],
  ]))
  const highlights = [
    ['Personal records', report.improved.map(key => personalRecordLabels[key])],
    ['New patches', report.earned.map(({ patch, level }) => patchName(patch, level))],
    ['Camp placement', placement.length ? placement : ['Outside the local top 20']],
  ]
  ui['report-highlights'].replaceChildren(...highlights.filter(([, items]) => items.length).map(([title, items]) => {
    const group = node('div', null, 'report-highlight')
    group.append(node('h3', title), node('p', items.join(' · ')))
    return group
  }))
}

export function createLodgeUI(ui, lodge, { camp, onPlayer, onOpen, onClose, onKennel, onAppearance, onStart, onJoin }) {
  const dialog = ui.lodge
  const panel = ui['lodge-panel']
  const scroll = dialog.querySelector('.lodge-scroll')
  const tabs = [...dialog.querySelectorAll('[role=tab]')]
  let room = 'trophies'
  let metric = 'score'
  let rivalMetric = 'score'
  let trigger

  function renderRoom() {
    onKennel(null)
    const player = lodge.current()
    panel.setAttribute('aria-labelledby', 'tab-' + room)
    for (const tab of tabs) {
      const active = tab.dataset.room === room
      tab.setAttribute('aria-selected', String(active))
      tab.tabIndex = active ? 0 : -1
    }
    function selectMetric(value) {
      metric = value
      if (room === 'worldwide') rivalMetric = value
      renderRoom()
      panel.querySelector('[data-metric=' + value + ']')?.focus({ preventScroll: true })
    }
    function selectRoom(value, focus = false) {
      room = value
      renderRoom()
      scroll.scrollTop = 0
      if (focus) tabs.find(tab => tab.dataset.room === value).focus({ preventScroll: true })
    }
    let content
    let stage
    if (room === 'board' || room === 'worldwide') {
      const isWorldwide = room === 'worldwide'
      const switcher = campSwitch(isWorldwide, () => selectRoom('board', true), () => selectRoom('worldwide', true))
      if (isWorldwide) metric = rivalMetric
      content = isWorldwide ? [switcher, worldwideBoard(camp, player, metric, selectMetric, { onJoin, onStart })]
        : [switcher, ...leaderboard(lodge, metric, selectMetric)]
    } else if (room === 'kennel') {
      ({ content, stage } = kennelRoom(lodge, onAppearance))
    } else if (room === 'career') content = careerRoom(player, insignia)
    else content = room === 'trophies' ? trophies(player) : room === 'journal' ? journal(player) : personalRecords(player)
    panel.replaceChildren(...content)
    if (stage) onKennel(stage)
  }

  function renderPlayers() {
    const player = lodge.current()
    ui['active-nickname'].textContent = 'Playing as ' + player.nickname
    ui.nickname.value = player.nickname
    const select = ui['local-player']
    select.replaceChildren(...lodge.players().map(item => {
      const option = node('option', item.nickname)
      option.value = item.id
      return option
    }))
    select.value = player.id
    renderRoom()
  }

  ui['local-player'].addEventListener('change', event => {
    lodge.select(Number(event.currentTarget.value))
    onPlayer()
    renderPlayers()
  })
  ui['nickname-form'].addEventListener('submit', event => {
    event.preventDefault()
    if (event.submitter?.value === 'new') {
      const name = ui.nickname.value.trim()
      lodge.newPlayer(name === lodge.current().nickname ? '' : name)
    } else {
      lodge.rename(ui.nickname.value)
    }
    onPlayer()
    renderPlayers()
  })
  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      room = tab.dataset.room
      renderRoom()
      scroll.scrollTop = 0
    })
    tab.addEventListener('keydown', event => {
      const index = tabs.indexOf(tab)
      const next = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index - 1 + tabs.length) % tabs.length,
        Home: 0, End: tabs.length - 1 }[event.key]
      if (next === undefined) return
      event.preventDefault()
      tabs[next].click()
      tabs[next].focus()
    })
  }

  function onConnectivity() {
    if (dialog.open && room === 'worldwide') renderRoom()
  }
  window.addEventListener('online', onConnectivity)
  window.addEventListener('offline', onConnectivity)
  function fitViewport() {
    if (!dialog.open || !window.visualViewport) return
    const viewport = window.visualViewport
    if (viewport.scale !== 1) return
    dialog.style.setProperty('--lodge-viewport', viewport.height + 'px')
    dialog.style.setProperty('--lodge-offset', viewport.offsetTop + 'px')
  }
  window.visualViewport?.addEventListener('resize', fitViewport)
  window.visualViewport?.addEventListener('scroll', fitViewport)
  ui['close-lodge'].addEventListener('click', () => dialog.close())
  dialog.addEventListener('close', () => {
    onKennel(null)
    onClose()
    trigger?.focus({ preventScroll: true })
  })
  return {
    rivalMetric: () => rivalMetric,
    open(button, targetRoom) {
      trigger = button
      if (targetRoom) room = targetRoom
      dialog.showModal()
      fitViewport()
      renderPlayers()
      ui['camp-profile'].open = false
      scroll.scrollTop = 0
      onOpen()
      ui['close-lodge'].focus({ preventScroll: true })
    },
  }
}
