import { Quaternion, Vector3 } from 'three'

export function createPawPlanting(root, meshes) {
  const point = new Vector3()
  const end = new Vector3()
  const pivot = new Vector3()
  const target = new Vector3()
  const current = new Vector3()
  const wanted = new Vector3()
  const facing = new Vector3()
  const turn = new Quaternion()
  const identity = new Quaternion()
  const inverse = new Quaternion()
  const parent = new Quaternion()
  const legs = []
  const bones = new Set()
  for (const side of ['L', 'R']) {
    for (const rear of [false, true]) {
      const names = rear ? ['BackLowerLeg', 'BackUpperLeg', 'BackLeg'] : ['FrontLowerLeg', 'FrontUpperLeg']
      const chain = names.map((name) => root.getObjectByName(name + side))
      const marker = root.getObjectByName((rear ? 'FFB' : 'FF') + side)
      if (!marker || chain.some((bone) => !bone)) continue
      const foot = chain[0]
      const toe = foot.worldToLocal(marker.getWorldPosition(new Vector3()))
      const anchor = marker.parent
      for (const bone of chain) bones.add(bone)
      legs.push({ chain, marker, foot, toe, anchor, rear, position: anchor.position.clone() })
    }
  }
  const rotations = [...bones].map((bone) => [bone, bone.quaternion.clone()])

  // Sample the feet and lower legs across the bind pose. The leg weights
  // can make a toe or the edge of a pad the lowest point in a crouch.
  const probes = []
  for (const mesh of meshes) {
    const cells = new Map()
    const { position, skinIndex } = mesh.geometry.attributes
    for (let i = 0; i < position.count; i++) {
      mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld)
      if (point.y > .54) continue
      const cell = [skinIndex.getX(i), Math.round(point.x * 18), Math.round(point.z * 18)].join(',')
      const previous = cells.get(cell)
      if (!previous || previous.y > point.y) cells.set(cell, { i, y: point.y })
    }
    for (const { i } of cells.values()) probes.push([mesh, i])
  }

  return {
    restore() {
      for (const [bone, previous] of rotations) bone.quaternion.copy(previous)
      for (const leg of legs) leg.anchor.position.copy(leg.position)
    },
    remember() {
      for (const [bone, previous] of rotations) previous.copy(bone.quaternion)
      for (const leg of legs) leg.position.copy(leg.anchor.position)
    },
    solve(amount, ground) {
      facing.set(0, 0, 1).applyQuaternion(root.getWorldQuaternion(parent))
      for (const { chain, marker, anchor, toe, foot, rear } of legs) {
        marker.getWorldPosition(point)
        target.copy(point).addScaledVector(facing, amount * (rear ? .025 : .10))
        target.y += (ground + .049 - point.y) * amount
        anchor.getWorldPosition(current).add(target).sub(point)
        anchor.position.copy(anchor.parent.worldToLocal(current))
        for (let iteration = 0; iteration < 3; iteration++) {
          for (const joint of chain) {
            joint.getWorldPosition(pivot)
            foot.localToWorld(end.copy(toe))
            current.copy(end).sub(pivot)
            wanted.copy(target).sub(pivot)
            if (current.lengthSq() < 1e-8 || wanted.lengthSq() < 1e-8) continue
            turn.setFromUnitVectors(current.normalize(), wanted.normalize())
            const rotation = turn.angleTo(identity)
            if (rotation > .58) turn.slerp(identity, 1 - .58 / rotation)
            joint.parent.getWorldQuaternion(parent)
            inverse.copy(parent).invert()
            turn.premultiply(inverse).multiply(parent)
            joint.quaternion.premultiply(turn)
          }
        }
      }
      root.updateMatrixWorld(true)
    },
    support(floor) {
      let lowest = Infinity
      for (const [mesh, vertex] of probes) {
        mesh.getVertexPosition(vertex, point).applyMatrix4(mesh.matrixWorld)
        lowest = Math.min(lowest, point.y)
      }
      return Math.max(0, floor - lowest)
    },
  }
}
