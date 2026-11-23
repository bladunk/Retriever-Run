import { careerStanding, dogRanks } from './career.js'
import { kennelItems, unlocked } from './kennel-catalog.js'
import { meters, node, number } from './lodge-elements.js'

export function careerProgress(standing) {
  const track = node('progress')
  track.max = standing.span
  track.value = standing.within
  track.setAttribute('aria-label', 'Working Dog experience to level ' + (standing.level + 1))
  return track
}

export function careerLine(player) {
  const standing = careerStanding(player.career.xp)
  return standing.rank.name + ' · Level ' + number(standing.level)
}

export function careerRoom(player, insignia) {
  const standing = careerStanding(player.career.xp)
  const panel = node('section', null, 'career-ledger')
  panel.append(node('p', player.nickname, 'lodge-kicker'), node('h3', 'Working Dog Career', 'section-title'),
    node('strong', careerLine(player)), careerProgress(standing),
    node('p', number(standing.within) + ' / ' + number(standing.span) + ' XP in this level · ' +
      number(standing.span - standing.within) + ' XP to level ' + number(standing.level + 1)),
    node('p', number(standing.xp) + ' lifetime XP · ' + number(player.stats.runs) + ' completed runs · ' +
      meters(player.stats.distance) + ' in the Field Journal'),
    node('p', standing.nextRank ? 'Next promotion · ' + standing.nextRank.name + ' at level ' + standing.nextRank.level
      : 'Marsh Legend · Keep earning career levels.', 'room-note'))

  const collection = node('div', null, 'career-patches')
  for (const rank of dogRanks) {
    const patch = node('article', null, 'career-patch')
    patch.dataset.earned = String(standing.level >= rank.level)
    const badge = node('div', null, 'patch-badge')
    badge.append(insignia(rank.emblem))
    const reward = kennelItems.find(item => item.id === rank.reward)
    patch.append(badge, node('strong', rank.name),
      node('span', standing.level >= rank.level ? 'Earned' : 'Level ' + rank.level),
      node('small', reward?.name ?? 'Classic field gear'))
    collection.append(patch)
  }
  const gear = node('ul', null, 'career-rewards')
  for (const item of kennelItems) {
    if (!item.level && !player.kennel.inherited.includes(item.id)) continue
    const owned = unlocked(item, standing.level, player.kennel.inherited)
    gear.append(node('li', item.name + ' · ' + (owned ? 'Unlocked' : 'Level ' + item.level)))
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
