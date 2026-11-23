import { boardPageSize } from './camp-rules.js'
import { categories } from './lodge-save.js'
import { node, number, meters, date } from './lodge-elements.js'
import { renderRival } from './rival-ui.js'

export const nameMessages = {
  invalid_name: 'Choose 3–20 characters using A–Z letters, numbers, spaces, hyphens, or underscores. Some names are reserved.',
  name_taken: 'That nickname is already taken. Try a different one.',
  rename_wait: 'You can change your worldwide nickname once an hour.',
  busy: 'A nickname is already being saved for this profile. Try again when it finishes.',
  auth_failed: 'Anonymous sign-in is unavailable right now. You can keep playing in Local Camp.',
  offline: 'You’re offline. Joining Worldwide Camp needs a connection.',
  unavailable: 'Worldwide Camp could not save your nickname. Try again in a moment.',
}

export const submissionMessages = {
  queued: 'Worldwide result queued. Your local result is saved.',
  sent: 'Worldwide bests are up to date.',
  pending: 'Worldwide result pending. Retry from the Lodge when you’re connected.',
  reconnect: 'Reconnect your worldwide identity in the Lodge to sync this result.',
  ineligible: 'This run is saved locally and falls outside the worldwide limits.',
  unranked: 'Run saved locally. A Season One entry needs a connection when the run starts.',
  season_changed: 'This run stays in your local records. Start a new run to enter the current standings.',
  rate_limited: 'Run saved locally. Worldwide Camp needs a moment before the next entry.',
  profile_required: 'Run saved locally. Reconnect your Worldwide name in the Lodge.',

}

function button(label, action) {
  const control = node('button', label)
  control.type = 'button'
  control.addEventListener('click', action)
  return control
}

export function campSwitch(worldwide, showLocal, showWorld) {
  const controls = node('div', null, 'camp-switch')
  const local = button('Local Camp', showLocal)
  const global = button('Worldwide Camp', showWorld)
  local.setAttribute('aria-pressed', String(!worldwide))
  global.setAttribute('aria-pressed', String(worldwide))
  controls.append(local, global)
  return controls
}

function standingsRow(run, metric, mine) {
  const row = node('li')
  if (run.rank <= 3) row.dataset.place = String(run.rank)
  const rank = node('span', '#' + number(run.rank), 'board-rank')
  const runner = node('div', null, 'board-runner')
  const when = node('time', date(run.recorded_at))
  when.dateTime = run.recorded_at
  runner.append(node('strong', run.nickname), when)
  if (mine?.nickname === run.nickname) row.classList.add('your-run')
  row.append(rank, runner, node('strong', metric === 'distance' ? meters(run.distance) : number(run[metric]), 'board-score'))
  row.append(node('p', [
    number(run.score) + ' pts', meters(run.distance), number(run.retrieves) + ' retrieves',
  ].join(' · '), 'board-detail'))
  return row
}

export function worldwideBoard(camp, player, metric, selectMetric, { onJoin, onStart }) {
  const section = node('section', null, 'worldwide-board')
  section.append(node('h3', 'Global Camp Leaderboard', 'section-title'))
  if (!camp.available) {
    section.append(node('p', 'Worldwide Camp hasn’t opened on this build. You can still compete in Local Camp.', 'empty-board'))
    return section
  }
  const filters = node('div', null, 'board-filters')
  for (const [id, label] of Object.entries(categories)) {
    const control = button(label, () => selectMetric(id))
    control.dataset.metric = id
    control.setAttribute('aria-pressed', String(metric === id))
    filters.append(control)
  }
  const season = node('p', '', 'room-note camp-season')
  section.append(season, filters)

  const status = node('p', '', 'room-note worldwide-status')
  status.setAttribute('role', 'status')
  const own = node('div', null, 'own-ranking')
  own.hidden = true
  const rival = node('section', null, 'rival-card')
  rival.hidden = true
  const roster = node('ol', null, 'camp-board worldwide-roster')
  const next = button('Show more', () => { void load(offset) })
  next.className = 'camp-more'
  next.hidden = true
  const retry = button('Reload rankings', () => { void load(0) })
  retry.className = 'camp-more'
  retry.hidden = true
  section.append(status, own, rival, roster, next, retry)

  const profile = node('details', null, 'worldwide-profile')
  const summary = node('summary')
  const form = node('form')
  const input = node('input')
  input.id = 'worldwide-nickname'
  input.type = 'text'
  input.maxLength = 20
  input.autocomplete = 'off'
  input.spellcheck = false
  const label = node('label', 'Public nickname')
  label.htmlFor = input.id
  const claim = node('button')
  claim.type = 'submit'
  const sync = button('Retry pending results', async () => {
    sync.disabled = true
    const result = await camp.sync(player.id)
    identityMessage.textContent = submissionMessages[result] ?? 'No results are waiting to sync.'
    updateProfile()
    if (result === 'sent') void load(0)
  })
  const identityMessage = node('p', '', 'room-note')
  identityMessage.setAttribute('role', 'status')
  profile.append(summary, form)
  form.append(label, input, claim, sync, identityMessage, node('p',
    'Joining shares your nickname and future personal bests. No email or password is required. Your anonymous identity stays in this browser and may be lost if you clear its data or switch devices.', 'room-note'))
  section.insertBefore(profile, status)
  let offset = 0
  let reconnect = false
  let loading = false
  let newestRequest = 0
  let standingsGeneration

  function updateProfile() {
    const member = camp.member(player.id)
    const pending = camp.pending(player.id)
    summary.textContent = member ? 'Worldwide nickname · ' + member.nickname + (pending ? ' · Pending sync' : '') : 'Join Worldwide Camp'
    claim.textContent = !member ? 'Join Worldwide Camp' : reconnect ? 'Reconnect' : 'Save nickname'
    if (!pending) sync.hidden = true
    else {
      sync.hidden = false
      sync.disabled = false
    }
  }

  input.value = (camp.member(player.id)?.nickname ?? player.nickname).slice(0, 20)
  updateProfile()

  form.addEventListener('submit', async event => {
    event.preventDefault()
    if (claim.disabled) return
    claim.disabled = true
    identityMessage.textContent = 'Saving nickname…'
    const result = await camp.join(player.id, input.value)
    if (result.status === 'ok') onJoin(player, camp.member(player.id))
    if (!section.isConnected) return
    claim.disabled = false
    if (result.status !== 'ok') {
      identityMessage.textContent = nameMessages[result.status] ?? nameMessages.unavailable
      return
    }
    reconnect = false
    input.value = camp.member(player.id).nickname
    identityMessage.textContent = result.replaced
      ? 'You’re using a new anonymous identity. Earlier entries remain under the original identity.'
      : 'Nickname saved. Your next qualifying run can post worldwide.'
    updateProfile()
    void load(0)
  })

  async function load(start) {
    if (loading && start) return
    const request = ++newestRequest
    loading = true
    retry.hidden = true
    next.disabled = true
    status.textContent = 'Loading worldwide rankings…'
    if (!start) {
      rival.hidden = !camp.member(player.id)
      if (!rival.hidden) {
        rival.textContent = 'Loading your next rival…'
        void camp.rival(player.id, metric).then(result => {
          if (section.isConnected && request === newestRequest) renderRival(rival, result, metric, onStart)
        })
      }
    }
    const result = await camp.board(player.id, metric, start)
    if (request !== newestRequest || !section.isConnected) return
    loading = false
    next.disabled = false
    if (result.status !== 'ok') {
      status.textContent = result.status === 'offline'
        ? 'You’re offline. Local Camp is ready whenever you are.'
        : 'Worldwide Camp is temporarily unavailable. Your local records are safe.'
      retry.hidden = false
      next.hidden = true
      if (!start) {
        roster.replaceChildren()
        own.hidden = true
      }
      return
    }
    const generation = result.generation ?? 0
    if (start && generation !== standingsGeneration) {
      void load(0)
      return
    }
    standingsGeneration = generation
    season.textContent = (result.season === 'season-one' ? 'Season One' : 'Preseason') + ' · Top 100 players'
    if (!start) roster.replaceChildren()
    reconnect = Boolean(result.reconnect)
    updateProfile()
    if (reconnect) {
      identityMessage.textContent = 'Reconnect to view your rank and sync results.'
      profile.open = true
    }
    own.hidden = !result.mine
    if (result.mine) own.textContent = 'Your ' + categories[metric].toLowerCase() + ' rank · #' + number(result.mine.rank)
    const existing = new Set([...roster.children].map(entry => entry.dataset.nickname))
    for (const run of result.rows) {
      if (existing.has(run.nickname)) continue
      const row = standingsRow(run, metric, result.mine)
      row.dataset.nickname = run.nickname
      roster.append(row)
      existing.add(run.nickname)
    }
    offset = start + boardPageSize
    next.hidden = !result.has_more || Boolean(result.offline)
    status.textContent = result.stale
      ? result.offline ? 'You’re offline. Showing recently loaded rankings.' : 'Showing recently loaded rankings.'
      : roster.children.length ? '' : 'No worldwide records yet. Join camp and set the first one.'
  }
  void load(0)
  return section
}
