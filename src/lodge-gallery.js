import { collectionSearch, matchesCollection } from './collection-browser.js'
import './lodge-gallery.css'
import { careerStanding } from './career.js'
import { exhibitCaption, exhibitImage, legacyInterior, routeWall } from './legacy-room.js'
import { legacyTimeline } from './legacy-history.js'
import { expeditionRegions } from './expedition.js'
import { honorById } from './field-honors.js'
import { verifiedHonorRequirements } from './ranked-camp.js'
import { causes, causeNames } from './field-stats.js'
import { duration, rows, cards, node, number, meters, date } from './lodge-elements.js'
import { completeMigrations, displayEquipment, earnedTrophies, migrationStop, trophyLimit } from './lodge-progress.js'
import { courseRuleset, legacyMigrationRuleset, localCourseRuleset } from './ruleset.js'
import { ownedGear } from './kennel-catalog.js'

const categoryOrder = { discovery: 1, legend: 0, competitive: 1, regional: 2, retrieves: 3, wildlife: 4, career: 5, honors: 6, hall: 7 }
const medals = { Platinum: 4, Gold: 3, Silver: 2, Bronze: 1 }
const occurred = trophy => trophy.date ? Date.parse(trophy.date) : 0
const awardOrder = (a, b) => occurred(b) - occurred(a) || categoryOrder[a.category] - categoryOrder[b.category] ||
  (medals[b.badge] ?? 0) - (medals[a.badge] ?? 0) || a.name.localeCompare(b.name)
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

function trophyRoom(player, { lodge, target, navigate, competitive = [] }) {
  const online = competitive.filter(id => honorById.has(id)).map(id => ({ key:'competitive:' + id,
    category:'competitive', name:honorById.get(id).name, badge:honorById.get(id).tier, art:'legend',
    description:'Worldwide Camp · ' + verifiedHonorRequirements[id] }))
  const trophies = [...earnedTrophies(player), ...online].sort(awardOrder)
  const room = node('section', null, 'legacy-gallery')
  const search = collectionSearch('Search trophies')
  const chips = node('div',null,'legacy-filter-chips')
  chips.setAttribute('role','group')
  chips.setAttribute('aria-label','Trophy category')
  const groups = {
    'All':null, 'On display':['pinned'], 'Field finds':['discovery','wildlife','retrieves','regional'],
    'Medals & milestones':['honors','career','legend','competitive'], 'Camp humor':['hall'],
  }
  const list = node('div',null,'lodge-trophy-list')
  const status = node('p',null,'room-note')
  status.setAttribute('role','status')
  const paging = node('div',null,'lodge-paging')
  const range = node('span',null,'room-note')
  const previous = action('Previous',() => { page--; render(true) })
  const next = action('Next',() => { page++; render(true) })
  paging.append(previous,range,next)
  let page = 0
  let highlight = target
  let category = 'All'
  const pageSize = 10
  const ownedDisplay = () => lodge.players().find(item => item.id === player.id)?.lodgeDisplay.pins ?? []
  function changeDisplay(item, replacement) {
    const wasPinned = ownedDisplay().includes(item.key)
    const saved = lodge.toggleTrophy(player.id,item.key,replacement ?? null)
    status.textContent = saved ? (wasPinned ? 'Automatic display restored.' : 'On your mantel.') : 'This display could not be saved.'
    if (!saved) return
    highlight = item.key
    render()
    list.querySelector('[open] summary')?.focus({preventScroll:true})
  }
  function render(scroll = false) {
    const pins = ownedDisplay()
    const choices = trophies.filter(item => (category === 'All' || category === 'On display' && pins.includes(item.key) ||
      groups[category]?.includes(item.category)) && matchesCollection(search.value,item.name,item.badge))
    page = Math.max(0,Math.min(page,Math.ceil(choices.length / pageSize)-1))
    const start = page * pageSize
    list.replaceChildren(...choices.slice(start,start+pageSize).map(item => {
      const detail = node('details',null,'lodge-trophy')
      detail.dataset.trophy = item.key
      if (item.category === 'legend' || item.badge === 'Platinum') detail.dataset.prestige = 'true'
      detail.open = highlight === item.key
      const summary = node('summary')
      const title = node('span')
      const pinned = pins.includes(item.key)
      title.append(node('strong',item.name),node('small',item.badge + (pinned ? ' · Displayed' : '')))
      summary.append(exhibitImage(item),title)
      const about = exhibitCaption(item)
      if ((!lodge.practice || lodge.preview) && item.category !== 'competitive') {
        if (pinned || pins.length < trophyLimit)
          about.append(action(pinned ? 'Unpin trophy' : 'Pin trophy',() => changeDisplay(item)))
        else {
          const choices = node('div',null,'legacy-swap')
          for (const pin of pins) {
            const old = trophies.find(entry => entry.key === pin)
            if (old) choices.append(action('Replace ' + old.name,() => changeDisplay(item,pin)))
          }
          about.append(choices)
        }
      }
      detail.append(summary,about)
      return detail
    }))
    if (!choices.length) list.append(node('p','No earned trophies in this view.','room-note'))
    range.textContent = choices.length ? (start+1)+'–'+Math.min(choices.length,start+pageSize)+' of '+choices.length : '0 trophies'
    previous.disabled = page === 0
    next.disabled = start+pageSize >= choices.length
    paging.hidden = choices.length <= pageSize
    if (scroll) paging.scrollIntoView({block:'start'})
  }
  for (const label of Object.keys(groups)) {
    const chip = action(label,() => {
      category = label
      for (const other of chips.children) other.setAttribute('aria-pressed',String(other === chip))
      page = 0
      highlight = undefined
      render()
    },{'aria-pressed':String(category === label)})
    chips.append(chip)
  }
  search.addEventListener('input',() => { page = 0; highlight = undefined; render() })
  room.append(heading('Trophy room',number(trophies.length) + ' earned displays'),
    search,chips,status,paging,list,action('Field Honors',() => navigate('trophies')))
  if (target) page = Math.floor(Math.max(0,trophies.findIndex(item => item.key === target)) / pageSize)
  render()
  if (target) requestAnimationFrame(() => list.querySelector('[open]')?.scrollIntoView({block:'start'}))
  return [room]
}

function migration(player, lodge, navigate) {
  const panel = node('section',null,'lodge-map-room')
  let selected = 0
  const wall = routeWall(player,index => move(index,true))
  const controls = node('div',null,'legacy-journey-controls')
  const previous = action('←',() => move(selected - 1),{'aria-label':'Previous territory'})
  const next = action('→',() => move(selected + 1),{'aria-label':'Next territory'})
  controls.append(previous,next)
  const detail = node('article', null, 'career-ledger migration-details')
  const records = lodge.personalEntries(player.id).filter(run => run.course === localCourseRuleset)
  function move(index, scroll = false) {
    selected = Math.min(14,Math.max(0,index))
    const stop = migrationStop(player,selected)
    const { region } = stop
    const status = stop.traversed ? 'Traversed' : stop.reached ? 'Reached' : 'Unreached'
    detail.dataset.region = region.key
    detail.dataset.status = status.toLowerCase()
    wall.draw(player,selected)
    for (const [index,row] of [...wall.route.children].entries())
      row.firstElementChild.setAttribute('aria-current',String(index === selected))
    previous.disabled = selected === 0
    next.disabled = selected === expeditionRegions.length - 1
    if (scroll) detail.scrollIntoView({block:'nearest'})
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
  panel.append(wall.plate,controls,detail,wall.route)
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

function history(player, lodge) {
  const standing = careerStanding(player.career)
  const timeline = legacyTimeline(player,standing,lodge.personalEntries(player.id))
  const room = node('section',null,'legacy-history')
  room.append(heading('Career timeline','The hunts and milestones that built this Lodge.'))
  function chapter(entries) {
    const line = node('ol',null,'legacy-timeline')
    for (const entry of entries) {
      const event = node('li')
      event.append(node('p',entry.kind,'legacy-eyebrow'),node('h4',entry.name))
      if (entry.detail != null) event.append(node('p', typeof entry.detail === 'number' ? number(entry.detail) + ' pts' : entry.detail))
      if (entry.date) {
        const time = node('time',date(entry.date))
        time.dateTime = entry.date
        event.append(time)
      }
      line.append(event)
    }
    return line
  }
  if (!timeline.dated.length && !timeline.undated.length)
    room.append(node('p', 'Your first completed hunt starts this story.','room-note'))
  if (timeline.dated.length) {
    const list = chapter(timeline.dated.slice(0,12))
    room.append(list)
    if (timeline.dated.length > 12) {
      let shown = 12
      const more = action('More milestones', () => {
        list.append(...chapter(timeline.dated.slice(shown,shown+12)).children)
        shown += 12
        more.hidden = shown >= timeline.dated.length
      })
      room.append(more)
    }
  }
  if (timeline.undated.length) {
    const archive = node('details',null,'career-ledger')
    archive.append(node('summary','Accomplishments without recorded dates'),chapter(timeline.undated))
    room.append(archive)
  }
  return [room]
}

function recordPanels(player, lodge) {
  const { profile, records, stats, migration: route } = player
  const room = node('section',null,'legacy-records')
  const section = node('div', null, 'record-grid')
  section.append(...cards([
    ['Highest hunt score', profile.best ? number(profile.best) : '—'], ['Greatest distance', profile.farthest ? meters(profile.farthest) : '—'],
    ['Longest hunt', records.duration ? duration(records.duration) : '—'], ['Most retrieves in a hunt', records.retrieves ? number(records.retrieves) : '—'],
    ['Best treat streak', profile.streak ? number(profile.streak) : '—'], ['Longest verified clear chain', player.progression.best.chain || '—'],
  ]))
  const totals = node('div',null,'record-grid')
  totals.append(...cards([
    ['Lifetime distance', meters(stats.distance)], ['Lifetime retrieves', number(profile.retrieves)], ['Completed hunts', number(stats.runs)],
    ['Active hunt time', duration(stats.playtime)], ['Farthest territory', expeditionRegions[route.farthest - 1]?.name ?? '—'],
    ['Complete migrations', number(completeMigrations(player))],
    ['Wildlife species observed',number(Object.values(player.wildlife.species).filter(row => row.seen).length)],
    ['Rare wildlife sightings',number(Object.values(player.wildlife.species).reduce((sum,row) => sum+row.rare,0))],
    ['Environmental discoveries',number(Object.keys(player.discoveries.entries).length)],
    ['Field Honors',number(Object.keys(player.progression.honors).length)],
    ['Equipment owned',number(ownedGear(player,careerStanding(player.career)).length)],
  ]))
  const all = lodge.personalEntries(player.id)
  const grouped = [[localCourseRuleset, 'Current Great Migration'], [courseRuleset, 'Phase 05 Great Migration'], [legacyMigrationRuleset, 'Earlier Great Migration'], ['legacy-10', 'Original route']]
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
  room.append(heading('Field records'),node('h4','Personal bests'),section,node('h4','Tracked career totals'),totals,books)
  return [room]
}

export function showLodgeRoom(room, player, context) {
  if (room === 'overview') return legacyInterior(player, context)
  if (room === 'history') return history(player,context.lodge)
  if (room === 'collection') return trophyRoom(player, context)
  if (room === 'migration') return migration(player, context.lodge, context.navigate)
  if (room === 'equipment') return equipment(player, context.navigate)
  if (room === 'shame') return hall(player, context.navigate)
  return recordPanels(player, context.lodge)
}
