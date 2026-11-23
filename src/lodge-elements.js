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
