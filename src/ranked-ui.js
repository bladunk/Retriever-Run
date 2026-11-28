import { careerStanding } from './career.js'
import { completeMigrations } from './lodge-progress.js'
import { masteryReplayVersion, rankedVersion } from './ranked-replay.js'
import { node, number, meters, rows } from './lodge-elements.js'
import { nameMessages } from './camp-ui.js'
import { rankedMetrics, verifiedHonorNames } from './ranked-camp.js'

const messages = {
  offline: 'You’re offline. Local hunts and records are available.',
  reconnect: 'Reconnect your Worldwide nickname from Competitive profile.',
  auth_required: 'Your Worldwide session has expired. Reconnect from Competitive profile.',
  auth_unavailable: 'Worldwide sign-in is temporarily unavailable. Public rankings may still be available.',
  profile_required: 'Join Worldwide Camp from Competitive profile to use this room.',
  closed: 'Official Worldwide competition is closed. Local hunts and progress are available.',
  unavailable: 'Camp is temporarily unavailable. Your local progress is safe.',
  schema_missing: 'The Worldwide database API needs its migration or a schema refresh. Local hunts are available.',
  verifier_missing: 'The online verifier is not configured. Your eligible result is queued.',
  wrong_course: 'This course does not match the Worldwide ruleset. Check for a game update.',
  wrong_version: 'The Worldwide ruleset does not match this build. Check for a game update.',
  invalid_run: 'Worldwide rejected this result. Your local hunt was saved.',
  invalid_ticket: 'This ticket cannot be verified. Your local hunt was saved.',
  expired: 'This ranked ticket expired. Your local hunt was saved.',
  rate_limited: 'Too many requests recently. Try again later.',
  invalid_code: 'That code did not match an available invitation.',
  feature_closed: 'Public career snapshots are awaiting approval.',
  invalid: 'Check the profile details and try again.',
  invalid_name: 'Use 3–20 characters, with letters or numbers at each end.',
  not_found: 'This entry is no longer available to you.',
  already_exists: 'A friendship or request already exists.',
  limit: 'This connection or Camp has reached its membership limit.',
  owner_must_transfer: 'Transfer ownership or close the Camp before leaving.',
  queue_full: 'Three results are waiting. Sync one before starting another ranked hunt.',
}
const feedback = response => messages[response.status] ?? 'Camp could not complete that request.'
const playedAt = new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' })
function moveValue(metric, value) {
  if (metric === 'duration') {
    const minutes = Math.floor(value / 60_000)
    const seconds = (value % 60_000 / 1000).toFixed(3)
    return minutes ? minutes + ':' + seconds.padStart(6, '0') : seconds + ' s'
  }
  return metric === 'distance' ? meters(value) : number(value)
}

function standingsValue(metric, value) {
  if (metric !== 'duration') return moveValue(metric, value)
  const minutes = Math.floor(value / 60_000)
  return minutes + ':' + (value % 60_000 / 1000).toFixed(3).padStart(6, '0')
}

function action(label, click, className) {
  const button = node('button', label, className)
  button.type = 'button'
  button.addEventListener('click', click)
  return button
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
  const status = node('p', '', 'room-note')
  status.setAttribute('role','status')
  const copy = action('Copy code', async () => {
    try { await navigator.clipboard.writeText(code); status.textContent = 'Code copied.' }
    catch { field.focus(); field.select(); status.textContent = 'Select and copy the code above.' }
  })
  group.append(node('p', label, 'room-note'), field, copy)
  if (typeof navigator.share === 'function') group.append(action('Share code', async () => {
    try { await navigator.share({ title:'Retriever Run invitation', text:'Retriever Run · ' + label + ' ' + code }) }
    catch (error) { if (error.name !== 'AbortError') status.textContent = 'Sharing is unavailable. Copy the code instead.' }
  }))
  group.append(status)
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

function ranking(camp, player, scope, campId, onReady, season = masteryReplayVersion) {
  const worldwide = scope === 'worldwide'
  const { section, status } = shell(worldwide ? 'Worldwide standings' :
    scope === 'friends' ? 'Friends standings' : 'Private Camp standings')
  const version = node('div', '', 'room-note ranked-version')
  const population = node('p', '', 'room-note')
  const own = node('section', null, 'own-ranking')
  const rivals = node('section', null, 'ranked-rivals')
  const list = node('tbody')
  const table = node('table', null, 'worldwide-table')
  const viewport = node('div', null, 'worldwide-table-scroll')
  viewport.tabIndex = 0
  viewport.setAttribute('aria-label', worldwide ? 'Worldwide top 100 standings' : 'Private score standings')
  {
    const header = node('tr')
    for (const [short, full] of [['#', 'Official rank'], ['Hunter', 'Hunter'], ['Score', 'Highest score'],
      ['Dist.', 'Longest distance'], ['Time', 'Longest hunt'], ['Ret.', 'Most retrieves'], ['Combo', 'Longest combo']]) {
      const cell = node('th', short)
      cell.scope = 'col'
      cell.setAttribute('aria-label', full)
      header.append(cell)
    }
    const head = node('thead')
    head.append(header)
    table.append(head, list)
    viewport.append(table)
    viewport.hidden = true
  }
  const profile = node('section', null, 'ranked-public-profile')
  const compatibility = node('p', null, 'room-note')
  let offset = 0
  let request = 0
  let profileRequest = 0
  const next = action('Show 25 more', () => void load(offset))
  const retry = action('Refresh', () => void load(0, true))
  retry.setAttribute('aria-label', 'Refresh rankings')
  const toolbar = node('div', null, worldwide ? 'worldwide-toolbar' : 'ranked-toolbar')
  toolbar.append(population)
  toolbar.append(retry)
  next.hidden = true
  section.append(version, own, toolbar)
  section.append(viewport, compatibility)
  section.append(next, rivals, profile)

  let currentSeason = season
  let ownBests
  function showProfile(nickname, button, verified) {
    const stamp = ++profileRequest
    profile.textContent = 'Loading verified profile…'
    void camp.publicProfile(nickname, currentSeason).then(result => {
      if (stamp !== profileRequest || !profile.isConnected) return
      profile.replaceChildren()
      if (result.status !== 'ok' && !verified) profile.textContent = feedback(result)
      else {
        profile.append(node('h4', nickname), node('p', 'Replay-verified personal bests', 'room-note'),
          ...recordRows(result.records ?? verified))
        if (result.career) profile.append(node('p', 'Shared local career · Level ' + result.career.level +
          (result.career.migration_complete ? ' · Great Migration completed' : '') + ' · Unverified', 'room-note'))
        if (scope === 'friends' && ownBests) profile.append(node('h4','Your verified bests'), ...recordRows(ownBests))
      }
      profile.append(action('Close competitive profile', () => {
        profile.replaceChildren()
        button.focus()
      }))
      profile.scrollIntoView({ block: 'nearest' })
    })
  }

  async function load(from = 0, refresh = false) {
    const stamp = ++request
    const metric = 'score'
    if (!from) {
      ++profileRequest
      profile.replaceChildren()
      own.replaceChildren()
      delete own.dataset.nickname
      rivals.replaceChildren()
      list.replaceChildren()
      population.textContent = ''
      compatibility.textContent = ''
      viewport.hidden = true
    }
    next.disabled = true
    status.textContent = 'Loading verified rankings…'
    const result = await camp.board(player.id, metric, scope, campId, from, refresh, season)
    if (stamp !== request || !section.isConnected) return
    next.disabled = false
    next.hidden = result.status !== 'ok' || !result.has_more || Boolean(result.stale)
    onReady?.(result)
    if (result.status !== 'ok') { status.textContent = feedback(result); return }
    if (!from) {
      currentSeason = result.season
      ownBests = result.mine?.bests ?? result.rows.find(row => row.nickname === result.mine?.nickname)?.bests
      compatibility.textContent = result.scoresOnly
        ? 'Official score rankings are available. The other verified bests are temporarily unavailable.'
        : 'Official rank follows verified score. Each column shows a separate personal best.'
      const name = (result.season === masteryReplayVersion ? 'Mastery' : 'Great Migration 1') +
        (season === rankedVersion ? ' · Archived' : result.open ? ' · Open' : ' · Competition closed')
      const details = node('details')
      details.append(node('summary','Season details'), node('p', result.course))
      if (result.as_of && Number.isFinite(Date.parse(result.as_of))) details.append(node('p','Last synced ' + playedAt.format(new Date(result.as_of))))
      version.replaceChildren(node('span',name), details)
      if (Number.isSafeInteger(result.total_ranked)) population.textContent = (worldwide ? 'Top 100 · ' : '') + number(result.total_ranked) + ' ranked'
      if (result.open && camp.member(player.id) && !result.mine && !result.stale && !result.authStatus)
        own.append(node('p','You have no verified score this season.','room-note'))
      if (result.mine) {
        own.dataset.nickname = result.mine.nickname
        own.append(node('strong', 'Your rank #' + result.mine.rank),
          node('p', 'Verified best · ' + moveValue(metric, result.mine.value), 'room-note'))
      }
      if (result.mine && result.total_ranked >= 5 && !result.stale && !result.legacyFallback && Number.isFinite(result.percentile))
        own.append(node('p', 'Scored above ' + result.percentile + '% of other ranked hunters', 'room-note'))
      if (result.rivals.length) rivals.append(node('h4', 'Nearby rivals'))
      for (const rival of result.rivals) {
        const above = rival.rank < result.mine?.rank
        const gap = above ? rival.value - result.mine.value : result.mine.value - rival.value
        const delta = above ? moveValue(metric, gap + 1) + ' more to pass' : gap ? moveValue(metric, gap) + ' behind' : 'Tied best · later record'
        rivals.append(node('p', '#' + rival.rank + ' ' + rival.nickname + ' · ' + delta))
      }
    }
    const onPage = new Set(Array.from(list.children, item => item.dataset.nickname))
    for (const item of result.rows) {
      if (onPage.has(item.nickname)) continue
      onPage.add(item.nickname)
      const row = node('tr')
      row.dataset.nickname = item.nickname
      if (item.nickname === own.dataset.nickname) row.classList.add('your-run')
      const details = action(item.nickname, () => showProfile(item.nickname, details, item.bests ?? {score:item.value}), 'ranked-player')
      {
        const hunter = node('th')
        hunter.scope = 'row'
        hunter.append(details)
        if (item.nickname === own.dataset.nickname) hunter.append(node('small', 'You'))
        row.append(node('td', number(item.rank)), hunter)
        for (const key of Object.keys(rankedMetrics)) {
          const best = key === 'score' ? item.value : item.bests?.[key]
          const known = Number.isSafeInteger(best) && best > 0
          const cell = node('td', known ? standingsValue(key, best) : '—')
          if (!known) cell.setAttribute('aria-label', 'No verified best')
          row.append(cell)
        }
      }
      list.append(row)
    }
    viewport.hidden = !list.children.length
    status.textContent = result.stale ? (result.staleReason === 'offline' ? 'Offline. Showing the last downloaded standings.'
      : 'Refresh failed. Showing the last downloaded standings.') : result.authStatus ? feedback({ status: result.authStatus }) :
      !list.children.length ? (worldwide ? 'No eligible verified scores are available for this season.' : 'No verified records in this category yet.') : ''
    offset = from + 25
  }
  queueMicrotask(() => void load())
  return { section, refresh: () => load(0, true) }
}

function worldwide(camp, player, start, navigate) {
  const region = node('div', null, 'ranked-overview')
  const state = node('p', '', 'room-note')
  state.setAttribute('role', 'status')
  let ticket
  let activeCourse
  const ranked = action('Prepare a ranked hunt', async () => {
    if (ticket && Date.parse(ticket.expires) > Date.now()) {
      if (!start(ticket)) state.textContent = 'Ranked entry needs prepared game content and a connection.'
      return
    }
    ranked.disabled = true
    state.textContent = 'Requesting a ranked entry…'
    const response = await camp.ticket(player.id, activeCourse)
    if (!region.isConnected) return
    ranked.disabled = false
    if (response.status === 'ok') {
      ticket = response
      state.textContent = 'Entry ready. Ranked verification covers up to ' +
        (response.season === masteryReplayVersion ? '60 minutes or 8,192 accepted moves.' : '15 minutes or 2,048 accepted moves.') +
        ' Longer hunts continue locally.'
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
    if (response.status === 'ok' || response.status === 'duplicate') await board.refresh()
    state.textContent = response.status === 'ok' || response.status === 'duplicate'
      ? 'Verified results synchronized.' : response.status === 'pending' ? 'Verification is still pending.' : feedback(response)
  })
  pending.hidden = !camp.pending(player.id)
  const board = ranking(camp, player, 'worldwide', null, result => {
    activeCourse = result.course
    if (ticket?.course !== activeCourse || !result.open) {
      ticket = undefined
      ranked.textContent = 'Prepare a ranked hunt'
    }
    ranked.hidden = !result.open || result.season !== masteryReplayVersion || !camp.member(player.id) ||
      Boolean(result.stale || result.authStatus)
    state.textContent = result.stale || result.status !== 'ok' || result.authStatus ? '' : result.open ?
      (result.season !== masteryReplayVersion ? 'Mastery entry is awaiting server setup.' : camp.member(player.id)
        ? 'Get a connected ticket to qualify. Ordinary hunts and Play Again save local records.'
        : 'Join in Competitive profile to enter.') : messages.closed
  })
  region.append(state, board.section, ranked, pending)
  return region
}

function friends(camp, player) {
  const { section, status } = shell('Friends')
  const list = node('div')
  const standings = node('div')
  section.append(node('p', 'Connect by exact code. Both players must agree before records are compared.', 'room-note'),
    inputForm('Friend code', 'Send request', value => {
      if (value.toLowerCase() === code) { status.textContent = 'Share your code with another hunter.'; return false }
      return change('friend_request', { value })
    }), list, standings)
  let code
  async function show() {
    const result = await camp.social(player.id, 'friends')
    if (!section.isConnected) return
    if (result.status !== 'ok') { status.textContent = feedback(result); return }
    code = result.code
    list.replaceChildren(shareCode('Your friend code', code),
      action('Rotate friend code', () => ask(list, 'Replace your code? Existing friends and requests stay connected.',
        () => change('friend_rotate', {}))))
    if (!result.rows.length) list.append(node('p', 'No friends or requests yet.', 'room-note'))
    for (const friend of result.rows) {
      const entry = node('article', null, 'ranked-entry')
      entry.append(node('strong', friend.nickname), node('small',
        friend.state === 'incoming' ? 'Incoming request' : friend.state === 'outgoing' ? 'Request sent' : 'Friend'))
      if (friend.state === 'friend') entry.append(action('View career profile', async event => {
        const details = entry.querySelector('.friend-profile') ?? node('div','', 'friend-profile')
        entry.append(details)
        details.textContent = 'Loading profile…'
        const response = await camp.publicProfile(friend.nickname,masteryReplayVersion)
        details.replaceChildren()
        if (response.status !== 'ok') details.textContent = 'No published Mastery career or verified records yet.'
        else {
          details.append(...recordRows(response.records))
          if (response.career) details.append(node('p','Shared local level ' + response.career.level +
            (response.career.migration_complete ? ' · Great Migration completed' : '') + ' · Unverified', 'room-note'))
        }
      }))
      if (friend.state === 'incoming') entry.append(action('Accept', () => void change('friend_accept', { target: friend.key })))
      entry.append(action(friend.state === 'incoming' ? 'Decline' : friend.state === 'outgoing' ? 'Cancel request' : 'Remove',
        () => void change('friend_remove', { target: friend.key })))
      list.append(entry)
    }
    standings.replaceChildren(ranking(camp, player, 'friends').section)
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
    detail.append(ranking(camp, player, 'camp', campId).section)
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
  const sharing = node('div', null, 'ranked-entry')
  async function shareCareer(publish) {
    const result = await camp.social(player.id,'career_visibility', { publish, level:careerStanding(player.career).level,
      migration:completeMigrations(player)>0 })
    status.textContent = result.status === 'ok' ? publish ? 'Local career snapshot published.' : 'Local career snapshot removed.' : feedback(result)
  }
  sharing.append(node('p','Optional career snapshot · Shares your local level and Migration completion alongside your public nickname. These details are unverified.'),
    action('Publish career snapshot', () => ask(sharing,'Publish this local career snapshot?', () => shareCareer(true))),
    action('Remove career snapshot', () => shareCareer(false)))
  const profileLookup = node('section',null,'ranked-entry')
  const publicResult = node('div')
  publicResult.setAttribute('role','status')
  profileLookup.append(inputForm('Look up a public nickname','Find profile',async nickname => {
    publicResult.textContent = 'Reading public profile…'
    const response = await camp.publicProfile(nickname,masteryReplayVersion)
    if (!profileLookup.isConnected) return false
    publicResult.replaceChildren()
    if (response.status !== 'ok') publicResult.textContent = feedback(response)
    else {
      publicResult.append(node('h4',response.nickname),...recordRows(response.records))
      if (response.career) publicResult.append(node('p','Shared local level ' + response.career.level +
        (response.career.migration_complete ? ' · Great Migration completed' : '') + ' · Unverified','room-note'))
    }
    return false
  },20),publicResult)
  section.append(node('p', 'Camp shares your nickname and verified bests. Friends and private Camp members are visible within their groups.', 'room-note'),
    form, resultArea, sharing, profileLookup, erase,
    node('p', 'Camp uses an anonymous identity stored in this browser. Clearing site data or changing devices can lose access. Account recovery is unavailable. Career, dog and ownership stay on this device.', 'room-note'))
  async function show() {
    form.querySelector('input').value = legacy.member(player.id)?.nickname ?? player.nickname
    sharing.hidden = erase.hidden = !legacy.member(player.id)
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
    const { section, status } = shell(room === 'worldwide' ? 'Rankings' : 'Online Camp')
    status.textContent = 'This build has no Worldwide connection configured. Local hunts and records are ready.'
    return section
  }
  if (room === 'camp-history') {
    const archive = node('div')
    archive.append(ranking(camp,player,'worldwide',null,undefined,rankedVersion).section,
      action('Earlier archives', () => navigate('camp-archives')), action('Back to Worldwide', () => navigate('worldwide')))
    return archive
  }
  if (room === 'friends') return friends(camp, player)
  if (room === 'private-camps') return privateCamps(camp, player)
  if (room === 'camp-profile') return competitiveProfile(camp, legacy, player, onJoin, onErase)
  return worldwide(camp, player, start, navigate)
}
