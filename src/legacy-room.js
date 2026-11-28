import { shareFrom } from './share-entry.js'
import { careerStanding, xpAt } from './career.js'
import { dogDisplayName } from './dog-name.js'
import { expeditionRegions } from './expedition.js'
import { checkLabel } from './field-honors.js'
import { date, node, number } from './lodge-elements.js'
import { migrationMap } from './lodge-map.js'
import { availableFinish, completeMigrations, earnedTrophies, lodgeFinishes, lodgeProgress, lodgeRequirements, lodgeTiers,
  migrationStop, trophyFor, trophyLimit } from './lodge-progress.js'
import { fieldSpecies } from './wildlife-catalog.js'
import { wildlifePortrait } from './wildlife-portrait.js'
import './legacy-room.css'

const galleryPriority = { legend: 0, discovery: 1, retrieves: 2, wildlife: 3, career: 4, regional: 5, honors: 6 }

export function exhibitButton(label, click, style) {
  const button = node('button', label, style)
  button.type = 'button'
  button.addEventListener('click', click)
  return button
}

function photo(path, width, height, alt = '') {
  const img = node('img')
  img.src = path
  img.width = width
  img.height = height
  img.alt = alt
  img.decoding = 'async'
  return img
}

export function exhibitImage(item) {
  const mat = node('span', null, 'exhibit-art')
  mat.dataset.art = item.species ? 'field-photograph' : item.art
  mat.dataset.grade = item.badge ?? ''
  const source = item.species ? wildlifePortrait(fieldSpecies[item.species], true)
    : './lodge/' + (item.art === 'migration' ? 'map' : item.art) + '.webp'
  const image = photo(source, 176, 164)
  image.loading = 'lazy'
  mat.append(image)
  return mat
}

export function exhibitCaption(item) {
  const body = node('div', null, 'exhibit-caption')
  const description = item.description
  if (description) body.append(node('p', description))
  if (item.territory) body.append(node('p', expeditionRegions.find(region => region.key === item.territory)?.name, 'legacy-muted'))
  if (item.checks?.length) {
    const list = node('ul')
    for (const check of item.checks) list.append(node('li', checkLabel(check)))
    body.append(list)
  }
  if (item.date) {
    const time = node('time', date(item.date), 'legacy-muted')
    time.dateTime = item.date
    body.append(time)
  }
  return body
}

export function chooseExhibits(player, selected = player.lodgeDisplay.pins) {
  const pins = selected.map(key => trophyFor(player,key)).filter(Boolean)
  const automatic = earnedTrophies(player).filter(item => item.category !== 'hall' && !pins.some(pin => pin.key === item.key))
    .sort((left,right) => galleryPriority[left.category] - galleryPriority[right.category] ||
      (Date.parse(right.date) || 0) - (Date.parse(left.date) || 0) || left.name.localeCompare(right.name))
  const shelves = pins.slice()
  const families = new Set(pins.map(item => item.art))
  for (const item of automatic) {
    if (shelves.length >= trophyLimit) break
    if (families.has(item.art)) continue
    families.add(item.art)
    shelves.push(item)
  }
  return shelves
}

export function legacyInterior(player, context) {
  const { lodge, navigate, hunt, preview } = context
  const standing = careerStanding(player.career)
  const progress = lodgeProgress(player,standing)
  const scene = node('section', null, 'legacy-cabin lodge-interior')
  const tier = progress.tier
  const tierIndex = lodgeTiers.indexOf(tier)
  const qualified = Boolean(player.progression.boyd) && !player.progression.paused
  scene.dataset.tier = tier.id
  const displayedName = qualified ? 'Master Hunter’s Lodge' : tier.name
  scene.dataset.finish = player.lodgeDisplay.finish ?? lodgeFinishes[tierIndex].id
  const title = node('div', null, 'legacy-cabin-title')
  title.append(node('div', 'Tier ' + tier.numeral + ' · Level ' + standing.level, 'legacy-eyebrow'), node('h3', displayedName))
  if (preview) title.append(node('span', 'Art Studio · simulated career', 'legacy-preview-label'))
  const room = node('div', null, 'legacy-interior')
  const backdrop = photo('./lodge/interior-' + (tierIndex + 1) + '.webp', 960, 1120, tier.description)
  backdrop.fetchPriority = 'high'
  backdrop.className = 'legacy-interior-art'
  const dog = dogDisplayName(player.kennel)
  const bed = exhibitButton(dog, () => navigate('kennel'), 'legacy-dog-tag')
  bed.setAttribute('aria-label', dog + ' · open Kennel')
  const crossing = completeMigrations(player)
  const chartButton = exhibitButton(crossing ? 'Flyway completed' : 'Migration map',
    () => navigate('migration'), 'legacy-wall-chart')
  chartButton.dataset.complete = String(Boolean(crossing))
  const chart = migrationMap(.5)
  chart.draw(player,Math.max(0,player.migration.farthest - 1))
  chartButton.prepend(chart.canvas)
  room.append(backdrop, title, chartButton, bed)
  if (qualified) {
    const portrait = exhibitButton('', () => inspect({
      name:'Boyd · Master Hunter', art:'boyd', badge:'Master Hunter tribute', date:player.progression.boyd,
      description:'Boyd’s portrait and signature collar commemorate the highest field qualification.',
    }, portrait), 'legacy-boyd-frame')
    portrait.append(photo('./branding/boyd-portrait.webp',768,960,'Inspect the Boyd tribute'))
    room.append(portrait)
  }
  const shelf = node('div', null, 'legacy-mantel')
  shelf.dataset.tier = tier.id
  shelf.setAttribute('role','region')
  shelf.setAttribute('aria-label','Earned displays')
  const caption = node('section', null, 'legacy-inspection')
  const furnishing = progress.upgrades.slice().reverse().find(entry => ['equipment','journal','map','decoy','observation'].includes(entry.art))
  if (furnishing) {
    const artwork = exhibitButton('', () => inspect({ name:furnishing.name, badge:'Earned furnishing',
      art:furnishing.art, description:lodgeRequirements(furnishing) }, artwork), 'legacy-furnishing')
    artwork.setAttribute('aria-label','Inspect ' + furnishing.name)
    artwork.append(exhibitImage(furnishing))
    room.append(artwork)
  }
  caption.hidden = true
  caption.setAttribute('aria-label','Display inspection')
  const transport = node('div', null, 'legacy-return')
  transport.append(exhibitButton('Hunt', hunt, 'legacy-hunt'),
    exhibitButton('Trophy room',() => navigate('collection')),
    exhibitButton('Share Lodge',event => shareFrom(event.currentTarget, () => ({
      kind:'lodge', title:displayedName, name:preview ? undefined : context.publicNickname,
      image:backdrop.getAttribute('src'),
      exhibits:chooseExhibits(player).map(item => ({ title:item.name, image:'./lodge/' +
        (item.species ? 'observation' : item.art === 'migration' ? 'map' : item.art) + '.webp' })),
      notes:[lodgeFinishes.find(item => item.id === scene.dataset.finish)?.name ?? tier.name,
        [qualified ? 'Boyd tribute' : '', furnishing?.name, crossing ? 'Great Migration completed' : ''].filter(Boolean).join(' · ')],
      footer:preview ? 'ART STUDIO · SIMULATED LODGE' : 'EARNED LODGE · TIER ' + tier.numeral,
    }))))
  function inspect(item, trigger) {
    const header = node('h4', item.name)
    const close = exhibitButton('Close', () => {
      caption.hidden = true
      trigger.focus({ preventScroll:true })
      shelf.querySelector('[aria-pressed="true"]')?.setAttribute('aria-pressed','false')
    })
    const headerBar = node('div', null, 'legacy-inspection-heading')
    headerBar.append(node('p',item.badge,'legacy-eyebrow'), close, header)
    const content = exhibitCaption(item)
    if (item.key) content.append(exhibitButton('Manage display', () => navigate('collection',item.key)))
    if (item.art === 'boyd') {
      const kit = node('figure', null, 'legacy-tribute-detail')
      kit.append(photo('./branding/boyd-portrait.webp',768,960,'Boyd in his signature collar'),
        photo('./branding/master-hunter.png',128,128,'Master Hunter insignia'))
      content.prepend(kit)
    }
    caption.replaceChildren(headerBar,content)
    caption.hidden = false
    header.tabIndex = -1
    caption.scrollIntoView({ block:'nearest' })
    header.focus({ preventScroll:true })
  }
  for (const item of chooseExhibits(player)) {
    const button = exhibitButton('', () => {
      for (const peer of shelf.children) peer.setAttribute('aria-pressed',String(peer === button))
      inspect(item, button)
    }, 'legacy-shelf-item')
    button.setAttribute('aria-pressed','false')
    button.dataset.exhibit = item.key
    button.setAttribute('aria-label','Inspect ' + item.name)
    button.append(exhibitImage(item),node('span',item.name))
    shelf.append(button)
  }
  if (!shelf.children.length)
    shelf.append(node('p','The first shelf is ready for your field finds.','legacy-empty-shelf'))
  room.append(shelf)
  scene.append(room,caption,transport)

  const next = lodgeTiers[tierIndex + 1]
  const progressPanel = node('div', null, 'legacy-next')
  if (next) {
    const rail = node('progress')
    rail.max = xpAt(next.level) - xpAt(tier.level)
    rail.value = Math.min(rail.max,standing.xp - xpAt(tier.level))
    rail.setAttribute('aria-label','XP toward ' + next.name)
    progressPanel.append(node('p',next.name),rail,node('span','Level ' + next.level,'legacy-muted'))
  } else {
    progressPanel.append(node('p',qualified ? standing.rank.name : 'Master Hunter qualification'),
      exhibitButton(qualified ? 'Career history' : 'See requirements', () => navigate('career')))
  }

  const decor = node('details', null, 'legacy-decor')
  decor.append(node('summary','Display styling'))
  const choices = node('div', null, 'legacy-fabric-options')
  choices.setAttribute('role','group')
  choices.setAttribute('aria-label','Earned material choices')
  const status = node('p',null,'legacy-muted')
  status.setAttribute('role','status')
  for (const finish of lodgeFinishes) {
    const entitled = availableFinish(finish.id,player)
    const button = exhibitButton('', () => {
      const saved = lodge.setLodgeFinish(player.id,finish.id)
      if (saved) {
        scene.dataset.finish = finish.id
        for (const entry of choices.children) entry.setAttribute('aria-pressed',String(entry === button))
      }
      status.textContent = saved ? 'Displayed · ' + finish.name : 'This display could not be saved.'
    })
    button.dataset.fabric = finish.id
    button.disabled = !entitled || lodge.practice && !preview
    button.setAttribute('aria-pressed',String(finish.id === scene.dataset.finish))
    button.append(node('i'),node('span',finish.name),node('small', entitled ? 'Available' : 'Level ' + finish.level))
    choices.append(button)
  }
  decor.append(choices,status)
  const latest = node('section',null,'legacy-room-notes')
  if (progress.upgrades.length) {
    const additions = node('details', null, 'legacy-additions')
    additions.append(node('summary', 'Cabin additions · ' + progress.upgrades.length))
    const list = node('ul')
    for (const upgrade of progress.upgrades.toReversed()) {
      const row = node('li')
      row.append(node('strong',upgrade.name),node('span',lodgeRequirements(upgrade),'legacy-muted'))
      list.append(row)
    }
    additions.append(list)
    latest.append(additions)
  }
  latest.append(exhibitButton('Career timeline', () => navigate('history')),exhibitButton('Lifetime records', () => navigate('records')))
  return [scene,progressPanel,decor,latest]
}

export function routeWall(player, selectTerritory) {
  const total = completeMigrations(player)
  const plate = node('figure', null, 'legacy-route-wall')
  plate.dataset.complete = String(Boolean(total))
  const map = migrationMap()
  map.draw(player,Math.max(0,player.migration.farthest - 1))
  plate.append(map.canvas)
  const caption = node('figcaption')
  caption.append(node('span', total ? 'A JOURNEY COMPLETED' : 'THE LONG WAY NORTH','legacy-eyebrow'),
    node('h4', 'The Great Migration'),
    node('p', total ? number(total) + (total === 1 ? ' complete crossing' : ' complete crossings')
      : number(player.migration.farthest) + ' of 15 territories reached'))
  plate.append(caption)
  const route = node('ol',null,'legacy-route-engraving')
  for (const region of expeditionRegions) {
    const stop = migrationStop(player,region.index)
    const row = node('li')
    const stopButton = exhibitButton(region.name,() => selectTerritory(region.index))
    row.append(stopButton)
    row.dataset.reached = String(stop.reached || Boolean(total))
    route.append(row)
  }
  return { plate, route, draw: map.draw }
}
