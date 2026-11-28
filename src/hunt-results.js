import { xpTransitions } from './career.js'
import { gearIllustration } from './kennel-illustration.js'
import { checkLabel, honorById } from './field-honors.js'
import { hazardName } from './field-stats.js'
import { trophyFor, honorDisplay, lodgeTiers } from './lodge-progress.js'
import { exhibitImage } from './legacy-room.js'
import { duration, meters, node, number } from './lodge-elements.js'
import { fieldSpecies } from './wildlife-catalog.js'
import { environmentalDiscoveries } from './environment-discoveries.js'

const recordLabels = { score: 'Score', distance: 'Distance', duration: 'Time survived',
  retrieves: 'Retrieves', treats: 'Treats', logs: 'Logs jumped', slidesCleared: 'Slides cleared', geese: 'Geese dodged' }
const formatRecord = (key, value) => key === 'duration' ? duration(value) : key === 'distance' ? meters(value) : number(value)
const gentle = value => value * (2 - value)

function award(target, { title, label, description, image, room, ref }, openRoom) {
  const card = node('details', null, 'earned-card')
  const summary = node('summary')
  const identification = node('span')
  identification.append(node('small', label), node('strong', title))
  if (image) summary.append(image)
  summary.append(identification)
  card.append(summary)
  if (description) card.append(node('p', description))
  if (room && openRoom) {
    const inspect = node('button', room === 'journal' ? 'Open Journal' : room === 'kennel' ? 'Open Kennel' : 'See in Lodge')
    inspect.type = 'button'
    inspect.addEventListener('click', () => openRoom(inspect, room, ref))
    card.append(inspect)
  }
  target.append(card)
}

function exhibits(report, player) {
  const cards = []
  for (const item of report.gear ?? []) {
    const category = Object.hasOwn(item, 'coat') ? 'coat' : item.bandana ? 'bandana' : item.id?.endsWith('-vest') ? 'vest' : 'collar'
    cards.push({ title: item.name, label: 'Equipment earned', room: 'kennel', ref: item.id,
      image: gearIllustration(item, category), description: item.description ??
        (item.honor ? honorById.get(item.honor)?.name : item.level ? 'Unlocked at career level ' + item.level : undefined) })
  }
  for (const honor of report.newHonors ?? []) {
    const key = 'honor:' + honor.id
    const trophy = player && trophyFor(player, key) || { name: honor.name, ...honorDisplay(honor), badge: honor.tier }
    cards.push({ title: trophy.name, label: trophy.badge ?? 'Field Honor', image: exhibitImage(trophy),
      description: trophy.description ?? honor.checks?.map(checkLabel).join(' · '), room: 'collection', ref: key })
  }
  for (const id of report.newWildlife ?? []) {
    const animal = fieldSpecies[id]
    if (animal) cards.push({ title: animal.name, label: 'First field sighting', image: exhibitImage({species:id}),
      description: animal.habitat, room: 'journal', ref: id })
  }
  for (const id of report.presentation?.discoveries ?? []) {
    const entry = environmentalDiscoveries[id]
    if (!entry) continue
    const trophy = player && trophyFor(player,'discovery:' + id)
    cards.push({ title: entry.name, label: 'Field discovery', description: entry.note,
      image: trophy ? exhibitImage(trophy) : undefined, room: 'journal', ref: id })
  }
  const tier = report.lodge?.tier
  if (tier) {
    const image = node('img', null, 'earned-interior')
    image.src = './lodge/interior-' + (lodgeTiers.findIndex(item => item.id === tier.id) + 1) + '.webp'
    image.alt = ''
    image.loading = 'lazy'
    cards.unshift({ title: tier.name, label: 'Lodge upgraded', description: tier.description, image, room: 'overview' })
  }
  for (const upgrade of report.lodge?.upgrades ?? []) {
    cards.push({ title: upgrade.name, label: 'Added to your Lodge', image: exhibitImage(upgrade), room: 'overview' })
  }
  if (report.presentation?.migrationCompleted)
    cards.unshift({ title: 'The Great Migration', label: 'All 15 territories', image: exhibitImage({ art: 'migration' }),
      description: 'Your first completed migration, from Gulf Coast Marsh to Canadian Mountain Wilderness.', room: 'migration' })
  if (report.boyd) cards.unshift({ title: 'Boyd and his field kit', label: 'Master Hunter qualification',
    image: exhibitImage({ art: 'legend' }), room: 'career' })
  return cards
}

export function renderHuntResults(ui, report, { player, motion, openRoom } = {}) {
  const celebration = report.boyd || report.presentation?.migrationCompleted || report.lodge?.tier ||
    report.gear?.length || report.improved?.includes('score')
  ui['field-report'].toggleAttribute('data-celebration',Boolean(celebration))
  const panel = ui['report-journey']
  panel.replaceChildren()
  const awards = ui['report-earned']
  awards.replaceChildren()
  ui['report-outcome'].textContent = 'Hunt ended at ' + hazardName(report.hazard).toLowerCase()
  const scoreLabel = ui['report-headline'].querySelector('.record-card')
  const scoreNumber = scoreLabel?.querySelector('strong')
  const scoreTitle = scoreLabel?.querySelector('span')
  if (scoreNumber) scoreNumber.setAttribute('aria-label', 'Final score ' + number(report.score))

  const career = report.career
  const marks = report.presentation?.achievements ?? []
  const visuals = []
  let careerAt
  if (career) {
    const section = node('section', null, 'result-career')
    const balance = node('h3', '+' + number(career.earned) + ' career XP')
    const heading = node('p', null, 'result-level')
    const meter = node('progress')
    meter.setAttribute('aria-label', 'Career level progress')
    const values = node('p', null, 'result-values')
    const extra = career.after.nextRank
    section.append(balance, heading, meter, values)
    if (extra || !career.after.maxed)
      section.append(node('p', extra ? 'Next rank · ' + extra.name : 'Next · Level ' + (career.after.level + 1), 'room-note'))
    if (report.saved === false) section.append(node('p', 'Save pending. The game will retry when it can.', 'room-note'))
    panel.append(section)
    const legs = xpTransitions(career.before, career.after)
    careerAt = fraction => {
      if (fraction >= 1) {
        const { level, within, span, maxed, rank } = career.after
        heading.textContent = (maxed && !report.boyd && !player?.progression.boyd ? 'Qualification pending' : rank.name) + ' · Level ' + level
        meter.max = span
        meter.value = within
        values.textContent = maxed ? number(career.after.xp) + ' lifetime XP' : number(within) + ' / ' + number(span) + ' XP'
        return
      }
      const cursor = fraction * legs.length
      const index = Math.floor(cursor)
      const leg = legs[index]
      if (!leg) return
      const shown = Math.floor(leg.from + (leg.to - leg.from) * gentle(cursor - index))
      heading.textContent = 'Level ' + leg.level
      meter.max = leg.max
      meter.value = shown
      values.textContent = number(shown) + ' / ' + number(leg.max) + ' XP'
    }
  }

  if (marks.length) {
    const field = node('section', null, 'result-honors')
    field.append(node('h3', 'Field Honors'))
    for (const mark of marks) {
      const name = node('label', mark.name)
      const meter = node('progress')
      meter.max = mark.target
      meter.setAttribute('aria-label', mark.name)
      const value = node('small')
      name.append(meter, value)
      field.append(name)
      visuals.push(fraction => {
        const shown = Math.floor(mark.from + (mark.to - mark.from) * fraction)
        meter.value = shown
        value.textContent = fraction === 1 && mark.completed ? 'Earned' : number(shown) + ' / ' + number(mark.target)
      })
    }
    panel.append(field)
  }
  const prior = report.presentation?.previousRecords
  if (prior && report.improved.length) {
    const records = node('section', null, 'result-records')
    records.append(node('h3', 'Personal records'))
    for (const key of report.improved.slice(0, 4)) {
      if (!recordLabels[key] || !Number.isFinite(report[key])) continue
      const previous = prior[key]
      records.append(node('p', recordLabels[key] + ' · ' + (previous > 0 ? formatRecord(key, previous) + ' → ' : '') +
        formatRecord(key, report[key])))
    }
    panel.append(records)
  }
  const cards = exhibits(report, player)
  if (cards.length) {
    awards.append(node('h3', 'Earned this hunt'))
    for (const card of cards) award(awards, card, openRoom)
  }
  awards.hidden = !cards.length
  ui['report-reward-summary'].hidden = Boolean(cards.length)
  ui['report-xp-summary'].hidden = Boolean(career)
  panel.hidden = !panel.children.length
  const skip = ui['report-skip']
  const exceptional = Boolean(report.boyd || report.presentation?.migrationCompleted || report.lodge?.tier ||
    career && career.before.rank.id !== career.after.rank.id)
  ui['field-report'].toggleAttribute('data-exceptional', exceptional)
  let frame
  const render = fraction => {
    if (scoreNumber && scoreTitle) {
      scoreNumber.textContent = number(report.score * gentle(Math.min(1, fraction * 2.4)))
      scoreTitle.textContent = fraction * 2.4 < 1 ? 'Scoring hunt' : 'Score'
    }
    careerAt?.(fraction)
    for (const paint of visuals) paint(fraction)
  }
  const finish = () => {
    cancelAnimationFrame(frame)
    skip.hidden = true
    skip.onclick = null
    render(1)
  }
  if (!motion || !career && !report.score) finish()
  else {
    const clock = performance.now()
    const length = exceptional ? 1900 : 1350
    skip.hidden = false
    skip.onclick = finish
    render(0)
    const tick = now => {
      const fraction = Math.max(0, Math.min(1, (now - clock) / length))
      if (fraction === 1) finish()
      else { render(fraction); frame = requestAnimationFrame(tick) }
    }
    frame = requestAnimationFrame(tick)
  }
  return finish
}
