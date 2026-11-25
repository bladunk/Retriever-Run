import { fieldSpecies } from './wildlife-catalog.js'

const photos = {
  'wood-duck': {
    path: 'species/wood-duck.webp', author: 'Arjan Haverkamp', license: 'CC BY 2.0',
    terms: 'https://creativecommons.org/licenses/by/2.0/',
    source: 'https://commons.wikimedia.org/wiki/File:Aix_sponsa_-Ouwehands_Dierenpark-8a.jpg',
  },
  mallard: {
    path: 'species/mallard.webp', author: 'Charles J. Sharp', license: 'CC BY-SA 3.0',
    terms: 'https://creativecommons.org/licenses/by-sa/3.0/',
    source: 'https://commons.wikimedia.org/wiki/File:Mallard_drake_(anas_platyrhynchos).JPG',
  },
  alligator: {
    path: 'species/alligator.webp', author: 'Judy Gallagher', license: 'CC BY 2.0',
    terms: 'https://creativecommons.org/licenses/by/2.0/',
    source: 'https://commons.wikimedia.org/wiki/File:American_Alligator_-_Alligator_mississippiensis,_Everglades_National_Park,_Homestead,_Florida,_January_31,_2022_(51858108563).jpg',
  },
}

const groups = {
  upland: ['pheasant'],
  birds: ['crane', 'heron', 'egret', 'eagle'],
  mammals: ['deer', 'moose'],
  reptiles: ['alligator'],
}

export const speciesArtwork = Object.freeze(Object.fromEntries(Object.values(fieldSpecies).map(animal => [
  animal.id, Object.freeze({
    id: 'species-' + animal.id,
    group: Object.keys(groups).find(group => groups[group].includes(animal.id)) ?? 'waterfowl',
    silhouette: animal.family,
    width: 420,
    height: 294,
    photo: photos[animal.id],
  }),
])))

export const speciesPhotoFiles = Object.values(photos).map(photo => photo.path)
