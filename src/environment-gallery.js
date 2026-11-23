import * as T from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { cornModel } from './corn.js'
import { environmentAssets } from './environment-assets.js'
import { forestModel, forestSurface } from './forest-models.js'

const host = document.querySelector('#scene')
const caption = document.querySelector('#caption')
const controls = [...document.querySelectorAll('button[data-view]')]
let renderer
try { renderer = new T.WebGLRenderer({ antialias: true }) }
catch { caption.textContent = 'A WebGL 2 browser is required to inspect the models.' }
if (renderer) showGallery(renderer)

function showGallery(renderer) {
  const scene = new T.Scene()
  scene.background = new T.Color(0x73867f)
  scene.fog = new T.Fog(0x73867f, 25, 55)
  const samples = new T.Group()
  scene.add(samples, new T.HemisphereLight(0xe1ecf3, 0x9c7951, 1.55))
  const sun = new T.DirectionalLight(0xffe1b3, 2.3)
  sun.position.set(-3, 6, 4)
  scene.add(sun)
  const plane = new T.Mesh(new T.PlaneGeometry(100, 100), new T.MeshLambertMaterial({ color: 0x706b52 }))
  plane.rotation.x = -Math.PI / 2
  plane.position.y = -.015
  scene.add(plane)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
  renderer.toneMapping = T.ACESFilmicToneMapping
  host.append(renderer.domElement)
  const camera = new T.PerspectiveCamera(43, 1, .04, 100)
  const orbit = new OrbitControls(camera, renderer.domElement)
  orbit.enableDamping = true
  const woody = forestSurface()
  const crop = new T.MeshLambertMaterial({ side: T.DoubleSide, vertexColors: true })
  const plantGeometry = [cornModel(), cornModel(true)]
  let selection = 0
  async function select(name) {
    const selected = ++selection
    for (const control of controls) control.setAttribute('aria-pressed', String(control.dataset.view === name))
    samples.clear()
    let geometries, material, height
    if (name === 'trees' || name === 'grass') {
      caption.textContent = 'Loading optimized models…'
      const pack = await environmentAssets.request(name)
      if (selected !== selection) return
      if (!pack) {
        caption.textContent = 'This optional pack is missing. The game uses its original scenery when the pack is unavailable.'
        return
      }
      geometries = pack.models
      material = pack.material
      height = name === 'trees' ? 5 : .34
      caption.textContent = name === 'trees' ? 'EFX’s tree2 and TreeSmall with their shared 512 px cutout atlas. The game uses these at a distance.'
        : 'Nicholas-3D’s low wheat grass and dense grass clump, reduced to two color textures on one atlas. Drag to orbit.'
    } else if (name === 'corn') {
      geometries = plantGeometry
      material = crop
      height = 1.55
      caption.textContent = 'Original mature autumn corn and harvest stubble. The tall stalk has curved leaves, ears and a tassel.'
    } else {
      geometries = (name === 'south' ? ['cypress', 'oak'] : ['birch', 'snowPine']).map(forestModel)
      material = woody
      height = 1
      caption.textContent = name === 'south' ? 'Original bald cypress with flared roots, knees and hanging moss, alongside flooded oak.'
        : 'Original paper birch and a snow-covered conifer, with both leaf and needle silhouettes on the same atlas.'
    }
    geometries.forEach((geometry, index) => {
      const mesh = new T.Mesh(geometry, material)
      geometry.computeBoundingBox()
      mesh.position.set((index ? 1 : -1) * height * .54, -geometry.boundingBox.min.y, 0)
      samples.add(mesh)
    })
    const bounds = new T.Box3().setFromObject(samples)
    const center = bounds.getCenter(new T.Vector3())
    const size = bounds.getSize(new T.Vector3())
    const vertical = Math.tan(T.MathUtils.degToRad(camera.fov * .5))
    const distance = 1.13 * Math.max(size.y, size.x / camera.aspect) / (2 * vertical) + size.z * .55
    camera.position.set(center.x + height * .14, center.y + height * .15, distance)
    orbit.target.copy(center)
    orbit.maxDistance = distance * 2.5
    orbit.minDistance = height * .50
    orbit.update()
  }
  for (const control of controls) control.addEventListener('click', () => select(control.dataset.view))
  const resize = () => {
    camera.aspect = host.clientWidth / host.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(host.clientWidth, host.clientHeight, false)
  }
  new ResizeObserver(resize).observe(host)
  resize()
  select('trees')
  renderer.setAnimationLoop(() => {
    orbit.update()
    renderer.render(scene, camera)
  })
}
