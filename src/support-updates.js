export const releaseHealth = {
  merged: '3b19de130ee812884e9b34f02691744edc022bc4',
  lastReadBuild: '5076c61',
  gates: ['Physical iPhone input responsiveness and hazard readability',
    'Independent human Endless balancing', 'Hosted Mastery submission verification'],
}

export function openFieldUpdates(source) {
  const dialog = document.createElement('dialog')
  dialog.className = 'support-panel'
  const heading = document.createElement('h2')
  heading.id = 'field-updates-heading'
  heading.textContent = 'Field updates'
  dialog.setAttribute('aria-labelledby', heading.id)
  const close = document.createElement('button')
  close.type = 'button'
  close.textContent = 'Close'
  close.addEventListener('click', () => dialog.close())
  dialog.addEventListener('close', () => { dialog.remove(); source?.focus() }, { once: true })
  const header = document.createElement('header')
  header.className = 'support-heading'
  header.append(heading, close)
  dialog.append(header)
  for (const [title, note] of [
    ['RC.11 under review', 'Player feedback, optional technical attachments and clearer Worldwide status. Feedback delivery depends on the service being configured.'],
    ['RC.10 released', 'Mastery adds tougher Endless sequences, clearer collection feedback and an interactive Hunt Over.'],
    ['Known issues', 'Physical iPhone hazard readability and input responsiveness are still under review. Long-hunt resource and Foothills transition checks are tracked in the release report. Official Worldwide competition remains closed.'],
    ['Coming up', 'Connected is planned for friends, rankings and sharing. Proving Grounds will focus on independent playtesting and physical-device performance.'],
  ]) {
    const section = document.createElement('section')
    const label = document.createElement('h3')
    const body = document.createElement('p')
    label.textContent = title
    body.textContent = note
    section.append(label, body)
    dialog.append(section)
  }
  document.body.append(dialog)
  dialog.showModal()
}
