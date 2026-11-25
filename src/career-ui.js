import { careerStanding, dogRanks, xpAt } from './career.js'
import { journalIssues } from './career-integrity.js'
import { localHonors } from './field-honors.js'
import { masterHunterChecks, masterHunterTrials, progressionMetrics } from './progression.js'
import { node, number } from './lodge-elements.js'

export function careerProgress(standing) {
  const track = node('progress')
  track.max = standing.span
  track.value = standing.within
  track.setAttribute('aria-label', standing.maxed ? 'Master Hunter level complete' : 'Career XP to level ' + (standing.level + 1))
  return track
}

export function careerLine(player) {
  const standing = careerStanding(player.career)
  return standing.rank.name + ' · Level ' + number(standing.level)
}

export function qualificationCard(player) {
  const qualified = Boolean(player.progression.boyd)
  const panel = node('section', null, 'career-ledger master-qualification')
  panel.append(node('h3', 'Boyd · Master Hunter', 'section-title'),
    node('p', qualified ? 'Qualified · Boyd and his exclusive field kit are available in the Kennel.'
      : 'Earn Boyd through field experience, mastery and wildlife discovery.'))
  const checklist = node('ul', null, 'career-requirements')
  for (const requirement of masterHunterChecks(player)) {
    const entry = node('li')
    entry.dataset.met = String(requirement.met)
    entry.append(node('strong', requirement.label), node('span',
      (requirement.met ? 'Complete · ' : '') + number(Math.min(requirement.value, requirement.target)) + ' / ' + number(requirement.target)))
    checklist.append(entry)
  }
  panel.append(checklist, node('p', 'Complete any two legendary trials · ' + masterHunterTrials.join(' · '), 'room-note'))
  return panel
}

export function careerRoom(player, insignia) {
  const standing = careerStanding(player.career)
  const panel = node('section', null, 'career-ledger')
  panel.append(node('p', player.nickname, 'lodge-kicker'), node('h3', 'Working Dog Career', 'section-title'),
    node('strong', careerLine(player)), careerProgress(standing),
    node('p', standing.maxed ? number(standing.xp) + ' lifetime XP · Level 100 complete'
      : number(standing.within) + ' / ' + number(standing.span) + ' XP toward Level ' + (standing.level + 1)),
    node('p', standing.nextRank ? 'Next rank · ' + standing.nextRank.name + ' at Level ' + standing.nextRank.level
      : 'Master Hunter · Career rank complete', 'room-note'))

  const problems = journalIssues(player)
  if (problems.length) panel.append(node('p', problems.join(' ') + ' Field Honors are paused for this profile.', 'room-note'))
  if (player.career.legacyLevel) panel.append(node('p', 'Earlier career · ' +
    player.career.legacyRank + ' · Level ' + player.career.legacyLevel + ' · ' + number(player.career.legacyXP) + ' XP', 'room-note'))

  const ranks = node('details', null, 'career-ledger')
  ranks.append(node('summary', 'All ten ranks'))
  const collection = node('div', null, 'career-patches')
  for (const rank of dogRanks) {
    const patch = node('article', null, 'career-patch')
    const earned = standing.level >= rank.level
    patch.dataset.earned = String(earned)
    const badge = node('div', null, 'patch-badge')
    badge.append(insignia(rank.emblem))
    patch.append(badge, node('strong', rank.name), node('span', 'Level ' + rank.level),
      node('small', earned ? 'Earned' : number(xpAt(rank.level)) + ' career XP'))
    collection.append(patch)
  }
  ranks.append(collection)
  return [panel, ranks, qualificationCard(player)]
}

export function nearbyHonor(player) {
  const values = progressionMetrics(player)
  const earned = player.progression.honors
  return localHonors.find(honor => honor.qualifies && !honor.secret && honor.checks.length === 1 &&
    !Object.hasOwn(earned, honor.id) && honor.checks.every(({ key, target }) => {
      const value = values.get(key) ?? 0
      return value > 0 && value < target && value / target >= .86
    }))
}

export function fillCareerReport(ui, report, openKennel, openLodge) {
  const space = ui['report-career']
  space.replaceChildren()
  space.hidden = !report.career
  if (!report.career) return
  const { earned, before, after } = report.career
  space.append(node('h3', '+' + number(earned) + ' Career XP'),
    node('p', after.rank.name + ' · Level ' + number(after.level) +
      (after.level > before.level ? ' · Up ' + number(after.level - before.level) : '')),
    careerProgress(after))
  if (report.lodge?.tier || report.lodge?.upgrades.length) {
    const reward = node('div', null, 'report-lodge-award')
    if (report.lodge.tier) reward.append(node('strong', 'Lodge upgraded · ' + report.lodge.tier.name))
    const additions = report.lodge.upgrades
    if (additions.length) reward.append(node('p', additions.length === 1 ? additions[0].name + ' added to the Lodge'
      : number(additions.length) + ' new Lodge additions'))
    const visit = node('button', 'See the Lodge')
    visit.type = 'button'
    visit.addEventListener('click', () => openLodge(visit))
    reward.append(visit)
    space.append(reward)
  }
  if (report.newHonors.length) space.append(node('p', number(report.newHonors.length) + ' new Field Honor' + (report.newHonors.length === 1 ? '' : 's')))
  if (report.boyd) space.append(node('strong', 'Boyd and his Master Hunter kit earned'))
  if (report.gear.length) {
    const button = node('button', 'View in Kennel')
    button.type = 'button'
    button.addEventListener('click', () => openKennel(button))
    space.append(node('p', number(report.gear.length) + ' new equipment option' + (report.gear.length === 1 ? '' : 's')), button)
  }
  if (report.saved === false) space.append(node('p', 'Progress is in memory. Leave this page open to retry saving on your next hunt.', 'room-note'))
}
