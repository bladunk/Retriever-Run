import { careerStanding } from './career.js'
import { gearRequirement, kennelCatalog, kennelItems, ownedGear, unlocked } from './kennel-catalog.js'
import { dogDisplayName, dogNameLimit, validatedDogName } from './dog-name.js'
import { gearIllustration } from './kennel-illustration.js'
import { node } from './lodge-elements.js'
import { masterHunter } from './master-hunter.js'
import { qualificationCard } from './career-ui.js'
import { checkLabel, honorById } from './field-honors.js'

const categories = { coat: 'Coats', vest: 'Vests', collar: 'Collars', bandana: 'Bandanas' }
const slot = category => category === 'bandana' ? 'collar' : category

export function kennelRoom(lodge, showAppearance, inspectDogs, changeDog, previewId) {
  const player = lodge.current()
  const standing = careerStanding(player.career)
  const stage = node('div', null, 'kennel-stage')
  stage.setAttribute('aria-label', '3D dog preview. Use arrow keys or drag to rotate.')
  stage.tabIndex = 0

  const filters = node('div', null, 'kennel-categories')
  filters.setAttribute('role', 'group')
  filters.setAttribute('aria-label', 'Equipment category')
  const options = node('div', null, 'kennel-items')
  options.setAttribute('role', 'group')
  options.setAttribute('aria-label', 'Equipment options')

  const description = node('p', null, 'kennel-preview-status')
  description.setAttribute('role', 'status')
  const threshold = node('p', null, 'room-note')
  const fitting = node('div', null, 'kennel-fitting')
  const count = node('span', ownedGear(player, standing).length + ' / ' + kennelItems.length + ' owned', 'kennel-count')
  const view = node('div', null, 'kennel-views')
  view.setAttribute('role', 'group')
  view.setAttribute('aria-label', 'Equipment ownership filter')
  let ownership = 'All'
  for (const label of ['All', 'Owned', 'Locked', 'Favorites']) {
    const button = node('button', label)
    button.type = 'button'
    button.setAttribute('aria-pressed', String(label === ownership))
    button.addEventListener('click', () => {
      ownership = label
      for (const other of view.children) other.setAttribute('aria-pressed', String(other === button))
      switchCategory(category, selected)
    })
    view.append(button)
  }

  const heading = node('div', null, 'kennel-identity')
  const name = node('h3', dogDisplayName(player.kennel))
  heading.append(name, count)
  const angles = node('div', null, 'kennel-angles')
  angles.setAttribute('role', 'group')
  angles.setAttribute('aria-label', 'Dog presentation')
  for (const [label, yaw] of [['Front', '.27'], ['Side', '1.50'], ['Rear', '2.96']]) {
    const button = node('button', label)
    button.type = 'button'
    button.addEventListener('click', () => { stage.dataset.yaw = yaw })
    angles.append(button)
  }
  const sit = node('button', 'Sit')
  sit.type = 'button'
  sit.setAttribute('aria-pressed', 'false')
  sit.addEventListener('click', () => {
    const seated = stage.dataset.sit !== 'true'
    stage.dataset.sit = String(seated)
    sit.textContent = seated ? 'Stand' : 'Sit'
    sit.setAttribute('aria-pressed', String(seated))
  })
  angles.append(sit)

  const feedback = node('div', null, 'kennel-selection')
  const equip = node('button', 'Equip', 'kennel-equip')
  const peek = node('button', 'View preview')
  const reset = node('button', 'Reset to Classic')
  const favorite = node('button', 'Save favorite')
  equip.type = peek.type = reset.type = favorite.type = 'button'
  feedback.append(equip, peek, favorite)
  fitting.append(heading, stage, angles, description, threshold, feedback, filters, view)

  let category = 'vest'
  let selected = player.kennel.equipment[category]
  let cards = []

  const available = item => unlocked(item, standing, player.kennel, player.progression)
  const equipped = () => player.kennel.equipment[slot(category)]
  function update() {
    for (const { item, button, label } of cards) {
      button.setAttribute('aria-pressed', String(selected === item.id))
      label.textContent = equipped() === item.id ? 'Equipped' : available(item) ? 'Owned' : 'Locked'
    }
    const item = kennelCatalog[slot(category)].find(item => item.id === selected)
    const wearing = equipped() === selected
    const customCoat = category === 'coat' && player.kennel.breed === 'boyd'
    description.textContent = customCoat ? 'Boyd wears his signature coat.' : item ? (wearing ? 'Wearing ' : 'Previewing ') + item.name : 'Browse equipment'
    const honor = honorById.get(item?.honor)
    threshold.hidden = !item || available(item) || customCoat
    threshold.textContent = threshold.hidden ? '' : [gearRequirement(item), ...(honor?.checks.map(checkLabel) ?? [])].join(' · ')
    equip.textContent = customCoat ? 'Available on Labrador' : wearing ? 'Equipped' : item && available(item) ? 'Equip' : 'Locked'
    equip.disabled = customCoat || wearing || !available(item)
    favorite.disabled = !item
    const saved = player.kennel.favorites.includes(selected)
    favorite.setAttribute('aria-pressed', String(saved))
    favorite.textContent = saved ? 'Favorited' : 'Save favorite'
    if (item && !customCoat && (!item.breed || player.kennel.breed === item.breed))
      showAppearance({ ...player.kennel.equipment, [slot(category)]: selected })
    else showAppearance(player.kennel.equipment)
  }

  function switchCategory(value, preview) {
    category = value
    selected = preview ?? equipped()
    for (const button of filters.children) button.setAttribute('aria-pressed', String(button.dataset.category === value))
    const items = kennelCatalog[slot(category)].filter(item => {
      if (slot(category) === 'collar' && Boolean(item.bandana) !== (category === 'bandana')) return false
      if (ownership === 'Owned') return available(item)
      if (ownership === 'Locked') return !available(item)
      return ownership !== 'Favorites' || player.kennel.favorites.includes(item.id)
    })
    if (!items.some(item => item.id === selected)) selected = items[0]?.id
    cards = items.map(item => {
        const button = node('button', null, 'gear-option')
        button.type = 'button'
        button.dataset.gear = item.id
        const label = node('small')
        button.append(gearIllustration(item, value), node('strong', item.name), label)
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
  equip.addEventListener('click', () => { if (lodge.equip(slot(category), selected)) update() })
  favorite.addEventListener('click', () => {
    lodge.favorite(selected)
    if (ownership === 'Favorites') switchCategory(category)
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
  const previewSlot = Object.keys(kennelCatalog).find(key => kennelCatalog[key].some(item => item.id === previewId))
  const previewItem = kennelCatalog[previewSlot]?.find(item => item.id === previewId)
  switchCategory(previewItem?.bandana ? 'bandana' : previewSlot ?? category, previewId)
  const nameDetails = node('details', null, 'kennel-breeds kennel-name')
  if (!inspectDogs && player.kennel.breed !== 'boyd') {
    const summary = node('summary', player.kennel.name ? 'Rename dog' : 'Name your dog')
    const form = node('form')
    const label = node('label', 'Dog name')
    const input = node('input')
    input.name = 'dog-name'
    input.autocomplete = 'off'
    input.value = player.kennel.name ?? ''
    input.placeholder = 'Labrador'
    input.setAttribute('aria-describedby', 'dog-name-help')
    const save = node('button', 'Save name')
    save.type = 'submit'
    const help = node('p', 'Optional · ' + dogNameLimit + ' characters · stored on this device', 'room-note')
    help.id = 'dog-name-help'
    const status = node('p', null, 'room-note')
    status.setAttribute('role', 'status')
    input.addEventListener('input', () => { status.textContent = '' })
    form.addEventListener('submit', event => {
      event.preventDefault()
      if (validatedDogName(input.value) === undefined) {
        status.textContent = 'Enter up to 20 letters or numbers with spaces, hyphens or apostrophes.'
        return
      }
      if (!lodge.renameDog(input.value)) {
        status.textContent = 'Name could not be saved. Reload the game and try again.'
        return
      }
      name.textContent = dogDisplayName(player.kennel)
      input.value = player.kennel.name ?? ''
      summary.textContent = player.kennel.name ? 'Rename dog' : 'Name your dog'
      status.textContent = 'Dog name saved.'
    })
    label.append(input)
    form.append(label, save, help, status)
    nameDetails.append(summary, form)
  }
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
  breeds.append(reset)
  return { content: [fitting, ...(nameDetails.children.length ? [nameDetails] : []), options, breeds], stage }
}
