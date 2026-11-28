import { node } from './lodge-elements.js'
import './connected-share.css'

const width = 960
const ink = '#f5ecd8'
const brass = '#d6b478'
const green = '#18291f'

export function shareSize(square) {
  return { width, height: square ? width : 1280 }
}

function photo(source) {
  if (!source || typeof source !== 'string') return Promise.resolve(source)
  const url = new URL(source,document.baseURI)
  if (url.origin !== location.origin) return Promise.reject(new Error('Image is not local'))
  const image = new Image()
  image.src = url.href
  return image.decode().then(() => image)
}

function fillImage(context, image, x, y, w, h, centerY = .5) {
  if (!image) return
  const scale = Math.max(w / image.width, h / image.height)
  const sw = w / scale
  const sh = h / scale
  context.drawImage(image, (image.width-sw)/2, (image.height-sh)*centerY, sw, sh, x, y, w, h)
}

function label(context, value, x, y, size, color = ink, face = 'Georgia', max = 848) {
  context.font = size + 'px ' + face
  context.fillStyle = color
  context.textBaseline = 'alphabetic'
  context.fillText(String(value),x,y,max)
}

export async function buildShareImage(model, { square = false, includeName = false } = {}) {
  const { height } = shareSize(square)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { alpha:false })
  try {
    const image = await photo(model.image)
    const emblems = await Promise.all((model.exhibits ?? []).slice(0,3).map(async item =>
      ({...item, photo:await photo(item.image)})))
    const endOfPhoto = model.kind === 'hunt' ? (square ? 490 : 660) : height-265
    context.fillStyle = green
    context.fillRect(0,0,width,height)
    fillImage(context,image,18,172,width-36,endOfPhoto-172,model.kind === 'lodge' ? .48 : .5)
    const shade = context.createLinearGradient(0,endOfPhoto-160,0,endOfPhoto)
    shade.addColorStop(0,'transparent')
    shade.addColorStop(1,green)
    context.fillStyle = shade
    context.fillRect(18,endOfPhoto-160,width-36,161)
    context.strokeStyle = brass
    context.lineWidth = 2
    context.strokeRect(18,18,width-36,height-36)
    label(context,'Retriever Run',58,101,65)
    label(context,'THE GREAT MIGRATION',60,140,23,brass,'sans-serif')
    label(context,model.title,58,endOfPhoto+42,47)
    let y = endOfPhoto+80
    if (includeName && model.name) {
      label(context,model.name,60,y,28,brass)
      y += 41
    }
    if (model.kind === 'hunt') {
      for (const [name,value] of model.metrics) {
        label(context,name,60,y,27,brass,'sans-serif',350)
        label(context,value,410,y,34,ink,'Georgia',486)
        y += square ? 46 : 57
      }
    } else {
      if (emblems.length) {
        for (const [index, item] of emblems.entries()) {
          const x = 60 + index*275
          fillImage(context,item.photo,x,y+13,51,46)
          label(context,item.title,x+61,y+41,22,ink,'sans-serif',204)
        }
      }
      for (const [index, line] of (model.notes ?? []).slice(0,2).entries())
        label(context,line,60,y + (emblems.length ? 86 : 25) + index*34,23,ink,'sans-serif')
    }
    label(context,model.footer,60,height-50,21,brass,'sans-serif')
    return await new Promise((resolve,reject) => canvas.toBlob(blob =>
      blob ? resolve(blob) : reject(new Error('Image could not be saved')), 'image/jpeg', .93))
  } finally {
    canvas.width = canvas.height = 1
  }
}

function control(label, action) {
  const button = node('button',label)
  button.type = 'button'
  button.addEventListener('click',action)
  return button
}

export function openSharePreview(source, model) {
  const dialog = node('dialog',null,'connected-share')
  dialog.setAttribute('aria-label','Share preview')
  const header = node('div',null,'connected-share-title')
  header.append(node('h3','Share preview'),control('Close',() => dialog.close()))
  const picture = node('img')
  picture.alt = model.title + ' share image preview'
  const status = node('p')
  status.setAttribute('role','status')
  const optional = node('label',model.kind === 'dog' ? 'Include dog name' : 'Include public nickname')
  const name = node('input')
  name.type = 'checkbox'
  optional.prepend(name)
  optional.hidden = !model.name
  const shape = control('Use square',() => {
    square = !square
    shape.textContent = square ? 'Use portrait' : 'Use square'
    void draw()
  })
  const save = node('a','Save image')
  const native = control('Share image',async () => {
    if (!file) return
    try { await navigator.share({ files:[file], title:model.title }) }
    catch (error) { if (error.name !== 'AbortError') status.textContent = 'Sharing is unavailable. Use Save image.' }
  })
  dialog.append(header,picture,optional,shape,save,native,status)
  document.body.append(dialog)
  let square = false
  let serial = 0
  let objectURL
  let file
  function release() {
    if (objectURL) URL.revokeObjectURL(objectURL)
    objectURL = file = undefined
  }
  async function draw() {
    const stamp = ++serial
    save.hidden = native.hidden = true
    status.textContent = 'Preparing image…'
    try {
      const blob = await buildShareImage(model,{ square, includeName:name.checked })
      if (!dialog.open || stamp !== serial) return
      release()
      objectURL = URL.createObjectURL(blob)
      file = new File([blob],'retriever-run-' + model.kind + '.jpg',{ type:blob.type })
      picture.src = objectURL
      save.href = objectURL
      save.download = file.name
      save.hidden = false
      try { native.hidden = !(typeof navigator.share === 'function' && navigator.canShare?.({ files:[file] })) }
      catch { native.hidden = true }
      status.textContent = ''
    } catch {
      if (stamp === serial) status.textContent = 'Image could not be prepared. Close and try again.'
    }
  }
  name.addEventListener('change',draw)
  dialog.addEventListener('close',() => {
    serial++
    release()
    if (model.image instanceof HTMLCanvasElement) model.image.width = model.image.height = 1
    dialog.remove()
    source?.focus({ preventScroll:true })
  },{ once:true })
  dialog.showModal()
  void draw()
}
