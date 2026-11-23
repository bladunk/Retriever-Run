import { careerStanding } from './career.js'
import { gearRequirement, kennelCatalog, unlocked } from './kennel-catalog.js'
import { node } from './lodge-elements.js'

const categories = { collar: 'Collars', vest: 'Hunting vests', coat: 'Coats' }

export function kennelRoom(lodge, showAppearance) {
  const player = lodge.current()
  const standing = careerStanding(player.career)
  const stage = node('div', null, 'kennel-stage')
  stage.setAttribute('aria-label', 'Labrador equipment preview')
  stage.tabIndex = -1

  const filters = node('div', null, 'board-filters')
  filters.setAttribute('role', 'group')
  filters.setAttribute('aria-label', 'Equipment category')
  const options = node('div', null, 'kennel-items')
  options.setAttribute('role', 'group')
  options.setAttribute('aria-label', 'Equipment options')

  const description = node('p', null, 'kennel-preview-status')
  description.setAttribute('role', 'status')
  const fitting = node('div', null, 'kennel-fitting')
  fitting.append(stage, description, filters)

  const feedback = node('div', null, 'kennel-selection')
  const equip = node('button', 'Equip')
  const peek = node('button', 'View preview')
  const reset = node('button', 'Reset to Classic')
  equip.type = peek.type = reset.type = 'button'
  feedback.append(equip, peek, reset)
  let category = 'collar'
  let selected = player.kennel.equipment[category]
  let cards = []

  const available = item => unlocked(item, standing, player.kennel.inherited)
  function update() {
    for (const { item, button, label } of cards) {
      button.setAttribute('aria-pressed', String(selected === item.id))
      label.textContent = player.kennel.equipment[category] === item.id ? 'Equipped'
        : available(item) ? 'Unlocked' : gearRequirement(item)
    }
    const item = kennelCatalog[category].find(item => item.id === selected)
    const equipped = player.kennel.equipment[category] === selected
    description.textContent = equipped ? 'Wearing ' + item.name : 'Previewing ' + item.name
    equip.textContent = equipped ? 'Equipped' : available(item) ? 'Equip' : gearRequirement(item)
    equip.disabled = equipped || !available(item)
    showAppearance({ ...player.kennel.equipment, [category]: selected })
  }

  function switchCategory(value) {
    category = value
    selected = player.kennel.equipment[category]
    for (const button of filters.children) button.setAttribute('aria-pressed', String(button.dataset.category === value))
    cards = kennelCatalog[category].filter(item => item.level || item.rank || player.kennel.inherited.includes(item.id))
      .map(item => {
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
    options.replaceChildren(...cards.map(card => card.button))
    update()
  }

  for (const [id, label] of Object.entries(categories)) {
    const button = node('button', label)
    button.type = 'button'
    button.dataset.category = id
    button.addEventListener('click', () => switchCategory(id))
    filters.append(button)
  }
  equip.addEventListener('click', () => { if (lodge.equip(category, selected)) update() })
  peek.addEventListener('click', () => {
    stage.scrollIntoView({ block: 'start' })
    stage.focus({ preventScroll: true })
  })
  reset.addEventListener('click', () => {
    lodge.resetGear()
    selected = player.kennel.equipment[category]
    update()
  })
  switchCategory(category)
  return { content: [fitting, options, feedback], stage }
}
