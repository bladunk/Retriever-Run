import { careerStanding, dogRanks, promotionRequirements, rankIndex } from './career.js'
import { gearRequirement, kennelItems, unlocked } from './kennel-catalog.js'
import { meters, node, number } from './lodge-elements.js'

export function careerProgress(standing) {
  const track = node('progress')
  track.max = standing.span
  track.value = standing.within
  track.setAttribute('aria-label', 'Working Dog experience to level ' + (standing.level + 1))
  return track
}

export function careerLine(player) {
  const standing = careerStanding(player.career)
  return standing.rank.name + ' · Level ' + number(standing.level)
}

export function careerRoom(player, insignia) {
  const standing = careerStanding(player.career)
  const panel = node('section', null, 'career-ledger')
  panel.append(node('p', player.nickname, 'lodge-kicker'), node('h3', 'Working Dog Career', 'section-title'),
    node('strong', careerLine(player)), careerProgress(standing),
    node('p', number(standing.within) + ' / ' + number(standing.span) + ' XP in this level · ' +
      number(standing.span - standing.within) + ' XP to level ' + number(standing.level + 1)),
    node('p', number(standing.xp) + ' lifetime XP · ' + number(player.stats.runs) + ' completed runs · ' +
      meters(player.stats.distance) + ' in the Field Journal'),
    node('p', standing.nextRank ? 'Next promotion · ' + standing.nextRank.name
      : 'Marsh Legend · Keep earning career levels.', 'room-note'))

  if (player.career.legacyLevel > 1) {
    const legacy = dogRanks[rankIndex(player.career.legacyRank)]
    const note = (legacy.id === 'pup' ? 'Old level ' : legacy.name + ' · Old level ') + number(player.career.legacyLevel)
    panel.append(node('p', note + '. The new XP curve recalculates levels. Your lifetime XP, earned rank and gear carry over.',
      'room-note'))
  }
  if (standing.nextRank) {
    const requirements = node('ul', null, 'career-requirements')
    for (const requirement of promotionRequirements(standing.nextRank, player, standing.level)) {
      const entry = node('li')
      entry.dataset.met = String(requirement.met)
      entry.append(node('strong', requirement.label), node('span',
        (requirement.met ? 'Complete · ' : '') + number(requirement.current) + ' / ' + number(requirement.target)))
      if (!requirement.met && requirement.candidates.length) {
        entry.append(node('small', 'Qualifying honors still available · ' + requirement.candidates.join(', ')))
      }
      requirements.append(entry)
    }
    panel.append(requirements, node('p', 'XP keeps accumulating while you finish these requirements. Promotions are awarded after a run.', 'room-note'))
  }

  const collection = node('div', null, 'career-patches')
  for (const rank of dogRanks) {
    const patch = node('article', null, 'career-patch')
    const earned = rankIndex(standing.rank.id) >= rankIndex(rank.id)
    patch.dataset.earned = String(earned)
    const badge = node('div', null, 'patch-badge')
    badge.append(insignia(rank.emblem))
    const reward = kennelItems.find(item => item.id === rank.reward)
    patch.append(badge, node('strong', rank.name),
      node('span', earned ? 'Earned' : 'Level ' + rank.level),
      node('small', reward?.name ?? 'Classic field gear'))
    collection.append(patch)
  }
  const gear = node('ul', null, 'career-rewards')
  for (const item of kennelItems) {
    if (!item.level && !item.rank && !player.kennel.inherited.includes(item.id)) continue
    const owned = unlocked(item, standing, player.kennel.inherited)
    gear.append(node('li', item.name + ' · ' + (owned ? 'Unlocked' : gearRequirement(item))))
  }
  return [panel, collection, node('h3', 'Kennel rewards', 'section-title section-break'), gear]
}

export function fillCareerReport(ui, report, openKennel) {
  const space = ui['report-career']
  space.replaceChildren()
  space.hidden = !report.career
  if (!report.career) return
  const { earned, before, after } = report.career
  space.append(node('h3', '+' + number(earned) + ' Career XP'),
    node('p', after.rank.name + ' · Level ' + number(after.level) +
      (after.level > before.level ? ' · Up ' + number(after.level - before.level) : '')),
    careerProgress(after))
  if (report.gear.length) {
    const button = node('button', 'View in Kennel')
    button.type = 'button'
    button.addEventListener('click', () => openKennel(button))
    space.append(node('p', 'New gear · ' + report.gear.map(item => item.name).join(', ')), button)
  }
}

export function createPromotion(ui, lodge, insignia, onShow) {
  const dialog = ui.promotion
  let rank
  function show() {
    rank = dogRanks.find(item => item.id === lodge.current().career.promotions[0])
    if (!rank) return false
    ui['promotion-patch'].replaceChildren(insignia(rank.emblem))
    ui['promotion-title'].textContent = rank.name
    ui['promotion-reward'].textContent = 'Gear unlocked · ' + kennelItems.find(item => item.id === rank.reward).name
    if (!dialog.open) dialog.showModal()
    ui['promotion-continue'].focus({ preventScroll: true })
    onShow()
    return true
  }
  ui['promotion-continue'].addEventListener('click', () => {
    lodge.acknowledgePromotion(rank.id)
    if (!show()) dialog.close()
  })
  return { show }
}
