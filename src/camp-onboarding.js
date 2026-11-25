import { campNickname } from './camp-rules.js'
import { nameMessages } from './camp-ui.js'

export function restoreEnrollment(lodge, camp) {
  for (const player of lodge.players()) {
    if (player.enrollment === 'returning' || player.enrollment === 'worldwide') continue
    const member = camp.member(player.id)
    if (member) lodge.enroll(player.id, member.nickname, 'worldwide')
  }
}

export function createOnboarding(ui, lodge, camp, onComplete, onStart) {
  const dialog = ui.onboarding
  const form = ui['onboarding-form']
  const input = ui['camp-name']
  const message = ui['onboarding-status']
  const join = ui['camp-join']
  const guest = ui['camp-guest']
  const welcome = ui['camp-welcome']
  const privacy = ui['camp-privacy']
  let playerId
  let pending = false

  function updateConnection() {
    if (!dialog.open || pending || form.hidden) return
    join.disabled = !camp.available || !camp.online()
    message.textContent = join.disabled ? 'Worldwide Camp is unavailable. You can begin in Guest Camp.' : ''
  }

  function changeBusy(busy) {
    pending = busy
    input.readOnly = busy
    guest.disabled = busy
    join.disabled = busy || !camp.available || !camp.online()
    form.setAttribute('aria-busy', String(busy))
  }

  function complete(name, mode) {
    const saved = lodge.enroll(playerId, name, mode)
    form.hidden = privacy.hidden = true
    welcome.hidden = false
    ui['camp-greeting'].textContent = 'Welcome to camp, ' + name
    ui['camp-enrollment-note'].textContent = saved
      ? mode === 'guest' ? 'You’re playing in Guest Camp. You can join Worldwide Camp in the Lodge.' : 'Your first hunt awaits.'
      : 'Browser storage is unavailable. Your profile may only last for this visit.'
    onComplete()
    ui['camp-run'].focus({ preventScroll: true })
  }

  function chosenName() {
    const name = campNickname(input.value)
    input.setAttribute('aria-invalid', String(!name))
    if (name) input.value = name
    else {
      message.textContent = nameMessages.invalid_name
      input.focus({ preventScroll: true })
    }
    return name
  }

  form.addEventListener('submit', async event => {
    event.preventDefault()
    if (join.disabled || pending) return
    const name = chosenName()
    if (!name) return
    changeBusy(true)
    message.textContent = 'Reserving your camp name…'
    const member = camp.member(playerId)
    const result = member ? { status: 'ok' } : await camp.join(playerId, name)
    changeBusy(false)
    if (result.status === 'ok') complete(camp.member(playerId).nickname, 'worldwide')
    else message.textContent = nameMessages[result.status] ?? nameMessages.unavailable
  })
  guest.addEventListener('click', () => {
    if (pending) return
    const name = chosenName()
    if (name) complete(name, 'guest')
  })
  dialog.addEventListener('cancel', event => {
    if (pending) event.preventDefault()
  })
  ui['camp-skip'].addEventListener('click', () => { if (!pending) dialog.close() })
  ui['camp-menu'].addEventListener('click', () => {
    dialog.close()
    ui.primary.focus({ preventScroll: true })
  })
  ui['camp-run'].addEventListener('click', () => {
    dialog.close()
    onStart()
  })
  window.addEventListener('online', updateConnection)
  window.addEventListener('offline', updateConnection)
  return {
    open() {
      const player = lodge.current()
      if (dialog.open || player.enrollment) return
      playerId = player.id
      dialog.showModal()
      updateConnection()
      ui['onboarding-title'].focus({ preventScroll: true })
    },
  }
}
