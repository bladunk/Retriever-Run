import { node } from './lodge-elements.js'

const fold = value => String(value ?? '').normalize('NFKD').replace(/\p{Mark}/gu, '').toLocaleLowerCase()
export function matchesCollection(query, ...fields) {
  const text = fold(fields.join(' '))
  return fold(query).trim().split(/\s+/).every(term => text.includes(term))
}

export function collectionSearch(label) {
  const input = node('input', null, 'collection-search')
  input.type = 'search'
  input.placeholder = label
  input.setAttribute('aria-label', label)
  return input
}

export function collectionSelect(label, choices) {
  const input = node('select')
  input.setAttribute('aria-label', label)
  for (const [value, text] of Object.entries(choices)) {
    const option = node('option', text)
    option.value = value
    input.append(option)
  }
  return input
}

export function recentlyEarned(a, b) {
  return (Date.parse(b) || 0) - (Date.parse(a) || 0)
}

export const roomGroups = {
  overview: ['overview', 'collection', 'trophies', 'career', 'records', 'migration', 'shame'],
  kennel: ['kennel', 'equipment'],
  journal: ['journal'],
  board: ['board', 'worldwide', 'friends', 'private-camps', 'camp-profile', 'camp-archives'],
}

export function primaryRoom(room) {
  return Object.keys(roomGroups).find(group => roomGroups[group].includes(room)) ?? 'overview'
}
