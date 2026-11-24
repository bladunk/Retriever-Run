export const fieldNotes = [
  { id: 'mallard-dabble', category: 'Waterfowl', text: 'Mallards often tip forward into shallow water to reach seeds and aquatic plants.',
    tags: ['mallard', 'gulf', 'flyway'], source: { name: 'Cornell Lab of Ornithology', url: 'https://www.allaboutbirds.org/guide/Mallard/lifehistory' } },
  { id: 'teal-scale', category: 'Waterfowl', text: 'A Blue-winged Teal is noticeably smaller than a Mallard.',
    tags: ['blue-winged-teal', 'prairie', 'dakota'], source: { name: 'Cornell Lab of Ornithology', url: 'https://www.allaboutbirds.org/guide/Blue-winged_Teal/id' } },
  { id: 'goose-formation', category: 'Migration', text: 'Experienced Canada Geese take turns at the front of a V-shaped flock.',
    tags: ['canada-goose', 'border', 'boreal'], source: { name: 'Cornell Lab of Ornithology', url: 'https://www.allaboutbirds.org/guide/Canada_Goose/lifehistory' } },
  { id: 'wetland-water', category: 'Wetland Ecology', text: 'Wetlands can hold floodwater and release it slowly, reducing the force of floods downstream.',
    tags: ['gulf', 'cypress', 'timber'], source: { name: 'U.S. Environmental Protection Agency', url: 'https://www.epa.gov/report-environment/wetlands' } },
  { id: 'four-flyways', category: 'Geography', text: 'North American waterfowl management follows four flyways: Atlantic, Mississippi, Central and Pacific.',
    tags: ['flyway', 'migration'], source: { name: 'U.S. Fish & Wildlife Service', url: 'https://www.fws.gov/program/migratory-birds/about-us' } },
]

export function createFieldNotes(random = Math.random) {
  const recent = []
  return {
    next(tags = []) {
      const fresh = fieldNotes.filter(note => !recent.includes(note.id))
      const relevant = fresh.filter(note => note.tags.some(tag => tags.includes(tag)))
      const choices = relevant.length ? relevant : fresh
      const note = choices[Math.floor(random() * choices.length)]
      recent.push(note.id)
      if (recent.length > 3) recent.shift()
      return note
    },
  }
}
