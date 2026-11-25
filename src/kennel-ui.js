import { careerStanding } from './career.js'
import { gearRequirement, kennelCatalog, kennelItems, ownedGear, unlocked } from './kennel-catalog.js'
import { gearRarity } from './collection-gear.js'
import { node } from './lodge-elements.js'
import { masterHunter } from './master-hunter.js'
import { qualificationCard } from './career-ui.js'

const categories = { collar: 'Collars', bandana: 'Bandanas', vest: 'Hunting vests', coat: 'Coats' }
const slot = category => category === 'bandana' ? 'collar' : category

export function kennelRoom(lodge, showAppearance, inspectDogs, changeDog) {
  const player = lodge.current()
  const standing = careerStanding(player.career)
  const stage = node('div', null, 'kennel-stage')
  stage.setAttribute('aria-label', 'Labrador equipment preview')
  stage.tabIndex = 0

  const filters = node('div', null, 'board-filters')
  filters.setAttribute('role', 'group')
  filters.setAttribute('aria-label', 'Equipment category')
  const options = node('div', null, 'kennel-items')
  options.setAttribute('role', 'group')
  options.setAttribute('aria-label', 'Equipment options')

  const description = node('p', null, 'kennel-preview-status')
  description.setAttribute('role', 'status')
  const fitting = node('div', null, 'kennel-fitting')
  const count = node('p', ownedGear(player, standing).length + ' of ' + kennelItems.length + ' options available', 'room-note')
  const view = node('div', null, 'board-filters')
  const ownership = node('select')
  ownership.setAttribute('aria-label', 'Equipment ownership filter')
  for (const label of ['All equipment', 'Owned', 'Locked', 'Favorites']) ownership.append(node('option', label))
  const order = node('select')
  order.setAttribute('aria-label', 'Sort equipment')
  for (const label of ['Field order', 'Rarity', 'Name']) order.append(node('option', label))
  view.append(ownership, order)
  fitting.append(stage, description, count, filters, view)

  const feedback = node('div', null, 'kennel-selection')
  const equip = node('button', 'Equip')
  const peek = node('button', 'View preview')
  const reset = node('button', 'Reset to Classic')
  const favorite = node('button', 'Favorite')
  equip.type = peek.type = reset.type = favorite.type = 'button'
  feedback.append(equip, peek, favorite, reset)
  let category = 'collar'
  let selected = player.kennel.equipment[category]
  let cards = []

  const available = item => unlocked(item, standing, player.kennel, player.progression)
  const equipped = () => player.kennel.equipment[slot(category)]
  function update() {
    for (const { item, button, label } of cards) {
      button.setAttribute('aria-pressed', String(selected === item.id))
      label.textContent = (item.rarity ?? 'Uncommon') + ' · ' + (equipped() === item.id ? 'Equipped'
        : available(item) ? 'Owned' : gearRequirement(item))
    }
    const item = kennelCatalog[slot(category)].find(item => item.id === selected)
    const wearing = equipped() === selected
    const customCoat = category === 'coat' && player.kennel.breed === 'boyd'
    description.textContent = customCoat ? 'Boyd wears his signature coat.' : item ? (wearing ? 'Wearing ' : 'Previewing ') + item.name : 'Browse equipment'
    equip.textContent = customCoat ? 'Available on Labrador' : wearing ? 'Equipped' : item && available(item) ? 'Equip' : 'Locked'
    equip.disabled = customCoat || wearing || !available(item)
    favorite.disabled = !item
    favorite.setAttribute('aria-pressed', String(player.kennel.favorites.includes(selected)))
    if (item && !customCoat && (!item.breed || player.kennel.breed === item.breed))
      showAppearance({ ...player.kennel.equipment, [slot(category)]: selected })
  }

  function switchCategory(value) {
    category = value
    selected = equipped()
    for (const button of filters.children) button.setAttribute('aria-pressed', String(button.dataset.category === value))
    const items = kennelCatalog[slot(category)].filter(item => {
      if (slot(category) === 'collar' && Boolean(item.bandana) !== (category === 'bandana')) return false
      if (ownership.value === 'Owned') return available(item)
      if (ownership.value === 'Locked') return !available(item)
      return ownership.value !== 'Favorites' || player.kennel.favorites.includes(item.id)
    })
    if (order.value === 'Name') items.sort((a, b) => a.name.localeCompare(b.name))
    if (order.value === 'Rarity') items.sort((a, b) => gearRarity.indexOf(b.rarity) - gearRarity.indexOf(a.rarity))
    if (!items.some(item => item.id === selected)) selected = items[0]?.id
    cards = items.map(item => {
        const button = node('button', null, 'gear-option')
        button.type = 'button'
        button.dataset.gear = item.id
        const swatch = node('span', null, 'gear-swatch')
        const color = item.id === 'classic-yellow' ? 0xc49354 : item.color
        swatch.style.setProperty('--gear-color', color === null ? 'transparent' : '#' + color.toString(16).padStart(6, '0'))
        const label = node('small')
        button.append(swatch, node('strong', item.name), label)
        button.addEventListener('click', () => {
          selected = item.id
          update()
        })
        return { item, button, label }
      })
    options.replaceChildren(...(cards.length ? cards.map(card => card.button) : [node('p', 'No equipment in this view.', 'room-note')]))
    update()
  }

  for (const [id, label] of Object.entries(categories)) {
    const button = node('button', label)
    button.type = 'button'
    button.dataset.category = id
    button.addEventListener('click', () => switchCategory(id))
    filters.append(button)
  }
  ownership.addEventListener('change', () => switchCategory(category))
  order.addEventListener('change', () => switchCategory(category))
  equip.addEventListener('click', () => { if (lodge.equip(slot(category), selected)) update() })
  favorite.addEventListener('click', () => {
    lodge.favorite(selected)
    if (ownership.value === 'Favorites') switchCategory(category)
    else update()
  })
  peek.addEventListener('click', () => {
    stage.scrollIntoView({ block: 'start' })
    stage.focus({ preventScroll: true })
  })
  reset.addEventListener('click', () => {
    lodge.resetGear()
    showAppearance(player.kennel.equipment)
    switchCategory(category)
  })
  switchCategory(category)
  const breeds = node('details', null, 'kennel-breeds')
  const portrait = node('img')
  portrait.src = './branding/boyd-portrait.webp'
  portrait.alt = 'Boyd, a pale yellow Labrador wearing his signature collar'
  portrait.width = 768
  portrait.height = 960
  portrait.loading = 'lazy'
  const emblem = node('img', null, 'master-hunter-emblem')
  emblem.src = './branding/master-hunter.png'
  emblem.alt = ''
  emblem.width = emblem.height = 48
  emblem.loading = 'lazy'
  const master = node('article', null, 'kennel-master-hunter')
  const details = node('div')
  const qualified = Boolean(player.progression.boyd)
  details.append(emblem, node('h3', masterHunter.name + ' · ' + masterHunter.title),
    node('p', qualified ? 'Master Hunter kit earned' : 'Locked · Level 100 and Master Hunter qualification'))
  if (qualified && !inspectDogs) {
    const dog = node('button', player.kennel.breed === 'boyd' ? 'Use Labrador' : 'Equip Boyd')
    dog.type = 'button'
    dog.addEventListener('click', () => changeDog(player.kennel.breed === 'boyd' ? 'lab' : 'boyd'))
    details.append(dog)
  }
  master.append(portrait, details)
  breeds.append(node('summary', 'Working dogs'), node('p', 'Labrador Retriever'),
    node('p', 'German Shorthaired Pointer · Career unlock pending'), master)
  const checklist = node('details', null, 'career-ledger')
  checklist.append(node('summary', 'Master Hunter requirements'), qualificationCard(player))
  breeds.append(checklist)
  if (inspectDogs) {
    const chooser = node('nav', null, 'kennel-inspection')
    chooser.setAttribute('aria-label', 'Development dog inspection')
    for (const [breed, label, kit] of [
      ['lab', 'Labrador'], ['pointer', 'Pointer'], ['boyd', 'Boyd + vest'],
      ['boyd', 'Signature collar', 'signature'], ['boyd', 'Master Hunter bandana', 'bandana'],
    ]) {
      const link = node('a', label)
      const url = new URL(location.href)
      url.searchParams.set('breed', breed)
      url.searchParams.set('inspect', 'kennel')
      if (kit) url.searchParams.set('kit', kit)
      else url.searchParams.delete('kit')
      link.href = url.href
      link.addEventListener('click', event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        // Switch the full inspection document so a second renderer, mixer,
        // texture or skeleton never remains owned by this preview document.
        location.replace(link.href)
      })
      chooser.append(link)
    }
    breeds.append(chooser)
  }
  return { content: [fitting, options, feedback, breeds], stage }
}
