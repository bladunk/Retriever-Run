import { collectionSearch, collectionSelect, matchesCollection } from './collection-browser.js'
import './lodge-gallery.css'
import { careerStanding } from './career.js'
import { qualificationCard } from './career-ui.js'
import { expeditionRegions } from './expedition.js'
import { checkLabel } from './field-honors.js'
import { causes, causeNames } from './field-stats.js'
import { duration, rows, cards, node, number, meters, date } from './lodge-elements.js'
import { migrationMap } from './lodge-map.js'
import { completeMigrations, displayEquipment, earnedTrophies, lodgeProgress, lodgeRequirements, lodgeTiers, lodgeUpgrades,
  migrationStop, trophyLimit } from './lodge-progress.js'
import { courseRuleset, legacyMigrationRuleset } from './ruleset.js'
import { fieldSpecies } from './wildlife-catalog.js'
import { wildlifePortrait } from './wildlife-portrait.js'

const categoryNames = { honors: 'Field Honors', legend: 'Legendary', wildlife: 'Wildlife observations',
  retrieves: 'Retrieves', regional: 'Regional displays', career: 'Career milestones', hall: 'Hall of Shame' }
const categoryOrder = { legend: 0, regional: 1, retrieves: 2, wildlife: 3, career: 4, honors: 5, hall: 6 }
const medals = { Platinum: 4, Gold: 3, Silver: 2, Bronze: 1 }
const occurred = trophy => trophy.date ? Date.parse(trophy.date) : 0
const awardOrder = (a, b) => occurred(b) - occurred(a) || categoryOrder[a.category] - categoryOrder[b.category] ||
  (medals[b.badge] ?? 0) - (medals[a.badge] ?? 0) || a.name.localeCompare(b.name)
const artRoot = './lodge/'
const prestigeKit = ['./branding/boyd-portrait.webp', './branding/master-hunter.png']

function curated(trophies, pins = []) {
  const display = pins.slice()
  const topics = new Set(pins.map(trophy => trophy.checks?.[0]?.key ?? trophy.key))
  for (const trophy of trophies) {
    if (display.length >= trophyLimit) break
    const topic = trophy.checks?.[0]?.key ?? trophy.key
    if (topics.has(topic)) continue
    topics.add(topic)
    display.push(trophy)
  }
  return display
}

function action(label, click, attributes) {
  const button = node('button', label)
  button.type = 'button'
  for (const [key, value] of Object.entries(attributes ?? {})) button.setAttribute(key, value)
  button.addEventListener('click', click)
  return button
}

function heading(title, text) {
  const header = node('div', null, 'gallery-heading')
  header.append(node('h3', title, 'section-title'))
  if (text) header.append(node('p', text, 'room-note'))
  return header
}

function image(source, width, height, className) {
  const img = node('img', null, className)
  img.src = source
  img.width = width
  img.height = height
  img.alt = ''
  img.decoding = 'async'
  return img
}

function ornament(kind) {
  const img = image(artRoot + kind + '.webp', 176, 164, 'lodge-ornament')
  img.loading = 'lazy'
  return img
}

function displayShelf(entries, open, label) {
  const shelf = node('section', null, 'lodge-shelf')
  shelf.setAttribute('aria-label', label)
  for (const entry of entries) {
    const item = action('', () => open(entry))
    const art = entry.species
      ? image(wildlifePortrait(fieldSpecies[entry.species], true), 100, 70, 'lodge-ornament field-illustration')
      : ornament(entry.art)
    item.append(art, node('strong', entry.name), node('small', entry.badge ?? 'Lodge addition'))
    shelf.append(item)
  }
  return shelf
}

function upgradeList(progress) {
  const details = node('details', null, 'career-ledger')
  details.append(node('summary', 'Lodge additions · ' + progress.upgrades.length + ' of ' + lodgeUpgrades.length))
  const earned = new Set(progress.upgrades.map(upgrade => upgrade.id))
  const list = node('ul', null, 'career-requirements lodge-upgrades')
  for (const up of lodgeUpgrades) {
    const unlocked = earned.has(up.id)
    const row = node('li')
    row.id = 'addition-' + up.id
    row.dataset.met = String(unlocked)
    row.append(node('strong', up.name), node('small', (unlocked ? 'Earned · ' : '') + lodgeRequirements(up)))
    list.append(row)
  }
  details.append(list)
  return details
}

function tribute(player) {
  const earned = Boolean(player.progression.boyd) && !player.progression.paused
  const plaque = node('section', null, 'lodge-tribute')
  plaque.setAttribute('aria-label', 'Master Hunter tribute')
  plaque.dataset.qualified = String(earned)
  if (earned) {
    const portrait = image(prestigeKit[0], 768, 960, 'tribute-portrait')
    portrait.alt = 'Boyd, the yellow Labrador, wearing his signature collar'
    portrait.loading = 'lazy'
    plaque.append(portrait)
  }
  const inscription = node('div', null, 'tribute-inscription')
  if (earned) inscription.append(image(prestigeKit[1], 52, 52))
  inscription.append(node('p', earned ? 'QUALIFIED' : 'RESERVED', 'lodge-kicker'),
    node('h4', 'Boyd · Master Hunter'),
    node('p', earned ? player.nickname + ' · Earned ' + date(player.progression.boyd)
      : 'This tribute opens when the full Master Hunter checklist is complete.'))
  if (earned) inscription.append(node('small', 'Signature collar · Master Hunter vest · Master Hunter bandana'))
  plaque.append(inscription)
  const requirements = node('details', null, 'career-ledger tribute-requirements')
  requirements.append(node('summary', 'Master Hunter requirements'), qualificationCard(player))
  return [plaque, requirements]
}

function overview(player, { navigate }) {
  const standing = careerStanding(player.career)
  const progress = lodgeProgress(player, standing)
  const tier = progress.tier
  const next = lodgeTiers.find(candidate => candidate.level > standing.level)
  const room = node('section', null, 'lodge-interior lodge-' + tier.id)
  room.dataset.tier = tier.id
  const intro = node('div', null, 'lodge-tier-title')
  const rank = standing.level === 100 && !player.progression.boyd ? 'Level 100' : standing.rank.name + ' · Level ' + standing.level
  intro.append(node('p', 'TIER ' + tier.numeral + '  /  ' + rank, 'lodge-kicker'), node('h3', tier.name))
  const frame = image(artRoot + 'tier-' + (lodgeTiers.indexOf(tier) + 1) + '.webp', 720, 440, 'lodge-interior-art')
  frame.alt = tier.description
  const note = node('p', next ? next.name + ' opens at Level ' + next.level : 'The lodge is fully built. The collection still grows.', 'room-note')
  room.append(intro, frame, note)
  const additions = upgradeList(progress)
  const display = []
  for (const up of progress.upgrades.toReversed()) {
    if (!display.some(entry => entry.art === up.art)) display.push(up)
    if (display.length === 3) break
  }
  if (display.length) room.append(displayShelf(display, entry => {
    additions.open = true
    additions.querySelector('#addition-' + entry.id)?.scrollIntoView({ block: 'center' })
  }, 'Earned Lodge additions'))
  const [master, requirements] = tribute(player)
  const shortcuts = node('div', null, 'lodge-shortcuts')
  shortcuts.append(action('Your retriever', () => navigate('kennel')), action('Master Hunter', () => {
    master.scrollIntoView({ block: 'start' })
    requirements.querySelector('summary').focus({ preventScroll: true })
  }))
  room.append(shortcuts)
  const trophies = earnedTrophies(player)
  const pins = player.lodgeDisplay.pins.flatMap(key => trophies.filter(item => item.key === key))
  const fallback = trophies.filter(item => item.category !== 'hall').sort(awardOrder)
  const chosen = curated(fallback, pins)
  const shelf = node('section', null, 'lodge-display-room')
  shelf.append(heading('On display', pins.length ? 'Your pinned trophies take the front shelf.' :
    chosen.length ? 'Pin an earned trophy to put it here.' : 'The first shelf is ready for a field discovery or earned Honor.'))
  if (chosen.length) shelf.append(displayShelf(chosen, entry => navigate('collection', entry.key), 'Trophy shelf'))
  shelf.append(action('Open the trophy room', () => navigate('collection')))
  return [room, additions, shelf, master, requirements]
}

function trophyRoom(player, { lodge, target, navigate }) {
  const trophies = earnedTrophies(player).sort(awardOrder)
  const room = node('section', null, 'lodge-display-room')
  const significant = trophies.filter(item => item.category === 'legend' || item.badge === 'Platinum' ||
    (item.category === 'honors' && item.badge === 'Gold' && item.date))
  const gallery = heading('Trophy room', number(trophies.length) + ' earned displays')
  if (significant.length && !target) gallery.append(displayShelf(curated(significant),
    item => jumpTo(item.key), 'Recent or distinguished trophies'))
  const filters = node('div', null, 'board-filters')
  const categories = node('select')
  categories.setAttribute('aria-label', 'Trophy category')
  for (const [key, label] of Object.entries({ all: 'All trophies', pinned: 'Pinned shelf', ...categoryNames })) {
    const option = node('option', label)
    option.value = key
    categories.append(option)
  }
  const search = collectionSearch('Search trophies')
  const rarity = collectionSelect('Trophy rarity', { all: 'All tiers', Bronze: 'Bronze', Silver: 'Silver', Gold: 'Gold', Platinum: 'Platinum' })
  const sort = collectionSelect('Order trophies', { recent: 'Newest first', name: 'Name', tier: 'Highest tier first' })
  const tools = node('div', null, 'collection-tools')
  filters.append(categories, rarity, sort, action('Full Field Honors', () => navigate('trophies')))
  tools.append(search, filters)
  const status = node('p', null, 'room-note')
  status.setAttribute('role', 'status')
  const list = node('div', null, 'lodge-trophy-list')
  const paging = node('div', null, 'lodge-paging')
  const range = node('span', null, 'room-note')
  const previous = action('Previous', () => { page--; render(true) })
  const next = action('Next', () => { page++; render(true) })
  paging.append(previous, range, next)
  let page = 0
  let highlight
  const pageSize = 10
  const ownedDisplay = () => lodge.players().find(item => item.id === player.id).lodgeDisplay.pins
  function pool() {
    const choices = trophies.filter(item => (categories.value === 'all' ||
      (categories.value === 'pinned' ? ownedDisplay().includes(item.key) : item.category === categories.value)) &&
      (rarity.value === 'all' || item.badge === rarity.value) && matchesCollection(search.value, item.name, item.badge))
    if (sort.value === 'name') choices.sort((a, b) => a.name.localeCompare(b.name))
    if (sort.value === 'tier') choices.sort((a, b) => (medals[b.badge] ?? 0) - (medals[a.badge] ?? 0))
    return choices
  }
  function render(scroll = false) {
    const choices = pool()
    page = Math.min(page, Math.max(0, Math.ceil(choices.length / pageSize) - 1))
    const pins = ownedDisplay()
    const start = page * pageSize
    list.replaceChildren(...choices.slice(start, start + pageSize).map(item => {
      const detail = node('details', null, 'lodge-trophy')
      detail.dataset.trophy = item.key
      detail.open = highlight === item.key
      const summary = node('summary')
      const title = node('span')
      title.append(node('strong', item.name), node('small', item.badge + (pins.includes(item.key) ? ' · Pinned' : '')))
      summary.append(item.species ? image(wildlifePortrait(fieldSpecies[item.species], true),100,70) : ornament(item.art), title)
      const about = node('div', null, 'trophy-detail')
      if (item.description) about.append(node('p', item.description))
      if (item.checks?.length) {
        const criteria = node('ul')
        item.checks.forEach(check => criteria.append(node('li', checkLabel(check))))
        about.append(criteria)
      }
      if (item.date) about.append(node('p', 'Recorded ' + date(item.date)))
      if (!lodge.practice) about.append(action(pins.includes(item.key) ? 'Unpin trophy' : 'Pin trophy', () => {
        const changed = lodge.toggleTrophy(player.id, item.key)
        status.textContent = changed ? (pins.includes(item.key) ? 'Trophy unpinned.' : 'Trophy pinned to your shelf.')
          : pins.length >= trophyLimit ? 'Unpin a trophy to make room for another.' : 'Unable to save that display.'
        if (changed) {
          highlight = item.key
          render()
          Array.from(list.children).find(card => card.dataset.trophy === item.key)?.querySelector('button')?.focus({ preventScroll: true })
        }
      }))
      detail.append(summary, about)
      return detail
    }))
    if (!choices.length) list.append(node('p', 'No earned trophies in this view.', 'room-note'))
    range.textContent = choices.length ? (start + 1) + '–' + Math.min(choices.length, start + pageSize) + ' of ' + choices.length : '0 trophies'
    previous.disabled = !page
    next.disabled = start + pageSize >= choices.length
    paging.hidden = choices.length <= pageSize
    if (scroll) paging.scrollIntoView({ block: 'start' })
  }
  function jumpTo(key) {
    categories.value = rarity.value = 'all'
    sort.value = 'recent'
    search.value = ''
    page = Math.max(0, Math.floor(trophies.findIndex(item => item.key === key) / pageSize))
    highlight = key
    render()
    requestAnimationFrame(() => [...list.children].find(card => card.dataset.trophy === key)?.scrollIntoView({ block: 'start' }))
  }
  const resetPage = () => { page = 0; highlight = undefined; render() }
  for (const filter of [categories, rarity, sort]) filter.addEventListener('change', resetPage)
  search.addEventListener('input', resetPage)
  room.append(gallery, tools, status, paging, list)
  if (target) jumpTo(target)
  else render()
  return [room]
}

function migration(player, lodge, navigate) {
  const completed = completeMigrations(player)
  const summary = number(player.migration.farthest) + ' of ' + expeditionRegions.length + ' reached · ' + number(completed) +
    ' complete migration' + (completed === 1 ? '' : 's')
  const panel = node('section', null, 'lodge-map-room')
  const chart = migrationMap()
  const controls = node('div', null, 'lodge-map-controls')
  const stops = node('select')
  stops.setAttribute('aria-label', 'Migration territory')
  for (const region of expeditionRegions) stops.append(node('option', (region.index + 1) + ' · ' + region.name))
  const previous = action('←', () => move(stops.selectedIndex - 1), { 'aria-label': 'Previous territory' })
  const next = action('→', () => move(stops.selectedIndex + 1), { 'aria-label': 'Next territory' })
  controls.append(previous, stops, next)
  const detail = node('article', null, 'career-ledger migration-details')
  const records = lodge.personalEntries(player.id).filter(run => run.course === courseRuleset)
  function move(index) {
    stops.selectedIndex = index
    const stop = migrationStop(player,index)
    const { region } = stop
    const status = stop.traversed ? 'Traversed' : stop.reached ? 'Reached' : 'Unreached'
    detail.dataset.region = region.key
    detail.dataset.status = status.toLowerCase()
    chart.draw(player, index)
    previous.disabled = index === 0
    next.disabled = index === expeditionRegions.length - 1
    const regionRecords = records.filter(run => run.territoryKey === region.key)
    const best = key => regionRecords.length ? Math.max(...regionRecords.map(run => run[key])) : null
    const stats = node('dl', null, 'field-list')
    stats.append(...rows([
      ['Wildlife collection', stop.observed.length + ' of ' + stop.capacity + ' observed'],
      ['Active time here', stop.seconds ? duration(stop.seconds) : '—'],
      ['Tracked distance here', stop.metres ? meters(stop.metres) : '—'],
      ['Best retained finishing score', best('score') === null ? '—' : number(best('score'))],
      ['Farthest retained finish', best('distance') === null ? '—' : meters(best('distance'))],
      ['Regional Honors', number(stop.honors.length)],
    ]))
    detail.replaceChildren(node('p', status, 'lodge-kicker'), node('h4', region.name), stats)
    if (stop.reached) detail.append(action('View regional trophy', () => navigate('collection','region:' + region.key)))
    if (stop.observed.length || stop.honors.length) {
      const memories = node('details')
      memories.append(node('summary', 'Field notes & Honors'))
      if (stop.observed.length) memories.append(node('p', stop.observed.map(species => species.name).join(' · ')))
      if (stop.honors.length) {
        const list = node('ul')
        for (const honor of stop.honors) list.append(node('li', honor.name))
        memories.append(list)
      }
      detail.append(memories)
    }
  }
  panel.append(heading('Great Migration', summary), chart.canvas, controls, detail)
  stops.addEventListener('change', () => move(stops.selectedIndex))
  move(Math.max(0,player.migration.farthest - 1))
  return [panel]
}

function equipment(player, navigate) {
  const gear = displayEquipment(player)
  const room = node('section', null, 'lodge-display-room equipment-room')
  room.append(heading('Equipment room', gear.owned + ' of ' + gear.total + ' wardrobe options available'),
    action('Open the Kennel', () => navigate('kennel')))
  const tracks = node('progress')
  tracks.max = gear.total
  tracks.value = gear.owned
  tracks.setAttribute('aria-label','Wardrobe options owned')
  room.append(tracks)
  const rack = items => {
    const list = node('ul', null, 'gear-rack')
    for (const item of items) {
      const piece = node('li')
      piece.dataset.item = item.id
      const swatch = node('span',null,'gear-swatch')
      swatch.style.setProperty('--gear-color', '#' + (item.color ?? 0x485845).toString(16).padStart(6,'0'))
      piece.append(swatch,node('strong',item.name),node('small',item.rarity))
      list.append(piece)
    }
    return list
  }
  const racks = [
    ...gear.outfits.map(({ breed, items }) => [breed === 'boyd' ? 'Boyd’s saved outfit' : 'Labrador’s saved outfit', items]),
    ['Favorite gear', gear.favorites], ['Recently earned', gear.recent], ['Rare and signature pieces', gear.distinguished],
  ]
  for (const [title, items] of racks) {
    const section = node('section', null, 'career-ledger')
    section.append(node('h4', title), items.length ? rack(items) : node('p',
      title === 'Recently earned' ? 'New gear earned from this release will appear here.' : 'This shelf is open.', 'room-note'))
    room.append(section)
  }
  return [room]
}

function hall(player, navigate) {
  const room = node('section', null, 'lodge-display-room lodge-hall')
  const earned = earnedTrophies(player).filter(item => item.category === 'hall').sort(awardOrder)
  room.append(heading('Hall of Shame', earned.length ? number(earned.length) + ' questionable decisions commemorated' :
    'The wall is still clean. The marsh is patient.'))
  if (earned.length) {
    room.append(displayShelf(earned.slice(0,3), item => navigate('collection',item.key), 'Hall of Shame displays'))
    const counts = node('dl', null, 'field-list')
    counts.append(...rows(causes.filter(key => player.stats.deathsBy[key])
      .map(key => [causeNames[key] + ' setbacks', number(player.stats.deathsBy[key])])))
    room.append(counts)
  }
  room.append(action('Find the Hall of Shame Honors', () => navigate('trophies', 'Hall of Shame')))
  return [room]
}

function recordPanels(player, lodge) {
  const { profile, records, stats, migration: route } = player
  const section = node('div', null, 'record-grid')
  section.append(...cards([
    ['Highest hunt score', profile.best ? number(profile.best) : '—'], ['Greatest distance', profile.farthest ? meters(profile.farthest) : '—'],
    ['Longest hunt', records.duration ? duration(records.duration) : '—'], ['Most retrieves in a hunt', records.retrieves ? number(records.retrieves) : '—'],
    ['Best treat streak', profile.streak ? number(profile.streak) : '—'], ['Longest verified clear chain', player.progression.best.chain || '—'],
    ['Lifetime distance', meters(stats.distance)], ['Lifetime retrieves', number(profile.retrieves)], ['Completed hunts', number(stats.runs)],
    ['Active hunt time', duration(stats.playtime)], ['Farthest territory', expeditionRegions[route.farthest - 1]?.name ?? '—'],
    ['Complete migrations', number(completeMigrations(player))],
  ]))
  const all = lodge.personalEntries(player.id)
  const grouped = [[courseRuleset, 'Current Great Migration'], [legacyMigrationRuleset, 'Earlier Great Migration'], ['legacy-10', 'Original route']]
  const books = node('section', null, 'lodge-record-books')
  for (const [course, title] of grouped) {
    const selected = all.filter(entry => (entry.course ?? 'legacy-10') === course).sort((a,b) => b.score-a.score || a.id-b.id)
    if (!selected.length) continue
    const book = node('details', null, 'career-ledger')
    book.append(node('summary', title + ' · retained records'))
    const values = node('dl', null, 'field-list')
    values.append(...rows(selected.slice(0,3).map((entry,index) => [
      index ? date(entry.date) : 'Best · ' + date(entry.date), number(entry.score) + ' pts · ' + meters(entry.distance),
    ])))
    book.append(values)
    books.append(book)
  }
  return [heading('Personal records','Career totals include earlier versions. Retained competitive results are grouped by ruleset.'),section,books]
}

export function showLodgeRoom(room, player, context) {
  if (room === 'overview') return overview(player, context)
  if (room === 'collection') return trophyRoom(player, context)
  if (room === 'migration') return migration(player, context.lodge, context.navigate)
  if (room === 'equipment') return equipment(player, context.navigate)
  if (room === 'shame') return hall(player, context.navigate)
  return recordPanels(player, context.lodge)
}
