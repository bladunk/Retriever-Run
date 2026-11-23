import { careerStanding } from './career.js'
import { gearRequirement, kennelCatalog, unlocked } from './kennel-catalog.js'
import { node } from './lodge-elements.js'

const categories = { collar: 'Collars', vest: 'Hunting vests', coat: 'Coats' }

export function kennelRoom(lodge, showAppearance) {
  const player = lodge.current()
  const standing = careerStanding(player.career)
  const stage = node('div', null, 'kennel-stage')
  stage.setAttribute('aria-label', 'Labrador equipment preview')
  const filters = node('div', null, 'board-filters')
  filters.setAttribute('aria-label', 'Equipment category')
  const options = node('div', null, 'kennel-items')
  options.setAttribute('role', 'group')
  options.setAttribute('aria-label', 'Equipment options')
  const feedback = node('div', null, 'kennel-selection')
  const description = node('p')
  description.setAttribute('role', 'status')
  const equip = node('button', 'Equip')
  const reset = node('button', 'Reset to Classic')
  equip.type = reset.type = 'button'
  feedback.append(description, equip, reset)
  let category = 'collar'
  let selected = player.kennel.equipment[category]

  function update(resetScroll = false) {
    const scroll = options.scrollTop
    for (const button of filters.children) button.setAttribute('aria-pressed', String(button.dataset.category === category))
    options.replaceChildren(...kennelCatalog[category].filter(item => item.level || item.rank || player.kennel.inherited.includes(item.id))
      .map(item => {
        const worn = player.kennel.equipment[category] === item.id
        const available = unlocked(item, standing, player.kennel.inherited)
        const button = node('button', null, 'gear-option')
        button.type = 'button'
        button.dataset.gear = item.id
        button.setAttribute('aria-pressed', String(selected === item.id))
        const swatch = node('span', null, 'gear-swatch')
        swatch.style.setProperty('--gear-color', item.color === null ? 'transparent' : '#' + item.color.toString(16).padStart(6, '0'))
        if (item.id === 'classic-yellow') swatch.style.setProperty('--gear-color', '#c49354')
        button.append(swatch, node('strong', item.name),
          node('small', worn ? 'Equipped' : available ? 'Unlocked' : gearRequirement(item)))
        button.addEventListener('click', () => {
          selected = item.id
          update()
          options.querySelector('[data-gear="' + selected + '"]').focus({ preventScroll: true })
        })
        return button
      }))
    const item = kennelCatalog[category].find(item => item.id === selected)
    const equipped = player.kennel.equipment[category] === selected
    const available = unlocked(item, standing, player.kennel.inherited)
    description.textContent = equipped ? 'Wearing ' + item.name : 'Previewing ' + item.name
    equip.textContent = equipped ? 'Equipped' : available ? 'Equip' : gearRequirement(item)
    equip.disabled = equipped || !available
    options.scrollTop = resetScroll ? 0 : scroll
    showAppearance({ ...player.kennel.equipment, [category]: selected })
  }

  for (const [id, label] of Object.entries(categories)) {
    const button = node('button', label)
    button.type = 'button'
    button.dataset.category = id
    button.addEventListener('click', () => {
      category = id
      selected = player.kennel.equipment[category]
      update(true)
    })
    filters.append(button)
  }
  equip.addEventListener('click', () => { if (lodge.equip(category, selected)) update() })
  reset.addEventListener('click', () => {
    lodge.resetGear()
    selected = player.kennel.equipment[category]
    update()
  })
  update()
  const fitting = node('div', null, 'kennel-fitting')
  fitting.append(stage, filters, feedback)
  return { content: [fitting, options], stage }
}
