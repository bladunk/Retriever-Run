const numbers = new Intl.NumberFormat()
const dates = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
export const number = value => numbers.format(Math.floor(value))
export const meters = value => number(value) + ' m'
export const date = value => Number.isFinite(Date.parse(value)) ? dates.format(new Date(value)) : '—'

export function node(tag, text, className) {
  const element = document.createElement(tag)
  if (text != null) element.textContent = text
  if (className) element.className = className
  return element
}

export function duration(seconds) {
  const total = Math.floor(seconds)
  const minutes = Math.floor(total / 60)
  return (minutes >= 60 ? Math.floor(minutes / 60) + 'h ' : '') +
    (minutes ? (minutes % 60) + 'm ' : '') + total % 60 + 's'
}

export function rows(items) {
  return items.map(([name, value]) => {
    const row = node('div')
    row.append(node('dt', name), node('dd', value))
    return row
  })
}

export function cards(items) {
  return items.map(([name, value]) => {
    const card = node('div', null, 'record-card')
    card.append(node('strong', value), node('span', name))
    return card
  })
}
