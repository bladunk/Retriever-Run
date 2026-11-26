import * as T from 'three'
import { contactShadow } from './contact-shadow.js'
import { createDog } from './dog.js'
import { gearAppearance } from './kennel-material.js'
import { boydAppearance } from './master-hunter.js'

export function createPlayer(scene, breed = 'lab', createPickup, kit, maySwap = () => true) {
  const fallback = createDog(scene)
  const shadow = contactShadow()
  shadow.rotation.order = 'YXZ'
  scene.add(shadow)
  const root = new T.Group()
  scene.add(root)
  let rig
  let equipment
  let active
  let prepared
  let loading
  let wanted = breed
  const inspection = kit !== undefined

  function appearance() {
    const gear = inspection && active === 'boyd' ? boydAppearance(kit) : gearAppearance(equipment)
    if (active === 'boyd') gear.coat = boydAppearance().coat
    fallback.appearance(gear)
    rig?.appearance(gear)
  }

  async function prepare() {
    if (loading || wanted === active || prepared?.breed === wanted) return
    const next = loading = wanted
    try {
      const { loadLabrador } = await import('./lab.js')
      const model = await loadLabrador(next, createPickup)
      if (wanted !== next) model.dispose()
      else prepared = { model, breed: next }
    } catch { /* Retain the current dog if a download is unavailable. */ }
    finally {
      loading = undefined
      if (wanted !== next) void prepare()
    }
  }
  void prepare()

  return {
    modelReady: () => Boolean(rig),
    activeBreed: () => active,
    canCarry: () => Boolean(rig),
    chooseBreed(next) {
      if (inspection || next === wanted) return
      wanted = next
      prepared?.model.dispose()
      prepared = undefined
      void prepare()
    },
    installPrepared() {
      if (!prepared || (rig && !maySwap())) return
      rig?.dispose()
      rig = prepared.model
      active = prepared.breed
      prepared = undefined
      rig.root.visible = false
      root.add(rig.root)
      appearance()
      return true
    },
    reset() { fallback.reset(); rig?.reset() },
    moveTo(target) { target.add(root, shadow, fallback.root) },
    appearance(value) {
      equipment = value
      if (!rig || active === wanted) appearance()
    },
    pose(pose) {
      const height = pose.height
      shadow.position.set(pose.x, pose.ground + .039, pose.z)
      shadow.rotation.set(-Math.PI / 2, pose.heading, 0)
      shadow.scale.set(1.63 + height * .32, 2.86 + height * .29, 1)
      shadow.material.opacity = .68 / (1 + height * 1.8)
      if (!rig) {
        fallback.pose(pose)
        return
      }
      fallback.root.visible = false
      rig.root.visible = true
      root.position.set(pose.x, pose.ground + height, pose.z)
      root.rotation.y = pose.heading
      root.updateWorldMatrix(true, false)
      rig.pose(pose)
    },
  }
}
