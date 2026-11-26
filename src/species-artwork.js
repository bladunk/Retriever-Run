import { fieldSpecies } from './wildlife-catalog.js'

import photos from './assets/journal-photos.json' with { type: 'json' }

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
    photo: Object.freeze({
      ...photos[animal.id],
      path: 'species/' + animal.id + '.webp',
      detail: 'species/' + animal.id + '-detail.webp',
    }),
  }),
])))

export const speciesPhotoFiles = Object.values(speciesArtwork).flatMap(({ photo }) => [photo.path, photo.detail])
