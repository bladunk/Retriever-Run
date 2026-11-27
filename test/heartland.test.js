import assert from 'node:assert/strict'
import test from 'node:test'
import { BufferAttribute, BufferGeometry, Mesh, Raycaster, Vector3 } from 'three'
import { hazardFrame, obstacleVolumes } from '../src/collision.js'
import { expeditionRegions } from '../src/expedition.js'
import { shoreHeight } from '../src/landforms.js'
import { createPuddleSurface, preparePuddle, puddleLengths, puddleMargin, puddleWidths } from '../src/puddle-art.js'
import { buildTile } from '../src/terrain-geometry.js'
import { centerAt, segmentLength } from '../src/trail.js'

test('puddle uses the collision footprint with a non-colliding damp margin', () => {
  const volumes = obstacleVolumes({ type:'puddle' })
  assert.deepEqual(puddleWidths.toArray(),volumes.map(volume=>volume.hx))
  assert.deepEqual(puddleLengths.toArray(),volumes.map(volume=>volume.hz))
  const surface = createPuddleSurface()
  const { position, marshDepth } = surface.geometry.attributes
  assert.ok(marshDepth.array.every(value=>value===3))
  assert.ok(Math.abs(Math.max(...position.array.filter((_,i)=>i%3===0))-puddleWidths.x-puddleMargin)<.00001)
  assert.ok(Math.abs(Math.max(...position.array.filter((_,i)=>i%3===2))-puddleLengths.z-puddleMargin)<.00001)
})

test('a puddle surface sits above rendered ground in all lanes of every territory', () => {
  const down = new Vector3(0,-1,0)
  const ray = new Raycaster()
  const water = createPuddleSurface()
  // Reusing one surface also exercises the pooled geometry update path.
  for (const region of expeditionRegions) {
    const index = Math.ceil(region.marker/segmentLength) + 1
    const start = index*segmentLength
    const tile = buildTile(index,7)
    const geom = new BufferGeometry()
    geom.setAttribute('position',new BufferAttribute(tile.ground.buffers.position.values,3))
    geom.setIndex(new BufferAttribute(tile.ground.index,1))
    const floor = new Mesh(geom)
    floor.position.x = centerAt(start) - centerAt(start+15)
    floor.position.z = 15
    floor.updateMatrixWorld()
    for (const lane of [-1,0,1]) {
      const entity = {type:'puddle',lane,distance:start+15}
      const pose = hazardFrame({},entity,entity.distance,entity.distance)
      preparePuddle(water,entity)
      water.position.set(pose.x,pose.y,pose.z)
      water.rotation.y = pose.angle
      water.updateMatrixWorld()
      const points = water.geometry.attributes.position
      for (let i=0;i<points.count;i++) {
        const point = new Vector3().fromBufferAttribute(points,i)
        if (!obstacleVolumes(entity).some(volume=>Math.abs(point.x)<=volume.hx && Math.abs(point.z)<=volume.hz)) continue
        water.localToWorld(point)
        ray.set(new Vector3(point.x,point.y+1,point.z),down)
        const contact = ray.intersectObject(floor)[0]
        assert.ok(contact?.point.y < point.y-.01,`${region.key} lane ${lane}`)
      }
    }
    geom.dispose()
  }
})

test('Heartland landscapes have continuous off-route wet and dry features and high Sandhills dunes', () => {
  for (const region of expeditionRegions.filter(region=>region.heartland)) {
    const samples = []
    for (let at=0;at<310;at+=11) for (let x=6;x<71;x+=2) samples.push(shoreHeight(region,region.marker+at,x)[0])
    assert.ok(samples.some(y=>y<-.59),region.key)
    assert.ok(samples.some(y=>y>(region.key==='platte' ? .32 : 1)),region.key)
    if (region.key==='sandhills') assert.ok(samples.some(y=>y>10))
  }
})
