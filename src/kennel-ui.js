import { careerStanding } from './career.js'
import { kennelCatalog, unlocked } from './kennel-catalog.js'
import { careerLine } from './career-ui.js'
import { node } from './lodge-elements.js'

const categories = { collar: 'Collars', vest: 'Hunting vests', coat: 'Coats' }

export function kennelRoom(lodge, showAppearance) {
  const player = lodge.current()
  const level = careerStanding(player.career.xp).level
  const heading = node('div', null, 'kennel-heading')
  heading.append(node('p', player.nickname + ' · ' + careerLine(player), 'lodge-kicker'),
    node('h3', 'The Kennel', 'section-title'))
  const stage = node('div', null, 'kennel-stage')
  stage.setAttribute('aria-label', 'Labrador equipment preview')
  const filters = node('div', null, 'board-filters')
  filters.setAttribute('aria-label', 'Equipment category')
  const options = node('div', null, 'kennel-items')
  const feedback = node('div', null, 'kennel-selection')
  const description = node('p')
  description.setAttribute('role', 'status')
  const equip = node('button', 'Equip')
  const reset = node('button', 'Reset to Classic')
  equip.type = reset.type = 'button'
  feedback.append(description, equip, reset)
  let category = 'collar'
  let selected = player.kennel.equipment[category]

  function update() {
    for (const button of filters.children) button.setAttribute('aria-pressed', String(button.dataset.category === category))
    options.replaceChildren(...kennelCatalog[category].filter(item => item.level || player.kennel.inherited.includes(item.id))
      .map(item => {
        const worn = player.kennel.equipment[category] === item.id
        const available = unlocked(item, level, player.kennel.inherited)
        const button = node('button', null, 'gear-option')
        button.type = 'button'
        button.dataset.gear = item.id
        button.setAttribute('aria-pressed', String(selected === item.id))
        const swatch = node('span', null, 'gear-swatch')
        swatch.style.setProperty('--gear-color', item.color === null ? 'transparent' : '#' + item.color.toString(16).padStart(6, '0'))
        if (item.id === 'classic-yellow') swatch.style.setProperty('--gear-color', '#c49354')
        button.append(swatch, node('strong', item.name),
          node('small', worn ? 'Equipped' : available ? 'Unlocked' : 'Level ' + item.level))
        button.addEventListener('click', () => {
          selected = item.id
          update()
          options.querySelector('[data-gear="' + selected + '"]').focus({ preventScroll: true })
        })
        return button
      }))
    const item = kennelCatalog[category].find(item => item.id === selected)
    const equipped = player.kennel.equipment[category] === selected
    const available = unlocked(item, level, player.kennel.inherited)
    description.textContent = equipped ? 'Wearing ' + item.name : 'Previewing ' + item.name
    equip.textContent = equipped ? 'Equipped' : available ? 'Equip' : 'Unlocks at level ' + item.level
    equip.disabled = equipped || !available
    showAppearance({ ...player.kennel.equipment, [category]: selected })
  }

  for (const [id, label] of Object.entries(categories)) {
    const button = node('button', label)
    button.type = 'button'
    button.dataset.category = id
    button.addEventListener('click', () => {
      category = id
      selected = player.kennel.equipment[category]
      update()
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
  return { content: [heading, stage, filters, options, feedback], stage }
}
