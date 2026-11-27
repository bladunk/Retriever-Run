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
  [0xac9978,0xa7976f,0x9e9b63,0x90834f,-.96,0x76a0b1,0xc9c8ac,0xffdaa4,.005,0x586761,6,1.17],
  [0xa58e67,0xa6955e,0xb6a05d,0x8f9069,-.72,0x7399b7,0xccc3a5,0xffdb9e,.0048,0x536e67,1,.73],
  [0x9b8566,0x8f874e,0xb9a463,0x8f8756,-.89,0x678ca4,0xc3ba98,0xffddb4,.007,0x414e38,2,.81],
  [0x868377,0x84906c,0xabaa83,0x82855d,-1.05,0x7495a7,0xb9c1b5,0xeee5cf,.0056,0x456364,3,.88],
  [0x827765,0x6e7857,0xa4a075,0x7f8d61,-1.18,0x7499a8,0xbec9bd,0xffe2c8,.0052,0x455e59,3,.88],
  [0x918579,0x8d844d,0xb7a663,0xaba269,-.93,0x718fa7,0xc9c1a8,0xffd8a5,.0054,0x4a6054,13,1.06],
  [0x676b5a,0x54664c,0x7c895d,0x536e58,-1.14,0x57788d,0xa3b4a7,0xffe5cb,.0069,0x2d4447,13,1.39],
  [0x8e8880,0x6e7a64,0x89967e,0x536f62,-.99,0x5f879e,0xb0bdbb,0xffdfbd,.0051,0x4f6a68,10,1.14],
  [0x9b9d96,0x8f9a8e,0xa6a990,0x526779,-1.20,0x61869f,0xb2c2c9,0xffe7d1,.0045,0x526f73,9,1.06],
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
    waterTint, treesPerSide, treeScale, birds, licensedGrass: licensedGrass.has(key), heartland: i >= 5 && i <= 9,
    snow: 0, conifers: 0, ridge: 0, ...accents[key] }
})
