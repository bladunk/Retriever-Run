const outlines = {
  hunt: 'M12 2v3m0 14v3M2 12h3m14 0h3M18.7 12a6.7 6.7 0 1 1-13.4 0 6.7 6.7 0 0 1 13.4 0ZM12 10v4',
  lodge: 'm2.5 11 9.5-7.1 9.5 7.1M5 10v10h14V10M10 20v-6h4v6m2-13V4h2v4',
  kennel: 'M6.8 18c0-2.4 3-6.3 5.2-6.3s5.2 3.9 5.2 6.3c0 1.2-.9 2-2.1 2-1.4 0-2-.8-3.1-.8s-1.7.8-3.1.8c-1.2 0-2.1-.8-2.1-2ZM5.1 12.5c-2.2-.4-2.9-5 .1-5 2.6.2 2.5 5.5-.1 5Zm4.8-3C7.1 9.3 7 3.1 9.8 3c2.8 0 2.9 6.7.1 6.5Zm4.5 0C11.7 9.7 11.7 3 14.5 3c2.7.1 2.6 6.3-.1 6.5Zm4.5 3c-2.6.5-2.7-4.8-.1-5 3 0 2.3 4.6.1 5Z',
  journal: 'M12 6v14m0-14C9 3 5 3.5 3 4.5V18c3-1 6-.5 9 2 3-2.5 6-3 9-2V4.5C19 3.5 15 3 12 6ZM6 8l3 1m-3 3 3 1m6-4 3-1m-3 5 3-1',
  worldwide: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3.5 12h17M12 3c5 4 5 14 0 18-5-4-5-14 0-18Z',
  board: 'm3 19 9-14 9 14H3Zm5 0 4-5.5 4 5.5M8.5 5l3.5 5 3.5-5',
}

export function addDestinationIcons(ui) {
  const destinations = {
    hunt: ui['camp-hunt'], lodge: ui['tab-overview'], kennel: ui['tab-kennel'],
    journal: ui['tab-journal'], worldwide: ui['tab-worldwide'], board: ui['tab-board'],
  }
  const icon = kind => {
    const space = 'http://www.w3.org/2000/svg'
    const drawing = document.createElementNS(space, 'svg')
    drawing.setAttribute('viewBox', '0 0 24 24')
    drawing.setAttribute('aria-hidden', 'true')
    drawing.setAttribute('class', 'field-icon')
    const contour = document.createElementNS(space, 'path')
    contour.setAttribute('d', outlines[kind])
    contour.setAttribute('fill', 'none')
    contour.setAttribute('stroke', 'currentColor')
    contour.setAttribute('stroke-width', '1.55')
    contour.setAttribute('stroke-linecap', 'round')
    contour.setAttribute('stroke-linejoin', 'round')
    drawing.append(contour)
    return drawing
  }
  for (const [kind, button] of Object.entries(destinations)) button?.prepend(icon(kind))
  for (const button of ui['title-rooms']?.children ?? []) button.prepend(icon(button.dataset.entry ?? 'lodge'))
}
