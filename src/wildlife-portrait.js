// Original field-guide illustrations keyed by the playable silhouettes.
function color(value) { return '#' + value.toString(16).padStart(6, '0') }

export function wildlifePortrait(animal, seen) {
  const fill = type => seen ? color(animal[type]) : '#536057'
  const body = fill('body'), head = fill('head'), wing = fill('wing')
  const bill = seen ? (animal.family === 'goose' ? '#989084' : '#c9a253') : head
  const eye = seen ? '#e6d99b' : head
  const large = ['deer','moose','alligator'].includes(animal.family)
  const slim = ['wader','crane','goose'].includes(animal.family)
  const neck = slim ? 'M45 44 Q62 46 70 24 Q78 22 80 27 L66 46 Q61 54 45 55Z'
    : 'M50 41 Q60 34 68 36 L74 49 Q63 55 51 52Z'
  const silhouette = large ? `
    <path fill="${body}" d="M10 47 Q22 32 47 41 L64 39 L78 48 L88 47 L91 51 L79 55 L62 53 L58 64H53L52 53H38L34 64H29L30 53L8 51Z"/>
    <path fill="${head}" d="M56 47 Q60 32 66 30 L73 25 L77 26 L76 33 L84 37 L83 44 L72 46 L68 53Z"/>
    <path fill="${wing}" d="M64 32 L60 21 L64 18 L69 30 L73 15 L78 19 L73 33Z"/>` : `
    <path fill="${body}" d="M8 48 L22 45 Q30 35 52 40 Q68 41 70 48 Q62 60 37 59 Q18 56 8 48Z"/>
    <path fill="${wing}" d="M18 48 Q34 39 54 46 Q56 51 47 54 Q32 57 18 48Z"/>
    <path fill="${head}" d="${neck}"/>
    <ellipse cx="${slim ? 77 : 71}" cy="${slim ? 24 : 37}" rx="10" ry="8" fill="${head}"/>
    <path fill="${bill}" d="M${slim ? 84 : 78} ${slim ? 23 : 36} L93 ${slim ? 24 : 38} L91 ${slim ? 28 : 41} L81 ${slim ? 28 : 41}Z"/>
    <circle cx="${slim ? 80 : 74}" cy="${slim ? 22 : 35}" r="1.4" fill="${eye}"/>
    ${animal.family === 'pheasant' || animal.family === 'pintail' ? '<path fill="'+wing+'" d="M26 47L2 39l16 14Z"/>' : ''}
    ${animal.family.startsWith('crest') || animal.family === 'merganser' ? '<path fill="'+head+'" d="M77 34Q61 12 60 35L69 40Z"/>' : ''}
    ${['wader','crane'].includes(animal.family) ? '<path stroke="'+head+'" fill="none" stroke-width="2" d="M38 56l-1 10m10-10-2 10"/>' : ''}`
  const graphic = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 70"><rect width="100" height="70" rx="8" fill="#23392f"/><path d="M0 62Q28 57 55 61T100 62V70H0Z" fill="#355244"/>' + silhouette + '</svg>'
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(graphic)
}
