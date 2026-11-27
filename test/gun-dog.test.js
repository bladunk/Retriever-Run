import assert from 'node:assert/strict'
import test from 'node:test'
import { openLodge, saveKey, saveVersion } from '../src/lodge-save.js'
import { dogDisplayName, validatedDogName } from '../src/dog-name.js'

function storage() {
  const data = new Map()
  return () => ({
    getItem: key => data.get(key) ?? null,
    setItem: (key,value) => data.set(key,value),
  })
}

test('Labrador names normalize on input while markup, spoofing controls and overlong names are rejected', () => {
  assert.equal(validatedDogName('  Jose\u0301  Anne-Marie  '),'José Anne-Marie')
  assert.equal(validatedDogName('L’Étoile'),'L’Étoile')
  assert.equal(validatedDogName('Ægir 2'),'Ægir 2')
  assert.equal(validatedDogName('   '),'')
  for (const value of [undefined,{},'<b>Drake</b>','Storm\u202E','Drake\nStorm','a'.repeat(21),'Bad--Name','-Lab']) {
    assert.equal(validatedDogName(value),undefined)
  }
  assert.equal(dogDisplayName({ breed:'boyd',name:'Custom' }),'Boyd')
})

test('names persist per local profile, preserve legacy gear and leave the public hunter name alone', () => {
  const disk = storage()
  const legacy = { version:saveVersion, active:1, players:[{ id:1,nickname:'Local Hunter',
    kennel:{ inherited:['canvas-vest','marsh-bandana','black'],
      equipment:{ vest:'canvas-vest',collar:'marsh-bandana',coat:'black' } } }] }
  disk().setItem(saveKey,JSON.stringify(legacy))
  let lodge = openLodge(disk)
  const first = lodge.current().id
  assert.equal(dogDisplayName(lodge.current().kennel),'Labrador')
  assert.ok(lodge.renameDog('Drake'))
  assert.equal(lodge.current().nickname,'Local Hunter')
  const second = lodge.newPlayer('Neighbor').id
  assert.ok(lodge.renameDog('June'))
  lodge = openLodge(disk)
  assert.equal(lodge.current().id,second)
  assert.equal(lodge.current().kennel.name,'June')
  lodge.select(first)
  assert.equal(lodge.current().kennel.name,'Drake')
  assert.deepEqual(lodge.current().kennel.equipment,legacy.players[0].kennel.equipment)
  assert.ok(!lodge.renameDog('<svg>'))
  assert.equal(lodge.current().kennel.name,'Drake')
  assert.ok(lodge.renameDog(''))
  assert.equal(dogDisplayName(openLodge(disk).current().kennel),'Labrador')
})

test('inspection cannot rename a dog and failed storage leaves the previous name intact', () => {
  const disk = storage()
  const opening = openLodge(disk)
  assert.ok(opening.renameDog('Maple'))
  assert.equal(openLodge(disk,undefined,{ practice:true }).renameDog('Practice'),false)
  const unavailable = openLodge(() => ({ getItem:disk().getItem, setItem() { throw Error('quota') } }))
  assert.equal(unavailable.renameDog('New Name'),false)
  assert.equal(unavailable.current().kennel.name,'Maple')
  assert.equal(opening.current().kennel.name,'Maple')
})
