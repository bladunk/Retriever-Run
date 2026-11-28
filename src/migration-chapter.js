const subtitles = [
  'Where the tide meets the reeds', 'Into the flooded forests', 'On the rich alluvial plain',
  'Beneath the bottomland oaks', 'Through limestone river country', 'Along the shelterbelts',
  'Where the river divides', 'Across the grass-covered dunes', 'Between the prairie ponds',
  'Into the northern wetlands', 'Across the Canadian flyway', 'Through the golden aspen',
  'Under the black spruce', 'At the foot of the Rockies', 'Where the trail meets the peaks',
]

export function chapterContent(region, { first = false, endless = false } = {}) {
  if (endless) return { series:'The Great Migration', title:'Into the Endless',
    subtitle:'The migration is complete. The wilderness continues.', milestone:'' }
  const index = region.index + 1
  return { series:'The Great Migration · ' + String(index).padStart(2,'0') + ' / 15',
    title:region.name, subtitle:subtitles[region.index],
    milestone:first ? index === 11 ? 'First arrival in Canada' : 'New territory' : '' }
}

export function migrationChapter(ui) {
  const panel = ui['migration-chapter']
  const ribbon = ui['migration-ribbon']
  const segments = Array.from({length:15}, () => ribbon.appendChild(document.createElement('i')))
  let expires = -Infinity
  let shown = ''
  let progressKey = ''
  return {
    show(region,time,options) {
      const key = options.endless ? 'endless' : region.key
      if (shown === key) return
      shown = key
      const content = chapterContent(region, options)
      for (const name of ['series','title','subtitle','milestone']) {
        ui['chapter-' + name].textContent = content[name]
      }
      expires = time + 2.8
      panel.hidden = false
      panel.animate([{opacity:0},{opacity:1}],{
        duration:document.documentElement.hasAttribute('data-reduce-motion') ? 0 : 220,
      })
    },
    update(region,time,endless) {
      const index = region.index
      const key = endless ? 'endless' : region.key
      if (key !== progressKey) {
        progressKey = key
        segments.forEach((element,i) => {
          element.toggleAttribute('data-complete', endless || i < index)
          element.toggleAttribute('data-current', !endless && i === index)
        })
        ribbon.setAttribute('aria-valuenow', endless ? '15' : String(index + 1))
        ribbon.setAttribute('aria-valuetext', endless ? 'Great Migration complete. Endless survival.' :
          region.name + ', territory ' + (index+1) + ' of 15')
      }
      if (time >= expires) panel.hidden = true
    },
    reset() {
      panel.hidden = true
      shown = progressKey = ''
      expires = -Infinity
    },
  }
}
