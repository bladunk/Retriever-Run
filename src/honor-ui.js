import { collectionSearch, collectionSelect, matchesCollection, recentlyEarned } from './collection-browser.js'
import { checkLabel, honorCategories, honors, localHonors } from './field-honors.js'
import { progressionMetrics } from './progression.js'
import { node, number } from './lodge-elements.js'
import { kennelItems } from './kennel-catalog.js'
import { verifiedHonorRequirements } from './ranked-camp.js'

export function honorFamilies(items) {
  const families = new Map()
  for (const honor of items) {
    const suffix = ' · ' + honor.tier
    const isSeries = !honor.secret && honor.name.endsWith(suffix) && /-[1-4]$/.test(honor.id)
    const id = isSeries ? honor.id.slice(0,-2) : honor.id
    if (!families.has(id)) families.set(id,{ label:isSeries ? honor.name.slice(0,-suffix.length) : honor.name, tiers:[] })
    families.get(id).tiers.push(honor)
  }
  return [...families.values()]
}

export function fieldHonorsRoom(player, insignia, legacyPanels, category, competitive = []) {
  const earned = player.progression.honors
  const verified = new Set(competitive)
  const owns = honor => Object.hasOwn(earned, honor.id) || verified.has(honor.id)
  const values = progressionMetrics(player)
  const root = node('section', null, 'patch-section')
  const filters = node('div', null, 'board-filters')
  const section = node('select')
  section.setAttribute('aria-label', 'Field Honor category')
  for (const name of ['All local honors', ...honorCategories]) section.append(node('option', name))
  if (honorCategories.includes(category)) section.value = category
  const status = node('select')
  status.setAttribute('aria-label', 'Field Honor status')
  for (const name of ['All statuses','Earned','Locked']) status.append(node('option', name))
  const search = collectionSearch('Search Field Honors')
  const rarity = collectionSelect('Honor rarity', { all: 'All tiers', Bronze: 'Bronze', Silver: 'Silver', Gold: 'Gold', Platinum: 'Platinum' })
  const sort = collectionSelect('Order Field Honors', { catalog: 'Catalog order', recent: 'Recently earned', name: 'Name' })
  const tools = node('div', null, 'collection-tools')
  const preferences = node('details',null,'heritage-honor-filters')
  preferences.append(node('summary','Filter Field Honors'),filters)
  tools.replaceChildren(search,preferences)
  filters.append(section,status,rarity,sort)
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
    const filtered = pool.filter(honor => {
      const owned = owns(honor)
      return (status.value === 'All statuses' || owned === (status.value === 'Earned')) &&
        (rarity.value === 'all' || honor.tier === rarity.value) &&
        matchesCollection(search.value, honor.secret && !owned ? 'Secret Field Honor' : honor.name, honor.category)
    })
    if (sort.value === 'recent') filtered.sort((a, b) => recentlyEarned(earned[a.id], earned[b.id]) ||
      Number(owns(b)) - Number(owns(a)))
    if (sort.value === 'name') filtered.sort((a, b) => (a.secret && !owns(a) ? 'Secret Field Honor' : a.name)
      .localeCompare(b.secret && !owns(b) ? 'Secret Field Honor' : b.name))
    const families = honorFamilies(filtered)
    function card(honor) {
      const owned = owns(honor)
      const hidden = honor.secret && !owned
      const isLegend = honor.category === 'Legendary'
      const details = node('details', null, 'patch-card')
      details.dataset.tier = owned ? honor.tier.toLowerCase() : 'locked'
      details.dataset.honor = honor.id
      const title = node('summary', hidden ? 'Secret Field Honor' : honor.name)
      const badge = node('div', null, 'patch-badge')
      badge.append(insignia(isLegend ? 'star' : honor.category === 'Hall of Shame' ? 'timber' :
        honor.category.includes('Waterfowl') ? 'bird' : 'paw'))
      const onlineRequirement = verifiedHonorRequirements[honor.id]
      details.append(title, badge, node('p', verified.has(honor.id) ? 'Verified · ' + honor.tier :
        honor.pending && !onlineRequirement ? 'Pending · verified Camp play' :
        owned ? 'Earned · ' + honor.tier : 'Locked · ' + honor.tier, 'patch-state'))
      if (onlineRequirement) details.append(node('p', onlineRequirement))
      else if (honor.pending) details.append(node('p', 'This Honor is unavailable until its requirement can be verified.'))
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
    }
    const articles = families.slice(page*size,page*size+size).map(family => {
      if (family.tiers.length === 1) return card(family.tiers[0])
      const group = node('details',null,'heritage-honor-family')
      const tiers = [...family.tiers].sort((a,b) => a.id.localeCompare(b.id))
      const earned = tiers.filter(owns)
      const next = tiers.find(tier => !owns(tier))
      const label = node('summary',family.label)
      label.append(node('small', (earned.at(-1)?.tier ?? 'Unstarted') + ' · ' + earned.length + '/' + tiers.length +
        (next ? ' · Next ' + next.tier : ' · Complete')))
      const content = node('div',null,'heritage-honor-tiers')
      content.append(...tiers.map(card))
      group.append(label,content)
      return group
    })
    grid.replaceChildren(...(articles.length ? articles : [node('p', 'No honors in this view.', 'room-note')]))
    back.disabled = page === 0
    next.disabled = (page + 1) * size >= families.length
    pageLabel.textContent = (families.length ? page * size + 1 : 0) + '–' +
      Math.min((page+1)*size,families.length) + ' of ' + families.length
  }

  search.addEventListener('input', () => { page = 0; render() })
  for (const filter of [section, status, rarity, sort]) filter.addEventListener('change', () => { page = 0; render() })
  back.addEventListener('click', () => { page--; render() })
  next.addEventListener('click', () => { page++; render() })
  const archive = node('details', null, 'career-ledger')
  archive.append(node('summary', 'Earlier patches and Hall of Shame'), ...legacyPanels)
  root.append(node('h3', 'Field Honors', 'section-title'),
    node('p', number(Object.keys(earned).length) + ' of ' + number(localHonors.length) + ' local honors earned', 'room-note'),
    ...(verified.size ? [node('p', number(verified.size) + ' competitive Honors recorded by Camp', 'room-note')] : []),
    tools, pageControls, grid, archive)
  render()
  return [root]
}
