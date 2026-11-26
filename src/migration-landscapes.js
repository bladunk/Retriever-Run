// World measures are in metres. Stable keys identify regions in saves and packs.
// Water level stays shared so blended channels meet across tile boundaries.
const landscapes = [
  // key, name, landform, landmark, tree families, vegetation, habitats
  ['gulf', 'Gulf Coast Marsh', 'tidal', 'fish-shack', ['cypress', 'tupelo'], 0, ['tidal-creeks', 'salt-marsh', 'open-water']],
  ['cypress', 'Southern Cypress Swamp', 'swamp', 'swamp-cabin', ['cypress', 'tupelo'], 0, ['flooded-cypress', 'cypress-knees', 'open-water']],
  ['flyway', 'Mississippi Delta', 'levee', 'delta-shed', ['willow', 'cottonwood'], 1, ['backwaters', 'sandbars', 'harvested-grain']],
  ['timber', 'Arkansas Flooded Timber', 'hardwood', 'blind', ['oak', 'maple'], 0, ['flooded-hardwood', 'leaf-litter', 'open-water']],
  ['ozark', 'Ozark River Country', 'limestone', 'limestone-crossing', ['oak', 'maple'], 1, ['limestone-banks', 'clear-river', 'hardwood']],
  ['farm', 'Midwest Farm Country', 'field', 'farm', ['cottonwood', 'oak'], 2, ['cornfield', 'harvested-grain', 'drainage-ditch']],
  ['platte', 'Platte River Valley', 'braids', 'river-camp', ['cottonwood', 'willow'], 1, ['braided-river', 'sandbars', 'riparian-grass']],
  ['sandhills', 'Nebraska Sandhills', 'dunes', 'windmill', ['cottonwood', 'willow'], 2, ['tall-grass', 'wet-meadow', 'dune-lakes']],
  ['prairie', 'Dakota Prairie Potholes', 'pothole', 'pothole-farm', ['aspen', 'willow'], 0, ['prairie-ponds', 'tall-grass', 'cattails']],
  ['dakota', 'Northern Dakota Wetlands', 'slough', 'grain-elevator', ['aspen', 'cottonwood'], 0, ['glacial-lake', 'harvested-grain', 'cattails']],
  ['manitoba', 'Manitoba Marshlands', 'lacustrine', 'marsh-dock', ['willow', 'aspen'], 0, ['freshwater-marsh', 'reed-beds', 'open-water']],
  ['parklands', 'Saskatchewan Parklands', 'parkland', 'aspen-cabin', ['aspen', 'birch'], 2, ['aspen-grove', 'tall-grass', 'prairie-ponds']],
  ['boreal', 'Canadian Boreal Forest', 'boreal', 'snag', ['spruce', 'fir'], 1, ['boreal-forest', 'rocky-shore', 'northern-lake']],
  ['foothills', 'Rocky Mountain Foothills', 'foothills', 'forestry-cabin', ['jackPine', 'fir'], 2, ['forested-slopes', 'rocky-river', 'snow-forest']],
  ['mountain', 'Canadian Mountain Wilderness', 'alpine', 'cairn', ['fir', 'snowPine'], 2, ['subalpine-forest', 'mountain-lake', 'snow-forest']],
]
const palettes = [
  // soil, bank, grass, trees, basin, sky, haze, sun, fog, water color, canopy count, scale
  [0x82725c,0x596149,0x959858,0x71754e,-.98,0x769ca4,0xdccb9e,0xffd8a3,.008,0x394f44,2,.81],
  [0x695444,0x3f4c35,0x748451,0x647143,-1.32,0x526d68,0xa3afa0,0xffcf91,.013,0x202a1d,12,1.43],
  [0x7e654a,0x93805b,0xa39863,0x8c814b,-1.05,0x6a8f9d,0xc8b89a,0xffe0b8,.006,0x594e3e,4,1.03],
  [0x665143,0x645745,0x98875c,0x907349,-1.08,0x5e7378,0xb6a791,0xffcf99,.011,0x30382b,12,1.64],
  [0xa19684,0x75805b,0x999468,0x8d744e,-.88,0x7097a6,0xb3c0ae,0xffdcb2,.006,0x3b5c4e,10,1.23],
  [0x947050,0x997f4f,0xb69950,0x988652,-.60,0x6594ae,0xd2b48a,0xffda9e,.006,0x4d5040,3,1.01],
  [0xa59474,0xb29d71,0xa3a35c,0x9e854d,-.96,0x79a5ba,0xc5c7ab,0xffe0b0,.006,0x4d7074,6,1.17],
  [0xa58e67,0x9d905a,0xb6a05d,0x8f9069,-.72,0x6f98b0,0xd2bd94,0xffdcaa,.006,0x4e6254,1,.79],
  [0x9b8566,0x8f874e,0xb9a463,0x8f8756,-.89,0x678ca4,0xc3ba98,0xffddb4,.007,0x414e38,2,.81],
  [0x868377,0x777852,0xa7a06c,0x82855d,-1.05,0x6491a7,0xaeb7aa,0xffe1c3,.007,0x3d5755,3,.88],
  [0x767869,0x627452,0x8e9a61,0x7f8d61,-1.18,0x648fa7,0xabbcb3,0xffe2c8,.007,0x34595a,3,.94],
  [0x909186,0x837f54,0xac9e61,0xaba269,-.93,0x688da3,0xadb9a9,0xffdfc4,.007,0x425d55,10,1.02],
  [0x73766e,0x536450,0x818969,0x536e58,-1.14,0x52738e,0xa2b8b3,0xffe3c8,.010,0x263b43,12,1.20],
  [0x88897e,0x6f7964,0x89967e,0x536f62,-.99,0x587d97,0xa0b5b9,0xffe6ce,.008,0x3c5b63,11,1.12],
  [0x9ea59f,0xa5b3a3,0xa9ad95,0x526779,-1.20,0x567996,0xa8bcc7,0xffe8d6,.007,0x3b6578,10,1.11],
]
const accents = {
  ozark: { relief: .12 }, dakota: { snow: .12 }, manitoba: { snow: .14 },
  parklands: { snow: .19 }, boreal: { snow: .38, conifers: .95 },
  foothills: { snow: .56, conifers: .88, ridge: .54 },
  mountain: { snow: .92, conifers: 1, ridge: 1 },
}
const licensedGrass = new Set(['flyway', 'timber', 'farm', 'prairie', 'dakota', 'platte', 'sandhills', 'parklands'])

export const landscapeProfiles = landscapes.map(([key, name, kind, landmark, species, plant, habitats], i) => {
  const [soil, bank, grass, trees, water, sky, horizon, sun, fog, waterTint, treesPerSide, treeScale] = palettes[i]
  const birds = ['farm', 'platte', 'sandhills'].includes(key) ? ['goose', 'pheasant']
    : key === 'gulf' ? ['teal', 'mallard'] : ['flyway', 'prairie', 'parklands', 'mountain'].includes(key) ? ['goose', 'mallard'] : ['mallard', 'teal']
  return { key, name, kind, landmark, species, plant, habitats, soil, bank, grass, trees, water, sky, horizon, sun, fog,
    waterTint, treesPerSide, treeScale, birds, licensedGrass: licensedGrass.has(key),
    snow: 0, conifers: 0, ridge: 0, ...accents[key] }
})
