import { createFeedback, feedbackKinds, feedbackStore, prepareScreenshot, unfairReasons } from './support-report.js'
import { createSupportTransport } from './support-transport.js'
import { openFieldUpdates } from './support-updates.js'
import './support.css'

const delivery = createSupportTransport()
const store = feedbackStore({
  getItem: key => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
})
let draining

export function element(tag, value, className) {
  const node = document.createElement(tag)
  if (value != null) node.textContent = value
  if (className) node.className = className
  return node
}

export function button(label, action) {
  const node = element('button', label)
  node.type = 'button'
  node.addEventListener('click', action)
  return node
}

function field(label, input) {
  const row = element('label', label, 'support-field')
  row.append(input)
  return row
}

function limit(tag, len) {
  const node = element(tag)
  node.maxLength = len
  return node
}

async function send(report) {
  const response = await delivery.send(report)
  if (response.status === 'ok' && typeof response.reference === 'string') store.delivered(report, response.reference)
  return response
}

export async function retryFeedback() {
  if (!navigator.onLine || draining) return draining
  const pending = store.pending()
  if (!pending.length) return
  draining = (async () => {
    for (const report of pending) {
      if (!store.pending().some(item => item.id === report.id)) continue
      const result = await send(report)
      if (result.status !== 'ok') break
    }
  })().finally(() => { draining = undefined })
  return draining
}

export function showSupport({ kind, source, build, diagnostics, fixture }) {
  if (kind === 'updates') return openFieldUpdates(source)
  const dialog = element('dialog', null, 'support-panel')
  dialog.setAttribute('aria-labelledby', 'support-title')
  const title = element('h2', 'Player feedback')
  title.id = 'support-title'
  const content = element('div')
  const head = element('div', null, 'support-heading')
  const close = button('Close', () => dialog.close())
  head.append(title, close)
  dialog.append(head, content)
  dialog.addEventListener('close', () => {
    dialog.remove()
    if (source?.isConnected) source.focus()
  }, { once: true })
  function home() {
    title.textContent = 'Player feedback'
    content.replaceChildren(element('p', 'Share field observations with the developer. Sending feedback is optional.'))
    const routes = element('div', null, 'support-routes')
    for (const key of ['bug','suggestion','note']) routes.append(button(feedbackKinds[key], () => formFor(key)))
    content.append(routes)
    const pending = fixture ? [] : store.pending()
    const receipts = fixture ? [] : store.receipts()
    if (pending.length) {
      content.append(element('h3', 'Saved for delivery'))
      for (const item of pending) {
        const row = element('div', null, 'support-receipt')
        row.append(element('span', item.subject || feedbackKinds[item.kind]),
          button('Cancel pending report', () => { store.cancel(item.id); home() }))
        content.append(row)
      }
      content.append(button('Retry pending reports', async event => {
        event.currentTarget.disabled = true
        await retryFeedback()
        home()
      }))
    }
    if (receipts.length) {
      content.append(element('h3', 'Report receipts'))
      for (const receipt of receipts) {
        const row = element('div', null, 'support-receipt')
        const state = element('p', 'Report ' + receipt.reference)
        state.setAttribute('role','status')
        row.append(state)
        if (receipt.updates) row.append(button('Check for a fix', async () => {
          const { status } = await delivery.receipt(receipt, 'status')
          state.textContent = status === 'verified' ? 'A fix for report ' + receipt.reference + ' was verified.'
            : status === 'received' ? 'No verified fix yet for ' + receipt.reference + '.'
            : status === 'unknown' ? 'This receipt has expired or the report was removed.' : 'Updates are unavailable right now.'
        }))
        row.append(button('Delete sent report', async () => {
          if (!confirm('Remove this submitted report and its attachments?')) return
          const { status } = await delivery.receipt(receipt, 'delete')
          if (status === 'deleted' || status === 'unknown') {
            store.forget(receipt.id)
            home()
          } else state.textContent = 'The report could not be removed. Try again while connected.'
        }))
        content.append(row)
      }
    }
  }

  function formFor(category) {
    title.textContent = feedbackKinds[category]
    const form = element('form')
    const subject = limit('input', 120)
    const message = limit('textarea', 2000)
    message.rows = 4
    const topic = element('select')
    topic.append(element('option', 'Choose a reason'))
    topic.options[0].value = ''
    unfairReasons.forEach(reason => topic.append(element('option', reason)))
    const upload = element('input')
    upload.type = 'file'
    upload.accept = 'image/jpeg,image/png,image/webp'
    const image = element('img')
    image.alt = 'Selected screenshot preview'
    image.hidden = true
    let screenshot
    let selected = 0
    let preparing = false
    const remove = button('Remove screenshot', () => {
      ++selected
      preparing = false
      screenshot = undefined
      upload.value = ''
      image.removeAttribute('src')
      image.hidden = remove.hidden = true
    })
    remove.hidden = true
    const consent = element('input')
    consent.type = 'checkbox'
    const updates = element('input')
    updates.type = 'checkbox'
    const review = element('pre', null, 'support-preview')
    review.hidden = true
    let attached
    consent.addEventListener('change', () => {
      attached = consent.checked ? diagnostics() : undefined
      review.hidden = !consent.checked
      review.textContent = attached ? JSON.stringify(attached, null, 2) : ''
    })
    const status = element('p', '', 'support-status')
    status.setAttribute('role', 'status')
    upload.addEventListener('change', async () => {
      const serial = ++selected
      screenshot = undefined
      image.hidden = remove.hidden = true
      image.removeAttribute('src')
      if (!upload.files[0]) { preparing = false; return }
      preparing = true
      status.textContent = 'Preparing screenshot…'
      try {
        const selectedImage = await prepareScreenshot(upload.files[0], document)
        if (serial !== selected) return
        screenshot = selectedImage
        image.src = 'data:image/jpeg;base64,' + screenshot
        image.hidden = remove.hidden = false
        status.textContent = 'Screenshot ready to review.'
      } catch (error) {
        if (serial === selected) status.textContent = error.message
      } finally { if (serial === selected) preparing = false }
    })
    const sendButton = element('button', 'Send report', 'support-primary')
    const save = button('Save for later', () => {
      if (!report || fixture) return
      if (store.queue(report)) home()
      else status.textContent = 'This browser could not save the report. Check the pending list or available space.'
    })
    save.hidden = true
    let report
    form.addEventListener('submit', async event => {
      event.preventDefault()
      if (sendButton.disabled || preparing) return
      try {
        report ??= createFeedback({ kind: category, subject: subject.value, message: message.value,
          topic: category === 'unfair' ? topic.value : '', build, updates: updates.checked,
          attachment: { ...(screenshot && { screenshot }), ...(attached && { diagnostics: attached }) } })
      } catch (error) { status.textContent = error.message; return }
      for (const field of [subject,message,topic,upload,remove,consent,updates]) field.disabled = true
      sendButton.disabled = true
      save.hidden = true
      status.textContent = 'Sending report…'
      const result = fixture
        ? fixture === 'offline' ? { status: 'unavailable' } : fixture === 'failed' ? { status: 'not_configured' }
          : { status: 'ok', reference: 'DEMO-011' }
        : await send(report)
      if (!dialog.open) return
      if (result.status === 'ok' && result.reference) {
        title.textContent = fixture ? 'Preview of report confirmation' : 'Report received'
        content.replaceChildren(element('p', 'Reference ' + result.reference),
          element('p', fixture ? 'This example did not send any information.' : 'The developer can review your report in the private inbox.'),
          button('Back to feedback', home))
        return
      }
      sendButton.disabled = false
      sendButton.textContent = 'Retry delivery'
      save.hidden = Boolean(fixture) || result.status === 'invalid'
      status.textContent = fixture === 'offline' || !navigator.onLine ? 'Offline. A connection is required to deliver this report.'
        : result.status === 'invalid' ? 'The service rejected the report format. Go back to write a new report.'
          : result.status === 'rate_limited' ? 'Feedback is temporarily at capacity. Please try again later.'
            : 'The feedback service is unavailable. Your report has not been confirmed.'
    })
    if (fixture) form.append(element('p', 'Art Studio example. No information is sent or saved.', 'support-status'))
    form.append(element('p', 'Game version ' + build.version + ' · ' + build.id + ' is included. Leave out names, contact details and other personal information. Young players should ask a parent or guardian before sending.'))
    if (category === 'unfair') form.append(field('What seemed unfair?', topic))
    form.append(field('Short description (optional)', subject),
      field(category === 'suggestion' ? 'Your idea (optional with description)' : 'What happened? (optional with description)', message),
      field('Choose a screenshot (optional)', upload), image, remove,
      field('Include technical details about this game session', consent),
      element('small', category === 'unfair' ? 'Includes graphics settings, recent frame timing and what happened around the collision.'
        : 'Includes graphics settings and recent frame timing when available.'), review,
      field('Let me check for a verified fix using this receipt', updates), sendButton, save, status)
    content.replaceChildren(button('All feedback options', home), form)
  }
  document.body.append(dialog)
  if (kind === 'unfair') formFor(kind)
  else if (Object.hasOwn(feedbackKinds, kind)) formFor(kind)
  else home()
  dialog.showModal()
}
