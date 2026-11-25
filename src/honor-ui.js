import { checkLabel, honorCategories, honors, localHonors } from './field-honors.js'
import { progressionMetrics } from './progression.js'
import { node, number } from './lodge-elements.js'
import { kennelItems } from './kennel-catalog.js'

export function fieldHonorsRoom(player, insignia, legacyPanels) {
  const earned = player.progression.honors
  const values = progressionMetrics(player)
  const root = node('section', null, 'patch-section')
  const filters = node('div', null, 'board-filters')
  const section = node('select')
  section.setAttribute('aria-label', 'Field Honor category')
  for (const name of ['All local honors', ...honorCategories]) section.append(node('option', name))
  const status = node('select')
  status.setAttribute('aria-label', 'Field Honor status')
  for (const name of ['All statuses','Earned','Locked']) status.append(node('option', name))
  filters.append(section, status)
  const grid = node('div', null, 'patch-grid')
  const pageControls = node('div', null, 'board-filters')
  const back = node('button', 'Previous')
  const next = node('button', 'Next')
  const pageLabel = node('span', null, 'room-note')
  pageLabel.setAttribute('aria-live', 'polite')
  back.type = next.type = 'button'
  pageControls.append(back, pageLabel, next)
  const size = 16
  let page = 0

  function render() {
    const pool = section.value === 'All local honors' ? localHonors : honors.filter(honor => honor.category === section.value)
    const filtered = pool.filter(honor => status.value === 'All statuses' ||
      Object.hasOwn(earned, honor.id) === (status.value === 'Earned'))
    const articles = filtered.slice(page * size, page * size + size).map(honor => {
      const owned = Object.hasOwn(earned, honor.id)
      const hidden = honor.secret && !owned
      const isLegend = honor.category === 'Legendary'
      const details = node('details', null, 'patch-card')
      details.dataset.tier = owned ? honor.tier.toLowerCase() : 'locked'
      details.dataset.honor = honor.id
      const title = node('summary', hidden ? 'Secret Field Honor' : honor.name)
      const badge = node('div', null, 'patch-badge')
      badge.append(insignia(isLegend ? 'star' : honor.category === 'Hall of Shame' ? 'timber' :
        honor.category.includes('Waterfowl') ? 'bird' : 'paw'))
      details.append(title, badge, node('p', honor.pending ? 'Pending · verified Camp play' :
        owned ? 'Earned · ' + honor.tier : 'Locked · ' + honor.tier, 'patch-state'))
      if (honor.pending) details.append(node('p', 'Available after the new Camp ruleset and verification are released.'))
      else if (hidden) details.append(node('p', 'Discover this combination on a hunt.'))
      else {
        const list = node('ul', null, 'career-requirements')
        for (const check of honor.checks) {
          const item = node('li', checkLabel(check))
          if (values.has(check.key) && !owned) item.append(node('small', number(Math.floor(values.get(check.key))) + ' recorded'))
          list.append(item)
        }
        details.append(list)
        const rewards = kennelItems.filter(item => item.honor === honor.id)
        if (rewards.length) details.append(node('small', 'Equipment · ' + number(rewards.length) + ' options in the Kennel'))
        if (owned) details.append(node('small', earned[honor.id] ? earned[honor.id].slice(0, 10) : 'Recognized from field records'))
      }
      return details
    })
    grid.replaceChildren(...(articles.length ? articles : [node('p', 'No honors in this view.', 'room-note')]))
    back.disabled = page === 0
    next.disabled = (page + 1) * size >= filtered.length
    pageLabel.textContent = (filtered.length ? page * size + 1 : 0) + '–' +
      Math.min((page + 1) * size, filtered.length) + ' of ' + filtered.length
  }

  for (const filter of [section, status]) filter.addEventListener('change', () => { page = 0; render() })
  back.addEventListener('click', () => { page--; render() })
  next.addEventListener('click', () => { page++; render() })
  const archive = node('details', null, 'career-ledger')
  archive.append(node('summary', 'Earlier patches and Hall of Shame'), ...legacyPanels)
  root.append(node('h3', 'Field Honors', 'section-title'),
    node('p', number(Object.keys(earned).length) + ' of ' + number(localHonors.length) + ' local honors earned', 'room-note'),
    filters, grid, pageControls, archive)
  render()
  return [root]
}
