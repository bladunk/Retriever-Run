export const feedbackKinds = {
  bug: 'Report a bug',
  suggestion: 'Suggest an improvement',
  note: 'Send a note',
  unfair: 'Report an unfair death',
}
export const unfairReasons = ['Obstacle appeared too late', 'Swipe did not respond', 'Jump did not respond',
  'Slide did not respond', 'Collision looked incorrect', 'No reachable safe path', 'Wildlife attack looked unavoidable',
  'Game stuttered', 'Misleading object', 'Something else']
export const screenshotLimit = 192 * 1024
const pendingKey = 'retriever-run.feedback.pending.v1'
const receiptKey = 'retriever-run.feedback.receipts.v1'

function read(storage, key) {
  try {
    const saved = JSON.parse(storage.getItem(key))
    return Array.isArray(saved) ? saved : []
  } catch { return [] }
}

function write(storage, key, values) {
  try {
    storage.setItem(key, JSON.stringify(values))
    return true
  } catch { return false }
}

export function feedbackStore(storage) {
  return {
    pending: () => read(storage, pendingKey).slice(0, 3),
    receipts: () => read(storage, receiptKey).slice(0, 12),
    queue(report) {
      const pending = read(storage, pendingKey)
      if (pending.some(item => item.id === report.id)) return true
      if (pending.length >= 3) return false
      return write(storage, pendingKey, [...pending, report])
    },
    cancel(id) {
      return write(storage, pendingKey, read(storage, pendingKey).filter(item => item.id !== id))
    },
    delivered(report, reference) {
      const saved = read(storage, receiptKey).filter(item => item.id !== report.id)
      if (!write(storage, receiptKey, [{ id: report.id, secret: report.secret, reference, updates: report.updates },
        ...saved].slice(0, 12))) return false
      return this.cancel(report.id)
    },
    forget(id) {
      return write(storage, receiptKey, read(storage, receiptKey).filter(item => item.id !== id))
    },
  }
}

export function createFeedback({ kind, subject, message, topic = '', build, attachment, updates }, random = crypto) {
  if (!Object.hasOwn(feedbackKinds, kind)) throw new Error('Invalid report category')
  subject = subject.trim()
  message = message.trim()
  if (subject.length > 120 || message.length > 2000 || (!message && !subject && !topic)) {
    throw new Error('Add a reason or a short description before sending.')
  }
  const secret = Array.from(random.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join('')
  return { id: random.randomUUID(), secret, kind, subject, message, topic: topic.slice(0, 80),
    version: build.version, build: build.id, updates: Boolean(updates), ...attachment }
}

export async function prepareScreenshot(file, document) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > 8 * 1024 * 1024) {
    throw new Error('Choose a JPEG, PNG or WebP image under 8 MB.')
  }
  const source = URL.createObjectURL(file)
  try {
    const image = document.createElement('img')
    image.src = source
    await image.decode()
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 30_000_000) {
      throw new Error('Choose a smaller image.')
    }
    const scale = Math.min(1, 800 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d', { alpha: false })
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const jpeg = canvas.toDataURL('image/jpeg', .69).split(',')[1]
    if (!jpeg || jpeg.length * .75 > screenshotLimit) throw new Error('Choose a smaller image.')
    return jpeg
  } finally {
    URL.revokeObjectURL(source)
  }
}
