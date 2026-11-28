export const releaseHealth = {
  merged: '673311caef599f57b5cd001cdf415c77d71a080f',
  lastReadBuild: '78c86e3',
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
  const header = document.createElement('div')
  header.className = 'support-heading'
  header.append(heading, close)
  dialog.append(header)
  for (const [title, note] of [
    ['Wild Heritage · RC.12.1', 'New woodland silhouettes, softer water and trail edges, clearer territory arrivals and equipment cards pictured on the Labrador.'],
    ['Connected · RC.12', 'Worldwide Camp brings verified standings, Friends and private Camps together. You can export a record card, Labrador portrait or earned Lodge image.'],
    ['Developer Command Center · RC.11', 'Send optional feedback or attach technical details after an unfair death. Delivery depends on the feedback service being configured.'],
    ['RC.10 released', 'Mastery adds tougher Endless sequences, clearer collection feedback and an interactive Hunt Over.'],
    ['Known issues', 'Physical iPhone hazard readability and input responsiveness are still under review. Long-hunt resource and Foothills transition checks are tracked in the release report. Official Worldwide competition remains closed.'],
    ['Coming up', 'The Great Migration cinematic is planned for first launch. Proving Grounds will focus on independent playtesting and physical-device performance.'],
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
