import { node, number, meters, duration, rows } from './lodge-elements.js'
import { nameMessages } from './camp-ui.js'
import { rankedMetrics, verifiedHonorNames } from './ranked-camp.js'

const messages = {
  offline: 'You’re offline. Local hunts and records are available.',
  reconnect: 'Reconnect your Worldwide nickname from Competitive profile.',
  profile_required: 'Join Worldwide Camp from Competitive profile to use this room.',
  closed: 'The new competition is closed until the production review. Local hunts are ready.',
  unavailable: 'Camp is temporarily unavailable. Your local progress is safe.',
  rate_limited: 'Too many requests recently. Try again later.',
  invalid_code: 'That code did not match an available invitation.',
  invalid_name: 'Use 3–20 characters, with letters or numbers at each end.',
  not_found: 'This entry is no longer available to you.',
  already_exists: 'A friendship or request already exists.',
  limit: 'This connection or Camp has reached its membership limit.',
  owner_must_transfer: 'Transfer ownership or close the Camp before leaving.',
  queue_full: 'Three results are waiting. Sync one before starting another ranked hunt.',
}
const feedback = response => messages[response.status] ?? 'Camp could not complete that request.'
const playedAt = new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' })
const moveValue = (metric, value) => metric === 'distance' ? meters(value) :
  metric === 'duration' ? duration(value / 1000) : number(value)

function action(label, click, className) {
  const button = node('button', label, className)
  button.type = 'button'
  button.addEventListener('click', click)
  return button
}

function select(label) {
  const control = node('select')
  control.setAttribute('aria-label', label)
  for (const [key, name] of Object.entries(rankedMetrics)) {
    const option = node('option', name)
    option.value = key
    control.append(option)
  }
  return control
}

function inputForm(label, submit, invoke, maxLength = 36) {
  const form = node('form', null, 'ranked-form')
  const field = node('input')
  field.required = true
  field.maxLength = maxLength
  field.spellcheck = false
  field.autocomplete = 'off'
  field.setAttribute('aria-label', label)
  const button = node('button', submit)
  button.type = 'submit'
  form.append(node('p', label, 'room-note'), field, button)
  form.addEventListener('submit', async event => {
    event.preventDefault()
    if (button.disabled) return
    button.disabled = true
    try { if (await invoke(field.value.trim())) field.value = '' }
    finally { button.disabled = false }
  })
  return form
}

function shareCode(label, code) {
  const field = node('input')
  field.value = code
  field.readOnly = true
  field.setAttribute('aria-label', label)
  field.addEventListener('focus', () => field.select())
  const group = node('div', null, 'ranked-code')
  group.append(node('p', label, 'room-note'), field)
  return group
}

function shell(title) {
  const section = node('section', null, 'ranked-camp')
  const status = node('p', '', 'room-note')
  status.setAttribute('role', 'status')
  section.append(node('h3', title, 'section-title'), status)
  return { section, status }
}

function recordRows(records) {
  return rows(Object.entries(rankedMetrics).filter(([key]) => Number.isSafeInteger(records?.[key]) &&
      records[key] > 0).map(([key, label]) => [label, moveValue(key, records[key])]))
}

function ranking(camp, player, scope, campId, onReady) {
  const { section, status } = shell(scope === 'worldwide' ? 'Worldwide rankings' : 'Verified standings')
  const version = node('p', '', 'room-note ranked-version')
  const picker = select('Ranking category')
  const own = node('section', null, 'own-ranking')
  const rivals = node('section', null, 'ranked-rivals')
  const list = node('ol', null, 'camp-board worldwide-roster')
  const profile = node('section', null, 'ranked-public-profile')
  let offset = 0
  let request = 0
  let profileRequest = 0
  const next = action('Show 25 more', () => void load(offset))
  const retry = action('Refresh rankings', () => void load(0, true))
  next.hidden = true
  section.append(version, picker, own, rivals, list, next, retry, profile)
  picker.addEventListener('change', () => void load())

  function showProfile(nickname, button) {
    const stamp = ++profileRequest
    profile.textContent = 'Loading verified profile…'
    void camp.publicProfile(nickname).then(result => {
      if (stamp !== profileRequest || !profile.isConnected) return
      profile.replaceChildren()
      if (result.status !== 'ok') profile.textContent = feedback(result)
      else profile.append(node('h4', result.nickname), node('p', 'Replay-verified personal bests', 'room-note'), ...recordRows(result.records))
      profile.append(action('Close competitive profile', () => {
        profile.replaceChildren()
        button.focus()
      }))
      profile.scrollIntoView({ block: 'nearest' })
    })
  }

  async function load(from = 0, refresh = false) {
    const stamp = ++request
    const metric = picker.value
    if (!from) {
      ++profileRequest
      profile.replaceChildren()
      own.replaceChildren()
      rivals.replaceChildren()
      list.replaceChildren()
    }
    next.disabled = true
    status.textContent = 'Loading verified rankings…'
    const result = await camp.board(player.id, metric, scope, campId, from, refresh)
    if (stamp !== request || !section.isConnected) return
    next.disabled = false
    next.hidden = result.status !== 'ok' || !result.has_more || Boolean(result.stale)
    if (result.status !== 'ok') { status.textContent = feedback(result); return }
    onReady?.(result)
    if (!from) {
      version.textContent = 'Great Migration 1 · ' + (result.open ? 'Open' : 'Launch review') +
        (result.as_of && Number.isFinite(Date.parse(result.as_of)) ? ' · Checked ' + playedAt.format(new Date(result.as_of)) : '')
      version.title = result.course
      if (result.mine) own.append(node('strong', 'Your rank #' + result.mine.rank),
        node('p', 'Verified best · ' + moveValue(metric, result.mine.value), 'room-note'))
      else if (scope === 'worldwide') own.append(node('p', 'No verified best in this category yet.', 'room-note'))
      if (result.rivals.length) rivals.append(node('h4', 'Nearby rivals'))
      for (const rival of result.rivals) {
        const above = rival.rank < result.mine?.rank
        const gap = above ? rival.value - result.mine.value : result.mine.value - rival.value
        const by = metric === 'duration' ? (gap / 1000).toFixed(2) + ' s' : moveValue(metric, gap)
        const delta = gap === 0 ? 'Tied metric · record time breaks the tie' : by + (above ? ' ahead' : ' behind')
        rivals.append(node('p', '#' + rival.rank + ' ' + rival.nickname + ' · ' + delta))
      }
    }
    const onPage = new Set(Array.from(list.children, item => item.dataset.nickname))
    for (const item of result.rows) {
      if (onPage.has(item.nickname)) continue
      onPage.add(item.nickname)
      const row = node('li')
      row.dataset.nickname = item.nickname
      const details = action(item.nickname, () => showProfile(item.nickname, details), 'ranked-player')
      row.append(node('span', '#' + number(item.rank), 'board-rank'), details,
        node('strong', moveValue(metric, item.value), 'board-score'))
      list.append(row)
    }
    status.textContent = result.stale ? 'Showing the last downloaded standings.' :
      !list.children.length ? 'There are no verified records in this category yet.' : ''
    offset = from + 25
  }
  queueMicrotask(() => void load())
  return section
}

function worldwide(camp, player, start, navigate) {
  const region = node('div', null, 'ranked-overview')
  const state = node('p', '', 'room-note')
  state.setAttribute('role', 'status')
  let ticket
  const ranked = action('Prepare a ranked hunt', async () => {
    if (ticket && Date.parse(ticket.expires) > Date.now()) { start(ticket); return }
    ranked.disabled = true
    state.textContent = 'Requesting a ranked entry…'
    const response = await camp.ticket(player.id)
    if (!region.isConnected) return
    ranked.disabled = false
    if (response.status === 'ok') {
      ticket = response
      state.textContent = 'Entry ready. Your ranked hunt begins when you tap Start.'
      ranked.textContent = 'Start ranked hunt'
    } else state.textContent = feedback(response)
  }, 'primary')
  ranked.hidden = true
  const pending = action('Sync pending ranked results', async () => {
    pending.disabled = true
    const response = await camp.flush(player.id)
    if (!region.isConnected) return
    pending.disabled = false
    pending.hidden = !camp.pending(player.id)
    state.textContent = response.status === 'ok' || response.status === 'duplicate'
      ? 'Verified results synchronized.' : response.status === 'pending' ? 'Verification is still pending.' : feedback(response)
  })
  pending.hidden = !camp.pending(player.id)
  const board = ranking(camp, player, 'worldwide', null, result => {
    ranked.hidden = !result.open || !camp.member(player.id) || Boolean(result.stale)
    state.textContent = result.stale ? '' : result.open ?
      (camp.member(player.id) ? 'Ranked entry is optional. Ordinary hunts stay local.' : 'Join in Competitive profile to enter.') : messages.closed
  })
  region.append(board, state, ranked, pending, action('Competitive profile', () => navigate('camp-profile')))
  return region
}

function friends(camp, player) {
  const { section, status } = shell('Friends')
  const list = node('div')
  const standings = node('div')
  section.append(node('p', 'Connect by exact code. Both players must agree before records are compared.', 'room-note'),
    inputForm('Friend code', 'Send request', value => change('friend_request', { value })), list, standings)
  async function show() {
    const result = await camp.social(player.id, 'friends')
    if (!section.isConnected) return
    if (result.status !== 'ok') { status.textContent = feedback(result); return }
    list.replaceChildren(shareCode('Your friend code', result.code))
    if (!result.rows.length) list.append(node('p', 'No friends or requests yet.', 'room-note'))
    for (const friend of result.rows) {
      const entry = node('article', null, 'ranked-entry')
      entry.append(node('strong', friend.nickname), node('small',
        friend.state === 'incoming' ? 'Incoming request' : friend.state === 'outgoing' ? 'Request sent' : 'Friend'))
      if (friend.state === 'incoming') entry.append(action('Accept', () => void change('friend_accept', { target: friend.key })))
      entry.append(action(friend.state === 'incoming' ? 'Decline' : friend.state === 'outgoing' ? 'Cancel request' : 'Remove',
        () => void change('friend_remove', { target: friend.key })))
      list.append(entry)
    }
    standings.replaceChildren(ranking(camp, player, 'friends'))
  }
  async function change(command, options) {
    const result = await camp.social(player.id, command, options)
    if (!section.isConnected) return false
    status.textContent = result.status === 'ok' ? 'Friends updated.' : feedback(result)
    if (result.status === 'ok') await show()
    return result.status === 'ok'
  }
  queueMicrotask(() => void show())
  return section
}

function privateCamps(camp, player) {
  const { section, status } = shell('Private Camps')
  const list = node('div', null, 'ranked-camps')
  const detail = node('div')
  const entry = node('details', null, 'ranked-members')
  entry.append(node('summary', 'Create or join a Camp'), inputForm('Camp name', 'Create Camp', value => mutate('camp_create', { value }), 20),
    inputForm('Invitation code', 'Join Camp', value => mutate('camp_join', { value })))
  section.append(entry, list, detail)
  let selection
  let request = 0

  async function show() {
    const stamp = ++request
    const result = await camp.social(player.id, 'camps')
    if (stamp !== request || !section.isConnected) return
    if (result.status !== 'ok') { status.textContent = feedback(result); return }
    list.replaceChildren()
    if (!result.rows.length) {
      list.append(node('p', 'You haven’t joined a private Camp yet.', 'room-note'))
      entry.open = true
    }
    for (const item of result.rows) list.append(action(item.name, () => void open(item.id)))
    if (selection && result.rows.some(item => item.id === selection)) await open(selection)
    else { selection = undefined; detail.replaceChildren() }
  }

  async function open(campId) {
    const stamp = ++request
    selection = campId
    const result = await camp.social(player.id, 'camp_detail', { camp: campId })
    if (stamp !== request || !section.isConnected) return
    if (result.status !== 'ok') { status.textContent = feedback(result); detail.replaceChildren(); return }
    const members = node('details', null, 'ranked-members')
    members.append(node('summary', 'Members · ' + result.rows.length))
    for (const member of result.rows) {
      const row = node('div', null, 'ranked-entry')
      row.append(node('strong', member.nickname + (member.owner ? ' · Owner' : '')))
      if (result.owner && !member.self) row.append(
        action('Transfer ownership', () => ask(row, 'Transfer this Camp to ' + member.nickname + '?',
          () => mutate('camp_transfer', { camp: campId, target: member.key }))),
        action('Remove member', () => ask(row, 'Remove ' + member.nickname + ' from this Camp?',
          () => mutate('camp_remove', { camp: campId, target: member.key }))))
      members.append(row)
    }
    detail.replaceChildren(node('h4', result.name), members)
    if (result.owner) detail.append(shareCode('Camp invitation code', result.invite),
      action('Rotate invitation', () => void mutate('camp_rotate', { camp: campId })),
      action('Close Camp', () => ask(detail, 'Close this Camp for all members?',
        () => mutate('camp_delete', { camp: campId }))))
    else detail.append(action('Leave Camp', () => ask(detail, 'Leave this Camp?',
      () => mutate('camp_leave', { camp: campId }))))
    detail.append(ranking(camp, player, 'camp', campId))
  }

  async function mutate(command, data) {
    const result = await camp.social(player.id, command, data)
    if (!section.isConnected) return false
    status.textContent = result.status === 'ok' ? 'Camp updated.' : feedback(result)
    if (result.status === 'ok') {
      if (result.id) { selection = result.id; entry.open = false }
      await show()
    }
    return result.status === 'ok'
  }
  queueMicrotask(() => void show())
  return section
}

function ask(parent, message, confirm) {
  parent.querySelector('.ranked-confirmation')?.remove()
  const prompt = node('div', null, 'ranked-confirmation')
  prompt.append(node('p', message), action('Confirm', async () => { prompt.remove(); await confirm() }),
    action('Cancel', () => prompt.remove()))
  parent.append(prompt)
}

function competitiveProfile(camp, legacy, player, onJoin, onErase) {
  const { section, status } = shell('Competitive profile')
  const resultArea = node('div')
  const erase = node('details')
  erase.append(node('summary', 'Remove online Camp data'),
    node('p', 'This removes your public records, connections and Camps you still own. Transfer any Camp you want to keep. Your local progress stays on this device.', 'room-note'),
    inputForm('Type DELETE MY CAMP PROFILE', 'Remove my Camp data', async confirm => {
      if (confirm !== 'DELETE MY CAMP PROFILE') { status.textContent = 'Type the full confirmation to remove your Camp data.'; return false }
      const response = await camp.erase(player.id, confirm)
      if (!section.isConnected) return false
      status.textContent = response.status === 'ok' ? 'Your online Camp data was removed.' : feedback(response)
      if (response.status === 'ok') { onErase(player); await show() }
      return response.status === 'ok'
    }))
  const form = inputForm('Public nickname', 'Save or join', async name => {
    const result = await legacy.join(player.id, name)
    if (!section.isConnected) return false
    status.textContent = result.status === 'ok' ? 'Nickname saved.' : nameMessages[result.status] ?? feedback(result)
    if (result.status === 'ok') { onJoin(player, legacy.member(player.id)); await show() }
    return false
  }, 20)
  section.append(node('p', 'Camp shares your nickname and verified bests. Friends and private Camp members are visible within their groups.', 'room-note'),
    form, resultArea, erase,
    node('p', 'Camp uses an anonymous identity stored in this browser. Clearing site data or changing devices can lose access. Account recovery is unavailable. Career, dog and ownership stay on this device.', 'room-note'))
  async function show() {
    form.querySelector('input').value = legacy.member(player.id)?.nickname ?? player.nickname
    erase.hidden = !legacy.member(player.id)
    resultArea.replaceChildren()
    if (erase.hidden) return
    const result = await camp.social(player.id, 'profile')
    if (!section.isConnected) return
    const owned = verifiedHonorNames(camp.honors(player.id))
    if (result.status === 'ok') resultArea.append(node('h4', 'Verified public records'), ...recordRows(result.records))
    else resultArea.append(node('p', feedback(result), 'room-note'))
    if (owned.length) resultArea.append(node('h4', 'Competitive Field Honors'),
      node('p', owned.join(' · '), 'room-note'))
  }
  queueMicrotask(() => void show())
  return section
}

export function rankedRoom(room, camp, legacy, player, { start, navigate, onJoin, onErase }) {
  if (!camp.available) {
    const { section, status } = shell('Worldwide Camp')
    status.textContent = 'Online Camp is unavailable on this build. Local records and hunts are ready.'
    return section
  }
  if (room === 'friends') return friends(camp, player)
  if (room === 'private-camps') return privateCamps(camp, player)
  if (room === 'camp-profile') return competitiveProfile(camp, legacy, player, onJoin, onErase)
  return worldwide(camp, player, start, navigate)
}
